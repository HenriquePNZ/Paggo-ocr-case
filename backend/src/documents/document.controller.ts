import { Controller, Post, Get, UploadedFile, UseInterceptors, UseGuards, Request, Param, Res, Query } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { DocumentsService } from './documents.service';
import { Response } from 'express';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          const filename = `${file.fieldname}-${uniqueSuffix}${ext}`;
          callback(null, filename);
        },
      }),
    }),
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File, @Request() req) {
    return await this.documentsService.handleUpload(file, req.user);
  }

  @Get() // Retornar documentos de um usuário autenticado
  @UseGuards(JwtAuthGuard)
  async getUserDocuments(@Request() req) {
    const userId = req.user.userId;
    console.log(`ID do usuário: ${userId}`)
    const documents = await this.documentsService.getUserDocuments(userId);
    return documents;
  }

  @Get('download/:documentId') // Baixar documentos com texto e/ou interações
  @UseGuards(JwtAuthGuard)
  async downloadFileWithTextAndContext(
    @Param('documentId') documentId: string,
    @Res() res: Response,
    @Query('queries') queries?: string, // Capture the queries parameter
  ) {
    const document = await this.documentsService.getDocumentById(documentId);

    if (!document) {
      return res.status(404).send('Documento não encontrado!');
    }

    const baseFilename = document.filename.split('.').slice(0, -1).join('.');
    let filename = `${baseFilename}_com_texto.txt`;
    let fileContent = `Nome do Arquivo Original: ${document.filename}\n\n`;
    fileContent += `-------------------- TEXTO EXTRAÍDO --------------------\n`;
    fileContent += `${document.extractedText}\n\n`;

    if (queries) {
        try {
            const conversationHistory: { question: string; answer: string }[] = JSON.parse(decodeURIComponent(queries));
            if (conversationHistory && conversationHistory.length > 0) {
                filename = `${baseFilename}_com_interacoes.txt`; // Update filename to indicate interactions
                fileContent += `-------------------- INTERAÇÕES COM GEMINI --------------------\n\n`;
                conversationHistory.forEach((item, index) => {
                    fileContent += `Pergunta ${index + 1}: ${item.question}\n`;
                    fileContent += `Resposta ${index + 1}: ${item.answer}\n\n`;
                });
            }
        } catch (e) {
            console.error("Failed to parse conversation history from query:", e);
            // Optionally, you could add a message to the file indicating the parse error
            // fileContent += "Erro ao carregar histórico de interações.\n\n";
        }
    }


    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'text/plain');
    res.send(fileContent);
  }

  @Get('original/:documentId')  // Baixar arquivo original (kept but not linked from frontend)
  @UseGuards(JwtAuthGuard)
  async downloadOriginalFile(@Param('documentId') documentId: string, @Res() res: Response) {
    const document = await this.documentsService.getDocumentById(documentId);

    if (!document) {
      return res.status(404).send('Documento não encontrado!');
    }

    const filePath = `./uploads/${document.filename}`;
    // Security check: Ensure the file is within the intended uploads directory
    if (!filePath.startsWith('./uploads/')) {
         return res.status(400).send('Invalid document path.');
    }
    // Check if file exists before attempting to download
    const fs = require('fs');
    if (!fs.existsSync(filePath)) {
        return res.status(404).send('Original file not found.');
    }

    return res.download(filePath, document.filename);
  }

}