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
import { IncidentsService } from './incidents.service';
import { CreateIncidenteDto } from './dto/create-incidente.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolUsuario } from '../../common/enums/rol.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/interfaces/api-response.interface';

@ApiTags('Incidentes Operativos (/incidentes)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('incidentes')
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  @Post('reportar')
  @HttpCode(HttpStatus.CREATED)
  @Roles(RolUsuario.OPERADOR, RolUsuario.ADMIN)
  @ApiOperation({
    summary:
      'Reportar incidente en puerto o ruta y registrar alerta crítica en Redis (alertas:activas)',
  })
  @ApiResponse({ status: 201, description: 'Incidente reportado exitosamente' })
  async reportar(
    @Body() dto: CreateIncidenteDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.incidentsService.reportarIncidente(dto, user.sub);
    return {
      message: 'Incidente reportado y alerta registrada en Redis',
      data,
    };
  }

  @Get()
  @Roles(RolUsuario.OPERADOR, RolUsuario.GERENTE, RolUsuario.ADMIN)
  @ApiOperation({ summary: 'Listar incidentes registrados' })
  @ApiResponse({ status: 200, description: 'Lista de incidentes' })
  async listar() {
    const data = await this.incidentsService.listarIncidentes();
    return {
      message: 'Incidentes obtenidos correctamente',
      data,
    };
  }
}
