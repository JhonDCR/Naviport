import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { KpisService } from './kpis.service';
import { Buque, Incidente, Viaje } from '../../database/schemas';
import { RedisService } from '../../redis/redis.service';

describe('KpisService', () => {
  let service: KpisService;
  const mockRedisService = {
    obtenerKpiResumen: jest.fn(),
    guardarKpiResumen: jest.fn(),
    obtenerAlertasActivas: jest.fn(),
  };

  const mockViajeModel = {
    aggregate: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue([
        {
          _id: null,
          totalViajes: 10,
          viajesPuntuales: 9,
          toneladasMes: 15000,
          viajesEnRuta: 6,
        },
      ]),
    }),
  };

  const mockBuqueModel = {
    countDocuments: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(5),
    }),
  };

  const mockIncidenteModel = {
    countDocuments: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(1),
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KpisService,
        { provide: getModelToken(Viaje.name), useValue: mockViajeModel },
        { provide: getModelToken(Buque.name), useValue: mockBuqueModel },
        { provide: getModelToken(Incidente.name), useValue: mockIncidenteModel },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<KpisService>(KpisService);
  });

  it('should return cached KPIs when present in Redis (kpi:resumen)', async () => {
    mockRedisService.obtenerKpiResumen.mockResolvedValueOnce({
      puntualidad: 94,
      toneladasMes: 14500,
      buquesActivos: 8,
      viajesEnRuta: 12,
      incidentesPendientes: 2,
    });

    const res = await service.obtenerResumen();
    expect(res.origenCache).toBe(true);
    expect(res.puntualidad).toBe(94);
    expect(mockViajeModel.aggregate).not.toHaveBeenCalled();
  });

  it('should aggregate from MongoDB and store in Redis when cache misses', async () => {
    mockRedisService.obtenerKpiResumen.mockResolvedValueOnce(null);

    const res = await service.obtenerResumen();
    expect(res.origenCache).toBe(false);
    expect(res.puntualidad).toBe(90);
    expect(res.toneladasMes).toBe(15000);
    expect(mockRedisService.guardarKpiResumen).toHaveBeenCalledWith(
      expect.objectContaining({ puntualidad: 90 }),
      300,
    );
  });

  it('should parse Redis Set alertas:activas into structured alerts', async () => {
    mockRedisService.obtenerAlertasActivas.mockResolvedValueOnce([
      'viaje_retrasado:V-2026-014',
      'mantenimiento_vencido:IMO-9876543',
    ]);

    const alertas = await service.obtenerAlertasActivas();
    expect(alertas).toEqual([
      {
        id: 'viaje_retrasado:V-2026-014',
        tipo: 'viaje_retrasado',
        referencia: 'V-2026-014',
      },
      {
        id: 'mantenimiento_vencido:IMO-9876543',
        tipo: 'mantenimiento_vencido',
        referencia: 'IMO-9876543',
      },
    ]);
  });
});
