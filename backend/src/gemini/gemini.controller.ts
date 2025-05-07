import { Controller, Post, Body, Param } from '@nestjs/common';
import { GeminiService } from '../gemini/gemini.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Controller('documents/llm')
export class GeminiController {
  constructor(
    private readonly geminiService: GeminiService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('query/:documentId')
  async queryLLM(@Param('documentId') documentId: string, @Body() body: { question: string }) {
   
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new Error('Documento não encontrado!');
    }

    const context = document.extractedText;
    console.log('Texto Extraído (Query):', context);
    const initialExplanation = await this.geminiService.explainText(context);

    // Fazendo a consulta ao Gemini com o contexto e a pergunta
    const answer = await this.geminiService.query(context, body.question);

    return { answer, initialExplanation };
  }
}