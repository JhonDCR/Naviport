import {
  BadRequestException,
  Body,
  CallHandler,
  Controller,
  ExecutionContext,
  Get,
  HttpCode,
  HttpStatus,
  Injectable,
  NestInterceptor,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Observable } from 'rxjs';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ScannerService } from './scanner.service';
import { InspeccionOpticaDto } from './dto/scanner.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolUsuario } from '../../common/enums/rol.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/interfaces/api-response.interface';

const IMAGE_MULTER_OPTIONS = {
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

@Injectable()
class NormalizeMultipartBodyInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<{
      body?: Record<string, unknown>;
    }>();
    if (req.body && Object.prototype.hasOwnProperty.call(req.body, 'daÃ±osDetectados')) {
      req.body['dañosDetectados'] = req.body['daÃ±osDetectados'];
      delete req.body['daÃ±osDetectados'];
    }
    return next.handle();
  }
}

@ApiTags('Escáner IA con Cámara (/escaner)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('escaner')
export class ScannerController {
  constructor(private readonly scannerService: ScannerService) {}

  @Post('inspeccion-optica')
  @HttpCode(HttpStatus.CREATED)
  @Roles(RolUsuario.OPERADOR, RolUsuario.ADMIN)
  @UseInterceptors(
    FileInterceptor('foto', IMAGE_MULTER_OPTIONS),
    NormalizeMultipartBodyInterceptor,
  )
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOperation({
    summary:
      'Procesar imagen de contenedor mediante inspección óptica IA y registrar evidencia (máx. 5 MB)',
  })
  @ApiResponse({
    status: 201,
    description: 'Inspección óptica procesada por IA',
  })
  async inspeccionOptica(
    @Body() dto: InspeccionOpticaDto,
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const data = await this.scannerService.procesarInspeccionOptica(
      dto,
      file?.originalname,
      file?.buffer,
      user,
      file?.mimetype,
    );
    return {
      message: 'Inspección óptica procesada por IA',
      data,
    };
  }

  @Get('historial')
  @Roles(RolUsuario.OPERADOR, RolUsuario.GERENTE, RolUsuario.ADMIN)
  @ApiQuery({ name: 'estado', required: false, enum: ['ok', 'sello_roto', 'averia'] })
  @ApiQuery({ name: 'soloMios', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 25 })
  @ApiOperation({
    summary:
      'Obtener historial de registros de contenedores escaneados con IA',
  })
  @ApiResponse({
    status: 200,
    description: 'Historial de inspecciones ópticas obtenido',
  })
  async obtenerHistorial(
    @CurrentUser() user: JwtPayload,
    @Query('estado') estado?: string,
    @Query('soloMios') soloMios?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const data = await this.scannerService.obtenerHistorialEscaneos(
      {
        estado,
        soloMios: soloMios === 'true',
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 25,
      },
      user,
    );
    return {
      message: 'Historial de inspecciones ópticas obtenido',
      data,
    };
  }

  @Get('resumen-operador')
  @Roles(RolUsuario.OPERADOR, RolUsuario.GERENTE, RolUsuario.ADMIN)
  @ApiOperation({
    summary:
      'Obtener métricas de rendimiento diario (Escaneos hoy) y últimos registros del operador autenticado',
  })
  @ApiResponse({
    status: 200,
    description: 'Resumen operativo del empleado obtenido',
  })
  async obtenerResumenOperador(@CurrentUser() user: JwtPayload) {
    const data = await this.scannerService.obtenerResumenOperador(user);
    return {
      message: 'Resumen operativo del empleado obtenido',
      data,
    };
  }
}

