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

  @Prop({ default: true })
  completado?: boolean;
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

  @Prop({ type: [EventoTimeline], default: [] })
  historialEventos: EventoTimeline[];
}

export const CargaSchema = SchemaFactory.createForClass(Carga);
