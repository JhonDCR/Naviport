import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { RolUsuario } from '../../../common/enums/rol.enum';

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

  @ApiPropertyOptional({ example: 'Matutino' })
  @IsOptional()
  @IsString()
  turno?: string;

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
}

export class UpdateEstadoUsuarioDto {
  @ApiProperty({
    example: false,
    description: 'Estado activo del usuario. Si es false, revoca su sesión en Redis inmediatamente.',
  })
  @IsBoolean()
  activo: boolean;
}

