import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import {
  ForbiddenException,
  HttpException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { AuditoriaLog, Turno, Usuario } from '../../database/schemas';
import { RedisService } from '../../redis/redis.service';
import { RolUsuario } from '../../common/enums/rol.enum';

describe('AuthService', () => {
  let service: AuthService;

  const mockRedisService = {
    guardarSesion: jest.fn(),
    revocarSesion: jest.fn(),
    verificarYRegistrarIntentoLogin: jest.fn().mockResolvedValue({
      permitido: true,
      intentos: 1,
      restantes: 4,
    }),
    limpiarIntentosLogin: jest.fn(),
    registrarAuditoria: jest.fn().mockResolvedValue(undefined),
    obtenerAuditoria: jest.fn().mockResolvedValue([]),
    guardarTurnoActivo: jest.fn().mockResolvedValue(undefined),
    obtenerTurnoActivo: jest.fn().mockResolvedValue(null),
    eliminarTurnoActivo: jest.fn().mockResolvedValue(undefined),
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

  const mockTurnoModel = {
    updateMany: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    }),
    create: jest.fn().mockResolvedValue({
      _id: 'turno-1',
      tipoTurno: 'Matutino',
      horarioAsignado: '08:00 - 16:00',
      fechaInicio: new Date(),
      estado: 'activo',
    }),
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockAuditoriaLogModel = {
    create: jest.fn().mockResolvedValue({}),
    find: jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([]),
          }),
        }),
      }),
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockRedisService.verificarYRegistrarIntentoLogin.mockResolvedValue({
      permitido: true,
      intentos: 1,
      restantes: 4,
    });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getModelToken(Usuario.name), useValue: mockUsuarioModel },
        { provide: getModelToken(Turno.name), useValue: mockTurnoModel },
        {
          provide: getModelToken(AuditoriaLog.name),
          useValue: mockAuditoriaLogModel,
        },
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
        preferencias: { notificacionesPush: true, modoOscuro: false, idioma: 'es' },
        activo: true,
      }),
    });

    const result = await service.login({
      correo: 'contacto@garyindustries.com',
      password: 'naviport123',
    });

    expect(result.accessToken).toBe('mock-jwt-token');
    expect(mockRedisService.limpiarIntentosLogin).toHaveBeenCalledWith(
      'contacto@garyindustries.com',
    );
    expect(mockRedisService.guardarSesion).toHaveBeenCalledWith(
      '672f0b9f91a24d0012ab34cd',
      {
        token: 'mock-jwt-token',
        rol: RolUsuario.CLIENTE,
        activo: 'true',
      },
    );
  });

  it('should block login with 429 when Redis rate limit is exceeded', async () => {
    mockRedisService.verificarYRegistrarIntentoLogin.mockResolvedValueOnce({
      permitido: false,
      intentos: 6,
      restantes: 0,
    });

    await expect(
      service.login({
        correo: 'ataque@naviport.com',
        password: 'wrongpassword',
      }),
    ).rejects.toThrow(HttpException);
  });

  it('should force RolUsuario.CLIENTE on public registration even if ADMIN role is sent', async () => {
    mockUsuarioModel.findOne.mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      }),
    });
    mockUsuarioModel.create.mockImplementation((doc: Record<string, unknown>) =>
      Promise.resolve({ _id: 'new-user-id', ...doc }),
    );

    const created = await service.registrarUsuario(
      {
        nombre: 'Usuario Externo',
        correo: 'externo@empresa.com',
        password: 'password123',
        rol: RolUsuario.ADMIN,
      },
      false,
    );

    expect(created.rol).toBe(RolUsuario.CLIENTE);
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

  it('should create Turno in MongoDB and cache active shift in Redis when starting shift', async () => {
    const mockSave = jest.fn().mockResolvedValue(true);
    const opId = '672f0b9f91a24d0012ab34ce';

    mockUsuarioModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        _id: opId,
        nombre: 'Javier Mendoza',
        detallesPerfil: { turno: 'Matutino', horarioTurno: '08:00 - 16:00' },
        save: mockSave,
      }),
    });

    const result = await service.controlarTurno(opId, {
      turnoActivo: true,
      turno: 'Matutino',
      horarioTurno: '08:00 - 16:00',
    });

    expect(result.turnoActivo).toBe(true);
    expect(mockTurnoModel.create).toHaveBeenCalled();
    expect(mockRedisService.guardarTurnoActivo).toHaveBeenCalledWith(
      opId,
      expect.objectContaining({
        turnoId: 'turno-1',
        tipoTurno: 'Matutino',
      }),
    );
    expect(mockAuditoriaLogModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        accion: 'INICIAR_TURNO',
        entidad: 'turnos',
      }),
    );
  });
});
