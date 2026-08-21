import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  health() {
    return {
      name: 'TaskFlow API',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
