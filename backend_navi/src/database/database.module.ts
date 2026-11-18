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
  Notificacion,
  NotificacionSchema,
  TicketSoporte,
  TicketSoporteSchema,
  Turno,
  TurnoSchema,
  AuditoriaLog,
  AuditoriaLogSchema,
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
  { name: Notificacion.name, schema: NotificacionSchema },
  { name: TicketSoporte.name, schema: TicketSoporteSchema },
  { name: Turno.name, schema: TurnoSchema },
  { name: AuditoriaLog.name, schema: AuditoriaLogSchema },
];

@Global()
@Module({
  imports: [MongooseModule.forFeature(MODELS)],
  providers: [SeederService],
  exports: [MongooseModule],
})
export class DatabaseModule {}
