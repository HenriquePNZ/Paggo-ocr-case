import { Controller, Post, Get, UploadedFile, UseInterceptors, UseGuards, Request, Param, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from './jwt-auth.guard';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { DocumentsService } from '../auth/documents.service';
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

  @Get() // Endpoint para pegar os documentos de um usuário autenticado
  @UseGuards(JwtAuthGuard)
  async getUserDocuments(@Request() req) {
    const userId = req.user.userId;
    console.log('ID do usuário: ${userId}')
    const documents = await this.documentsService.getUserDocuments(userId);
    return documents;
  }

  @Get('download/:documentId')  // Endpoint para baixar o arquivo
  @UseGuards(JwtAuthGuard)
  async downloadFile(@Param('documentId') documentId: string, @Res() res: Response) {
    const document = await this.documentsService.getDocumentById(documentId);
    
    if (!document) {
      return res.status(404).send('Documento não encontrado!');
    }

    const filePath = `./uploads/${document.filename}`;  // Caminho do arquivo
    return res.download(filePath, document.filename);  // Faz o download do arquivo
  }
}
