import { Injectable } from '@nestjs/common';
import type { Express } from 'express';

@Injectable()
export class DocumentsService {
  async handleUpload(file: Express.Multer.File, user: any) {
    return {
      message: 'Arquivo recebido com sucesso!',
      filename: file.filename,
      uploadedBy: user,
    };
  }
}
