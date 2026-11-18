import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import {
  EstadoBuque,
  EstadoOperativoBuque,
} from '../../../database/schemas/buque.schema';
import {
  EstadoMantenimiento,
  TipoMantenimiento,
} from '../../../database/schemas/mantenimiento.schema';

export class CreateBuqueDto {
  @ApiProperty({ example: 'MSC Gülsün' })
  @IsString()
  nombre: string;

  @ApiProperty({ example: 'IMO-9839430' })
  @IsString()
  imo: string;

  @ApiProperty({ example: 'Portacontenedores' })
  @IsString()
  tipo: string;

  @ApiProperty({ example: 52000 })
  @IsNumber()
  @Min(0)
  capacidadToneladas: number;

  @ApiProperty({ example: 'Panamá' })
  @IsString()
  bandera: string;

  @ApiPropertyOptional({ example: 'Luis Andrade' })
  @IsOptional()
  @IsString()
  capitan?: string;

  @ApiProperty({
    enum: ['activo', 'mantenimiento', 'inactivo'],
    example: 'activo',
  })
  @IsIn(['activo', 'mantenimiento', 'inactivo'])
  estado: EstadoBuque;

  @ApiPropertyOptional({
    enum: ['en_ruta', 'en_puerto', 'retraso', 'mantenimiento', 'inactivo'],
    example: 'en_ruta',
  })
  @IsOptional()
  @IsIn(['en_ruta', 'en_puerto', 'retraso', 'mantenimiento', 'inactivo'])
  estadoOperativo?: EstadoOperativoBuque;
}

export class UpdateBuqueDto {
  @ApiPropertyOptional({ example: 'MSC Irina' })
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiPropertyOptional({ example: 'IMO-6360226' })
  @IsOptional()
  @IsString()
  imo?: string;

  @ApiPropertyOptional({ example: 'Portacontenedores' })
  @IsOptional()
  @IsString()
  tipo?: string;

  @ApiPropertyOptional({ example: 52000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  capacidadToneladas?: number;

  @ApiPropertyOptional({ example: 'Panamá' })
  @IsOptional()
  @IsString()
  bandera?: string;

  @ApiPropertyOptional({ example: 'Luis Andrade' })
  @IsOptional()
  @IsString()
  capitan?: string;

  @ApiPropertyOptional({
    enum: ['activo', 'mantenimiento', 'inactivo'],
  })
  @IsOptional()
  @IsIn(['activo', 'mantenimiento', 'inactivo'])
  estado?: EstadoBuque;

  @ApiPropertyOptional({
    enum: ['en_ruta', 'en_puerto', 'retraso', 'mantenimiento', 'inactivo'],
  })
  @IsOptional()
  @IsIn(['en_ruta', 'en_puerto', 'retraso', 'mantenimiento', 'inactivo'])
  estadoOperativo?: EstadoOperativoBuque;
}

export class UpdateEstadoBuqueDto {
  @ApiProperty({
    enum: ['activo', 'mantenimiento', 'inactivo'],
    example: 'activo',
  })
  @IsIn(['activo', 'mantenimiento', 'inactivo'])
  estado: EstadoBuque;

  @ApiPropertyOptional({
    enum: ['en_ruta', 'en_puerto', 'retraso', 'mantenimiento', 'inactivo'],
    example: 'en_puerto',
  })
  @IsOptional()
  @IsIn(['en_ruta', 'en_puerto', 'retraso', 'mantenimiento', 'inactivo'])
  estadoOperativo?: EstadoOperativoBuque;
}

export class CreatePuertoDto {
  @ApiProperty({ example: 'Puerto Marítimo de Guayaquil' })
  @IsString()
  nombre: string;

  @ApiProperty({ example: 'ECU' })
  @IsString()
  pais: string;

  @ApiProperty({ example: 'Guayaquil' })
  @IsString()
  ciudad: string;

  @ApiProperty({
    example: [-79.9, -2.28],
    description: '[longitud, latitud]',
  })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @IsNumber({}, { each: true })
  coordenadas: [number, number];
}

export class UpdatePuertoDto {
  @ApiPropertyOptional({ example: 'Puerto Marítimo de Guayaquil' })
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiPropertyOptional({ example: 'ECU' })
  @IsOptional()
  @IsString()
  pais?: string;

  @ApiPropertyOptional({ example: 'Guayaquil' })
  @IsOptional()
  @IsString()
  ciudad?: string;

  @ApiPropertyOptional({
    example: [-79.9, -2.28],
    description: '[longitud, latitud]',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @IsNumber({}, { each: true })
  coordenadas?: [number, number];
}

export class CreateMantenimientoDto {
  @ApiProperty({ example: '672f0b9f91a24d0012ab34ce' })
  @IsMongoId()
  buqueId: string;

  @ApiProperty({ enum: ['preventivo', 'correctivo'], example: 'preventivo' })
  @IsIn(['preventivo', 'correctivo'])
  tipo: TipoMantenimiento;

  @ApiPropertyOptional({
    example: 'Revisión de propulsor principal y sistema refrigerado',
  })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiPropertyOptional({ example: 18500 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costoUSD?: number;

  @ApiPropertyOptional({ example: 'Astilleros Navales del Pacífico' })
  @IsOptional()
  @IsString()
  responsable?: string;

  @ApiProperty({ example: '2026-12-01T08:00:00.000Z' })
  @IsDateString()
  fechaProgramada: string;
}

export class UpdateEstadoMantenimientoDto {
  @ApiProperty({
    enum: ['pendiente', 'completado'],
    example: 'completado',
  })
  @IsIn(['pendiente', 'completado'])
  estado: EstadoMantenimiento;

  @ApiPropertyOptional({
    example: '2026-11-11T15:00:00.000Z',
    description: 'Fecha real de finalización del mantenimiento',
  })
  @IsOptional()
  @IsDateString()
  fechaReal?: string;
}

