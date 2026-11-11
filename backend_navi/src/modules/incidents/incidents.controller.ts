import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
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
  @UseInterceptors(FileInterceptor('foto'))
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOperation({
    summary:
      'Reportar incidente en puerto o ruta (con fotografía opcional) y registrar alerta crítica en Redis (alertas:activas)',
  })
  @ApiResponse({ status: 201, description: 'Incidente reportado exitosamente' })
  async reportar(
    @Body() dto: CreateIncidenteDto,
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const data = await this.incidentsService.reportarIncidente(
      dto,
      user.sub,
      file,
    );
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
