import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsMongoId, IsString, MinLength } from 'class-validator';
import {
  GravedadIncidente,
  TipoIncidente,
} from '../../../database/schemas/incidente.schema';

export class CreateIncidenteDto {
  @ApiProperty({
    example: '672f0b9f91a24d0012ab34cd',
    description: 'ID de MongoDB del viaje asociado',
  })
  @IsMongoId()
  viajeId: string;

  @ApiProperty({
    example: '672f0b9f91a24d0012ab34ce',
    description: 'ID de MongoDB del buque asociado',
  })
  @IsMongoId()
  buqueId: string;

  @ApiProperty({
    enum: ['retraso', 'averia', 'clima'],
    example: 'averia',
  })
  @IsIn(['retraso', 'averia', 'clima'])
  tipo: TipoIncidente;

  @ApiProperty({
    example: 'Avería, precinto o sello roto en contenedor refrigerado',
    minLength: 10,
  })
  @IsString()
  @MinLength(10)
  descripcion: string;

  @ApiProperty({
    enum: ['alta', 'media', 'baja'],
    example: 'alta',
  })
  @IsIn(['alta', 'media', 'baja'])
  gravedad: GravedadIncidente;
}
