import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Incidente,
  IncidenteDocument,
  Viaje,
  ViajeDocument,
} from '../../database/schemas';
import { RedisService } from '../../redis/redis.service';
import { CreateIncidenteDto } from './dto/create-incidente.dto';

@Injectable()
export class IncidentsService {
  constructor(
    @InjectModel(Incidente.name)
    private readonly incidenteModel: Model<IncidenteDocument>,
    @InjectModel(Viaje.name)
    private readonly viajeModel: Model<ViajeDocument>,
    private readonly redisService: RedisService,
  ) {}

  async reportarIncidente(dto: CreateIncidenteDto, operadorId: string) {
    const nuevoIncidente = await this.incidenteModel.create({
      viajeId: new Types.ObjectId(dto.viajeId),
      buqueId: new Types.ObjectId(dto.buqueId),
      operadorId: new Types.ObjectId(operadorId),
      tipo: dto.tipo,
      descripcion: dto.descripcion,
      gravedad: dto.gravedad,
      fecha: new Date(),
    });

    const viaje = await this.viajeModel.findById(dto.viajeId).exec();
    const refViaje = viaje?.codigo ?? dto.viajeId;

    if (dto.tipo === 'retraso' || dto.gravedad === 'alta') {
      if (viaje && viaje.estado !== 'finalizado') {
        viaje.estado = 'retrasado';
        await viaje.save();
      }
      await this.redisService.agregarAlerta(`viaje_retrasado:${refViaje}`);
    } else {
      await this.redisService.agregarAlerta(
        `incidente_${dto.tipo}:${refViaje}`,
      );
    }

    await this.redisService.invalidarKpiResumen();

    return nuevoIncidente;
  }

  async listarIncidentes() {
    return this.incidenteModel
      .find()
      .populate('viajeId')
      .populate('buqueId')
      .populate('operadorId', '-password_hash')
      .sort({ fecha: -1 })
      .lean()
      .exec();
  }
}
