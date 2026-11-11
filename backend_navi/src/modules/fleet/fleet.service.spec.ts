import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { FleetService } from './fleet.service';
import { Buque, Mantenimiento, Puerto } from '../../database/schemas';
import { RedisService } from '../../redis/redis.service';

describe('FleetService', () => {
  let service: FleetService;

  const mockRedisService = {
    agregarAlerta: jest.fn(),
    eliminarAlerta: jest.fn(),
    invalidarKpiResumen: jest.fn(),
  };

  const mockBuqueModel = {
    find: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  };

  const mockPuertoModel = {
    find: jest.fn(),
    create: jest.fn(),
  };

  const mockMantenimientoModel = {
    find: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FleetService,
        { provide: getModelToken(Buque.name), useValue: mockBuqueModel },
        { provide: getModelToken(Puerto.name), useValue: mockPuertoModel },
        {
          provide: getModelToken(Mantenimiento.name),
          useValue: mockMantenimientoModel,
        },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<FleetService>(FleetService);
  });

  it('should create ship and invalidate KPI cache in Redis', async () => {
    mockBuqueModel.create.mockResolvedValue({
      nombre: 'MSC Gülsün',
      imo: 'IMO-9839430',
      estado: 'activo',
    });

    const buque = await service.crearBuque({
      nombre: 'MSC Gülsün',
      imo: 'IMO-9839430',
      tipo: 'Portacontenedores',
      capacidadToneladas: 52000,
      bandera: 'Panamá',
      estado: 'activo',
    });

    expect(buque.imo).toBe('IMO-9839430');
    expect(mockRedisService.invalidarKpiResumen).toHaveBeenCalled();
  });

  it('should clear overdue maintenance alert in Redis and reactivate ship when maintenance is completed', async () => {
    const buqueId = new Types.ObjectId();
    const mantId = new Types.ObjectId();
    const mockMantSave = jest.fn().mockResolvedValue(true);
    const mockBuqueSave = jest.fn().mockResolvedValue(true);

    mockMantenimientoModel.findById
      .mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue({
          _id: mantId,
          buqueId,
          estado: 'pendiente',
          fechas: { programada: new Date() },
          save: mockMantSave,
        }),
      })
      .mockReturnValueOnce({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue({
              _id: mantId,
              estado: 'completado',
            }),
          }),
        }),
      });

    mockBuqueModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        _id: buqueId,
        imo: 'IMO-9876543',
        estado: 'mantenimiento',
        save: mockBuqueSave,
      }),
    });

    await service.actualizarEstadoMantenimiento(String(mantId), {
      estado: 'completado',
    });

    expect(mockRedisService.eliminarAlerta).toHaveBeenCalledWith(
      'mantenimiento_vencido:IMO-9876543',
    );
    expect(mockBuqueSave).toHaveBeenCalled();
    expect(mockRedisService.invalidarKpiResumen).toHaveBeenCalled();
  });
});
