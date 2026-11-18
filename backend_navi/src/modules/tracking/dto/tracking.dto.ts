import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { EstadoViaje } from '../../../database/schemas/viaje.schema';
import { TipoCarga } from '../../../database/schemas/carga.schema';

export class CreateViajeDto {
  @ApiProperty({
    example: 'V-2026-025',
    description: 'Código único del viaje marítimo',
  })
  @IsString()
  @MinLength(3)
  codigo: string;

  @ApiProperty({
    example: '672f0b9f91a24d0012ab34ce',
    description: 'ID de MongoDB del buque asignado',
  })
  @IsMongoId()
  buqueId: string;

  @ApiProperty({
    example: '672f0b9f91a24d0012ab34cf',
    description: 'ID de MongoDB del puerto de origen',
  })
  @IsMongoId()
  origenId: string;

  @ApiProperty({
    example: '672f0b9f91a24d0012ab34d0',
    description: 'ID de MongoDB del puerto de destino',
  })
  @IsMongoId()
  destinoId: string;

  @ApiProperty({ example: '2026-11-15T08:00:00.000Z' })
  @IsDateString()
  fechaSalida: string;

  @ApiProperty({ example: '2026-12-10T18:00:00.000Z' })
  @IsDateString()
  fechaLlegadaEstimada: string;

  @ApiPropertyOptional({
    enum: ['programado', 'en_ruta', 'finalizado', 'retrasado'],
    default: 'programado',
    example: 'en_ruta',
  })
  @IsOptional()
  @IsIn(['programado', 'en_ruta', 'finalizado', 'retrasado'])
  estado?: EstadoViaje;

