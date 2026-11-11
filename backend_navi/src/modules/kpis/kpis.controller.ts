import { Controller, Delete, Get, Param, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { KpisService } from './kpis.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolUsuario } from '../../common/enums/rol.enum';

@ApiTags('KPIs y Analítica (/kpis)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('kpis')
export class KpisController {
  constructor(private readonly kpisService: KpisService) {}

  @Get('resumen')
  @Roles(RolUsuario.GERENTE, RolUsuario.ADMIN)
  @ApiOperation({
    summary:
      'Obtener resumen de KPIs gerenciales desde caché Redis (kpi:resumen, TTL 300s) o agregación MongoDB',
  })
  @ApiResponse({ status: 200, description: 'Resumen de KPIs obtenido' })
  async obtenerResumen() {
    const data = await this.kpisService.obtenerResumen();
    return {
      message: 'Resumen de KPIs obtenido',
      data,
    };
  }

  @Get('alertas-activas')
  @Roles(RolUsuario.GERENTE, RolUsuario.ADMIN)
  @ApiOperation({
    summary:
      'Obtener alertas operativas críticas desde el Set de Redis (alertas:activas)',
  })
  @ApiResponse({ status: 200, description: 'Alertas críticas activas' })
  async obtenerAlertasActivas() {
    const data = await this.kpisService.obtenerAlertasActivas();
    return {
      message: 'Alertas críticas activas',
      data,
    };
  }

  @Delete('alertas-activas/:id')
  @Roles(RolUsuario.GERENTE, RolUsuario.ADMIN)
  @ApiOperation({
    summary:
      'Resolver y eliminar una alerta crítica del Set de Redis (SREM alertas:activas)',
  })
  @ApiParam({
    name: 'id',
    example: 'viaje_retrasado:V-2026-014',
    description: 'Identificador completo de la alerta en Redis',
  })
  @ApiResponse({ status: 200, description: 'Alerta resuelta y eliminada' })
  async resolverAlerta(@Param('id') id: string) {
    const data = await this.kpisService.resolverAlertaActiva(id);
    return {
      message: 'Alerta crítica resuelta y eliminada de Redis',
      data,
    };
  }
}

