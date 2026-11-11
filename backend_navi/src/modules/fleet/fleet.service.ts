import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Buque,
  BuqueDocument,
  Mantenimiento,
  MantenimientoDocument,
  Puerto,
  PuertoDocument,
} from '../../database/schemas';
import { RedisService } from '../../redis/redis.service';
import {
  CreateBuqueDto,
  CreateMantenimientoDto,
  CreatePuertoDto,
} from './dto/fleet.dto';

@Injectable()
export class FleetService {
  constructor(
    @InjectModel(Buque.name)
    private readonly buqueModel: Model<BuqueDocument>,
    @InjectModel(Puerto.name)
    private readonly puertoModel: Model<PuertoDocument>,
    @InjectModel(Mantenimiento.name)
    private readonly mantenimientoModel: Model<MantenimientoDocument>,
    private readonly redisService: RedisService,
  ) {}

  async listarBuques() {
    return this.buqueModel.find().lean().exec();
  }

  async crearBuque(dto: CreateBuqueDto) {
    const buque = await this.buqueModel.create(dto);
    await this.redisService.invalidarKpiResumen();
    return buque;
  }

  async listarPuertos() {
    return this.puertoModel.find().lean().exec();
  }

  async crearPuerto(dto: CreatePuertoDto) {
    return this.puertoModel.create({
      nombre: dto.nombre,
      pais: dto.pais,
      ciudad: dto.ciudad,
      ubicacion: {
        type: 'Point',
        coordinates: dto.coordenadas,
      },
    });
  }

  async listarMantenimientos() {
    return this.mantenimientoModel.find().populate('buqueId').lean().exec();
  }

  async programarMantenimiento(dto: CreateMantenimientoDto) {
    const mant = await this.mantenimientoModel.create({
      buqueId: new Types.ObjectId(dto.buqueId),
      tipo: dto.tipo,
      fechas: {
        programada: new Date(dto.fechaProgramada),
      },
      estado: 'pendiente',
    });

    const buque = await this.buqueModel.findById(dto.buqueId).lean().exec();
    if (buque && new Date(dto.fechaProgramada).getTime() < Date.now()) {
      await this.redisService.agregarAlerta(
        `mantenimiento_vencido:${buque.imo}`,
      );
    }

    return mant;
  }
}
