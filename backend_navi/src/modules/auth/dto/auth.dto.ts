import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { RolUsuario } from '../../../common/enums/rol.enum';

export class GoogleLoginDto {
  @ApiProperty({ description: 'Credencial firmada por Google Identity Services' })
  @IsString()
  @MinLength(1)
  @MaxLength(8192)
  credential: string;
}

export class LoginDto {
  @ApiProperty({
    example: 'contacto@garyindustries.com',
    description: 'Correo electrónico del usuario',
  })
  @IsEmail()
  correo: string;

  @ApiProperty({
    example: 'naviport123',
    description: 'Contraseña (mínimo 6 caracteres)',
  })
  @IsString()
  @MinLength(6)
  password: string;
}

export class DetallesPerfilDto {
  @ApiPropertyOptional({ example: 'Gary Industries' })
  @IsOptional()
  @IsString()
  empresa?: string;

  @ApiPropertyOptional({ example: '0992345678001' })
  @IsOptional()
  @IsString()
  ruc?: string;

  @ApiPropertyOptional({ example: 'Av. 9 de Octubre 416, Guayaquil, Ecuador' })
  @IsOptional()
  @IsString()
  direccionLegal?: string;

  @ApiPropertyOptional({ example: '+593 99 123 4567' })
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiPropertyOptional({ example: 'Matutino' })
  @IsOptional()
  @IsString()
  turno?: string;

  @ApiPropertyOptional({ example: '08:00 - 16:00' })
  @IsOptional()
  @IsString()
  horarioTurno?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  turnoActivo?: boolean;

  @ApiPropertyOptional({ example: 'OP-4021' })
  @IsOptional()
  @IsString()
  idEmpleado?: string;
}

export class CreateUsuarioDto {
  @ApiProperty({
    example: 'Importadora Pacífico S.A.',
    description: 'Nombre completo o razón social del usuario',
  })
  @IsString()
  @MinLength(2)
  nombre: string;

  @ApiProperty({
    example: 'logistica@importadorapacifico.ec',
    description: 'Correo electrónico único',
  })
  @IsEmail()
  correo: string;

  @ApiProperty({
    example: 'naviport123',
    description: 'Contraseña (mínimo 6 caracteres)',
  })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({
    enum: RolUsuario,
    default: RolUsuario.CLIENTE,
    example: RolUsuario.CLIENTE,
  })
  @IsOptional()
  @IsEnum(RolUsuario)
  rol?: RolUsuario;

  @ApiPropertyOptional({ type: DetallesPerfilDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DetallesPerfilDto)
  detallesPerfil?: DetallesPerfilDto;
}

export class UpdatePerfilDto {
  @ApiPropertyOptional({ example: 'Gary Industries Corp.' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  nombre?: string;

  @ApiPropertyOptional({ example: 'https://cdn.naviport.app/avatars/gary.png' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({ type: DetallesPerfilDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DetallesPerfilDto)
  detallesPerfil?: DetallesPerfilDto;
}

export class UpdatePreferenciasDto {
  @ApiPropertyOptional({
    example: true,
    description: 'Activar o desactivar notificaciones push en la app móvil',
  })
  @IsOptional()
  @IsBoolean()
  notificacionesPush?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Activar o desactivar el modo oscuro en la app móvil',
  })
  @IsOptional()
  @IsBoolean()
  modoOscuro?: boolean;

  @ApiPropertyOptional({
    enum: ['es', 'en'],
    example: 'es',
    description: 'Idioma preferido de la aplicación e informes portuarios',
  })
  @IsOptional()
  @IsIn(['es', 'en'])
  idioma?: 'es' | 'en';
}

export class ControlTurnoDto {
  @ApiProperty({
    example: true,
    description: 'Indica si el operador inicia (true) o finaliza (false) su turno activo',
  })
  @IsBoolean()
  turnoActivo: boolean;

  @ApiPropertyOptional({
    example: 'Matutino',
    description: 'Horario o nombre del turno asignado (Matutino, Vespertino, Nocturno)',
  })
  @IsOptional()
  @IsString()
  turno?: string;

  @ApiPropertyOptional({
    example: '08:00 - 16:00',
    description: 'Franja horaria asignada del operador',
  })
  @IsOptional()
  @IsString()
  horarioTurno?: string;

  @ApiPropertyOptional({
    example: 'Turno completado sin novedades en muelle 3',
    description: 'Observaciones opcionales al finalizar el turno',
  })
  @IsOptional()
  @IsString()
  observacionesCierre?: string;
}

export class UpdateEstadoUsuarioDto {
  @ApiProperty({
    example: false,
    description: 'Estado activo del usuario. Si es false, revoca su sesión en Redis inmediatamente.',
  })
  @IsBoolean()
  activo: boolean;
}

export class UpdateUsuarioAdminDto {
  @ApiPropertyOptional({ example: 'Javier Mendoza' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  nombre?: string;

  @ApiPropertyOptional({ enum: RolUsuario, example: RolUsuario.OPERADOR })
  @IsOptional()
  @IsEnum(RolUsuario)
  rol?: RolUsuario;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @ApiPropertyOptional({ type: DetallesPerfilDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DetallesPerfilDto)
  detallesPerfil?: DetallesPerfilDto;
}

export class CambiarPasswordDto {
  @ApiProperty({ example: 'naviport123' })
  @IsString()
  @MinLength(6)
  passwordActual: string;

  @ApiProperty({ example: 'NaviPort2026!' })
  @IsString()
  @MinLength(6)
  passwordNueva: string;
}

