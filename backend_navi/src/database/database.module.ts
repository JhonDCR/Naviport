import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Usuario,
  UsuarioSchema,
  Puerto,
  PuertoSchema,
  Buque,
  BuqueSchema,
  Viaje,
  ViajeSchema,
  Carga,
  CargaSchema,
  Incidente,
  IncidenteSchema,
  Imagen,
  ImagenSchema,
  Mantenimiento,
  MantenimientoSchema,
} from './schemas';
import { SeederService } from './seeder.service';

const MODELS = [
  { name: Usuario.name, schema: UsuarioSchema },
  { name: Puerto.name, schema: PuertoSchema },
  { name: Buque.name, schema: BuqueSchema },
  { name: Viaje.name, schema: ViajeSchema },
  { name: Carga.name, schema: CargaSchema },
  { name: Incidente.name, schema: IncidenteSchema },
  { name: Imagen.name, schema: ImagenSchema },
  { name: Mantenimiento.name, schema: MantenimientoSchema },
];

@Global()
@Module({
  imports: [MongooseModule.forFeature(MODELS)],
  providers: [SeederService],
  exports: [MongooseModule],
})
export class DatabaseModule {}
