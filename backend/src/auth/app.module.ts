import { Module } from '@nestjs/common';
import { OpenAiController } from '../openai/openai.controller';  // Importe o controlador
import { OpenAiModule } from '../openai/openai.module';  // Importe o módulo OpenAI
import { PrismaModule } from 'src/prisma/prisma.module';  // Importe o PrismaModule

@Module({
  imports: [
    OpenAiModule,
    PrismaModule,
  ],
  controllers: [OpenAiController],  // Adicionando o controlador do LLM
  providers: [],
})
export class AppModule {}
