import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { TrackingService } from './tracking.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolUsuario } from '../../common/enums/rol.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/interfaces/api-response.interface';

@ApiTags('Cargas y Seguimiento (/cargas y /viajes)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  @Get('cargas/mis-cargas')
  @Roles(RolUsuario.CLIENTE, RolUsuario.GERENTE, RolUsuario.ADMIN)
  @ApiOperation({
    summary: 'Obtener cargas asociadas al cliente autenticado',
  })
  @ApiQuery({
    name: 'estado',
    required: false,
    enum: ['en_curso', 'completados'],
  })
  @ApiResponse({ status: 200, description: 'Cargas obtenidas correctamente' })
  async obtenerMisCargas(
    @CurrentUser() user: JwtPayload,
    @Query('estado') estado?: string,
  ) {
    const data = await this.trackingService.obtenerMisCargas(user, estado);
    return {
      message: 'Cargas obtenidas correctamente',
      data,
    };
  }

  @Get('cargas/:id/timeline')
  @Roles(
    RolUsuario.CLIENTE,
    RolUsuario.OPERADOR,
    RolUsuario.GERENTE,
    RolUsuario.ADMIN,
  )
  @ApiOperation({
    summary:
      'Obtener historial vertical de eventos (Timeline) de un contenedor',
  })
  @ApiResponse({ status: 200, description: 'Timeline obtenido' })
  async obtenerTimeline(@Param('id') id: string) {
    const data = await this.trackingService.obtenerTimeline(id);
    return {
      message: 'Timeline obtenido',
      data,
    };
  }

  @Get('viajes')
  @Roles(
    RolUsuario.CLIENTE,
    RolUsuario.OPERADOR,
    RolUsuario.GERENTE,
    RolUsuario.ADMIN,
  )
  @ApiOperation({
    summary: 'Listar viajes marítimos con buque y puertos de origen/destino',
  })
  @ApiResponse({ status: 200, description: 'Viajes obtenidos correctamente' })
  async listarViajes() {
    const data = await this.trackingService.listarViajes();
    return {
      message: 'Viajes obtenidos correctamente',
      data,
    };
  }
}
