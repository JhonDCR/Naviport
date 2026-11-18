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
import { SupportService } from './support.service';
import {
  CreateTicketSoporteDto,
  ResponderTicketSoporteDto,
} from './dto/support.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolUsuario } from '../../common/enums/rol.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/interfaces/api-response.interface';

@ApiTags('Soporte Técnico y Asistencia (/soporte)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('soporte')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(
    RolUsuario.CLIENTE,
    RolUsuario.OPERADOR,
    RolUsuario.GERENTE,
    RolUsuario.ADMIN,
  )
  @ApiOperation({
    summary:
      'Crear un ticket de soporte (Contactar Agente, Contactar Supervisor o Reportar fallo de la App)',
  })
  @ApiResponse({ status: 201, description: 'Ticket de soporte registrado' })
  async crearTicket(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateTicketSoporteDto,
  ) {
    const data = await this.supportService.crearTicket(user, dto);
    return {
      message: 'Ticket de soporte enviado correctamente',
      data,
    };
  }

  @Get('mis-tickets')
  @Roles(
    RolUsuario.CLIENTE,
    RolUsuario.OPERADOR,
    RolUsuario.GERENTE,
    RolUsuario.ADMIN,
  )
  @ApiOperation({
    summary: 'Listar los tickets de soporte enviados por el usuario autenticado',
  })
  @ApiResponse({ status: 200, description: 'Tickets del usuario obtenidos' })
  async obtenerMisTickets(@CurrentUser() user: JwtPayload) {
    const data = await this.supportService.obtenerMisTickets(user);
    return {
      message: 'Mis tickets obtenidos correctamente',
      data,
    };
  }

  @Get()
  @Roles(RolUsuario.GERENTE, RolUsuario.ADMIN)
  @ApiQuery({
    name: 'estado',
    required: false,
    enum: ['abierto', 'en_proceso', 'resuelto', 'cerrado'],
  })
  @ApiQuery({
    name: 'tipo',
    required: false,
    enum: ['agente_aduanas', 'supervisor', 'fallo_app', 'consulta_general'],
  })
  @ApiOperation({
    summary: 'Listar todos los tickets de soporte (Gerente/Admin)',
  })
  @ApiResponse({ status: 200, description: 'Tickets obtenidos correctamente' })
  async listarTickets(
    @Query('estado') estado?: string,
    @Query('tipo') tipo?: string,
  ) {
    const data = await this.supportService.listarTickets({ estado, tipo });
    return {
      message: 'Tickets de soporte obtenidos correctamente',
      data,
    };
  }

  @Patch(':id/responder')
  @Roles(RolUsuario.GERENTE, RolUsuario.ADMIN)
  @ApiOperation({
    summary:
      'Responder y actualizar el estado de un ticket de soporte (notifica automáticamente al solicitante)',
  })
  @ApiResponse({ status: 200, description: 'Ticket respondido correctamente' })
  async responderTicket(
    @Param('id') id: string,
    @Body() dto: ResponderTicketSoporteDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.supportService.responderTicket(id, dto, user);
    return {
      message: 'Respuesta registrada y usuario notificado',
      data,
    };
  }
}
