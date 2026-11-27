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
import { AuthService } from './auth.service';
import { GoogleAuthService } from './google-auth.service';
import {
  CambiarPasswordDto,
  ControlTurnoDto,
  CreateUsuarioDto,
  GoogleLoginDto,
  LoginDto,
  UpdateEstadoUsuarioDto,
  UpdatePerfilDto,
  UpdatePreferenciasDto,
  UpdateUsuarioAdminDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolUsuario } from '../../common/enums/rol.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/interfaces/api-response.interface';

@ApiTags('Autenticación y Usuarios (/auth)')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly googleAuth: GoogleAuthService,
  ) {}

  @Post('google/challenge')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Preparar una comprobación de acceso con Google' })
  async prepararGoogle() {
    return { enabled: await this.googleAuth.challenge() };
  }

  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validar la credencial firmada por Google' })
  async iniciarConGoogle(@Body() dto: GoogleLoginDto) {
    return {
      message: 'Autenticación satisfactoria',
      data: await this.googleAuth.login(dto.credential),
    };
  }

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

  @Post('registro')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Registrar un nuevo cliente en la plataforma NaviPort (el registro público asigna rol cliente por seguridad)',
  })
  @ApiResponse({ status: 201, description: 'Usuario registrado exitosamente' })
  @ApiResponse({ status: 409, description: 'El correo ya está registrado' })
  async registrar(@Body() dto: CreateUsuarioDto) {
    const data = await this.authService.registrarUsuario(dto, false);
    return {
      message: 'Usuario registrado exitosamente',
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

  @Patch('perfil')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Actualizar datos del perfil del usuario autenticado',
  })
  @ApiResponse({ status: 200, description: 'Perfil actualizado correctamente' })
  async actualizarPerfil(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdatePerfilDto,
  ) {
    const data = await this.authService.actualizarPerfil(user.sub, dto);
    return {
      message: 'Perfil actualizado correctamente',
      data,
    };
  }

  @Patch('preferencias')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Actualizar preferencias de aplicación (notificacionesPush, modoOscuro, idioma)',
  })
  @ApiResponse({
    status: 200,
    description: 'Preferencias actualizadas correctamente',
  })
  async actualizarPreferencias(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdatePreferenciasDto,
  ) {
    const data = await this.authService.actualizarPreferencias(user.sub, dto);
    return {
      message: 'Preferencias actualizadas correctamente',
      data,
    };
  }

  @Patch('cambiar-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Cambiar contraseña del usuario autenticado verificando la actual',
  })
  @ApiResponse({
    status: 200,
    description: 'Contraseña actualizada correctamente',
  })
  async cambiarPassword(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CambiarPasswordDto,
  ) {
    const data = await this.authService.cambiarPassword(user.sub, dto);
    return {
      message: 'Contraseña actualizada correctamente',
      data,
    };
  }

  @Patch('turno')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.OPERADOR, RolUsuario.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Iniciar o finalizar turno operativo del empleado (persiste en colección turnos y caché Redis)',
  })
  @ApiResponse({ status: 200, description: 'Estado de turno actualizado' })
  async controlarTurno(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ControlTurnoDto,
  ) {
    const data = await this.authService.controlarTurno(user.sub, dto);
    return {
      message: dto.turnoActivo
        ? 'Turno operativo iniciado'
        : 'Turno operativo finalizado',
      data,
    };
  }

  @Get('turnos/mi-historial')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.OPERADOR, RolUsuario.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Obtener el turno activo actual e historial laboral de turnos del operador autenticado',
  })
  @ApiResponse({ status: 200, description: 'Historial de turnos obtenido' })
  async obtenerMisTurnos(@CurrentUser() user: JwtPayload) {
    const data = await this.authService.obtenerMisTurnos(user.sub);
    return {
      message: 'Historial de turnos obtenido correctamente',
      data,
    };
  }

  @Get('turnos')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.GERENTE, RolUsuario.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Listar todos los turnos operativos de empleados (Gerente/Admin)',
  })
  @ApiResponse({ status: 200, description: 'Turnos obtenidos' })
  async listarTodosTurnos() {
    const data = await this.authService.listarTodosTurnos();
    return {
      message: 'Turnos obtenidos correctamente',
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

  @Post('usuarios')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Crear un usuario con cualquier rol desde el panel Admin',
  })
  @ApiResponse({ status: 201, description: 'Usuario creado por administrador' })
  async crearUsuarioAdmin(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateUsuarioDto,
  ) {
    const data = await this.authService.registrarUsuario(dto, true, user.sub);
    return {
      message: 'Usuario creado correctamente',
      data,
    };
  }

  @Patch('usuarios/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Editar nombre, rol, estado o detalles de perfil de un usuario (Admin)',
  })
  @ApiResponse({ status: 200, description: 'Usuario actualizado correctamente' })
  async actualizarUsuarioAdmin(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateUsuarioAdminDto,
  ) {
    const data = await this.authService.actualizarUsuarioAdmin(
      id,
      dto,
      user.sub,
    );
    return {
      message: 'Usuario actualizado correctamente',
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
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateEstadoUsuarioDto,
  ) {
    const data = await this.authService.cambiarEstadoUsuario(
      id,
      dto.activo,
      user.sub,
    );
    return {
      message: dto.activo
        ? 'Usuario activado correctamente'
        : 'Usuario suspendido y sesión revocada en Redis',
      data,
    };
  }

  @Get('auditoria')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.ADMIN)
  @ApiBearerAuth()
  @ApiQuery({ name: 'limite', required: false, example: 50 })
  @ApiOperation({
    summary:
      'Consultar historial reciente de eventos de auditoría almacenados en Redis (Admin)',
  })
  @ApiResponse({ status: 200, description: 'Logs de auditoría obtenidos' })
  async obtenerAuditoria(@Query('limite') limite?: string) {
    const parsed = limite ? parseInt(limite, 10) : 50;
    const data = await this.authService.obtenerAuditoria(
      Number.isNaN(parsed) ? 50 : parsed,
    );
    return {
      message: 'Eventos de auditoría obtenidos correctamente',
      data,
    };
  }
}

