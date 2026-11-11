import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PuertoDocument = HydratedDocument<Puerto>;

@Schema({ _id: false })
export class GeoPoint {
  @Prop({ type: String, enum: ['Point'], default: 'Point' })
  type: 'Point';

  @Prop({ type: [Number], required: true })
  coordinates: [number, number];
}

@Schema({ collection: 'puertos', timestamps: true })
export class Puerto {
  @Prop({ required: true, trim: true })
  nombre: string;

  @Prop({ required: true, trim: true })
  pais: string;

  @Prop({ required: true, trim: true })
  ciudad: string;

  @Prop({ type: GeoPoint, required: true })
  ubicacion: GeoPoint;
}

export const PuertoSchema = SchemaFactory.createForClass(Puerto);
PuertoSchema.index({ ubicacion: '2dsphere' });