  @ApiPropertyOptional({
    example: [122.065, 30.626],
    description: 'Coordenadas GeoJSON [longitud, latitud] de la posición actual',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @IsNumber({}, { each: true })
  coordenadas?: [number, number];

  @ApiPropertyOptional({ example: 50, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  contenedores?: number;

  @ApiPropertyOptional({ example: 1200, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  toneladas?: number;

  @ApiPropertyOptional({ example: 21.4, default: 21.4 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  velocidadNudos?: number;

  @ApiPropertyOptional({ example: 'Luis Andrade' })
  @IsOptional()
  @IsString()
  capitanAsignado?: string;

  @ApiPropertyOptional({ example: 185000, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  ingresosEstimadosUSD?: number;

  @ApiPropertyOptional({ example: 112000, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costoOperativoUSD?: number;
}

export class UpdateViajeDto {
  @ApiPropertyOptional({ example: '672f0b9f91a24d0012ab34ce' })
  @IsOptional()
  @IsMongoId()
  buqueId?: string;

  @ApiPropertyOptional({ example: '672f0b9f91a24d0012ab34cf' })
  @IsOptional()
  @IsMongoId()
  origenId?: string;

  @ApiPropertyOptional({ example: '672f0b9f91a24d0012ab34d0' })
  @IsOptional()
  @IsMongoId()
  destinoId?: string;

  @ApiPropertyOptional({ example: '2026-11-15T08:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  fechaSalida?: string;

  @ApiPropertyOptional({ example: '2026-12-10T18:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  fechaLlegadaEstimada?: string;

  @ApiPropertyOptional({ example: '2026-12-10T16:30:00.000Z' })
  @IsOptional()
  @IsDateString()
  fechaLlegadaReal?: string;

  @ApiPropertyOptional({
    enum: ['programado', 'en_ruta', 'finalizado', 'retrasado'],
  })
  @IsOptional()
  @IsIn(['programado', 'en_ruta', 'finalizado', 'retrasado'])
  estado?: EstadoViaje;

  @ApiPropertyOptional({ example: [-95.4, 5.2] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @IsNumber({}, { each: true })
  coordenadas?: [number, number];

  @ApiPropertyOptional({ example: 21.4 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  velocidadNudos?: number;

  @ApiPropertyOptional({ example: 'Luis Andrade' })
  @IsOptional()
  @IsString()
  capitanAsignado?: string;

  @ApiPropertyOptional({ example: 190000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  ingresosEstimadosUSD?: number;

  @ApiPropertyOptional({ example: 115000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costoOperativoUSD?: number;
}

export class UpdateEstadoViajeDto {
  @ApiPropertyOptional({
    enum: ['programado', 'en_ruta', 'finalizado', 'retrasado'],
    example: 'en_ruta',
  })
  @IsOptional()
  @IsIn(['programado', 'en_ruta', 'finalizado', 'retrasado'])
  estado?: EstadoViaje;

  @ApiPropertyOptional({
    example: [-95.4, 5.2],
    description:
      'Coordenadas GeoJSON [longitud, latitud] para actualizar el pin amarillo en el mapa',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @IsNumber({}, { each: true })
  coordenadas?: [number, number];

  @ApiPropertyOptional({
    example: 21.4,
    description: 'Velocidad actual del buque en nudos',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  velocidadNudos?: number;

  @ApiPropertyOptional({
    example: '2026-12-10T16:30:00.000Z',
    description: 'Fecha real de llegada cuando el viaje finaliza',
  })
  @IsOptional()
  @IsDateString()
  fechaLlegadaReal?: string;
}

export class CreateCargaDto {
  @ApiProperty({
    example: '672f0b9f91a24d0012ab34cd',
    description: 'ID de MongoDB del viaje marítimo',
  })
  @IsMongoId()
  viajeId: string;

  @ApiProperty({
    example: '672f0b9f91a24d0012ab34ca',
    description: 'ID de MongoDB del usuario cliente propietario',
  })
  @IsMongoId()
  clienteId: string;

  @ApiProperty({
    example: '#CN-5510',
    description: 'Código único del contenedor',
  })
  @IsString()
  @MinLength(3)
  codigoContenedor: string;

  @ApiProperty({
    enum: ['Seco', 'Refrigerado'],
    example: 'Seco',
  })
  @IsIn(['Seco', 'Refrigerado'])
  tipo: TipoCarga;

  @ApiProperty({ example: 22.4 })
  @IsNumber()
  @Min(0)
  pesoToneladas: number;

  @ApiPropertyOptional({
    example: '#MSK-4409',
    description: 'Número de sello o precinto aduanero del contenedor',
  })
  @IsOptional()
  @IsString()
  numeroPrecinto?: string;

  @ApiPropertyOptional({
    example: 4800,
    description: 'Valor del flete marítimo en USD',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  valorFleteUSD?: number;

  @ApiPropertyOptional({
    example: '8471.30.00.00',
    description: 'Partida arancelaria para el manifiesto aduanero',
  })
  @IsOptional()
  @IsString()
  partidaArancelaria?: string;

  @ApiPropertyOptional({
    example: 'Terminal Yangshan (CHN)',
    description: 'Ubicación inicial para el primer evento del timeline',
  })
  @IsOptional()
  @IsString()
  ubicacionInicial?: string;
}

export class AddEventoTimelineDto {
  @ApiProperty({
    example: 'En aduana de destino',
    description: 'Nombre del estado o hito en el timeline del contenedor',
  })
  @IsString()
  @MinLength(3)
  estado: string;

  @ApiProperty({
    example: 'Puerto Marítimo de Guayaquil (ECU)',
    description: 'Ubicación geográfica o terminal del evento',
  })
  @IsString()
  @MinLength(2)
  ubicacion: string;

  @ApiPropertyOptional({
    example: 'Contenedor sellado #MSK-4409 verificado en muelle terminal 3.',
    description: 'Descripción técnica o detalle operativo del evento',
  })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiPropertyOptional({
    example: '2026-11-12T14:00:00.000Z',
    description: 'Fecha del evento (por defecto la fecha actual)',
  })
  @IsOptional()
  @IsDateString()
  fecha?: string;

  @ApiPropertyOptional({
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  completado?: boolean;
}
