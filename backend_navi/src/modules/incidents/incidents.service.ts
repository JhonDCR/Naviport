import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import {
  Imagen,
  ImagenDocument,
  Incidente,
  IncidenteDocument,
  Viaje,
  ViajeDocument,
} from '../../database/schemas';
import { RedisService } from '../../redis/redis.service';
import { CreateIncidenteDto } from './dto/create-incidente.dto';

export interface EvidenciaArchivo {
  originalname: string;
  buffer?: Buffer;
}

@Injectable()
export class IncidentsService {
  constructor(
    @InjectModel(Incidente.name)
    private readonly incidenteModel: Model<IncidenteDocument>,
    @InjectModel(Viaje.name)
    private readonly viajeModel: Model<ViajeDocument>,
    @InjectModel(Imagen.name)
    private readonly imagenModel: Model<ImagenDocument>,
    private readonly redisService: RedisService,
  ) {}

  async reportarIncidente(
    dto: CreateIncidenteDto,
    operadorId: string,
    archivo?: EvidenciaArchivo,
  ) {
    const nuevoIncidente = await this.incidenteModel.create({
      viajeId: new Types.ObjectId(dto.viajeId),
      buqueId: new Types.ObjectId(dto.buqueId),
      operadorId: new Types.ObjectId(operadorId),
      tipo: dto.tipo,
      descripcion: dto.descripcion,
      gravedad: dto.gravedad,
      fecha: new Date(),
    });

    let evidenciaImagen: { id: string; rutaArchivo: string } | null = null;
    if (archivo || dto.codigoContenedor) {
      const safeName = (archivo?.originalname ?? 'evidencia-incidente.jpg').replace(
        /[^a-zA-Z0-9._-]/g,
        '_',
      );
      const fileName = `${Date.now()}-${safeName}`;
      const rutaArchivo = `/uploads/incidents/${fileName}`;

      if (archivo?.buffer) {
        const dir = join(process.cwd(), 'uploads', 'incidents');
        await mkdir(dir, { recursive: true });
        await writeFile(join(dir, fileName), archivo.buffer);
      }

      const imgDoc = await this.imagenModel.create({
        entidadId: new Types.ObjectId(String(nuevoIncidente._id)),
        tipoEntidad: 'incidente',
        rutaArchivo,
        resultadoIA: {
          codigoLeido: dto.codigoContenedor ?? 'INCIDENTE-PUERTO',
          dañosDetectados: dto.tipo === 'averia',
          confianza: 90,
        },
      });

      evidenciaImagen = {
        id: String(imgDoc._id),
        rutaArchivo: imgDoc.rutaArchivo,
      };
    }

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

    const plainIncidente =
      typeof nuevoIncidente.toObject === 'function'
        ? (nuevoIncidente.toObject() as unknown as Record<string, unknown>)
        : (nuevoIncidente as unknown as Record<string, unknown>);

    return {
      ...plainIncidente,
      evidenciaImagen,
    };
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
