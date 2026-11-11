import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';
import { TrackingService } from './tracking.service';
import { Buque, Carga, Puerto, Viaje } from '../../database/schemas';
import { RedisService } from '../../redis/redis.service';
import { RolUsuario } from '../../common/enums/rol.enum';

describe('TrackingService', () => {
  let service: TrackingService;

  const mockRedisService = {
    agregarAlerta: jest.fn(),
    eliminarAlerta: jest.fn(),
    invalidarKpiResumen: jest.fn(),
  };

  const mockCargaModel = {
    find: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
  };

  const mockViajeModel = {
    find: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrackingService,
        { provide: getModelToken(Carga.name), useValue: mockCargaModel },
        { provide: getModelToken(Viaje.name), useValue: mockViajeModel },
        { provide: getModelToken(Buque.name), useValue: {} },
        { provide: getModelToken(Puerto.name), useValue: {} },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<TrackingService>(TrackingService);
  });

  it('should enforce client isolation when requesting timeline of another client', async () => {
    const ownerId = new Types.ObjectId();
    const otherClientId = new Types.ObjectId();

    mockCargaModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        _id: new Types.ObjectId(),
        clienteId: ownerId,
        codigoContenedor: '#CN-9823',
        historialEventos: [],
      }),
    });

    await expect(
      service.obtenerTimeline('#CN-9823', {
        sub: String(otherClientId),
        correo: 'otro@cliente.com',
        rol: RolUsuario.CLIENTE,
        nombre: 'Otro Cliente',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should push Redis alert when trip state changes to retrasado', async () => {
    const mockSave = jest.fn().mockResolvedValue(true);
    const viajeId = new Types.ObjectId();

    mockViajeModel.findById
      .mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue({
          _id: viajeId,
          codigo: 'V-2026-014',
          estado: 'en_ruta',
          fechas: {
            salida: new Date(),
            llegadaEstimada: new Date(),
          },
          save: mockSave,
        }),
      })
      .mockReturnValueOnce({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              lean: jest.fn().mockReturnValue({
                exec: jest.fn().mockResolvedValue({
                  _id: viajeId,
                  codigo: 'V-2026-014',
                  estado: 'retrasado',
                }),
              }),
            }),
          }),
        }),
      });

    await service.actualizarEstadoViaje(String(viajeId), {
      estado: 'retrasado',
    });

    expect(mockRedisService.agregarAlerta).toHaveBeenCalledWith(
      'viaje_retrasado:V-2026-014',
    );
    expect(mockRedisService.invalidarKpiResumen).toHaveBeenCalled();
  });
});
