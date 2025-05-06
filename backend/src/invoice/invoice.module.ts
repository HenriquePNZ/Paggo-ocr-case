import { Module } from '@nestjs/common';
import { InvoiceParserService } from './invoice-parser.service';

@Module({
  providers: [InvoiceParserService],
  exports: [InvoiceParserService],
})
export class InvoiceModule {}
