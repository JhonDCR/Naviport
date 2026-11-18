import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types } from 'mongoose';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import {
  Buque,
  BuqueDocument,
  Carga,
  CargaDocument,
  EstadoSelloIA,
  Imagen,
  ImagenDocument,
  Puerto,
  PuertoDocument,
  Turno,
  TurnoDocument,
  Viaje,
  ViajeDocument,
} from '../../database/schemas';
import { RedisService } from '../../redis/redis.service';
import { InspeccionOpticaDto } from './dto/scanner.dto';
import { JwtPayload } from '../../common/interfaces/api-response.interface';
import { RolUsuario } from '../../common/enums/rol.enum';

interface PopulatedViaje {
  _id?: Types.ObjectId;
  buqueId?: { nombre: string };
  origenId?: { ciudad: string; pais: string };
  destinoId?: { ciudad: string; pais: string };
  fechas?: { llegadaEstimada?: Date };
  estado?: string;
}

interface ImagenWithTimestamps extends Imagen {
  _id: Types.ObjectId;
  createdAt?: Date;
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

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
    @InjectModel(Buque.name)
    private readonly buqueModel: Model<BuqueDocument>,
    @InjectModel(Turno.name)
    private readonly turnoModel: Model<TurnoDocument>,
    private readonly redisService: RedisService,
  ) {}

  async procesarInspeccionOptica(
    dto: InspeccionOpticaDto,
    nombreArchivo?: string,
    fileBuffer?: Buffer,
    user?: JwtPayload,
    mimeType?: string,
  ) {
    if (fileBuffer && fileBuffer.length > MAX_IMAGE_BYTES) {
      throw new BadRequestException(
        'La imagen excede el tamaño máximo permitido de 5 MB',
      );
    }

    if (
      mimeType &&
      !['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(mimeType)
    ) {
      throw new BadRequestException(
        'Formato de imagen no válido. Solo se permiten JPEG, PNG o WEBP',
      );
    }

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
          { path: 'buqueId', model: this.buqueModel },
          { path: 'origenId', model: this.puertoModel },
          { path: 'destinoId', model: this.puertoModel },
        ],
      })
      .lean()
      .exec();

    const viajePop = carga?.viajeId as unknown as PopulatedViaje | undefined;

    const entidadId = carga?._id
      ? new Types.ObjectId(String(carga._id))
      : dto.viajeId && isValidObjectId(dto.viajeId)
        ? new Types.ObjectId(dto.viajeId)
        : new Types.ObjectId();

    const viajeIdObj = viajePop?._id
      ? new Types.ObjectId(String(viajePop._id))
      : dto.viajeId && isValidObjectId(dto.viajeId)
        ? new Types.ObjectId(dto.viajeId)
        : undefined;

    const buqueNombre = viajePop?.buqueId?.nombre ?? 'Maersk Horizon';

    const safeFileName = nombreArchivo
      ? `${Date.now()}-${nombreArchivo.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      : `${Date.now()}-scan-cn9823.jpg`;
    const rutaArchivo = `/uploads/scans/${safeFileName}`;

    if (fileBuffer) {
      const dir = join(process.cwd(), 'uploads', 'scans');
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, safeFileName), fileBuffer);
    }

    const dañosDetectados =
      dto.dañosDetectados ??
      dto.danosDetectados ??
      (dto.estadoSello === 'sello_roto' || dto.estadoSello === 'averia');
    const estadoSello: EstadoSelloIA =
      dto.estadoSello ?? (dañosDetectados ? 'sello_roto' : 'ok');

    const resultadoIA = {
      codigoLeido: carga?.codigoContenedor ?? codigoObjetivo,
      dañosDetectados,
      confianza: dto.confianza ?? 85,
      estadoSello,
    };

    const nuevaImagen = await this.imagenModel.create({
      entidadId,
      tipoEntidad: 'carga',
      operadorId:
        user?.sub && isValidObjectId(user.sub)
          ? new Types.ObjectId(user.sub)
          : undefined,
      viajeId: viajeIdObj,
      buqueNombre,
      observaciones: dto.observaciones?.trim(),
      rutaArchivo,
      resultadoIA,
    });

    if (resultadoIA.dañosDetectados) {
      await this.redisService.agregarAlerta(
        `averia_detectada:${resultadoIA.codigoLeido}`,
      );
    }

    if (user?.sub && isValidObjectId(user.sub)) {
      await this.turnoModel
        .findOneAndUpdate(
          { operadorId: new Types.ObjectId(user.sub), estado: 'activo' },
          { $inc: { escaneosRealizados: 1 } },
        )
        .exec();
    }

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
      estadoSello: resultadoIA.estadoSello,
      buqueNombre,
      observaciones: dto.observaciones?.trim() ?? null,
      origen,
      destino,
      estadoRuta,
      fechaEstimada,
      imagenId: String(nuevaImagen._id),
    };
  }

  private calcularTiempoRelativo(fecha: Date): string {
    const diffMs = Math.max(0, Date.now() - new Date(fecha).getTime());
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Hace unos segundos';
    if (mins < 60) return `Hace ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Hace ${hours} h`;
    const days = Math.floor(hours / 24);
    return `Hace ${days} d`;
  }

  async obtenerHistorialEscaneos(
    filtros?: {
      estado?: string;
      soloMios?: boolean;
      limit?: number;
      page?: number;
    },
    user?: JwtPayload,
  ) {
    const query: Record<string, unknown> = {};

    if (filtros?.soloMios && user?.sub && isValidObjectId(user.sub)) {
      query.operadorId = new Types.ObjectId(user.sub);
    }

    if (
      filtros?.estado &&
      ['ok', 'sello_roto', 'averia'].includes(filtros.estado)
    ) {
      query['resultadoIA.estadoSello'] = filtros.estado;
    }

    const limit = Math.min(100, Math.max(1, filtros?.limit ?? 25));
    const page = Math.max(1, filtros?.page ?? 1);
    const skip = (page - 1) * limit;

    const registros = (await this.imagenModel
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec()) as unknown as ImagenWithTimestamps[];

    return registros.map((reg) => {
      const fecha = reg.createdAt ?? new Date();
      const estadoSello =
        reg.resultadoIA.estadoSello ??
        (reg.resultadoIA.dañosDetectados ? 'sello_roto' : 'ok');
      const etiqueta =
        estadoSello === 'ok'
          ? 'OK'
          : estadoSello === 'sello_roto'
            ? 'Sello'
            : 'Avería';

      return {
        id: String(reg._id),
        entidadId: String(reg.entidadId),
        tipoEntidad: reg.tipoEntidad,
        operadorId: reg.operadorId ? String(reg.operadorId) : null,
        buqueNombre: reg.buqueNombre ?? 'Maersk Horizon',
        observaciones: reg.observaciones ?? null,
        rutaArchivo: reg.rutaArchivo,
        codigoLeido: reg.resultadoIA.codigoLeido,
        dañosDetectados: reg.resultadoIA.dañosDetectados,
        confianza: reg.resultadoIA.confianza,
        estadoSello,
        estadoVerificacion: etiqueta,
        fecha,
        tiempoRelativo: this.calcularTiempoRelativo(fecha),
      };
    });
  }

  async obtenerResumenOperador(user?: JwtPayload) {
    const inicioHoy = new Date();
    inicioHoy.setHours(0, 0, 0, 0);

    const filtroBase: Record<string, unknown> = {};
    if (
      user?.rol === RolUsuario.OPERADOR &&
      user.sub &&
      isValidObjectId(user.sub)
    ) {
      filtroBase.operadorId = new Types.ObjectId(user.sub);
    }

    const [escaneosHoyDb, totalEscaneos, ultimosRegistros] = await Promise.all([
      this.imagenModel
        .countDocuments({ ...filtroBase, createdAt: { $gte: inicioHoy } })
        .exec(),
      this.imagenModel.countDocuments(filtroBase).exec(),
      this.obtenerHistorialEscaneos(
        { soloMios: user?.rol === RolUsuario.OPERADOR, limit: 5 },
        user,
      ),
    ]);

    return {
      escaneosHoy: escaneosHoyDb,
      totalEscaneos,
      ultimosRegistros,
    };
  }
}

