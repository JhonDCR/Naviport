import {
  Body,
  Controller,
  Delete,
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
import {
  BuqueEnriquecido,
  BuquesPaginadosResponse,
  FleetService,
} from './fleet.service';
import {
  CreateBuqueDto,
  CreateMantenimientoDto,
  CreatePuertoDto,
  UpdateBuqueDto,
  UpdateEstadoBuqueDto,
  UpdateEstadoMantenimientoDto,
  UpdatePuertoDto,
} from './dto/fleet.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolUsuario } from '../../common/enums/rol.enum';

@ApiTags('Gestión de Flota, Puertos y Mantenimientos (/buques, /puertos, /mantenimientos)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class FleetController {
  constructor(private readonly fleetService: FleetService) {}

  @Get('buques')
  @Roles(
    RolUsuario.OPERADOR,
    RolUsuario.GERENTE,
    RolUsuario.ADMIN,
    RolUsuario.CLIENTE,
  )
  @ApiQuery({ name: 'q', required: false, description: 'Buscar por IMO, nombre, capitán o ruta' })
  @ApiQuery({
    name: 'estado',
    required: false,
    enum: ['todos', 'en_ruta', 'en_puerto', 'retraso', 'mantenimiento', 'activo', 'inactivo'],
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiOperation({
    summary:
      'Listar buques de la flota naviera con filtros, viaje activo enriquecido y paginación opcional',
  })
  @ApiResponse({ status: 200, description: 'Lista de buques' })
  async listarBuques(
    @Query('q') q?: string,
    @Query('estado') estado?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<{
    message: string;
    data: BuqueEnriquecido[] | BuquesPaginadosResponse;
  }> {
    const data = await this.fleetService.listarBuques({
      q,
      estado,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
    return {
      message: 'Buques obtenidos correctamente',
      data,
    };
  }

  @Get('buques/resumen-flota')
  @Roles(RolUsuario.GERENTE, RolUsuario.ADMIN, RolUsuario.OPERADOR)
  @ApiOperation({
    summary:
      'Obtener contadores agregados de flota (Total, En tránsito, En puerto, Retraso, Mantenimiento, Capacidad neta)',
  })
  @ApiResponse({ status: 200, description: 'Resumen de flota obtenido' })
  async obtenerResumenFlota() {
    const data = await this.fleetService.obtenerResumenFlota();
    return {
      message: 'Resumen de flota obtenido correctamente',
      data,
    };
  }

  @Get('buques/exportar-csv')
  @Roles(RolUsuario.GERENTE, RolUsuario.ADMIN)
  @ApiOperation({
    summary: 'Exportar directorio completo de buques en formato CSV',
  })
  @ApiResponse({ status: 200, description: 'CSV de buques generado' })
  async exportarBuquesCsv() {
    const data = await this.fleetService.exportarBuquesCsv();
    return {
      message: 'CSV de flota generado correctamente',
      data,
    };
  }

  @Post('buques')
  @HttpCode(HttpStatus.CREATED)
  @Roles(RolUsuario.ADMIN)
  @ApiOperation({ summary: 'Registrar un nuevo buque en la flota (Admin)' })
  @ApiResponse({ status: 201, description: 'Buque creado' })
  async crearBuque(@Body() dto: CreateBuqueDto) {
    const data = await this.fleetService.crearBuque(dto);
    return {
      message: 'Buque registrado correctamente',
      data,
    };
  }

  @Patch('buques/:id')
  @Roles(RolUsuario.GERENTE, RolUsuario.ADMIN)
  @ApiOperation({
    summary: 'Editar datos generales de un buque (nombre, IMO, capacidad, capitán, estado)',
  })
  @ApiResponse({ status: 200, description: 'Buque actualizado' })
  async actualizarBuque(@Param('id') id: string, @Body() dto: UpdateBuqueDto) {
    const data = await this.fleetService.actualizarBuque(id, dto);
    return {
      message: 'Buque actualizado correctamente',
      data,
    };
  }

  @Patch('buques/:id/estado')
  @Roles(RolUsuario.GERENTE, RolUsuario.ADMIN)
  @ApiOperation({
    summary:
      'Cambiar el estado operativo de un buque (activo, mantenimiento, inactivo)',
  })
  @ApiResponse({ status: 200, description: 'Estado del buque actualizado' })
  async actualizarEstadoBuque(
    @Param('id') id: string,
    @Body() dto: UpdateEstadoBuqueDto,
  ) {
    const data = await this.fleetService.actualizarEstadoBuque(id, dto);
    return {
      message: 'Estado del buque actualizado correctamente',
      data,
    };
  }

  @Delete('buques/:id')
  @Roles(RolUsuario.ADMIN)
  @ApiOperation({ summary: 'Eliminar un buque sin viajes asociados (Admin)' })
  @ApiResponse({ status: 200, description: 'Buque eliminado' })
  async eliminarBuque(@Param('id') id: string) {
    const data = await this.fleetService.eliminarBuque(id);
    return {
      message: 'Buque eliminado correctamente',
      data,
    };
  }

  @Get('puertos')
  @Roles(
    RolUsuario.CLIENTE,
    RolUsuario.OPERADOR,
    RolUsuario.GERENTE,
    RolUsuario.ADMIN,
  )
  @ApiOperation({
    summary: 'Listar puertos marítimos registrados con coordenadas GeoJSON',
  })
  @ApiResponse({ status: 200, description: 'Lista de puertos' })
  async listarPuertos() {
    const data = await this.fleetService.listarPuertos();
    return {
      message: 'Puertos obtenidos correctamente',
      data,
    };
  }

  @Post('puertos')
  @HttpCode(HttpStatus.CREATED)
  @Roles(RolUsuario.ADMIN)
  @ApiOperation({ summary: 'Registrar un nuevo puerto marítimo (Admin)' })
  @ApiResponse({ status: 201, description: 'Puerto registrado' })
  async crearPuerto(@Body() dto: CreatePuertoDto) {
    const data = await this.fleetService.crearPuerto(dto);
    return {
      message: 'Puerto registrado correctamente',
      data,
    };
  }

  @Patch('puertos/:id')
  @Roles(RolUsuario.ADMIN)
  @ApiOperation({ summary: 'Editar información o coordenadas de un puerto (Admin)' })
  @ApiResponse({ status: 200, description: 'Puerto actualizado' })
  async actualizarPuerto(
    @Param('id') id: string,
    @Body() dto: UpdatePuertoDto,
  ) {
    const data = await this.fleetService.actualizarPuerto(id, dto);
    return {
      message: 'Puerto actualizado correctamente',
      data,
    };
  }

  @Delete('puertos/:id')
  @Roles(RolUsuario.ADMIN)
  @ApiOperation({ summary: 'Eliminar un puerto sin viajes vinculados (Admin)' })
  @ApiResponse({ status: 200, description: 'Puerto eliminado' })
  async eliminarPuerto(@Param('id') id: string) {
    const data = await this.fleetService.eliminarPuerto(id);
    return {
      message: 'Puerto eliminado correctamente',
      data,
    };
  }

  @Get('mantenimientos')
  @Roles(RolUsuario.GERENTE, RolUsuario.ADMIN)
  @ApiOperation({ summary: 'Listar mantenimientos de buques' })
  @ApiResponse({ status: 200, description: 'Lista de mantenimientos' })
  async listarMantenimientos() {
    const data = await this.fleetService.listarMantenimientos();
    return {
      message: 'Mantenimientos obtenidos correctamente',
      data,
    };
  }

  @Post('mantenimientos')
  @HttpCode(HttpStatus.CREATED)
  @Roles(RolUsuario.ADMIN)
  @ApiOperation({ summary: 'Programar mantenimiento de un buque (Admin)' })
  @ApiResponse({ status: 201, description: 'Mantenimiento programado' })
  async programarMantenimiento(@Body() dto: CreateMantenimientoDto) {
    const data = await this.fleetService.programarMantenimiento(dto);
    return {
      message: 'Mantenimiento programado correctamente',
      data,
    };
  }

  @Patch('mantenimientos/:id/estado')
  @Roles(RolUsuario.GERENTE, RolUsuario.ADMIN)
  @ApiOperation({
    summary:
      'Completar o actualizar estado de mantenimiento y limpiar alerta vencida en Redis',
  })
  @ApiResponse({
    status: 200,
    description: 'Mantenimiento actualizado correctamente',
  })
  async actualizarEstadoMantenimiento(
    @Param('id') id: string,
    @Body() dto: UpdateEstadoMantenimientoDto,
  ) {
    const data = await this.fleetService.actualizarEstadoMantenimiento(id, dto);
    return {
      message: 'Estado de mantenimiento actualizado correctamente',
      data,
    };
  }

  @Delete('mantenimientos/:id')
  @Roles(RolUsuario.ADMIN)
  @ApiOperation({ summary: 'Eliminar un registro de mantenimiento (Admin)' })
  @ApiResponse({ status: 200, description: 'Mantenimiento eliminado' })
  async eliminarMantenimiento(@Param('id') id: string) {
    const data = await this.fleetService.eliminarMantenimiento(id);
    return {
      message: 'Registro de mantenimiento eliminado correctamente',
      data,
    };
  }
}

