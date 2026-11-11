import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import {
  Usuario,
  UsuarioDocument,
  Puerto,
  PuertoDocument,
  Buque,
  BuqueDocument,
  Viaje,
  ViajeDocument,
  Carga,
  CargaDocument,
  Incidente,
  IncidenteDocument,
  Mantenimiento,
  MantenimientoDocument,
} from './schemas';
import { RolUsuario } from '../common/enums/rol.enum';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class SeederService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeederService.name);

  constructor(
    @InjectModel(Usuario.name)
    private readonly usuarioModel: Model<UsuarioDocument>,
    @InjectModel(Puerto.name)
    private readonly puertoModel: Model<PuertoDocument>,
    @InjectModel(Buque.name)
    private readonly buqueModel: Model<BuqueDocument>,
    @InjectModel(Viaje.name)
    private readonly viajeModel: Model<ViajeDocument>,
    @InjectModel(Carga.name)
    private readonly cargaModel: Model<CargaDocument>,
    @InjectModel(Incidente.name)
    private readonly incidenteModel: Model<IncidenteDocument>,
    @InjectModel(Mantenimiento.name)
    private readonly mantenimientoModel: Model<MantenimientoDocument>,
    private readonly redisService: RedisService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      const count = await this.usuarioModel.countDocuments().exec();
      if (count > 0) {
        await this.sincronizarAlertasRedis();
        return;
      }

      this.logger.log('Inicializando datos semilla de NaviPort (OceanTrack)...');
      const passwordHash = await bcrypt.hash('naviport123', 10);

      // 1. Usuarios (4 roles)
      const [cliente, operador] = await this.usuarioModel.insertMany([
        {
          nombre: 'Gary Industries',
          correo: 'contacto@garyindustries.com',
          password_hash: passwordHash,
          rol: RolUsuario.CLIENTE,
          detallesPerfil: {
            empresa: 'Gary Industries',
            ruc: '0992345678001',
          },
          preferencias: { notificacionesPush: true, modoOscuro: false },
          activo: true,
        },
        {
          nombre: 'Javier Mendoza',
          correo: 'operador@naviport.com',
          password_hash: passwordHash,
          rol: RolUsuario.OPERADOR,
          detallesPerfil: {
            turno: 'Matutino',
            idEmpleado: 'OP-4021',
          },
          preferencias: { notificacionesPush: true, modoOscuro: false },
          activo: true,
        },
        {
          nombre: 'Elena Vásquez',
          correo: 'gerente@naviport.com',
          password_hash: passwordHash,
          rol: RolUsuario.GERENTE,
          detallesPerfil: {},
          preferencias: { notificacionesPush: true, modoOscuro: true },
          activo: true,
        },
        {
          nombre: 'Administrador NaviPort',
          correo: 'admin@naviport.com',
          password_hash: passwordHash,
          rol: RolUsuario.ADMIN,
          detallesPerfil: {},
          preferencias: { notificacionesPush: true, modoOscuro: true },
          activo: true,
        },
      ]);

      // 2. Puertos (Shanghai, Miami, Guayaquil)
      const [shanghai, miami, guayaquil] = await this.puertoModel.insertMany([
        {
          nombre: 'Terminal Yangshan',
          pais: 'CHN',
          ciudad: 'Shanghai',
          ubicacion: { type: 'Point', coordinates: [122.065, 30.626] },
        },
        {
          nombre: 'PortMiami Terminal',
          pais: 'USA',
          ciudad: 'Miami',
          ubicacion: { type: 'Point', coordinates: [-80.17, 25.774] },
        },
        {
          nombre: 'Puerto Marítimo de Guayaquil',
          pais: 'ECU',
          ciudad: 'Guayaquil',
          ubicacion: { type: 'Point', coordinates: [-79.9, -2.28] },
        },
      ]);

      // 3. Buques
      const [maersk, pacificStar] = await this.buqueModel.insertMany([
        {
          nombre: 'Maersk Horizon',
          imo: 'IMO-9812345',
          tipo: 'Portacontenedores',
          capacidadToneladas: 45000,
          bandera: 'Panamá',
          estado: 'activo',
        },
        {
          nombre: 'Pacific Star II',
          imo: 'IMO-9876543',
          tipo: 'Portacontenedores',
          capacidadToneladas: 38000,
          bandera: 'Liberia',
          estado: 'mantenimiento',
        },
      ]);

      // 4. Viajes
      const [viajePrincipal, viajeRetrasado] = await this.viajeModel.insertMany([
        {
          codigo: '#BU-1234XYZ',
          buqueId: maersk._id,
          origenId: shanghai._id,
          destinoId: guayaquil._id,
          fechas: {
            salida: new Date('2026-10-01T08:00:00.000Z'),
            llegadaEstimada: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          },
          estado: 'en_ruta',
          ultimaPosicion: { type: 'Point', coordinates: [-110.5, 8.2] },
          resumenCarga: {
            contenedores: 120,
            toneladas: 2400,
          },
        },
        {
          codigo: 'V-2026-014',
          buqueId: pacificStar._id,
          origenId: miami._id,
          destinoId: guayaquil._id,
          fechas: {
            salida: new Date('2026-10-15T10:00:00.000Z'),
            llegadaEstimada: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          },
          estado: 'retrasado',
          ultimaPosicion: { type: 'Point', coordinates: [-79.5, 8.95] },
          resumenCarga: {
            contenedores: 85,
            toneladas: 1750,
          },
        },
      ]);

      // 5. Cargas
      await this.cargaModel.insertMany([
        {
          viajeId: viajePrincipal._id,
          clienteId: cliente._id,
          codigoContenedor: '#CN-9823',
          tipo: 'Seco',
          pesoToneladas: 24.5,
          historialEventos: [
            {
              estado: 'Recogido en fábrica',
              fecha: new Date('2026-09-28T10:00:00.000Z'),
              ubicacion: 'Suzhou, CHN',
              completado: true,
            },
            {
              estado: 'En patio de contenedores',
              fecha: new Date('2026-09-30T16:00:00.000Z'),
              ubicacion: 'Terminal Yangshan (CHN)',
              completado: true,
            },
            {
              estado: 'A bordo de buque',
              fecha: new Date('2026-10-01T08:00:00.000Z'),
              ubicacion: 'Maersk Horizon',
              completado: true,
            },
            {
              estado: 'En tránsito marítimo',
              fecha: new Date('2026-10-05T00:00:00.000Z'),
              ubicacion: 'Océano Pacífico',
              completado: true,
            },
            {
              estado: 'Desembarque en puerto',
              fecha: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
              ubicacion: 'Puerto Marítimo de Guayaquil (ECU)',
              completado: false,
            },
          ],
        },
        {
          viajeId: viajeRetrasado._id,
          clienteId: cliente._id,
          codigoContenedor: '#CN-7741',
          tipo: 'Refrigerado',
          pesoToneladas: 18.2,
          historialEventos: [
            {
              estado: 'En patio de contenedores',
              fecha: new Date('2026-10-14T12:00:00.000Z'),
              ubicacion: 'PortMiami Terminal (USA)',
              completado: true,
            },
            {
              estado: 'A bordo de buque',
              fecha: new Date('2026-10-15T10:00:00.000Z'),
              ubicacion: 'Pacific Star II',
              completado: true,
            },
          ],
        },
      ]);

      // 6. Incidentes y Mantenimientos
      await this.incidenteModel.create({
        viajeId: viajeRetrasado._id,
        buqueId: pacificStar._id,
        operadorId: operador._id,
        tipo: 'retraso',
        descripcion: 'Congestión en esclusas del Canal de Panamá',
        gravedad: 'alta',
        fecha: new Date(),
      });

      await this.mantenimientoModel.create({
        buqueId: pacificStar._id,
        tipo: 'preventivo',
        fechas: {
          programada: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        },
        estado: 'pendiente',
      });

      await this.sincronizarAlertasRedis();
      this.logger.log('Datos semilla de NaviPort insertados con éxito.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      this.logger.warn(`Seeder omitido (MongoDB aún no disponible): ${msg}`);
    }
  }

  private async sincronizarAlertasRedis(): Promise<void> {
    await this.redisService.agregarAlerta('viaje_retrasado:V-2026-014');
    await this.redisService.agregarAlerta('mantenimiento_vencido:IMO-9876543');
  }
}
