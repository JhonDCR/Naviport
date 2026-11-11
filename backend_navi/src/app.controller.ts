import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppService, HealthStatus } from './app.service';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  @ApiOperation({ summary: 'Verificar estado de salud de la API' })
  @ApiResponse({ status: 200, description: 'API operativa' })
  getHealth(): { message: string; data: HealthStatus } {
    return {
      message: 'API de NaviPort operativa',
      data: this.appService.getHealth(),
    };
  }
}
