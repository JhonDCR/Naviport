import {
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import {
  AuditoriaLog,
  AuditoriaLogDocument,
  Turno,
  TurnoDocument,
  Usuario,
  UsuarioDocument,
} from '../../database/schemas';
import { RedisService } from '../../redis/redis.service';
import {
  CambiarPasswordDto,
  ControlTurnoDto,
  CreateUsuarioDto,
  LoginDto,
  UpdatePerfilDto,
  UpdatePreferenciasDto,
  UpdateUsuarioAdminDto,
} from './dto/auth.dto';
import { JwtPayload } from '../../common/interfaces/api-response.interface';
import { RolUsuario } from '../../common/enums/rol.enum';

export interface LoginResult {
  accessToken: string;
  usuario: {
    id: string;
    nombre: string;
    correo: string;
    rol: string;
    avatarUrl?: string;
    detallesPerfil: Usuario['detallesPerfil'];
    preferencias: Usuario['preferencias'];
  };
}

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(Usuario.name)
    private readonly usuarioModel: Model<UsuarioDocument>,
    @InjectModel(Turno.name)
    private readonly turnoModel: Model<TurnoDocument>,
    @InjectModel(AuditoriaLog.name)
    private readonly auditoriaLogModel: Model<AuditoriaLogDocument>,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
  ) {}

  private async persistirAuditoria(evento: {
    usuarioId: string;
    accion: string;
    entidad: string;
    entidadId?: string;
    detalle?: string;
  }): Promise<void> {
    await Promise.all([
      this.redisService.registrarAuditoria(evento),
      this.auditoriaLogModel.create({
        usuarioId: evento.usuarioId,
        accion: evento.accion,
        entidad: evento.entidad,
        entidadId: evento.entidadId,
        detalle: evento.detalle,
        fecha: new Date(),
      }),
    ]);
  }

  async login(dto: LoginDto): Promise<LoginResult> {
    const correoNormalizado = dto.correo.toLowerCase().trim();
    const rateLimit =
      await this.redisService.verificarYRegistrarIntentoLogin(correoNormalizado);

    if (!rateLimit.permitido) {
      await this.persistirAuditoria({
        usuarioId: correoNormalizado,
        accion: 'LOGIN_BLOQUEADO',
        entidad: 'usuarios',
        detalle: `Rate limit alcanzado (${rateLimit.intentos} intentos)`,
      });
      throw new HttpException(
        'Demasiados intentos fallidos. Por seguridad, espera 60 segundos antes de reintentar.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const usuario = await this.usuarioModel
      .findOne({ correo: correoNormalizado })
      .exec();

    if (!usuario) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!usuario.activo) {
      throw new ForbiddenException(
        'La cuenta de usuario se encuentra suspendida',
      );
    }

    const passwordValido = await bcrypt.compare(
      dto.password,
      usuario.password_hash,
    );
    if (!passwordValido) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    await this.redisService.limpiarIntentosLogin(correoNormalizado);

    const idUsuario = String(usuario._id);
    const payload: JwtPayload = {
      sub: idUsuario,
      correo: usuario.correo,
      rol: usuario.rol,
      nombre: usuario.nombre,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    await this.redisService.guardarSesion(idUsuario, {
      token: accessToken,
      rol: usuario.rol,
      activo: String(usuario.activo),
    });

    await this.persistirAuditoria({
      usuarioId: idUsuario,
      accion: 'LOGIN',
      entidad: 'usuarios',
      entidadId: idUsuario,
      detalle: `Inicio de sesión exitoso (${usuario.rol})`,
    });

    return {
      accessToken,
      usuario: {
        id: idUsuario,
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol: usuario.rol,
        avatarUrl: usuario.avatarUrl,
        detallesPerfil: usuario.detallesPerfil,
        preferencias: usuario.preferencias,
      },
    };
  }

  async registrarUsuario(
    dto: CreateUsuarioDto,
    permitirRolPersonalizado = false,
    adminId?: string,
  ) {
    const correoNormalizado = dto.correo.toLowerCase().trim();
    const existente = await this.usuarioModel
      .findOne({ correo: correoNormalizado })
      .lean()
      .exec();

    if (existente) {
      throw new ConflictException(
        'Ya existe un usuario registrado con ese correo electrónico',
      );
    }

    const rolAsignado = permitirRolPersonalizado
      ? (dto.rol ?? RolUsuario.CLIENTE)
      : RolUsuario.CLIENTE;

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const nuevo = await this.usuarioModel.create({
      nombre: dto.nombre.trim(),
      correo: correoNormalizado,
      password_hash: passwordHash,
      rol: rolAsignado,
      detallesPerfil: dto.detallesPerfil ?? {},
      preferencias: {
        notificacionesPush: true,
        modoOscuro: false,
        idioma: 'es',
      },
      activo: true,
    });

    await this.persistirAuditoria({
      usuarioId: adminId ?? String(nuevo._id),
      accion: 'CREAR_USUARIO',
      entidad: 'usuarios',
      entidadId: String(nuevo._id),
      detalle: `Usuario ${nuevo.correo} registrado con rol ${rolAsignado}`,
    });

    return {
      id: String(nuevo._id),
      nombre: nuevo.nombre,
      correo: nuevo.correo,
      rol: nuevo.rol,
      detallesPerfil: nuevo.detallesPerfil,
      preferencias: nuevo.preferencias,
      activo: nuevo.activo,
    };
  }

  async logout(idUsuario: string): Promise<{ revocado: boolean }> {
    await this.redisService.revocarSesion(idUsuario);
    await this.persistirAuditoria({
      usuarioId: idUsuario,
      accion: 'LOGOUT',
      entidad: 'usuarios',
      entidadId: idUsuario,
    });
    return { revocado: true };
  }

  async obtenerPerfil(idUsuario: string) {
    const usuario = await this.usuarioModel
      .findById(idUsuario)
      .select('-password_hash')
      .lean()
      .exec();

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return usuario;
  }

  async actualizarPerfil(idUsuario: string, dto: UpdatePerfilDto) {
    const usuario = await this.usuarioModel.findById(idUsuario).exec();
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (dto.nombre !== undefined) {
      usuario.nombre = dto.nombre.trim();
    }

    if (dto.avatarUrl !== undefined) {
      usuario.avatarUrl = dto.avatarUrl.trim();
    }

    if (dto.detallesPerfil !== undefined) {
      usuario.detallesPerfil = {
        ...usuario.detallesPerfil,
        ...dto.detallesPerfil,
      };
    }

    await usuario.save();
    return this.obtenerPerfil(idUsuario);
  }

  async actualizarPreferencias(idUsuario: string, dto: UpdatePreferenciasDto) {
    const usuario = await this.usuarioModel.findById(idUsuario).exec();
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    usuario.preferencias = {
      notificacionesPush:
        dto.notificacionesPush ?? usuario.preferencias?.notificacionesPush ?? true,
      modoOscuro: dto.modoOscuro ?? usuario.preferencias?.modoOscuro ?? false,
      idioma: dto.idioma ?? usuario.preferencias?.idioma ?? 'es',
    };

    await usuario.save();
    return this.obtenerPerfil(idUsuario);
  }

  async controlarTurno(idUsuario: string, dto: ControlTurnoDto) {
    const usuario = await this.usuarioModel.findById(idUsuario).exec();
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const turnoActual = dto.turno ?? usuario.detallesPerfil?.turno ?? 'Matutino';
    const horarioActual =
      dto.horarioTurno ??
      usuario.detallesPerfil?.horarioTurno ??
      '08:00 - 16:00';

    usuario.detallesPerfil = {
      ...usuario.detallesPerfil,
      turno: turnoActual,
      horarioTurno: horarioActual,
      turnoActivo: dto.turnoActivo,
    };

    await usuario.save();

    const operadorObjId = isValidObjectId(idUsuario)
      ? new Types.ObjectId(idUsuario)
      : usuario._id;

    let turnoDocumento: unknown = null;
    if (dto.turnoActivo) {
      await this.turnoModel
        .updateMany(
          { operadorId: operadorObjId, estado: 'activo' },
          { estado: 'finalizado', fechaFin: new Date() },
        )
        .exec();

      const nuevoTurno = await this.turnoModel.create({
        operadorId: operadorObjId,
        tipoTurno: turnoActual,
        horarioAsignado: horarioActual,
        fechaInicio: new Date(),
        estado: 'activo',
        escaneosRealizados: 0,
        incidentesReportados: 0,
      });

      await this.redisService.guardarTurnoActivo(idUsuario, {
        turnoId: String(nuevoTurno._id),
        tipoTurno: turnoActual,
        horarioAsignado: horarioActual,
        fechaInicio: nuevoTurno.fechaInicio.toISOString(),
      });

      await this.persistirAuditoria({
        usuarioId: idUsuario,
        accion: 'INICIAR_TURNO',
        entidad: 'turnos',
        entidadId: String(nuevoTurno._id),
        detalle: `Turno ${turnoActual} (${horarioActual}) iniciado`,
      });

      turnoDocumento = nuevoTurno;
    } else {
      const turnoAbierto = await this.turnoModel
        .findOne({ operadorId: operadorObjId, estado: 'activo' })
        .sort({ fechaInicio: -1 })
        .exec();

      if (turnoAbierto) {
        turnoAbierto.estado = 'finalizado';
        turnoAbierto.fechaFin = new Date();
        if (dto.observacionesCierre) {
          turnoAbierto.observacionesCierre = dto.observacionesCierre.trim();
        }
        await turnoAbierto.save();
        turnoDocumento = turnoAbierto;
      }

      await this.redisService.eliminarTurnoActivo(idUsuario);
      await this.persistirAuditoria({
        usuarioId: idUsuario,
        accion: 'FINALIZAR_TURNO',
        entidad: 'turnos',
        entidadId: turnoAbierto ? String(turnoAbierto._id) : undefined,
        detalle: `Turno ${turnoActual} finalizado`,
      });
    }

    return {
      idUsuario: String(usuario._id),
      nombre: usuario.nombre,
      turnoActivo: dto.turnoActivo,
      turno: usuario.detallesPerfil.turno,
      horarioTurno: usuario.detallesPerfil.horarioTurno,
      turnoRegistro: turnoDocumento,
      timestamp: new Date().toISOString(),
    };
  }

  async obtenerMisTurnos(idUsuario: string) {
    const cacheActivo = await this.redisService.obtenerTurnoActivo(idUsuario);
    const operadorObjId = isValidObjectId(idUsuario)
      ? new Types.ObjectId(idUsuario)
      : idUsuario;

    const historial = await this.turnoModel
      .find({ operadorId: operadorObjId })
      .sort({ fechaInicio: -1 })
      .limit(30)
      .lean()
      .exec();

    const turnoActivoDb =
      historial.find((t) => t.estado === 'activo') ?? null;

    return {
      turnoActivo: turnoActivoDb ?? cacheActivo,
      historial,
    };
  }

  async listarTodosTurnos() {
    return this.turnoModel
      .find()
      .populate('operadorId', '-password_hash')
      .sort({ fechaInicio: -1 })
      .limit(100)
      .lean()
      .exec();
  }

  async listarUsuarios() {
    return this.usuarioModel.find().select('-password_hash').lean().exec();
  }

  async cambiarEstadoUsuario(
    idUsuario: string,
    activo: boolean,
    adminId?: string,
  ) {
    const usuario = await this.usuarioModel
      .findByIdAndUpdate(idUsuario, { activo }, { new: true })
      .select('-password_hash')
      .lean()
      .exec();

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (!activo) {
      await this.redisService.revocarSesion(idUsuario);
    }

    await this.persistirAuditoria({
      usuarioId: adminId ?? 'sistema',
      accion: activo ? 'ACTIVAR_USUARIO' : 'SUSPENDER_USUARIO',
      entidad: 'usuarios',
      entidadId: idUsuario,
      detalle: `Usuario objetivo: ${idUsuario}`,
    });

    return usuario;
  }

  async actualizarUsuarioAdmin(
    idUsuario: string,
    dto: UpdateUsuarioAdminDto,
    adminId?: string,
  ) {
    const usuario = await this.usuarioModel.findById(idUsuario).exec();
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const rolCambio = dto.rol !== undefined && dto.rol !== usuario.rol;
    const suspendido = dto.activo === false;

    if (dto.nombre !== undefined) {
      usuario.nombre = dto.nombre.trim();
    }
    if (dto.rol !== undefined) {
      usuario.rol = dto.rol;
    }
    if (dto.activo !== undefined) {
      usuario.activo = dto.activo;
    }
    if (dto.detallesPerfil !== undefined) {
      usuario.detallesPerfil = {
        ...usuario.detallesPerfil,
        ...dto.detallesPerfil,
      };
    }

    await usuario.save();

    if (suspendido || rolCambio) {
      await this.redisService.revocarSesion(idUsuario);
    }

    await this.persistirAuditoria({
      usuarioId: adminId ?? 'sistema',
      accion: 'ACTUALIZAR_USUARIO',
      entidad: 'usuarios',
      entidadId: idUsuario,
      detalle: `Usuario actualizado: ${idUsuario}`,
    });

    return this.obtenerPerfil(idUsuario);
  }

  async cambiarPassword(idUsuario: string, dto: CambiarPasswordDto) {
    const usuario = await this.usuarioModel.findById(idUsuario).exec();
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const passwordValido = await bcrypt.compare(
      dto.passwordActual,
      usuario.password_hash,
    );
    if (!passwordValido) {
      throw new UnauthorizedException('La contraseña actual es incorrecta');
    }

    usuario.password_hash = await bcrypt.hash(dto.passwordNueva, 10);
    await usuario.save();

    await this.persistirAuditoria({
      usuarioId: idUsuario,
      accion: 'CAMBIAR_PASSWORD',
      entidad: 'usuarios',
      entidadId: idUsuario,
    });

    return { actualizado: true };
  }

  async obtenerAuditoria(limite = 50) {
    const max = Math.max(1, Math.min(200, limite));
    const logsDb = await this.auditoriaLogModel
      .find()
      .sort({ fecha: -1 })
      .limit(max)
      .lean()
      .exec();

    if (logsDb.length > 0) {
      return logsDb;
    }
    return this.redisService.obtenerAuditoria(max);
  }
}

