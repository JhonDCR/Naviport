import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type CargaDocument = HydratedDocument<Carga>;

export type TipoCarga = 'Seco' | 'Refrigerado';

@Schema({ _id: false })
export class EventoTimeline {
  @Prop({ required: true })
  estado: string;

  @Prop({ required: true })
  fecha: Date;

  @Prop({ required: true })
  ubicacion: string;

  @Prop()
  descripcion?: string;

  @Prop({ type: Types.ObjectId, ref: 'Usuario' })
  registradoPor?: Types.ObjectId;

  @Prop({ default: true })
  completado?: boolean;
}

@Schema({ _id: false })
export class ManifiestoAduanero {
  @Prop({ required: true })
  numeroDocumento: string;

  @Prop({ default: () => new Date() })
  fechaEmision: Date;

  @Prop({ default: '8471.30.00.00' })
  partidaArancelaria: string;

  @Prop({
    type: String,
    enum: ['pendiente', 'declarado', 'liberado'],
    default: 'declarado',
  })
  estadoAduana: 'pendiente' | 'declarado' | 'liberado';
}

@Schema({ collection: 'cargas', timestamps: true })
export class Carga {
  @Prop({ type: Types.ObjectId, ref: 'Viaje', required: true, index: true })
  viajeId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Usuario', required: true, index: true })
  clienteId: Types.ObjectId;

  @Prop({ required: true, unique: true, trim: true, index: true })
  codigoContenedor: string;

  @Prop({
    required: true,
    type: String,
    enum: ['Seco', 'Refrigerado'],
    default: 'Seco',
  })
  tipo: TipoCarga;

  @Prop({ required: true, min: 0 })
  pesoToneladas: number;

  @Prop({ trim: true })
  numeroPrecinto?: string;

  @Prop({ default: 0, min: 0 })
  valorFleteUSD: number;

  @Prop({ type: ManifiestoAduanero })
  manifiestoAduanero?: ManifiestoAduanero;

  @Prop({ type: [EventoTimeline], default: [] })
  historialEventos: EventoTimeline[];
}

export const CargaSchema = SchemaFactory.createForClass(Carga);
CargaSchema.index({ clienteId: 1, viajeId: 1 });
