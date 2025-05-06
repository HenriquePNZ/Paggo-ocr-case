import { Injectable } from '@nestjs/common';
import { OpenAI } from 'openai';

@Injectable()
export class OpenAiService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY, // Carrega a chave da API do OpenAI
    });
  }

  // Método para interagir com o LLM
  async query(context: string, question: string): Promise<string> {
    const response = await this.openai.chat.completions.create({
      messages: [
        { role: 'system', content: 'Você é um assistente muito inteligente.' },
        { role: 'user', content: context },
        { role: 'user', content: question },
      ],
      model: 'gpt-4', // Ou gpt-3.5 se você não tiver acesso ao GPT-4
    });

    if (!response.choices[0].message.content) {
      return 'Desculpe, não consegui processar sua pergunta.';
    }

    return response.choices[0].message.content;
  }
}
