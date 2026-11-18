import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ImagenDocument = HydratedDocument<Imagen>;

export type TipoEntidadImagen = 'incidente' | 'carga';
export type EstadoSelloIA = 'ok' | 'sello_roto' | 'averia';

@Schema({ _id: false })
export class ResultadoIA {
  @Prop({ required: true })
  codigoLeido: string;

  @Prop({ default: false })
  dañosDetectados: boolean;

  @Prop({ required: true, min: 0, max: 100 })
  confianza: number;

  @Prop({
    type: String,
    enum: ['ok', 'sello_roto', 'averia'],
    default: 'ok',
  })
  estadoSello?: EstadoSelloIA;
}

@Schema({ collection: 'imagenes', timestamps: true })
export class Imagen {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  entidadId: Types.ObjectId;

  @Prop({
    required: true,
    type: String,
    enum: ['incidente', 'carga'],
  })
  tipoEntidad: TipoEntidadImagen;

  @Prop({ type: Types.ObjectId, ref: 'Usuario', index: true })
  operadorId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Viaje' })
  viajeId?: Types.ObjectId;

  @Prop({ trim: true })
  buqueNombre?: string;

  @Prop({ trim: true })
  observaciones?: string;

  @Prop({ required: true })
  rutaArchivo: string;

  @Prop({ type: ResultadoIA, required: true })
  resultadoIA: ResultadoIA;
}

export const ImagenSchema = SchemaFactory.createForClass(Imagen);
ImagenSchema.index({ operadorId: 1, createdAt: -1 });
