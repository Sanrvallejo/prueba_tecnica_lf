import {
  CanActivate,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HealthService } from './health.service.js';

/**
 * Rechaza con 503 si el sistema no está listo. Como guard, corre antes que el
 * interceptor de subida, así el archivo no llega a guardarse.
 */
@Injectable()
export class SystemReadyGuard implements CanActivate {
  constructor(private readonly health: HealthService) {}

  async canActivate(): Promise<boolean> {
    const status = await this.health.check();
    if (!status.ready) {
      throw new ServiceUnavailableException({
        message: 'El sistema no está listo para procesar documentos',
        ...status,
      });
    }
    return true;
  }
}
