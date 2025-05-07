import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  
  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      console.error('A variável de ambiente GEMINI_API_KEY não está definida.');
      return;
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  }

  async query(context: string, question: string): Promise<string> {
    if (!this.model) {
      return 'O serviço Gemini não foi inicializado corretamente (chave de API ausente).';
    }

    try {
      const result = await this.model.generateContent({
        contents: [{ parts: [{ text: `Contexto: ${context}\n\nPergunta: ${question}\n\nPor favor, forneça uma resposta concisa juntamente com uma breve explicação ou contexto para a sua resposta.`,}] }],
      });
      const response = await result.response;
      const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
      return text || 'Desculpe, não obtive uma resposta clara do Gemini.';
    } catch (error) {
      console.error('Erro ao chamar Gemini:', error);
      throw new Error('Erro ao obter resposta do Gemini.');
    }
  }
  async explainText(extractedText: string): Promise<string>{
    
    if(!this.model) {
        return 'O serviço Gemini não foi inicializado corretamente (API key ausente).';
    }

    try {
        const result = await this.model.generateContent({
          contents: [{ parts: [{ text: `Resuma brevemente o conteúdo do seguinte texto: "${extractedText}"` }] }],
        });

        const response = await result.response;
        return response.candidates?.[0]?.content?.parts?.[0]?.text || 'Não foi possível obter uma explicação.';
    }

    catch (error){
        console.error('Erro ao obter explicação do Gemini:', error);
        return 'Ocorreu um erro ao obter a explicação do Gemini.';
    }
  }
}

