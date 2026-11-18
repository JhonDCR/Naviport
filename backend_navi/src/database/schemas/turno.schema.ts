import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type TurnoDocument = HydratedDocument<Turno>;

export type EstadoTurno = 'activo' | 'finalizado';

@Schema({ collection: 'turnos', timestamps: true })
export class Turno {
  @Prop({ type: Types.ObjectId, ref: 'Usuario', required: true, index: true })
  operadorId: Types.ObjectId;

  @Prop({ default: 'Matutino', trim: true })
  tipoTurno: string;

  @Prop({ default: '08:00 - 16:00', trim: true })
  horarioAsignado: string;

  @Prop({ default: () => new Date() })
  fechaInicio: Date;

  @Prop()
  fechaFin?: Date;

  @Prop({
    type: String,
    enum: ['activo', 'finalizado'],
    default: 'activo',
  })
  estado: EstadoTurno;

  @Prop({ default: 0, min: 0 })
  escaneosRealizados: number;

  @Prop({ default: 0, min: 0 })
  incidentesReportados: number;

  @Prop({ trim: true })
  observacionesCierre?: string;
}

export const TurnoSchema = SchemaFactory.createForClass(Turno);
TurnoSchema.index({ operadorId: 1, estado: 1, fechaInicio: -1 });
