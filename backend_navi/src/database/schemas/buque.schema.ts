import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type BuqueDocument = HydratedDocument<Buque>;

export type EstadoBuque = 'activo' | 'mantenimiento' | 'inactivo';

@Schema({ collection: 'buques', timestamps: true })
export class Buque {
  @Prop({ required: true, trim: true })
  nombre: string;

  @Prop({ required: true, unique: true, trim: true, index: true })
  imo: string;

  @Prop({ required: true, trim: true })
  tipo: string;

  @Prop({ required: true, min: 0 })
  capacidadToneladas: number;

  @Prop({ required: true, trim: true })
  bandera: string;

  @Prop({
    required: true,
    type: String,
    enum: ['activo', 'mantenimiento', 'inactivo'],
    default: 'activo',
  })
  estado: EstadoBuque;
}

export const BuqueSchema = SchemaFactory.createForClass(Buque);
