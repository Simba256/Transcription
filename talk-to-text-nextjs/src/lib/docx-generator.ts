export interface DocxOptions {
  title: string;
  content: string;
  footerNote?: string;
  metadata?: {
    author?: string;
    subject?: string;
    keywords?: string[];
  };
}

// Generate a .docx Buffer from plain text with a title and optional footer
export async function generateDocx(options: DocxOptions): Promise<Buffer> {
  // Dynamically import to keep this server-only and avoid TS type resolution issues
  const docx: any = await import('docx');
  const { Document, HeadingLevel, Packer, Paragraph, TextRun } = docx;
  const { title, content, footerNote, metadata } = options;

  const paragraphs: any[] = [];

  // Title
  paragraphs.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: title, bold: true })],
      spacing: { after: 200 },
    })
  );

  // Timestamp
  const timestamp = new Date().toLocaleString();
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({ text: `Generated on: ${timestamp}`, size: 18, color: '555555' }),
      ],
      spacing: { after: 200 },
    })
  );

  // Body content, split by lines to preserve formatting
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    paragraphs.push(
      new Paragraph({
        children: [new TextRun({ text: line })],
        spacing: { after: 120 },
      })
    );
  }

  // Optional footer note
  if (footerNote) {
    paragraphs.push(
      new Paragraph({
        children: [new TextRun({ text: footerNote, size: 18, color: '777777', italics: true })],
        spacing: { before: 300 },
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: paragraphs,
      },
    ],
    creator: metadata?.author || 'Talk-to-Text Transcription App',
    description: metadata?.subject || 'Transcription Document',
    title,
    keywords: metadata?.keywords,
  });

  // Return a Node Buffer suitable for uploading
  const buffer = await Packer.toBuffer(doc);
  return buffer;
}

export default generateDocx;
