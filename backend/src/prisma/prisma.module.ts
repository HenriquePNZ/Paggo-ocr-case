import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service'; // Importando o PrismaService

@Module({
  providers: [PrismaService], // Registrando o PrismaService como provedor
  exports: [PrismaService],    // Exportando para que possa ser usado em outros módulos
})
export class PrismaModule {}
