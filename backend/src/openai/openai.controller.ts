import { Controller, Post, Body, Param } from '@nestjs/common';
import { OpenAiService } from './openai.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Controller('documents/llm')
export class OpenAiController {
  constructor(
    private readonly openAiService: OpenAiService,
    private readonly prisma: PrismaService,  // Usando o PrismaService para buscar o documento
  ) {}

  @Post('query/:documentId')  // Passando o documentId como parâmetro da URL
  async queryLLM(@Param('documentId') documentId: string, @Body() body: { question: string }) {
    // Usando o prisma para buscar o documento pelo id
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    // Caso o documento não exista, lançar um erro
    if (!document) {
      throw new Error('Documento não encontrado!');
    }

    const context = document.extractedText;  // Extrai o texto do documento

    // Fazendo a consulta ao OpenAI com o contexto e a pergunta
    const answer = await this.openAiService.query(context, body.question);

    return { answer };
  }
}
