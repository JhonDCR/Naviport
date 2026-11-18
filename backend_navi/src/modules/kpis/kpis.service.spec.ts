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
    obtenerKpiReportes: jest.fn(),
    guardarKpiReportes: jest.fn(),
    obtenerAlertasActivas: jest.fn(),
    eliminarAlerta: jest.fn(),
    invalidarKpiResumen: jest.fn(),
  };

  const createViajeFindChain = (docs: unknown[]) => ({
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(docs),
    }),
  });

  const createIncidenteFindChain = (docs: unknown[]) => ({
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(docs),
    }),
  });

  const mockViajeModel = {
    aggregate: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue([
        {
          _id: null,
          totalViajes: 10,
          viajesPuntuales: 9,
          toneladasMes: 15000,
          viajesEnRuta: 6,
          viajesProgramados: 1,
          viajesFinalizados: 2,
          viajesRetrasados: 1,
        },
      ]),
    }),
    find: jest.fn().mockImplementation(() =>
      createViajeFindChain([
        {
          codigo: '#BU-1234XYZ',
          estado: 'en_ruta',
          fechas: { salida: new Date(), llegadaEstimada: new Date() },
          buqueId: { nombre: 'Maersk Horizon' },
          origenId: { ciudad: 'Shanghai' },
          destinoId: { ciudad: 'Guayaquil' },
          resumenCarga: { contenedores: 120, toneladas: 2400 },
          finanzas: { ingresosEstimadosUSD: 420000, costoOperativoUSD: 255000 },
        },
      ]),
    ),
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
    find: jest.fn().mockImplementation(() => createIncidenteFindChain([])),
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
      totalBuques: 10,
      porcentajeFlotaOperativa: 80,
      viajesEnRuta: 12,
      incidentesPendientes: 2,
      toneladasPorMes: [],
      distribucionEstadoViajes: {
        en_ruta: 5,
        programado: 2,
        finalizado: 2,
        retrasado: 1,
      },
      enviosYAlertasRecientes: [],
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
    expect(res.toneladasPorMes.length).toBe(6);
    expect(res.distribucionEstadoViajes.en_ruta).toBe(6);
    expect(mockRedisService.guardarKpiResumen).toHaveBeenCalledWith(
      expect.objectContaining({ puntualidad: 90 }),
      300,
    );
  });

  it('should generate and cache managerial reports by period (kpi:reportes:{periodo})', async () => {
    mockRedisService.obtenerKpiReportes.mockResolvedValueOnce(null);

    const reporte = await service.obtenerReportes('mes');
    expect(reporte.origenCache).toBe(false);
    expect(reporte.periodo).toBe('mes');
    expect(reporte.ingresosUSD).toBe(420000);
    expect(reporte.costoOperativoUSD).toBe(255000);
    expect(reporte.margenOperativoUSD).toBe(165000);
    expect(mockRedisService.guardarKpiReportes).toHaveBeenCalledWith(
      'mes',
      expect.objectContaining({ ingresosUSD: 420000 }),
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
