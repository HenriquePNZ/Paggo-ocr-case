import { Module } from '@nestjs/common';
import { GeminiController } from './gemini/gemini.controller';
import { GeminiModule } from './gemini/gemini.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    GeminiModule,
    PrismaModule,
    AuthModule,
  ],
  controllers: [GeminiController],
  providers: [],
})
export class AppModule {}