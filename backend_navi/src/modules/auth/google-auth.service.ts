import {
  ConflictException,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { randomBytes } from 'crypto';
import { OAuth2Client, TokenPayload } from 'google-auth-library';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { RolUsuario } from '../../common/enums/rol.enum';
import { Usuario, UsuarioDocument } from '../../database/schemas';
import { RedisService } from '../../redis/redis.service';
import { AuthService, LoginResult } from './auth.service';

@Injectable()
export class GoogleAuthService {
  private readonly google = new OAuth2Client();

  constructor(
    private readonly config: ConfigService,
    private readonly redis: RedisService,
    private readonly auth: AuthService,
    @InjectModel(Usuario.name) private readonly usuarios: Model<UsuarioDocument>,
  ) {}

  private get clientId(): string {
    return this.config.get<string>('GOOGLE_CLIENT_ID')?.trim() ?? '';
  }

  async challenge(): Promise<{ clientId: string; nonce: string } | null> {
    if (!this.clientId) return null;

    const nonce = randomBytes(32).toString('hex');
    await this.redis.guardarDesafioGoogle(nonce);
    return { clientId: this.clientId, nonce };
  }

  async login(credential: string): Promise<LoginResult> {
    const clientId = this.clientId;
    if (!clientId) {
      throw new ServiceUnavailableException('El acceso con Google aún no está configurado');
    }

    const identity = await this.verify(credential, clientId);
    const nonce = identity.nonce;
    const email = identity.email?.trim().toLowerCase();
    if (!nonce || !/^[a-f0-9]{64}$/.test(nonce) || !email || !identity.email_verified) {
      throw new UnauthorizedException('Identidad de Google no válida');
    }
    if (!(await this.redis.consumirDesafioGoogle(nonce))) {
      throw new UnauthorizedException('El acceso con Google venció. Vuelve a abrir el inicio de sesión.');
    }

    const subject = identity.sub;
    const user =
      (await this.usuarios.findOne({ googleSubject: subject }).exec()) ??
      (await this.createAccount(subject, email, identity.name?.trim() || email.split('@')[0]));
    if (!user.activo) {
      throw new ForbiddenException('La cuenta de usuario se encuentra suspendida');
    }
    return this.auth.iniciarSesion(user);
  }

  private async verify(credential: string, audience: string): Promise<TokenPayload> {
    try {
      const ticket = await this.google.verifyIdToken({ idToken: credential, audience });
      const payload = ticket.getPayload();
      if (!payload?.sub) throw new UnauthorizedException();
      return payload;
    } catch {
      throw new UnauthorizedException('Identidad de Google no válida');
    }
  }

  private async createAccount(subject: string, email: string, name: string): Promise<UsuarioDocument> {
    try {
      return await this.usuarios.create({
        googleSubject: subject,
        nombre: name,
        correo: email,
        password_hash: await bcrypt.hash(randomBytes(32).toString('hex'), 10),
        rol: RolUsuario.CLIENTE,
      });
    } catch (error) {
      if (typeof error !== 'object' || !error || !('code' in error) || error.code !== 11000) {
        throw error;
      }
      const sameAccount = await this.usuarios.findOne({ googleSubject: subject }).exec();
      if (sameAccount) return sameAccount;
      throw new ConflictException('Este correo ya tiene una cuenta. Usa su contraseña para ingresar.');
    }
  }
}
