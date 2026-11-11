import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { TrackingService } from './tracking.service';
import {
  AddEventoTimelineDto,
  CreateCargaDto,
  CreateViajeDto,
  UpdateEstadoViajeDto,
} from './dto/tracking.dto';
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
    summary:
      'Obtener cargas asociadas al cliente autenticado con filtro por estado y búsqueda',
  })
  @ApiQuery({
    name: 'estado',
    required: false,
    enum: ['en_curso', 'completados'],
  })
  @ApiQuery({
    name: 'q',
    required: false,
    description: 'Buscar por código de contenedor, buque, viaje o puerto',
  })
  @ApiResponse({ status: 200, description: 'Cargas obtenidas correctamente' })
  async obtenerMisCargas(
    @CurrentUser() user: JwtPayload,
    @Query('estado') estado?: string,
    @Query('q') busqueda?: string,
  ) {
    const data = await this.trackingService.obtenerMisCargas(
      user,
      estado,
      busqueda,
    );
    return {
      message: 'Cargas obtenidas correctamente',
      data,
    };
  }

  @Get('cargas/resumen-cliente')
  @Roles(RolUsuario.CLIENTE, RolUsuario.GERENTE, RolUsuario.ADMIN)
  @ApiOperation({
    summary:
      'Obtener resumen de métricas rápidas y envío destacado para la pantalla Inicio (Home Cliente)',
  })
  @ApiResponse({
    status: 200,
    description: 'Resumen del cliente obtenido correctamente',
  })
  async obtenerResumenCliente(@CurrentUser() user: JwtPayload) {
    const data = await this.trackingService.obtenerResumenCliente(user);
    return {
      message: 'Resumen del cliente obtenido correctamente',
      data,
    };
  }

  @Get('cargas/notificaciones')
  @Roles(RolUsuario.CLIENTE, RolUsuario.GERENTE, RolUsuario.ADMIN)
  @ApiOperation({
    summary:
      'Obtener notificaciones de arribos, retrasos y eventos de timeline de los contenedores del cliente',
  })
  @ApiResponse({
    status: 200,
    description: 'Notificaciones obtenidas correctamente',
  })
  async obtenerNotificacionesCliente(@CurrentUser() user: JwtPayload) {
    const data = await this.trackingService.obtenerNotificacionesCliente(user);
    return {
      message: 'Notificaciones obtenidas correctamente',
      data,
    };
  }

  @Get('cargas/:id')
  @Roles(
    RolUsuario.CLIENTE,
    RolUsuario.OPERADOR,
    RolUsuario.GERENTE,
    RolUsuario.ADMIN,
  )
  @ApiOperation({
    summary:
      'Obtener detalle técnico completo de un contenedor (Detalle Pedido) por ID o código (#CN-9823)',
  })
  @ApiResponse({
    status: 200,
    description: 'Detalle del contenedor obtenido correctamente',
  })
  async obtenerDetalleCarga(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.trackingService.obtenerDetalleCarga(id, user);
    return {
      message: 'Detalle del contenedor obtenido correctamente',
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
  async obtenerTimeline(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.trackingService.obtenerTimeline(id, user);
    return {
      message: 'Timeline obtenido',
      data,
    };
  }

  @Post('cargas')
  @HttpCode(HttpStatus.CREATED)
  @Roles(RolUsuario.ADMIN, RolUsuario.GERENTE)
  @ApiOperation({
    summary:
      'Registrar un nuevo contenedor/carga asociado a un viaje y a un cliente',
  })
  @ApiResponse({ status: 201, description: 'Carga registrada correctamente' })
  async crearCarga(@Body() dto: CreateCargaDto) {
    const data = await this.trackingService.crearCarga(dto);
    return {
      message: 'Carga registrada correctamente',
      data,
    };
  }

  @Post('cargas/:id/eventos')
  @HttpCode(HttpStatus.CREATED)
  @Roles(RolUsuario.OPERADOR, RolUsuario.GERENTE, RolUsuario.ADMIN)
  @ApiOperation({
    summary:
      'Agregar un nuevo hito/evento al timeline de un contenedor (Operador/Admin)',
  })
  @ApiResponse({
    status: 201,
    description: 'Evento agregado al timeline del contenedor',
  })
  async agregarEventoTimeline(
    @Param('id') id: string,
    @Body() dto: AddEventoTimelineDto,
  ) {
    const data = await this.trackingService.agregarEventoTimeline(id, dto);
    return {
      message: 'Evento agregado al timeline del contenedor',
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

  @Get('viajes/:id')
  @Roles(
    RolUsuario.CLIENTE,
    RolUsuario.OPERADOR,
    RolUsuario.GERENTE,
    RolUsuario.ADMIN,
  )
  @ApiOperation({
    summary: 'Obtener detalle de un viaje marítimo por ID o código',
  })
  @ApiResponse({ status: 200, description: 'Detalle del viaje obtenido' })
  async obtenerViajePorId(@Param('id') id: string) {
    const data = await this.trackingService.obtenerViajePorId(id);
    return {
      message: 'Detalle del viaje obtenido correctamente',
      data,
    };
  }

  @Post('viajes')
  @HttpCode(HttpStatus.CREATED)
  @Roles(RolUsuario.ADMIN, RolUsuario.GERENTE)
  @ApiOperation({
    summary: 'Programar un nuevo viaje marítimo en una ruta (Admin/Gerente)',
  })
  @ApiResponse({ status: 201, description: 'Viaje programado correctamente' })
  async crearViaje(@Body() dto: CreateViajeDto) {
    const data = await this.trackingService.crearViaje(dto);
    return {
      message: 'Viaje programado correctamente',
      data,
    };
  }

  @Patch('viajes/:id/estado')
  @Roles(RolUsuario.OPERADOR, RolUsuario.GERENTE, RolUsuario.ADMIN)
  @ApiOperation({
    summary:
      'Actualizar estado del viaje o coordenadas GeoJSON (pin en el mapa) y sincronizar alertas en Redis',
  })
  @ApiResponse({ status: 200, description: 'Viaje actualizado correctamente' })
  async actualizarEstadoViaje(
    @Param('id') id: string,
    @Body() dto: UpdateEstadoViajeDto,
  ) {
    const data = await this.trackingService.actualizarEstadoViaje(id, dto);
    return {
      message: 'Viaje actualizado correctamente',
      data,
    };
  }
}

