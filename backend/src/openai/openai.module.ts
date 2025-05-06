import { Module } from '@nestjs/common';
import { OpenAiService } from './openai.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule.forRoot()],  // Carrega as variáveis do .env
  providers: [OpenAiService],
  exports: [OpenAiService],  // Para exportar o serviço, caso seja necessário em outro módulo
})
export class OpenAiModule {}
