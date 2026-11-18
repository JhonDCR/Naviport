import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { IncidentsService } from './incidents.service';
import {
  AuditoriaLog,
  Imagen,
  Incidente,
  Notificacion,
  Turno,
  Viaje,
} from '../../database/schemas';
import { RedisService } from '../../redis/redis.service';

describe('IncidentsService', () => {
  let service: IncidentsService;

  const mockRedisService = {
    agregarAlerta: jest.fn(),
    eliminarAlerta: jest.fn(),
    invalidarKpiResumen: jest.fn(),
    registrarAuditoria: jest.fn().mockResolvedValue(undefined),
  };

  const mockIncidenteModel = {
    create: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
  };

  const mockViajeModel = {
    findById: jest.fn(),
  };

  const mockImagenModel = {
    create: jest.fn(),
  };

  const mockTurnoModel = {
    findOneAndUpdate: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    }),
  };

  const mockNotificacionModel = {
    create: jest.fn().mockResolvedValue({}),
  };

  const mockAuditoriaLogModel = {
    create: jest.fn().mockResolvedValue({}),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IncidentsService,
        { provide: getModelToken(Incidente.name), useValue: mockIncidenteModel },
        { provide: getModelToken(Viaje.name), useValue: mockViajeModel },
        { provide: getModelToken(Imagen.name), useValue: mockImagenModel },
        { provide: getModelToken(Turno.name), useValue: mockTurnoModel },
        {
          provide: getModelToken(Notificacion.name),
          useValue: mockNotificacionModel,
        },
        {
          provide: getModelToken(AuditoriaLog.name),
          useValue: mockAuditoriaLogModel,
        },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<IncidentsService>(IncidentsService);
  });

  it('should report critical incident, mark trip as retrasado, save photo evidence and push Redis alert', async () => {
    const viajeId = new Types.ObjectId();
    const buqueId = new Types.ObjectId();
    const operadorId = new Types.ObjectId();
    const incidenteId = new Types.ObjectId();
    const imagenId = new Types.ObjectId();
    const mockViajeSave = jest.fn().mockResolvedValue(true);

    mockIncidenteModel.create.mockResolvedValue({
      _id: incidenteId,
      viajeId,
      buqueId,
      operadorId,
      tipo: 'averia',
      descripcion: 'Precinto roto en contenedor refrigerado',
      gravedad: 'alta',
    });

    mockImagenModel.create.mockResolvedValue({
      _id: imagenId,
      rutaArchivo: '/uploads/incidents/test-evidencia.jpg',
    });

    mockViajeModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        _id: viajeId,
        codigo: 'V-2026-014',
        estado: 'en_ruta',
        save: mockViajeSave,
      }),
    });

    const result = await service.reportarIncidente(
      {
        viajeId: String(viajeId),
        buqueId: String(buqueId),
        tipo: 'averia',
        descripcion: 'Precinto roto en contenedor refrigerado',
        gravedad: 'alta',
        codigoContenedor: '#CN-9823',
      },
      String(operadorId),
      { originalname: 'test-evidencia.jpg' },
    );

    expect(mockViajeSave).toHaveBeenCalled();
    expect(mockImagenModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tipoEntidad: 'incidente',
      }),
    );
    expect(mockRedisService.agregarAlerta).toHaveBeenCalledWith(
      'viaje_retrasado:V-2026-014',
    );
    expect(mockRedisService.invalidarKpiResumen).toHaveBeenCalled();
    expect(result.evidenciaImagen).toEqual({
      id: String(imagenId),
      rutaArchivo: '/uploads/incidents/test-evidencia.jpg',
    });
  });

  it('should resolve incident and remove associated Redis alerts', async () => {
    const incidenteId = new Types.ObjectId();
    const viajeId = new Types.ObjectId();
    const adminId = new Types.ObjectId();
    const mockIncidenteSave = jest.fn().mockResolvedValue(true);

    mockIncidenteModel.findById
      .mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue({
          _id: incidenteId,
          viajeId,
          tipo: 'retraso',
          estado: 'abierto',
          save: mockIncidenteSave,
        }),
      })
      .mockReturnValueOnce({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              lean: jest.fn().mockReturnValue({
                exec: jest.fn().mockResolvedValue({
                  _id: incidenteId,
                  estado: 'resuelto',
                }),
              }),
            }),
          }),
        }),
      });

    mockViajeModel.findById.mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: viajeId,
          codigo: 'V-2026-014',
        }),
      }),
    });

    const updated = await service.actualizarEstadoIncidente(
      String(incidenteId),
      { estado: 'resuelto' },
      String(adminId),
    );

    expect(updated?.estado).toBe('resuelto');
    expect(mockRedisService.eliminarAlerta).toHaveBeenCalledWith(
      'viaje_retrasado:V-2026-014',
    );
    expect(mockRedisService.invalidarKpiResumen).toHaveBeenCalled();
  });
});
