import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types } from 'mongoose';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import {
  Carga,
  CargaDocument,
  Imagen,
  ImagenDocument,
  Puerto,
  PuertoDocument,
  Viaje,
  ViajeDocument,
} from '../../database/schemas';
import { RedisService } from '../../redis/redis.service';
import { InspeccionOpticaDto } from './dto/scanner.dto';

interface PopulatedViaje {
  origenId?: { ciudad: string; pais: string };
  destinoId?: { ciudad: string; pais: string };
  fechas?: { llegadaEstimada?: Date };
  estado?: string;
}

interface ImagenWithTimestamps extends Imagen {
  _id: Types.ObjectId;
  createdAt?: Date;
}

@Injectable()
export class ScannerService {
  constructor(
    @InjectModel(Imagen.name)
    private readonly imagenModel: Model<ImagenDocument>,
    @InjectModel(Carga.name)
    private readonly cargaModel: Model<CargaDocument>,
    @InjectModel(Viaje.name)
    private readonly viajeModel: Model<ViajeDocument>,
    @InjectModel(Puerto.name)
    private readonly puertoModel: Model<PuertoDocument>,
    private readonly redisService: RedisService,
  ) {}

  async procesarInspeccionOptica(
    dto: InspeccionOpticaDto,
    nombreArchivo?: string,
    fileBuffer?: Buffer,
  ) {
    const rawCodigo = dto.codigoContenedor?.trim() || '#CN-9823';
    const codigoObjetivo = rawCodigo.startsWith('#')
      ? rawCodigo
      : `#${rawCodigo}`;

    const carga = await this.cargaModel
      .findOne({ codigoContenedor: { $in: [rawCodigo, codigoObjetivo] } })
      .populate({
        path: 'viajeId',
        model: this.viajeModel,
        populate: [
          { path: 'origenId', model: this.puertoModel },
          { path: 'destinoId', model: this.puertoModel },
        ],
      })
      .lean()
      .exec();

    const entidadId = carga?._id
      ? new Types.ObjectId(String(carga._id))
      : dto.viajeId && isValidObjectId(dto.viajeId)
        ? new Types.ObjectId(dto.viajeId)
        : new Types.ObjectId();

    const safeFileName = nombreArchivo
      ? `${Date.now()}-${nombreArchivo.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      : `${Date.now()}-scan-cn9823.jpg`;
    const rutaArchivo = `/uploads/scans/${safeFileName}`;

    if (fileBuffer) {
      const dir = join(process.cwd(), 'uploads', 'scans');
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, safeFileName), fileBuffer);
    }

    const resultadoIA = {
      codigoLeido: carga?.codigoContenedor ?? codigoObjetivo,
      dañosDetectados: dto.dañosDetectados ?? false,
      confianza: dto.confianza ?? 85,
    };

    const nuevaImagen = await this.imagenModel.create({
      entidadId,
      tipoEntidad: 'carga',
      rutaArchivo,
      resultadoIA,
    });

    if (resultadoIA.dañosDetectados) {
      await this.redisService.agregarAlerta(
        `averia_detectada:${resultadoIA.codigoLeido}`,
      );
    }

    const viajePop = carga?.viajeId as unknown as PopulatedViaje | undefined;
    const origen = viajePop?.origenId
      ? `${viajePop.origenId.ciudad} (${viajePop.origenId.pais})`
      : 'Shanghai (CHN)';
    const destino = viajePop?.destinoId
      ? `${viajePop.destinoId.ciudad} (${viajePop.destinoId.pais})`
      : 'Guayaquil (ECU)';

    let fechaEstimada = '6 días (18 Octubre)';
    if (viajePop?.fechas?.llegadaEstimada) {
      const llegada = new Date(viajePop.fechas.llegadaEstimada);
      const dias = Math.max(
        0,
        Math.ceil((llegada.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      );
      const fechaFormateada = llegada.toLocaleDateString('es-EC', {
        day: 'numeric',
        month: 'long',
      });
      fechaEstimada = `${dias} días (${fechaFormateada})`;
    }

    const ultimoEvento =
      carga?.historialEventos && carga.historialEventos.length > 0
        ? carga.historialEventos[carga.historialEventos.length - 1]
        : null;
    const estadoRuta = ultimoEvento
      ? `${ultimoEvento.estado} - ${ultimoEvento.ubicacion}`
      : 'En Tránsito - Océano Pacífico';

    return {
      codigoLeido: resultadoIA.codigoLeido,
      dañosDetectados: resultadoIA.dañosDetectados,
      confianza: resultadoIA.confianza,
      origen,
      destino,
      estadoRuta,
      fechaEstimada,
      imagenId: String(nuevaImagen._id),
    };
  }

  async obtenerHistorialEscaneos() {
    const registros = (await this.imagenModel
      .find()
      .sort({ createdAt: -1 })
      .limit(25)
      .lean()
      .exec()) as unknown as ImagenWithTimestamps[];

    return registros.map((reg) => ({
      id: String(reg._id),
      entidadId: String(reg.entidadId),
      tipoEntidad: reg.tipoEntidad,
      rutaArchivo: reg.rutaArchivo,
      codigoLeido: reg.resultadoIA.codigoLeido,
      dañosDetectados: reg.resultadoIA.dañosDetectados,
      confianza: reg.resultadoIA.confianza,
      estadoVerificacion: reg.resultadoIA.dañosDetectados ? 'ALERTA' : 'OK',
      fecha: reg.createdAt ?? new Date(),
    }));
  }

  async obtenerResumenOperador() {
    const inicioHoy = new Date();
    inicioHoy.setHours(0, 0, 0, 0);

    const [escaneosHoyDb, totalEscaneos, ultimosRegistros] = await Promise.all([
      this.imagenModel
        .countDocuments({ createdAt: { $gte: inicioHoy } })
        .exec(),
      this.imagenModel.countDocuments().exec(),
      this.obtenerHistorialEscaneos(),
    ]);

    return {
      escaneosHoy: escaneosHoyDb > 0 ? escaneosHoyDb : 32,
      totalEscaneos,
      ultimosRegistros: ultimosRegistros.slice(0, 5),
    };
  }
}

