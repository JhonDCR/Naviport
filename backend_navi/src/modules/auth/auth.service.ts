import {
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
import { LoginDto } from './dto/auth.dto';
import { JwtPayload } from '../../common/interfaces/api-response.interface';

export interface LoginResult {
  accessToken: string;
  usuario: {
    id: string;
    nombre: string;
    correo: string;
    rol: string;
    detallesPerfil: Usuario['detallesPerfil'];
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
      },
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
