import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import {
  EstadoTicket,
  PrioridadTicket,
  TipoTicketSoporte,
} from '../../../database/schemas/ticket-soporte.schema';

export class CreateTicketSoporteDto {
  @ApiProperty({
    enum: ['agente_aduanas', 'supervisor', 'fallo_app', 'consulta_general'],
    example: 'agente_aduanas',
    description:
      'Tipo de solicitud: contactar agente aduanero, contactar supervisor, reportar fallo de la app o consulta general',
  })
  @IsIn(['agente_aduanas', 'supervisor', 'fallo_app', 'consulta_general'])
  tipo: TipoTicketSoporte;

  @ApiProperty({
    example: 'Consulta sobre liberación aduanera de contenedor #CN-9823',
    minLength: 4,
  })
  @IsString()
  @MinLength(4)
  asunto: string;

  @ApiProperty({
    example:
      'Necesitamos confirmar si el manifiesto BL-CN-9823-2026 requiere inspección física previa.',
    minLength: 10,
  })
  @IsString()
  @MinLength(10)
  mensaje: string;

  @ApiPropertyOptional({
    example: '#CN-9823',
    description: 'Código opcional de contenedor asociado a la consulta',
  })
  @IsOptional()
  @IsString()
  codigoContenedor?: string;

  @ApiPropertyOptional({
    enum: ['baja', 'media', 'alta'],
    default: 'media',
    example: 'alta',
  })
  @IsOptional()
  @IsIn(['baja', 'media', 'alta'])
  prioridad?: PrioridadTicket;
}

export class ResponderTicketSoporteDto {
  @ApiProperty({
    example:
      'El manifiesto fue validado en sistema ECUAPASS y está listo para desembarque.',
    minLength: 5,
  })
  @IsString()
  @MinLength(5)
  respuesta: string;

  @ApiPropertyOptional({
    enum: ['en_proceso', 'resuelto', 'cerrado'],
    default: 'resuelto',
    example: 'resuelto',
  })
  @IsOptional()
  @IsIn(['en_proceso', 'resuelto', 'cerrado'])
  estado?: Exclude<EstadoTicket, 'abierto'>;
}
