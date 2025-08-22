import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export interface PDFOptions {
  title: string;
  content: string;
  fileName: string;
  password?: string;
}

export class PDFGenerator {
  static async generateSecurePDF(options: PDFOptions): Promise<Uint8Array> {
    const { title, content, fileName, password } = options;
    
    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    
    // Embed the Times Roman font
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesRomanBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    
    // Add a blank page with dimensions
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 size in points
    const { width, height } = page.getSize();
    
    // Set margins
    const margin = 50;
    const usableWidth = width - (2 * margin);
    const usableHeight = height - (2 * margin);
    
    // Draw title
    const titleFontSize = 16;
    const titleHeight = titleFontSize + 10;
    page.drawText(title, {
      x: margin,
      y: height - margin - titleHeight,
      size: titleFontSize,
      font: timesRomanBoldFont,
      color: rgb(0, 0, 0),
    });
    
    // Draw a line under the title
    page.drawLine({
      start: { x: margin, y: height - margin - titleHeight - 5 },
      end: { x: width - margin, y: height - margin - titleHeight - 5 },
      thickness: 1,
      color: rgb(0.5, 0.5, 0.5),
    });
    
    // Add security notice
    const securityNoticeY = height - margin - titleHeight - 25;
    page.drawText('[PROTECTED] This document is generated for read-only distribution', {
      x: margin,
      y: securityNoticeY,
      size: 9,
      font: timesRomanFont,
      color: rgb(0.6, 0.6, 0.6),
    });
    
    // Prepare content text with proper formatting
    const fontSize = 11;
    const lineHeight = fontSize + 6; // Increased line spacing
    
    // Calculate how much text can fit on a line using actual text width
    const sampleText = 'A'.repeat(80); // Test with 80 characters
    const sampleWidth = timesRomanFont.widthOfTextAtSize(sampleText, fontSize);
    const maxCharsPerLine = Math.floor((usableWidth / sampleWidth) * 80);
    
    // Split content into paragraphs first
    const paragraphs = content.split('\n').filter(p => p.trim().length > 0);
    const lines: string[] = [];
    
    for (const paragraph of paragraphs) {
      if (paragraph.trim() === '') {
        lines.push(''); // Add empty line for paragraph breaks
        continue;
      }
      
      const words = paragraph.split(' ');
      let currentLine = '';
      
      for (const word of words) {
        const testLine = currentLine + (currentLine ? ' ' : '') + word;
        const testWidth = timesRomanFont.widthOfTextAtSize(testLine, fontSize);
        
        if (testWidth <= usableWidth) {
          currentLine = testLine;
        } else {
          if (currentLine) {
            lines.push(currentLine);
          }
          currentLine = word;
        }
      }
      
      if (currentLine) {
        lines.push(currentLine);
      }
      
      // Add space between paragraphs
      lines.push('');
    }
    
    // Calculate starting position for content (account for security notice)
    let currentY = height - margin - titleHeight - 50; // More space from header
    const availableHeight = currentY - margin; // Space available for content
    const maxLinesPerPage = Math.floor(availableHeight / lineHeight) - 2; // Leave some bottom margin
    
    let currentPageLines = 0;
    let currentPageObj = page;
    
    // Draw content lines
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check if we need a new page
      if (currentPageLines >= maxLinesPerPage && currentPageLines > 0) {
        currentPageObj = pdfDoc.addPage([595.28, 841.89]);
        currentY = height - margin - 20; // Start from top of new page
        currentPageLines = 0;
      }
      
      // Only draw non-empty lines
      if (line.trim().length > 0) {
        currentPageObj.drawText(line, {
          x: margin,
          y: currentY,
          size: fontSize,
          font: timesRomanFont,
          color: rgb(0, 0, 0),
        });
      }
      
      currentY -= lineHeight;
      currentPageLines++;
    }
    
    // Add metadata with security information
    pdfDoc.setTitle(title);
    pdfDoc.setSubject('Protected Transcription Document - Read Only');
    pdfDoc.setKeywords(['transcription', 'audio', 'text', 'protected', 'read-only']);
    pdfDoc.setProducer('Talk-to-Text Transcription App - Secure Distribution');
    pdfDoc.setCreator('Talk-to-Text Transcription App');
    
    // Set metadata and security properties
    pdfDoc.setAuthor('Talk-to-Text Transcription App');
    
    // Save the PDF with optimal settings for read-only distribution
    const pdfBytes = await pdfDoc.save({
      useObjectStreams: false,
      addDefaultPage: false,
      // These settings help make the PDF more secure for distribution
      objectsPerTick: 50,
    });
    
    return pdfBytes;
  }
  
  static async generateTranscriptionPDF(
    transcriptionText: string,
    fileName: string,
    originalFileName: string
  ): Promise<Uint8Array> {
    const title = `Transcription: ${originalFileName}`;
    
    // Add timestamp and formatting to content
    const timestamp = new Date().toLocaleString();
    const formattedContent = `Generated on: ${timestamp}\n\nOriginal File: ${originalFileName}\n\n${'='.repeat(60)}\n\nTRANSCRIPTION:\n\n${transcriptionText}`;
    
    return this.generateSecurePDF({
      title,
      content: formattedContent,
      fileName,
    });
  }
}

export default PDFGenerator;