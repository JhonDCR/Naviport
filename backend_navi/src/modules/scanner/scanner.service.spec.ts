import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { ScannerService } from './scanner.service';
import { Carga, Imagen, Puerto, Viaje } from '../../database/schemas';
import { RedisService } from '../../redis/redis.service';

describe('ScannerService', () => {
  let service: ScannerService;

  const mockRedisService = {
    agregarAlerta: jest.fn(),
  };

  const mockImagenModel = {
    create: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
  };

  const mockCargaModel = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScannerService,
        { provide: getModelToken(Imagen.name), useValue: mockImagenModel },
        { provide: getModelToken(Carga.name), useValue: mockCargaModel },
        { provide: getModelToken(Viaje.name), useValue: {} },
        { provide: getModelToken(Puerto.name), useValue: {} },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<ScannerService>(ScannerService);
  });

  it('should process optical scan and register alert in Redis when damage is detected', async () => {
    mockCargaModel.findOne.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            _id: new Types.ObjectId(),
            codigoContenedor: '#CN-9823',
            historialEventos: [
              {
                estado: 'En tránsito marítimo',
                ubicacion: 'Océano Pacífico',
                fecha: new Date(),
              },
            ],
          }),
        }),
      }),
    });

    mockImagenModel.create.mockResolvedValue({
      _id: new Types.ObjectId(),
    });

    const res = await service.procesarInspeccionOptica({
      codigoContenedor: '#CN-9823',
      dañosDetectados: true,
      confianza: 91,
    });

    expect(res.codigoLeido).toBe('#CN-9823');
    expect(res.confianza).toBe(91);
    expect(res.dañosDetectados).toBe(true);
    expect(mockRedisService.agregarAlerta).toHaveBeenCalledWith(
      'averia_detectada:#CN-9823',
    );
  });
});
