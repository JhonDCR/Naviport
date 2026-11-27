import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { Model } from 'mongoose';
import { UsuarioDocument } from '../../database/schemas';
import { RedisService } from '../../redis/redis.service';
import { AuthService } from './auth.service';
import { GoogleAuthService } from './google-auth.service';

describe('GoogleAuthService', () => {
  const googleId = 'naviport-test.apps.googleusercontent.com';
  const identity = {
    sub: 'google-account-subject',
    email: 'cliente@example.com',
    email_verified: true,
    nonce: 'a'.repeat(64),
  };
  const query = { exec: jest.fn() };
  const users = { findOne: jest.fn(() => query), create: jest.fn() };
  const redis = { consumirDesafioGoogle: jest.fn(), guardarDesafioGoogle: jest.fn() };
  const auth = { iniciarSesion: jest.fn() };
  let service: GoogleAuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new GoogleAuthService(
      new ConfigService({ GOOGLE_CLIENT_ID: googleId }),
      redis as unknown as RedisService,
      auth as unknown as AuthService,
      users as unknown as Model<UsuarioDocument>,
    );
    const verify = jest.spyOn(OAuth2Client.prototype, 'verifyIdToken') as unknown as jest.Mock;
    verify.mockResolvedValue({ getPayload: () => identity });
  });

  afterEach(() => jest.restoreAllMocks());

  it('rechaza una credencial cuyo desafío de un solo uso ya se consumió', async () => {
    redis.consumirDesafioGoogle.mockResolvedValue(false);
    await expect(service.login('credential')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(users.findOne).not.toHaveBeenCalled();
    expect(auth.iniciarSesion).not.toHaveBeenCalled();
  });

  it('no vincula Google a una cuenta existente solo por compartir correo', async () => {
    redis.consumirDesafioGoogle.mockResolvedValue(true);
    query.exec.mockResolvedValue(null);
    users.create.mockRejectedValue({ code: 11000 });

    await expect(service.login('credential')).rejects.toBeInstanceOf(ConflictException);
    expect(users.findOne).toHaveBeenCalledWith({ googleSubject: identity.sub });
    expect(auth.iniciarSesion).not.toHaveBeenCalled();
  });

  it('reutiliza exclusivamente la cuenta vinculada al sub verificado', async () => {
    const user = { _id: 'local-user', activo: true };
    redis.consumirDesafioGoogle.mockResolvedValue(true);
    query.exec.mockResolvedValue(user);
    auth.iniciarSesion.mockResolvedValue({ accessToken: 'local-session' });

    await expect(service.login('credential')).resolves.toEqual({ accessToken: 'local-session' });
    expect(users.create).not.toHaveBeenCalled();
    expect(auth.iniciarSesion).toHaveBeenCalledWith(user);
  });
});
