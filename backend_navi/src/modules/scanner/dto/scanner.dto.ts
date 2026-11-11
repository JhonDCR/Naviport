import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

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

  @ApiPropertyOptional({
    example: false,
    description: 'Indica si la inspección óptica detectó daños o precinto roto',
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  dañosDetectados?: boolean;

  @ApiPropertyOptional({
    example: 85,
    description: 'Porcentaje de confianza del modelo OCR/IA (0 - 100)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  confianza?: number;
}

