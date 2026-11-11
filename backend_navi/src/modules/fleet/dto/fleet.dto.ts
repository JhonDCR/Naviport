import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsMongoId,
  IsDateString,
  IsNumber,
  IsString,
  Min,
} from 'class-validator';
import { EstadoBuque } from '../../../database/schemas/buque.schema';
import { TipoMantenimiento } from '../../../database/schemas/mantenimiento.schema';

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

  @ApiProperty({
    enum: ['activo', 'mantenimiento', 'inactivo'],
    example: 'activo',
  })
  @IsIn(['activo', 'mantenimiento', 'inactivo'])
  estado: EstadoBuque;
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

export class CreateMantenimientoDto {
  @ApiProperty({ example: '672f0b9f91a24d0012ab34ce' })
  @IsMongoId()
  buqueId: string;

  @ApiProperty({ enum: ['preventivo', 'correctivo'], example: 'preventivo' })
  @IsIn(['preventivo', 'correctivo'])
  tipo: TipoMantenimiento;

  @ApiProperty({ example: '2026-12-01T08:00:00.000Z' })
  @IsDateString()
  fechaProgramada: string;
}
