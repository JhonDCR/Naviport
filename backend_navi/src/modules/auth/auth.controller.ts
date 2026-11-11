import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, UpdateEstadoUsuarioDto } from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolUsuario } from '../../common/enums/rol.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/interfaces/api-response.interface';

@ApiTags('Autenticación y Usuarios (/auth)')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Iniciar sesión y registrar sesión activa en Redis',
  })
  @ApiResponse({ status: 200, description: 'Autenticación satisfactoria' })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  async login(@Body() dto: LoginDto) {
    const data = await this.authService.login(dto);
    return {
      message: 'Autenticación satisfactoria',
      data,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Cerrar sesión e invalidar sesion:{idUsuario} en Redis',
  })
  @ApiResponse({ status: 200, description: 'Sesión cerrada exitosamente' })
  async logout(@CurrentUser() user: JwtPayload) {
    const data = await this.authService.logout(user.sub);
    return {
      message: 'Sesión cerrada y revocada en Redis',
      data,
    };
  }

  @Get('perfil')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener perfil del usuario autenticado' })
  @ApiResponse({ status: 200, description: 'Perfil obtenido' })
  async obtenerPerfil(@CurrentUser() user: JwtPayload) {
    const data = await this.authService.obtenerPerfil(user.sub);
    return {
      message: 'Perfil de usuario obtenido',
      data,
    };
  }

  @Get('usuarios')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar todos los usuarios del sistema (Admin)' })
  @ApiResponse({ status: 200, description: 'Lista de usuarios' })
  async listarUsuarios() {
    const data = await this.authService.listarUsuarios();
    return {
      message: 'Usuarios obtenidos correctamente',
      data,
    };
  }

  @Patch('usuarios/:id/estado')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Activar o suspender un usuario (revoca sesión en Redis en tiempo real)',
  })
  @ApiResponse({ status: 200, description: 'Estado de usuario actualizado' })
  async cambiarEstadoUsuario(
    @Param('id') id: string,
    @Body() dto: UpdateEstadoUsuarioDto,
  ) {
    const data = await this.authService.cambiarEstadoUsuario(id, dto.activo);
    return {
      message: dto.activo
        ? 'Usuario activado correctamente'
        : 'Usuario suspendido y sesión revocada en Redis',
      data,
    };
  }
}
