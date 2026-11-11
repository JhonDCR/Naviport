import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class InspeccionOpticaDto {
  @ApiPropertyOptional({
    example: '672f0b9f91a24d0012ab34cd',
    description: 'ID opcional del viaje asignado',
  })
  @IsOptional()
  @IsString()
  viajeId?: string;

  @ApiPropertyOptional({
    example: '#CN-9823',
    description: 'Código opcional del contenedor si se envía manual o simulado',
  })
  @IsOptional()
  @IsString()
  codigoContenedor?: string;
}
