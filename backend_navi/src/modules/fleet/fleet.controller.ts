import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FleetService } from './fleet.service';
import {
  CreateBuqueDto,
  CreateMantenimientoDto,
  CreatePuertoDto,
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
  @ApiOperation({ summary: 'Listar buques de la flota naviera' })
  @ApiResponse({ status: 200, description: 'Lista de buques' })
  async listarBuques() {
    const data = await this.fleetService.listarBuques();
    return {
      message: 'Buques obtenidos correctamente',
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
}
