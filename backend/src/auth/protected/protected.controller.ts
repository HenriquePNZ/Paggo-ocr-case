import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../jwt-auth.guard';

@Controller('protected')
export class ProtectedController {
  @Get() 
  @UseGuards(JwtAuthGuard)  // Protege a rota com o guard JWT
  getProtectedData() {
    return { message: 'Você tem acesso à rota protegida!' };
  }
}
