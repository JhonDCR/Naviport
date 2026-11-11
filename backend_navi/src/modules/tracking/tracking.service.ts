import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types } from 'mongoose';
import {
  Buque,
  BuqueDocument,
  Carga,
  CargaDocument,
  Puerto,
  PuertoDocument,
  Viaje,
  ViajeDocument,
} from '../../database/schemas';
import { RolUsuario } from '../../common/enums/rol.enum';
import { JwtPayload } from '../../common/interfaces/api-response.interface';

interface PopulatedViaje {
  _id: Types.ObjectId;
  codigo: string;
  buqueId?: { nombre: string };
  origenId?: { ciudad: string; nombre: string; pais: string };
  destinoId?: { ciudad: string; nombre: string; pais: string };
  fechas: {
    salida: Date;
    llegadaEstimada: Date;
    llegadaReal?: Date;
  };
  estado: string;
}

@Injectable()
export class TrackingService {
  constructor(
    @InjectModel(Carga.name)
    private readonly cargaModel: Model<CargaDocument>,
    @InjectModel(Viaje.name)
    private readonly viajeModel: Model<ViajeDocument>,
    @InjectModel(Buque.name)
    private readonly buqueModel: Model<BuqueDocument>,
    @InjectModel(Puerto.name)
    private readonly puertoModel: Model<PuertoDocument>,
  ) {}

  async obtenerMisCargas(user: JwtPayload, estadoFiltro?: string) {
    const query: Record<string, unknown> = {};
    if (user.rol === RolUsuario.CLIENTE && isValidObjectId(user.sub)) {
      query.clienteId = new Types.ObjectId(user.sub);
    }

    const cargas = await this.cargaModel
      .find(query)
      .populate({
        path: 'viajeId',
        populate: [
          { path: 'buqueId', model: this.buqueModel },
          { path: 'origenId', model: this.puertoModel },
          { path: 'destinoId', model: this.puertoModel },
        ],
      })
      .lean()
      .exec();

    const resultado = cargas.map((c) => {
      const viajePop = c.viajeId as unknown as PopulatedViaje | null;
      const llegadaEstimada = viajePop?.fechas?.llegadaEstimada
        ? new Date(viajePop.fechas.llegadaEstimada)
        : new Date();
      const diffMs = llegadaEstimada.getTime() - Date.now();
      const diasRestantes = Math.max(
        0,
        Math.ceil(diffMs / (1000 * 60 * 60 * 24)),
      );

      const origenStr = viajePop?.origenId
        ? `${viajePop.origenId.ciudad} (${viajePop.origenId.nombre} - ${viajePop.origenId.pais})`
        : 'N/A';
      const destinoStr = viajePop?.destinoId
        ? `${viajePop.destinoId.ciudad} (${viajePop.destinoId.nombre} - ${viajePop.destinoId.pais})`
        : 'N/A';

      return {
        id: String(c._id),
        codigoContenedor: c.codigoContenedor,
        tipo: c.tipo,
        pesoToneladas: c.pesoToneladas,
        viaje: {
          codigo: viajePop?.codigo ?? 'N/A',
          buque: viajePop?.buqueId?.nombre ?? 'N/A',
          origen: origenStr,
          destino: destinoStr,
          salida: viajePop?.fechas?.salida ?? null,
          llegadaEstimada: viajePop?.fechas?.llegadaEstimada ?? null,
          estado: viajePop?.estado ?? 'en_ruta',
          diasRestantes,
        },
      };
    });

    if (estadoFiltro === 'completados') {
      return resultado.filter((item) => item.viaje.estado === 'finalizado');
    }
    if (estadoFiltro === 'en_curso') {
      return resultado.filter((item) => item.viaje.estado !== 'finalizado');
    }
    return resultado;
  }

  async obtenerTimeline(idOrCodigo: string) {
    let carga: Carga | null = null;

    if (isValidObjectId(idOrCodigo)) {
      carga = await this.cargaModel.findById(idOrCodigo).lean().exec();
    }

    if (!carga) {
      const normalized = idOrCodigo.startsWith('#')
        ? idOrCodigo
        : `#${idOrCodigo}`;
      carga = await this.cargaModel
        .findOne({
          codigoContenedor: { $in: [idOrCodigo, normalized] },
        })
        .lean()
        .exec();
    }

    if (!carga) {
      throw new NotFoundException('Contenedor o carga no encontrada');
    }

    return {
      codigoContenedor: carga.codigoContenedor,
      eventos: carga.historialEventos.map((ev) => ({
        estado: ev.estado,
        fecha: ev.fecha,
        ubicacion: ev.ubicacion,
        completado: ev.completado ?? true,
      })),
    };
  }

  async listarViajes() {
    return this.viajeModel
      .find()
      .populate('buqueId')
      .populate('origenId')
      .populate('destinoId')
      .lean()
      .exec();
  }
}
