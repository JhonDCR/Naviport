import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { IncidentsService } from './incidents.service';
import {
  CreateIncidenteDto,
  UpdateEstadoIncidenteDto,
} from './dto/create-incidente.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolUsuario } from '../../common/enums/rol.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/interfaces/api-response.interface';

const INCIDENT_MULTER_OPTIONS = {
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (
    _req: unknown,
    file: Express.Multer.File,
    cb: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(file.mimetype)) {
      return cb(
        new BadRequestException(
          'Solo se permiten imágenes JPEG, PNG o WEBP de hasta 5 MB',
        ),
        false,
      );
    }
    return cb(null, true);
  },
};

@ApiTags('Incidentes Operativos (/incidentes)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('incidentes')
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  @Post('reportar')
  @HttpCode(HttpStatus.CREATED)
  @Roles(RolUsuario.OPERADOR, RolUsuario.ADMIN)
  @UseInterceptors(FileInterceptor('foto', INCIDENT_MULTER_OPTIONS))
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOperation({
    summary:
      'Reportar incidente en puerto o ruta (con fotografía opcional máx. 5 MB) y registrar alerta crítica en Redis (alertas:activas)',
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
  @ApiQuery({
    name: 'estado',
    required: false,
    enum: ['abierto', 'en_revision', 'resuelto'],
  })
  @ApiOperation({ summary: 'Listar incidentes registrados' })
  @ApiResponse({ status: 200, description: 'Lista de incidentes' })
  async listar(@Query('estado') estado?: string) {
    const data = await this.incidentsService.listarIncidentes(estado);
    return {
      message: 'Incidentes obtenidos correctamente',
      data,
    };
  }

  @Patch(':id/estado')
  @Roles(RolUsuario.GERENTE, RolUsuario.ADMIN)
  @ApiOperation({
    summary:
      'Actualizar el estado de un incidente (abierto, en_revision, resuelto) y limpiar alertas en Redis si se resuelve',
  })
  @ApiResponse({ status: 200, description: 'Estado del incidente actualizado' })
  async actualizarEstado(
    @Param('id') id: string,
    @Body() dto: UpdateEstadoIncidenteDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.incidentsService.actualizarEstadoIncidente(
      id,
      dto,
      user.sub,
    );
    return {
      message: 'Estado del incidente actualizado correctamente',
      data,
    };
  }
}
