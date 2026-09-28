import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { HealthService, HealthStatus } from './health.service.js';

@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  async check(): Promise<HealthStatus> {
    const status = await this.health.check();
    if (!status.ready) throw new ServiceUnavailableException(status);
    return status;
  }
}
