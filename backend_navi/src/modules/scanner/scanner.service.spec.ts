import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { ScannerService } from './scanner.service';
import { Buque, Carga, Imagen, Puerto, Turno, Viaje } from '../../database/schemas';
import { RedisService } from '../../redis/redis.service';
import { RolUsuario } from '../../common/enums/rol.enum';

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

  const mockTurnoModel = {
    findOneAndUpdate: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    }),
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
        { provide: getModelToken(Buque.name), useValue: {} },
        { provide: getModelToken(Turno.name), useValue: mockTurnoModel },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<ScannerService>(ScannerService);
  });

  it('should process optical scan, persist operadorId and register alert in Redis when damage is detected', async () => {
    const operadorId = new Types.ObjectId();

    mockCargaModel.findOne.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            _id: new Types.ObjectId(),
            codigoContenedor: '#CN-9823',
            viajeId: {
              _id: new Types.ObjectId(),
              buqueId: { nombre: 'Maersk Horizon' },
            },
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

    const res = await service.procesarInspeccionOptica(
      {
        codigoContenedor: '#CN-9823',
        dañosDetectados: true,
        estadoSello: 'sello_roto',
        confianza: 91,
      },
      undefined,
      undefined,
      {
        sub: String(operadorId),
        correo: 'operador@naviport.com',
        rol: RolUsuario.OPERADOR,
        nombre: 'Javier Mendoza',
      },
    );

    expect(res.codigoLeido).toBe('#CN-9823');
    expect(res.confianza).toBe(91);
    expect(res.dañosDetectados).toBe(true);
    expect(res.estadoSello).toBe('sello_roto');
    expect(res.buqueNombre).toBe('Maersk Horizon');
    expect(mockImagenModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        operadorId,
        buqueNombre: 'Maersk Horizon',
      }),
    );
    expect(mockRedisService.agregarAlerta).toHaveBeenCalledWith(
      'averia_detectada:#CN-9823',
    );
  });
});
