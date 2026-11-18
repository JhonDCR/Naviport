import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { SupportService } from './support.service';
import {
  AuditoriaLog,
  Notificacion,
  TicketSoporte,
} from '../../database/schemas';
import { RedisService } from '../../redis/redis.service';
import { RolUsuario } from '../../common/enums/rol.enum';

describe('SupportService', () => {
  let service: SupportService;

  const mockTicketModel = {
    countDocuments: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(2),
    }),
    create: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
  };

  const mockNotificacionModel = {
    create: jest.fn().mockResolvedValue({}),
  };

  const mockAuditoriaLogModel = {
    create: jest.fn().mockResolvedValue({}),
  };

  const mockRedisService = {
    registrarAuditoria: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupportService,
        {
          provide: getModelToken(TicketSoporte.name),
          useValue: mockTicketModel,
        },
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

    service = module.get<SupportService>(SupportService);
  });

  it('should create support ticket, notify target role and record audit log', async () => {
    const userId = new Types.ObjectId();
    const ticketId = new Types.ObjectId();

    mockTicketModel.create.mockResolvedValue({
      _id: ticketId,
      codigo: 'TKT-2026-003',
      usuarioId: userId,
      tipo: 'agente_aduanas',
      asunto: 'Consulta de aduana',
      estado: 'abierto',
    });

    const ticket = await service.crearTicket(
      {
        sub: String(userId),
        correo: 'contacto@garyindustries.com',
        rol: RolUsuario.CLIENTE,
        nombre: 'Gary Industries',
      },
      {
        tipo: 'agente_aduanas',
        asunto: 'Consulta de aduana',
        mensaje: 'Requerimos confirmar documentos previos al arribo en puerto.',
        codigoContenedor: '#CN-9823',
        prioridad: 'alta',
      },
    );

    expect(ticket.codigo).toBe('TKT-2026-003');
    expect(mockNotificacionModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        rolDestino: 'gerente',
        tipo: 'soporte',
      }),
    );
    expect(mockAuditoriaLogModel.create).toHaveBeenCalled();
  });

  it('should respond to ticket and notify requesting user', async () => {
    const ticketId = new Types.ObjectId();
    const requesterId = new Types.ObjectId();
    const adminId = new Types.ObjectId();
    const mockSave = jest.fn().mockResolvedValue(true);

    mockTicketModel.findById
      .mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue({
          _id: ticketId,
          codigo: 'TKT-2026-001',
          usuarioId: requesterId,
          codigoContenedor: '#CN-9823',
          estado: 'abierto',
          save: mockSave,
        }),
      })
      .mockReturnValueOnce({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            lean: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue({
                _id: ticketId,
                codigo: 'TKT-2026-001',
                estado: 'resuelto',
                respuesta: 'Manifiesto validado en ECUAPASS.',
              }),
            }),
          }),
        }),
      });

    const updated = await service.responderTicket(
      String(ticketId),
      {
        respuesta: 'Manifiesto validado en ECUAPASS.',
        estado: 'resuelto',
      },
      {
        sub: String(adminId),
        correo: 'admin@naviport.com',
        rol: RolUsuario.ADMIN,
        nombre: 'Admin',
      },
    );

    expect(updated?.estado).toBe('resuelto');
    expect(mockNotificacionModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        usuarioId: requesterId,
        tipo: 'soporte',
      }),
    );
  });
});
