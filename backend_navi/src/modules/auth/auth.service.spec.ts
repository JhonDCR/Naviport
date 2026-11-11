import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { Usuario } from '../../database/schemas';
import { RedisService } from '../../redis/redis.service';
import { RolUsuario } from '../../common/enums/rol.enum';

describe('AuthService', () => {
  let service: AuthService;

  const mockRedisService = {
    guardarSesion: jest.fn(),
    revocarSesion: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn().mockResolvedValue('mock-jwt-token'),
  };

  const mockUsuarioModel = {
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getModelToken(Usuario.name), useValue: mockUsuarioModel },
        { provide: JwtService, useValue: mockJwtService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should authenticate valid user and store session in Redis (sesion:{idUsuario})', async () => {
    const hash = await bcrypt.hash('naviport123', 10);
    mockUsuarioModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        _id: '672f0b9f91a24d0012ab34cd',
        nombre: 'Gary Industries',
        correo: 'contacto@garyindustries.com',
        password_hash: hash,
        rol: RolUsuario.CLIENTE,
        detallesPerfil: { empresa: 'Gary Industries' },
        preferencias: { notificacionesPush: true, modoOscuro: false },
        activo: true,
      }),
    });

    const result = await service.login({
      correo: 'contacto@garyindustries.com',
      password: 'naviport123',
    });

    expect(result.accessToken).toBe('mock-jwt-token');
    expect(mockRedisService.guardarSesion).toHaveBeenCalledWith(
      '672f0b9f91a24d0012ab34cd',
      {
        token: 'mock-jwt-token',
        rol: RolUsuario.CLIENTE,
        activo: 'true',
      },
    );
  });

  it('should reject login when user is suspended', async () => {
    mockUsuarioModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        _id: '672f0b9f91a24d0012ab34cd',
        correo: 'suspendido@naviport.com',
        activo: false,
      }),
    });

    await expect(
      service.login({
        correo: 'suspendido@naviport.com',
        password: 'naviport123',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should reject login with invalid credentials', async () => {
    mockUsuarioModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    await expect(
      service.login({
        correo: 'inexistente@naviport.com',
        password: 'wrongpassword',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should revoke Redis session immediately when suspending a user', async () => {
    mockUsuarioModel.findByIdAndUpdate.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            _id: '672f0b9f91a24d0012ab34cd',
            activo: false,
          }),
        }),
      }),
    });

    await service.cambiarEstadoUsuario('672f0b9f91a24d0012ab34cd', false);
    expect(mockRedisService.revocarSesion).toHaveBeenCalledWith(
      '672f0b9f91a24d0012ab34cd',
    );
  });
});
