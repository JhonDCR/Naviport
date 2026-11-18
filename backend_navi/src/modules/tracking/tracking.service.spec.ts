import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';
import { TrackingService } from './tracking.service';
import {
  Buque,
  Carga,
  Notificacion,
  Puerto,
  Usuario,
  Viaje,
} from '../../database/schemas';
import { RedisService } from '../../redis/redis.service';
import { RolUsuario } from '../../common/enums/rol.enum';

describe('TrackingService', () => {
  let service: TrackingService;

  const mockRedisService = {
    agregarAlerta: jest.fn(),
    eliminarAlerta: jest.fn(),
    invalidarKpiResumen: jest.fn(),
    obtenerNotificacionesLeidas: jest.fn().mockResolvedValue([]),
    marcarNotificacionLeida: jest.fn(),
    marcarTodasNotificacionesLeidas: jest.fn(),
  };

  const mockCargaModel = {
    find: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    countDocuments: jest.fn(),
  };

  const mockViajeModel = {
    find: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    findByIdAndDelete: jest.fn(),
  };

  const mockBuqueModel = {
    findById: jest.fn(),
  };

  const mockUsuarioModel = {
    findById: jest.fn(),
  };

  const mockNotificacionModel = {
    find: jest.fn(),
    create: jest.fn().mockResolvedValue({}),
    insertMany: jest.fn().mockResolvedValue([]),
    findByIdAndUpdate: jest.fn(),
    updateMany: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrackingService,
        { provide: getModelToken(Carga.name), useValue: mockCargaModel },
        { provide: getModelToken(Viaje.name), useValue: mockViajeModel },
        { provide: getModelToken(Buque.name), useValue: mockBuqueModel },
        { provide: getModelToken(Puerto.name), useValue: {} },
        { provide: getModelToken(Usuario.name), useValue: mockUsuarioModel },
        {
          provide: getModelToken(Notificacion.name),
          useValue: mockNotificacionModel,
        },
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

  it('should push Redis alert and persist notifications when trip state changes to retrasado', async () => {
    const mockSave = jest.fn().mockResolvedValue(true);
    const viajeId = new Types.ObjectId();
    const clienteId = new Types.ObjectId();

    mockCargaModel.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([
            { clienteId, codigoContenedor: '#CN-7741' },
          ]),
        }),
      }),
    });

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
    expect(mockNotificacionModel.insertMany).toHaveBeenCalled();
    expect(mockRedisService.invalidarKpiResumen).toHaveBeenCalled();
  });

  it('should return customs manifest for authorized client', async () => {
    const ownerId = new Types.ObjectId();
    const cargaId = new Types.ObjectId();

    mockCargaModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        _id: cargaId,
        clienteId: ownerId,
        codigoContenedor: '#CN-9823',
      }),
    });

    mockCargaModel.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            _id: cargaId,
            clienteId: ownerId,
            codigoContenedor: '#CN-9823',
            tipo: 'Seco',
            pesoToneladas: 24.5,
            numeroPrecinto: '#MSK-4409',
            valorFleteUSD: 5400,
            manifiestoAduanero: {
              numeroDocumento: 'BL-CN-9823-2026',
              partidaArancelaria: '8471.30.00.00',
              estadoAduana: 'declarado',
            },
            viajeId: null,
            historialEventos: [],
          }),
        }),
      }),
    });

    mockUsuarioModel.findById.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            nombre: 'Gary Industries',
            detallesPerfil: {
              empresa: 'Gary Industries',
              ruc: '0992345678001',
              direccionLegal: 'Av. 9 de Octubre 416',
            },
          }),
        }),
      }),
    });

    const manifest = await service.obtenerManifiestoCarga('#CN-9823', {
      sub: String(ownerId),
      correo: 'contacto@garyindustries.com',
      rol: RolUsuario.CLIENTE,
      nombre: 'Gary Industries',
    });

    expect(manifest.numeroDocumento).toBe('BL-CN-9823-2026');
    expect(manifest.consignatario.ruc).toBe('0992345678001');
    expect(manifest.contenedor.numeroPrecinto).toBe('#MSK-4409');
  });
});
