import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { EstadoSelloIA } from '../../../database/schemas/imagen.schema';

const parseOptionalBoolean = (value: unknown): unknown => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') return true;
    if (normalized === 'false' || normalized === '0') return false;
  }
  return value;
};

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
  @Transform(({ value }) => parseOptionalBoolean(value))
  @IsBoolean()
  dañosDetectados?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Alias ASCII-seguro de dañosDetectados para formularios multipart',
  })
  @IsOptional()
  @Transform(({ value }) => parseOptionalBoolean(value))
  @IsBoolean()
  danosDetectados?: boolean;

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

  @ApiPropertyOptional({
    enum: ['ok', 'sello_roto', 'averia'],
    example: 'ok',
    description: 'Estado del sello o integridad física detectada',
  })
  @IsOptional()
  @IsIn(['ok', 'sello_roto', 'averia'])
  estadoSello?: EstadoSelloIA;

  @ApiPropertyOptional({
    example: 'Precinto verificado en muelle 3 sin anomalías',
    description: 'Observaciones adicionales del operador',
  })
  @IsOptional()
  @IsString()
  observaciones?: string;
}

