import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { RedisService } from '../../../redis/redis.service';
import { JwtPayload } from '../../../common/interfaces/api-response.interface';

interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Token de autenticación no proporcionado');
    }

    let payload: JwtPayload;
    try {
      const secret = this.configService.get<string>(
        'JWT_SECRET',
        'super_secret_jwt_key_naviport_change_me',
      );
      payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret,
      });
    } catch {
      throw new UnauthorizedException('Token JWT inválido o expirado');
    }

    // Verificar sesión activa en Redis (sesion:{idUsuario})
    const sesion = await this.redisService.obtenerSesion(payload.sub);
    if (!sesion || sesion.activo !== 'true' || sesion.token !== token) {
      throw new UnauthorizedException(
        'Sesión expirada o revocada en tiempo real',
      );
    }

    request.user = payload;
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
