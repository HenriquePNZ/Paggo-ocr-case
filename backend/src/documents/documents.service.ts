import { Injectable } from '@nestjs/common';
import * as Tesseract from 'tesseract.js';
import * as sharp from 'sharp';
import { join } from 'path';
import { promises as fs, existsSync } from 'fs';
import type { Express } from 'express';
import { InvoiceParserService } from '../invoice/invoice-parser.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly invoiceParser: InvoiceParserService,
    private readonly prisma: PrismaService
  ) {}

  async getUserDocuments(userId: string) {
    console.log(`Buscando documentos para o usuário: ${userId}`);
    
    const documents = await this.prisma.document.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  
    console.log(`Documentos encontrados: `, documents);
  
    return documents;
  }
  

  async getDocumentById(documentId: string) {
    return this.prisma.document.findUnique({
      where: {id: documentId},
    });
  }

  async handleUpload(file: Express.Multer.File, user: any) {
    const imagePath = join(process.cwd(), 'uploads', file.filename);
    const processedPath = join(process.cwd(), 'uploads', `processed-${file.filename}`);

    if (!existsSync(imagePath)) {
      throw new Error('Arquivo não encontrado para OCR!');
    }

    // Pré-processamento com sharp
    await sharp(imagePath)
      .grayscale()
      .normalize()
      .toFile(processedPath);

    // OCR com Tesseract
    const ocrResult = await Tesseract.recognize(processedPath, 'eng', {
      logger: m => console.log(m),
    });

    const extractedText = ocrResult.data.text;

    // Limpa imagem temporária
    await fs.unlink(processedPath);

    // Parse flexível dos dados
    const parsed = this.invoiceParser.parse(extractedText);

    // Criação do documento e captura do ID
    const document = await this.prisma.document.create({
      data: {
        filename: file.filename,
        extractedText: extractedText,
        parsedJson: parsed,
        userId: user.userId,
      },
      select: {
        id: true,
      }
    });

    //Retorna a resposta com o id do documento
    return {
      message: 'Arquivo recebido com sucesso!',
      filename: file.filename,
      uploadedBy: user,
      extractedText,
      parsed,
      documentId: document.id,
    };
  }
}
