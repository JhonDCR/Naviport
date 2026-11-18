import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { GeoPoint } from './puerto.schema';

export type ViajeDocument = HydratedDocument<Viaje>;

export type EstadoViaje = 'programado' | 'en_ruta' | 'finalizado' | 'retrasado';

@Schema({ _id: false })
export class FechasViaje {
  @Prop({ required: true })
  salida: Date;

  @Prop({ required: true })
  llegadaEstimada: Date;

  @Prop()
  llegadaReal?: Date;
}

@Schema({ _id: false })
export class ResumenCargaViaje {
  @Prop({ default: 0 })
  contenedores: number;

  @Prop({ default: 0 })
  toneladas: number;
}

@Schema({ _id: false })
export class FinanzasViaje {
  @Prop({ default: 0, min: 0 })
  ingresosEstimadosUSD: number;

  @Prop({ default: 0, min: 0 })
  costoOperativoUSD: number;
}

@Schema({ collection: 'viajes', timestamps: true })
export class Viaje {
  @Prop({ required: true, unique: true, trim: true, index: true })
  codigo: string;

  @Prop({ type: Types.ObjectId, ref: 'Buque', required: true })
  buqueId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Puerto', required: true })
  origenId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Puerto', required: true })
  destinoId: Types.ObjectId;

  @Prop({ type: FechasViaje, required: true })
  fechas: FechasViaje;

  @Prop({
    required: true,
    type: String,
    enum: ['programado', 'en_ruta', 'finalizado', 'retrasado'],
    default: 'programado',
  })
  estado: EstadoViaje;

  @Prop({ type: GeoPoint, required: true })
  ultimaPosicion: GeoPoint;

  @Prop({ default: 21.4, min: 0 })
  velocidadNudos: number;

  @Prop({ trim: true })
  capitanAsignado?: string;

  @Prop({
    type: ResumenCargaViaje,
    default: () => ({ contenedores: 0, toneladas: 0 }),
  })
  resumenCarga: ResumenCargaViaje;

  @Prop({
    type: FinanzasViaje,
    default: () => ({ ingresosEstimadosUSD: 0, costoOperativoUSD: 0 }),
  })
  finanzas: FinanzasViaje;
}

export const ViajeSchema = SchemaFactory.createForClass(Viaje);
ViajeSchema.index({ estado: 1, 'fechas.salida': -1 });
