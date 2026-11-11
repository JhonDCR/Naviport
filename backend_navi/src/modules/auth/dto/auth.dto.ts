import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsString, MinLength } from 'class-validator';

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

export class UpdateEstadoUsuarioDto {
  @ApiProperty({
    example: false,
    description: 'Estado activo del usuario. Si es false, revoca su sesión en Redis inmediatamente.',
  })
  @IsBoolean()
  activo: boolean;
}
