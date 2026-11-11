import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { IncidentsService } from './incidents.service';
import { Imagen, Incidente, Viaje } from '../../database/schemas';
import { RedisService } from '../../redis/redis.service';

describe('IncidentsService', () => {
  let service: IncidentsService;

  const mockRedisService = {
    agregarAlerta: jest.fn(),
    invalidarKpiResumen: jest.fn(),
  };

  const mockIncidenteModel = {
    create: jest.fn(),
    find: jest.fn(),
  };

  const mockViajeModel = {
    findById: jest.fn(),
  };

  const mockImagenModel = {
    create: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IncidentsService,
        { provide: getModelToken(Incidente.name), useValue: mockIncidenteModel },
        { provide: getModelToken(Viaje.name), useValue: mockViajeModel },
        { provide: getModelToken(Imagen.name), useValue: mockImagenModel },
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
});
