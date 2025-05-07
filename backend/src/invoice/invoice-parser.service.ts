import { Injectable } from '@nestjs/common';

@Injectable()
export class InvoiceParserService {
  parse(text: string) {
    return {
      invoiceNumber: this.matchAny([
        /invoice\s*(?:number|no)?[:#]?\s*[^\d]*?(\d{3,})/i
      ], text),
      invoiceDate: this.matchAny([
        /invoice\s*date[:\s]*([\w]+\s\d{1,2},\s\d{4})/i,
        /date[:\s]*([\w]+\s\d{1,2},\s\d{4})/i,
      ], text),
      dueDate: this.matchAny([
        /due\s*date[:\s]*([\w]+\s\d{1,2},\s\d{4})/i,
      ], text),
      subtotal: this.matchAny([
        /subtotal[:\s]*\$?([\d,.]+)/i,
      ], text),
      total: this.matchAny([
        /balance\s*due[:\s]*\$?([\d,.]+)/i,
        /total[:\s]*\$?([\d,.]+)/i,
      ], text),
      client: this.matchAny([
        /bill\s*to[:\s]*(.+)/i,
      ], text),
      products: this.extractProducts(text),
    };
  }

  private matchAny(patterns: RegExp[], text: string): string | null {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[2]?.trim() || match[1]?.trim() || null;
    }
    return null;
  }

  private extractProducts(text: string) {
    const lines = text.split('\n');

    const productLines = lines.filter(line =>
      /\$[\d,.]+/.test(line) &&
      !/subtotal|sales\s*tax|balance\s*due|total/i.test(line)
    );

    return productLines.map(line => {
      const parts = line.trim().split(/\s(?=\$)/);
      return {
        description: parts[0]?.trim() || null,
        unitPrice: parts[1]?.trim() || null,
        total: parts[2]?.trim() || parts[1]?.trim() || null,
      };
    });
  }
}
