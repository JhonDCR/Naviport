import {
  Body,
  Controller,
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
import { ScannerService } from './scanner.service';
import { InspeccionOpticaDto } from './dto/scanner.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolUsuario } from '../../common/enums/rol.enum';

@ApiTags('Escáner IA con Cámara (/escaner)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('escaner')
export class ScannerController {
  constructor(private readonly scannerService: ScannerService) {}

  @Post('inspeccion-optica')
  @HttpCode(HttpStatus.CREATED)
  @Roles(RolUsuario.OPERADOR, RolUsuario.ADMIN)
  @UseInterceptors(FileInterceptor('foto'))
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOperation({
    summary:
      'Procesar imagen de contenedor mediante inspección óptica IA y registrar evidencia',
  })
  @ApiResponse({
    status: 201,
    description: 'Inspección óptica procesada por IA',
  })
  async inspeccionOptica(
    @Body() dto: InspeccionOpticaDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const data = await this.scannerService.procesarInspeccionOptica(
      dto,
      file?.originalname,
    );
    return {
      message: 'Inspección óptica procesada por IA',
      data,
    };
  }
}
