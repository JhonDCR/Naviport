import { Injectable } from '@nestjs/common';

export interface HealthStatus {
  service: string;
  status: string;
  version: string;
}

@Injectable()
export class AppService {
  getHealth(): HealthStatus {
    return {
      service: 'NaviPort Tracking API (OceanTrack)',
      status: 'online',
      version: '1.0.0',
    };
  }
}
