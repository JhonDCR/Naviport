import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types } from 'mongoose';
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
import { InspeccionOpticaDto } from './dto/scanner.dto';

interface PopulatedViaje {
  origenId?: { ciudad: string; pais: string };
  destinoId?: { ciudad: string; pais: string };
  fechas?: { llegadaEstimada?: Date };
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
  ) {}

  async procesarInspeccionOptica(
    dto: InspeccionOpticaDto,
    nombreArchivo?: string,
  ) {
    const codigoObjetivo = dto.codigoContenedor ?? '#CN-9823';

    const carga = await this.cargaModel
      .findOne({ codigoContenedor: codigoObjetivo })
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

    const rutaArchivo = nombreArchivo
      ? `/uploads/scans/${Date.now()}-${nombreArchivo}`
      : `/uploads/scans/${Date.now()}-scan-cn9823.jpg`;

    const resultadoIA = {
      codigoLeido: carga?.codigoContenedor ?? codigoObjetivo,
      dañosDetectados: false,
      confianza: 85,
    };

    const nuevaImagen = await this.imagenModel.create({
      entidadId,
      tipoEntidad: 'carga',
      rutaArchivo,
      resultadoIA,
    });

    const viajePop = carga?.viajeId as unknown as PopulatedViaje | undefined;
    const origen = viajePop?.origenId
      ? `${viajePop.origenId.ciudad} (${viajePop.origenId.pais})`
      : 'Shanghai (CHN)';
    const destino = viajePop?.destinoId
      ? `${viajePop.destinoId.ciudad} (${viajePop.destinoId.pais})`
      : 'Guayaquil (ECU)';

    return {
      codigoLeido: resultadoIA.codigoLeido,
      dañosDetectados: resultadoIA.dañosDetectados,
      confianza: resultadoIA.confianza,
      origen,
      destino,
      estadoRuta: 'En Tránsito - Océano Pacífico',
      fechaEstimada: '6 días (18 Octubre)',
      imagenId: String(nuevaImagen._id),
    };
  }
}
