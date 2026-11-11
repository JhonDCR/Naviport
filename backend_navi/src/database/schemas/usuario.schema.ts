import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { RolUsuario } from '../../common/enums/rol.enum';

export type UsuarioDocument = HydratedDocument<Usuario>;

@Schema({ _id: false })
export class DetallesPerfil {
  @Prop()
  empresa?: string;

  @Prop()
  ruc?: string;

  @Prop()
  turno?: string;

  @Prop()
  idEmpleado?: string;
}

@Schema({ _id: false })
export class PreferenciasUsuario {
  @Prop({ default: true })
  notificacionesPush: boolean;

  @Prop({ default: false })
  modoOscuro: boolean;
}

@Schema({ collection: 'usuarios', timestamps: true })
export class Usuario {
  @Prop({ required: true, trim: true })
  nombre: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  correo: string;

  @Prop({ required: true })
  password_hash: string;

  @Prop({
    required: true,
    type: String,
    enum: Object.values(RolUsuario),
    default: RolUsuario.CLIENTE,
  })
  rol: RolUsuario;

  @Prop({ type: DetallesPerfil, default: () => ({}) })
  detallesPerfil: DetallesPerfil;

  @Prop({
    type: PreferenciasUsuario,
    default: () => ({ notificacionesPush: true, modoOscuro: false }),
  })
  preferencias: PreferenciasUsuario;

  @Prop({ default: true })
  activo: boolean;
}

export const UsuarioSchema = SchemaFactory.createForClass(Usuario);
