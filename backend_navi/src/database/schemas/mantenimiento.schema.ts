import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type MantenimientoDocument = HydratedDocument<Mantenimiento>;

export type TipoMantenimiento = 'preventivo' | 'correctivo';
export type EstadoMantenimiento = 'pendiente' | 'completado';

@Schema({ _id: false })
export class FechasMantenimiento {
  @Prop({ required: true })
  programada: Date;

  @Prop()
  real?: Date;
}

@Schema({ collection: 'mantenimientos', timestamps: true })
export class Mantenimiento {
  @Prop({ type: Types.ObjectId, ref: 'Buque', required: true, index: true })
  buqueId: Types.ObjectId;

  @Prop({
    required: true,
    type: String,
    enum: ['preventivo', 'correctivo'],
  })
  tipo: TipoMantenimiento;

  @Prop({ type: FechasMantenimiento, required: true })
  fechas: FechasMantenimiento;

  @Prop({
    required: true,
    type: String,
    enum: ['pendiente', 'completado'],
    default: 'pendiente',
  })
  estado: EstadoMantenimiento;
}

export const MantenimientoSchema = SchemaFactory.createForClass(Mantenimiento);
