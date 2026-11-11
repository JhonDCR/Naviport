import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Usuario, UsuarioDocument } from '../../database/schemas';
import { RedisService } from '../../redis/redis.service';
import {
  ControlTurnoDto,
  CreateUsuarioDto,
  LoginDto,
  UpdatePerfilDto,
  UpdatePreferenciasDto,
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
    detallesPerfil: Usuario['detallesPerfil'];
    preferencias: Usuario['preferencias'];
  };
}

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(Usuario.name)
    private readonly usuarioModel: Model<UsuarioDocument>,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
  ) {}

  async login(dto: LoginDto): Promise<LoginResult> {
    const usuario = await this.usuarioModel
      .findOne({ correo: dto.correo.toLowerCase().trim() })
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

    return {
      accessToken,
      usuario: {
        id: idUsuario,
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol: usuario.rol,
        detallesPerfil: usuario.detallesPerfil,
        preferencias: usuario.preferencias,
      },
    };
  }

  async registrarUsuario(dto: CreateUsuarioDto) {
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

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const nuevo = await this.usuarioModel.create({
      nombre: dto.nombre.trim(),
      correo: correoNormalizado,
      password_hash: passwordHash,
      rol: dto.rol ?? RolUsuario.CLIENTE,
      detallesPerfil: dto.detallesPerfil ?? {},
      preferencias: { notificacionesPush: true, modoOscuro: false },
      activo: true,
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
    usuario.detallesPerfil = {
      ...usuario.detallesPerfil,
      turno: dto.turnoActivo ? turnoActual : 'Fuera de turno',
    };

    await usuario.save();
    return {
      idUsuario: String(usuario._id),
      nombre: usuario.nombre,
      turnoActivo: dto.turnoActivo,
      turno: usuario.detallesPerfil.turno,
      timestamp: new Date().toISOString(),
    };
  }

  async listarUsuarios() {
    return this.usuarioModel.find().select('-password_hash').lean().exec();
  }

  async cambiarEstadoUsuario(idUsuario: string, activo: boolean) {
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

    return usuario;
  }
}

