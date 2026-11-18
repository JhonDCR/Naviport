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
  Imagen,
  ImagenDocument,
  Mantenimiento,
  MantenimientoDocument,
  Notificacion,
  NotificacionDocument,
  TicketSoporte,
  TicketSoporteDocument,
  Turno,
  TurnoDocument,
  AuditoriaLog,
  AuditoriaLogDocument,
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
    @InjectModel(Imagen.name)
    private readonly imagenModel: Model<ImagenDocument>,
    @InjectModel(Mantenimiento.name)
    private readonly mantenimientoModel: Model<MantenimientoDocument>,
    @InjectModel(Notificacion.name)
    private readonly notificacionModel: Model<NotificacionDocument>,
    @InjectModel(TicketSoporte.name)
    private readonly ticketSoporteModel: Model<TicketSoporteDocument>,
    @InjectModel(Turno.name)
    private readonly turnoModel: Model<TurnoDocument>,
    @InjectModel(AuditoriaLog.name)
    private readonly auditoriaLogModel: Model<AuditoriaLogDocument>,
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
      const [cliente, operador, gerente, admin] =
        await this.usuarioModel.insertMany([
        {
          nombre: 'Gary Industries',
          correo: 'contacto@garyindustries.com',
          password_hash: passwordHash,
          rol: RolUsuario.CLIENTE,
          detallesPerfil: {
            empresa: 'Gary Industries',
            ruc: '0992345678001',
            direccionLegal: 'Av. 9 de Octubre 416, Guayaquil, Ecuador',
            telefono: '+593 4 256 7890',
          },
          preferencias: {
            notificacionesPush: true,
            modoOscuro: false,
            idioma: 'es',
          },
          activo: true,
        },
        {
          nombre: 'Javier Mendoza',
          correo: 'operador@naviport.com',
          password_hash: passwordHash,
          rol: RolUsuario.OPERADOR,
          detallesPerfil: {
            turno: 'Matutino',
            horarioTurno: '08:00 - 16:00',
            turnoActivo: true,
            idEmpleado: 'OP-4021',
          },
          preferencias: {
            notificacionesPush: true,
            modoOscuro: false,
            idioma: 'es',
          },
          activo: true,
        },
        {
          nombre: 'Elena Vásquez',
          correo: 'gerente@naviport.com',
          password_hash: passwordHash,
          rol: RolUsuario.GERENTE,
          detallesPerfil: {},
          preferencias: {
            notificacionesPush: true,
            modoOscuro: true,
            idioma: 'es',
          },
          activo: true,
        },
        {
          nombre: 'Administrador NaviPort',
          correo: 'admin@naviport.com',
          password_hash: passwordHash,
          rol: RolUsuario.ADMIN,
          detallesPerfil: {},
          preferencias: {
            notificacionesPush: true,
            modoOscuro: true,
            idioma: 'es',
          },
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
      const [maersk, pacificStar, mscIrina] = await this.buqueModel.insertMany([
        {
          nombre: 'Maersk Horizon',
          imo: 'IMO-9812345',
          tipo: 'Portacontenedores',
          capacidadToneladas: 45000,
          bandera: 'Panamá',
          capitan: 'Luis Andrade',
          estado: 'activo',
          estadoOperativo: 'en_ruta',
        },
        {
          nombre: 'Pacific Star II',
          imo: 'IMO-9876543',
          tipo: 'Portacontenedores',
          capacidadToneladas: 38000,
          bandera: 'Liberia',
          capitan: 'Carlos Vera',
          estado: 'mantenimiento',
          estadoOperativo: 'retraso',
        },
        {
          nombre: 'MSC Irina',
          imo: 'IMO-6360226',
          tipo: 'Portacontenedores',
          capacidadToneladas: 52000,
          bandera: 'Panamá',
          capitan: 'Luis Andrade',
          estado: 'activo',
          estadoOperativo: 'en_puerto',
        },
      ]);

      // 4. Viajes
      const now = Date.now();
      const [viajePrincipal, viajeRetrasado, viajeCompletado] =
        await this.viajeModel.insertMany([
          {
            codigo: '#BU-1234XYZ',
            buqueId: maersk._id,
            origenId: shanghai._id,
            destinoId: guayaquil._id,
            fechas: {
              salida: new Date(now - 12 * 24 * 60 * 60 * 1000),
              llegadaEstimada: new Date(now + 5 * 24 * 60 * 60 * 1000),
            },
            estado: 'en_ruta',
            velocidadNudos: 21.4,
            capitanAsignado: 'Luis Andrade',
            ultimaPosicion: { type: 'Point', coordinates: [-110.5, 8.2] },
            resumenCarga: {
              contenedores: 120,
              toneladas: 2400,
            },
            finanzas: {
              ingresosEstimadosUSD: 420000,
              costoOperativoUSD: 255000,
            },
          },
          {
            codigo: 'V-2026-014',
            buqueId: pacificStar._id,
            origenId: miami._id,
            destinoId: guayaquil._id,
            fechas: {
              salida: new Date(now - 6 * 24 * 60 * 60 * 1000),
              llegadaEstimada: new Date(now + 2 * 24 * 60 * 60 * 1000),
            },
            estado: 'retrasado',
            velocidadNudos: 16.8,
            capitanAsignado: 'Carlos Vera',
            ultimaPosicion: { type: 'Point', coordinates: [-79.5, 8.95] },
            resumenCarga: {
              contenedores: 85,
              toneladas: 1750,
            },
            finanzas: {
              ingresosEstimadosUSD: 260000,
              costoOperativoUSD: 195000,
            },
          },
          {
            codigo: 'V-2026-009',
            buqueId: mscIrina._id,
            origenId: shanghai._id,
            destinoId: guayaquil._id,
            fechas: {
              salida: new Date(now - 28 * 24 * 60 * 60 * 1000),
              llegadaEstimada: new Date(now - 3 * 24 * 60 * 60 * 1000),
              llegadaReal: new Date(now - 3 * 24 * 60 * 60 * 1000),
            },
            estado: 'finalizado',
            velocidadNudos: 0,
            capitanAsignado: 'Luis Andrade',
            ultimaPosicion: { type: 'Point', coordinates: [-79.9, -2.28] },
            resumenCarga: {
              contenedores: 145,
              toneladas: 3100,
            },
            finanzas: {
              ingresosEstimadosUSD: 510000,
              costoOperativoUSD: 305000,
            },
          },
        ]);

      // 5. Cargas
      const [cargaPrincipal, cargaSecundaria] = await this.cargaModel.insertMany([
        {
          viajeId: viajePrincipal._id,
          clienteId: cliente._id,
          codigoContenedor: '#CN-9823',
          tipo: 'Seco',
          pesoToneladas: 24.5,
          numeroPrecinto: '#MSK-4409',
          valorFleteUSD: 5400,
          manifiestoAduanero: {
            numeroDocumento: 'BL-CN-9823-2026',
            fechaEmision: new Date(now - 12 * 24 * 60 * 60 * 1000),
            partidaArancelaria: '8471.30.00.00',
            estadoAduana: 'declarado',
          },
          historialEventos: [
            {
              estado: 'Recogido en fábrica',
              fecha: new Date(now - 15 * 24 * 60 * 60 * 1000),
              ubicacion: 'Suzhou, CHN',
              descripcion: 'Unidad retirada y consolidada en planta de origen.',
              completado: true,
            },
            {
              estado: 'En patio de contenedores',
              fecha: new Date(now - 13 * 24 * 60 * 60 * 1000),
              ubicacion: 'Terminal Yangshan (CHN)',
              descripcion:
                'Contenedor sellado #MSK-4409 verificado en muelle terminal 3.',
              completado: true,
            },
            {
              estado: 'A bordo de buque',
              fecha: new Date(now - 12 * 24 * 60 * 60 * 1000),
              ubicacion: 'Maersk Horizon',
              descripcion: 'Estiba completada en cubierta principal.',
              completado: true,
            },
            {
              estado: 'En tránsito marítimo',
              fecha: new Date(now - 8 * 24 * 60 * 60 * 1000),
              ubicacion: 'Océano Pacífico',
              descripcion: 'Velocidad: 21.4 nudos • Coordenadas: 14°N 165°W.',
              completado: true,
            },
            {
              estado: 'Desembarque en puerto',
              fecha: new Date(now + 5 * 24 * 60 * 60 * 1000),
              ubicacion: 'Puerto Marítimo de Guayaquil (ECU)',
              descripcion: 'Arribo programado a muelle de descarga.',
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
          numeroPrecinto: '#PAC-8821',
          valorFleteUSD: 6200,
          manifiestoAduanero: {
            numeroDocumento: 'BL-CN-7741-2026',
            fechaEmision: new Date(now - 6 * 24 * 60 * 60 * 1000),
            partidaArancelaria: '3004.90.29.00',
            estadoAduana: 'pendiente',
          },
          historialEventos: [
            {
              estado: 'En patio de contenedores',
              fecha: new Date(now - 7 * 24 * 60 * 60 * 1000),
              ubicacion: 'PortMiami Terminal (USA)',
              descripcion: 'Inspección térmica y precintado #PAC-8821 OK.',
              completado: true,
            },
            {
              estado: 'A bordo de buque',
              fecha: new Date(now - 6 * 24 * 60 * 60 * 1000),
              ubicacion: 'Pacific Star II',
              descripcion: 'Contenedor conectado a toma refrigerada en bodega.',
              completado: true,
            },
          ],
        },
        {
          viajeId: viajeCompletado._id,
          clienteId: cliente._id,
          codigoContenedor: '#CN-5102',
          tipo: 'Seco',
          pesoToneladas: 21.0,
          numeroPrecinto: '#MSC-1904',
          valorFleteUSD: 4950,
          manifiestoAduanero: {
            numeroDocumento: 'BL-CN-5102-2026',
            fechaEmision: new Date(now - 28 * 24 * 60 * 60 * 1000),
            partidaArancelaria: '8517.62.90.00',
            estadoAduana: 'liberado',
          },
          historialEventos: [
            {
              estado: 'Desembarque en puerto',
              fecha: new Date(now - 3 * 24 * 60 * 60 * 1000),
              ubicacion: 'Puerto Marítimo de Guayaquil (ECU)',
              descripcion: 'Mercancía nacionalizada y liberada en aduana.',
              completado: true,
            },
          ],
        },
      ]);

      // 6. Incidentes, Imágenes (IA) y Mantenimientos
      await this.incidenteModel.create({
        viajeId: viajeRetrasado._id,
        buqueId: pacificStar._id,
        operadorId: operador._id,
        codigoContenedor: '#CN-7741',
        tipo: 'retraso',
        descripcion: 'Congestión en esclusas del Canal de Panamá',
        gravedad: 'alta',
        estado: 'abierto',
        fecha: new Date(),
      });

      await this.imagenModel.insertMany([
        {
          entidadId: cargaPrincipal._id,
          tipoEntidad: 'carga',
          operadorId: operador._id,
          viajeId: viajePrincipal._id,
          buqueNombre: 'Maersk Horizon',
          observaciones: 'Lectura óptica de dígitos sin daños en sello.',
          rutaArchivo: '/uploads/scans/seed-scan-cn9823.jpg',
          resultadoIA: {
            codigoLeido: '#CN-9823',
            dañosDetectados: false,
            confianza: 85,
            estadoSello: 'ok',
          },
        },
        {
          entidadId: cargaSecundaria._id,
          tipoEntidad: 'carga',
          operadorId: operador._id,
          viajeId: viajeRetrasado._id,
          buqueNombre: 'Pacific Star II',
          observaciones: 'Verificación de precinto #PAC-8821 en muelle.',
          rutaArchivo: '/uploads/scans/seed-scan-cn7741.jpg',
          resultadoIA: {
            codigoLeido: '#CN-7741',
            dañosDetectados: false,
            confianza: 92,
            estadoSello: 'ok',
          },
        },
      ]);

      await this.mantenimientoModel.create({
        buqueId: pacificStar._id,
        tipo: 'preventivo',
        descripcion:
          'Inspección preventiva de generadores auxiliares y casco.',
        costoUSD: 14500,
        responsable: 'Astilleros Navales del Pacífico',
        fechas: {
          programada: new Date(now - 2 * 24 * 60 * 60 * 1000),
        },
        estado: 'pendiente',
      });

      // 7. Turno activo del operador, Notificaciones, Soporte y Auditoría
      const turnoActivo = await this.turnoModel.create({
        operadorId: operador._id,
        tipoTurno: 'Matutino',
        horarioAsignado: '08:00 - 16:00',
        fechaInicio: new Date(now - 2 * 60 * 60 * 1000),
        estado: 'activo',
        escaneosRealizados: 32,
        incidentesReportados: 1,
      });

      await this.notificacionModel.insertMany([
        {
          usuarioId: cliente._id,
          tipo: 'arribo_proximo',
          titulo: 'Arribo próximo de #CN-9823',
          mensaje:
            'Tu contenedor a bordo de Maersk Horizon arribará a Guayaquil en 5 días.',
          codigoContenedor: '#CN-9823',
          referenciaId: String(cargaPrincipal._id),
          leida: false,
        },
        {
          usuarioId: cliente._id,
          tipo: 'retraso',
          titulo: 'Alerta de ruta en #CN-7741 (V-2026-014)',
          mensaje:
            'Congestión reportada en esclusas del Canal de Panamá. ETA reprogramada.',
          codigoContenedor: '#CN-7741',
          referenciaId: String(viajeRetrasado._id),
          leida: false,
        },
        {
          rolDestino: 'operador',
          tipo: 'turno',
          titulo: 'Turno Matutino activo (08:00 - 16:00)',
          mensaje:
            'Escáner IA habilitado para inspección de contenedores en muelle.',
          referenciaId: String(turnoActivo._id),
          leida: false,
        },
        {
          rolDestino: 'gerente',
          tipo: 'incidente',
          titulo: 'Incidente de gravedad ALTA en V-2026-014',
          mensaje: 'Congestión en esclusas del Canal de Panamá',
          codigoContenedor: '#CN-7741',
          referenciaId: String(viajeRetrasado._id),
          leida: false,
        },
      ]);

      await this.ticketSoporteModel.insertMany([
        {
          codigo: 'TKT-2026-001',
          usuarioId: cliente._id,
          rolUsuario: RolUsuario.CLIENTE,
          tipo: 'agente_aduanas',
          asunto: 'Validación previa de manifiesto BL-CN-9823-2026',
          mensaje:
            'Por favor confirmar si el contenedor #CN-9823 requiere aforo físico al llegar a Guayaquil.',
          codigoContenedor: '#CN-9823',
          prioridad: 'media',
          estado: 'resuelto',
          respuesta:
            'Documentación verificada en sistema aduanero. Aforo automático aprobado.',
          atendidoPor: admin._id,
          fechaRespuesta: new Date(now - 24 * 60 * 60 * 1000),
        },
        {
          codigo: 'TKT-2026-002',
          usuarioId: operador._id,
          rolUsuario: RolUsuario.OPERADOR,
          tipo: 'supervisor',
          asunto: 'Reemplazo de precinto en muelle 3',
          mensaje:
            'Se detectó sello desgastado en unidad refrigerada; solicitamos autorización de reemplazo.',
          codigoContenedor: '#CN-7741',
          prioridad: 'alta',
          estado: 'abierto',
        },
      ]);

      await this.auditoriaLogModel.insertMany([
        {
          usuarioId: String(admin._id),
          accion: 'SEED_INICIAL',
          entidad: 'sistema',
          detalle:
            'Inicialización profesional de datos NaviPort (12 colecciones MongoDB + Redis)',
          fecha: new Date(),
        },
        {
          usuarioId: String(gerente._id),
          accion: 'CONSULTAR_KPIS',
          entidad: 'kpis',
          detalle: 'Sincronización de tablero gerencial',
          fecha: new Date(),
        },
      ]);

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

