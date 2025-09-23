import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun, AlignmentType, Header, Footer, Table, TableRow, TableCell, WidthType, TextDirection, PageBreak } from 'docx';
import { TranscriptionJob, TranscriptSegment } from '@/lib/firebase/transcriptions';
import { Timestamp } from 'firebase/firestore';

export interface TranscriptTemplateData {
  clientName?: string;
  projectName?: string;
  fileName: string;
  providerName?: string;
  patientName?: string;
  location?: string;
  time?: string;
  date: string;
  transcriptContent: string;
  timestampedTranscript?: TranscriptSegment[]; // New field for timestamped data
}

// Utility function to format seconds into MM:SS or HH:MM:SS format
function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}

export function generateTemplateData(transcription: TranscriptionJob, userData?: { name?: string }): TranscriptTemplateData {
  let dateString: string;
  let timeString: string;

  try {
    const uploadTime = transcription.createdAt instanceof Timestamp
      ? transcription.createdAt.toDate()
      : transcription.createdAt instanceof Date
      ? transcription.createdAt
      : new Date();

    dateString = uploadTime.toLocaleDateString('en-CA');
    timeString = uploadTime.toLocaleTimeString('en-CA', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.warn('Error formatting date/time in generateTemplateData:', error);
    const now = new Date();
    dateString = now.toLocaleDateString('en-CA');
    timeString = now.toLocaleTimeString('en-CA', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  return {
    clientName: userData?.name || transcription.clientName || '', // Use user's name
    projectName: transcription.projectName || '',
    fileName: transcription.originalFilename || 'Unknown',
    providerName: 'Talk to Text', // Always use this
    patientName: transcription.patientName || '',
    location: transcription.location || '', // Will be user's location if enabled
    time: timeString, // Use upload time
    date: dateString, // Use upload date
    transcriptContent: transcription.transcript || '',
    timestampedTranscript: transcription.timestampedTranscript || [] // Include timestamped data
  };
}

export async function exportTranscriptPDF(templateData: TranscriptTemplateData): Promise<void> {
  const pdf = new jsPDF();
  const pageHeight = pdf.internal.pageSize.height;
  const pageWidth = pdf.internal.pageSize.width;

  // Load and add the logo
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load logo'));
      img.src = '/images/logo.png';
    });

    // Calculate logo dimensions to maintain aspect ratio
    const logoMaxWidth = 50;
    const logoMaxHeight = 15;
    const aspectRatio = img.width / img.height;

    let logoWidth = logoMaxWidth;
    let logoHeight = logoMaxWidth / aspectRatio;

    // If height exceeds max, scale down based on height instead
    if (logoHeight > logoMaxHeight) {
      logoHeight = logoMaxHeight;
      logoWidth = logoMaxHeight * aspectRatio;
    }

    // Add logo (top right corner) with proper aspect ratio and padding from border
    pdf.addImage(img, 'PNG', pageWidth - logoWidth - 15, 15, logoWidth, logoHeight);
  } catch (error) {
    console.warn('Could not load logo for PDF:', error);
    // Fallback to text if logo fails to load
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text('LOGO', pageWidth - 30, 24);
  }

  // Add page border
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.5);
  pdf.rect(10, 10, pageWidth - 20, pageHeight - 20);

  // Add header with company name
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text('TALK TO TEXT CANADA', 20, 25);

  // Add header underline
  pdf.setLineWidth(0.3);
  pdf.line(20, 30, pageWidth - 20, 30);

  // Metadata section with border
  let yPos = 45;
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');

  const metadata = [
    templateData.clientName && ['Client Name:', templateData.clientName],
    templateData.projectName && ['Project Name:', templateData.projectName],
    ['Date:', templateData.date],
    ['File Name:', templateData.fileName],
    ['Provider Name:', templateData.providerName],
    templateData.patientName && ['Patient Name:', templateData.patientName],
    templateData.location && ['Location:', templateData.location],
    templateData.time && ['Time:', templateData.time]
  ].filter(Boolean) as [string, string][];

  // Metadata box border
  const metadataHeight = metadata.length * 8 + 15; // Increased for extra padding
  pdf.setDrawColor(150, 150, 150);
  pdf.setLineWidth(0.2);
  pdf.rect(20, yPos - 5, pageWidth - 40, metadataHeight);

  yPos += 5; // Add padding above first row

  metadata.forEach(([label, value]) => {
    pdf.setFont('helvetica', 'bold');
    pdf.text(label, 25, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.text(value, 85, yPos);
    yPos += 8;
  });

  // Content separator
  yPos += 15;
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.5);
  pdf.line(20, yPos, pageWidth - 20, yPos);
  yPos += 15;

  // Add transcript content with padding
  pdf.setFontSize(11);

  // Check if we have timestamped data, use it if available
  if (templateData.timestampedTranscript && templateData.timestampedTranscript.length > 0) {
    // Render timestamped content
    for (const segment of templateData.timestampedTranscript) {
      if (yPos > pageHeight - 50) {
        pdf.addPage();
        // Add border to new page
        pdf.setDrawColor(0, 0, 0);
        pdf.setLineWidth(0.5);
        pdf.rect(10, 10, pageWidth - 20, pageHeight - 20);
        yPos = 25;
      }

      // Add timestamp in bold
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(100, 100, 100); // Gray color for timestamps
      pdf.text(`[${formatTimestamp(segment.start)}]`, 25, yPos);

      // Add the text content with reduced spacing
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(0, 0, 0); // Black color for text
      const lines = pdf.splitTextToSize(segment.text, pageWidth - 55); // Reduced space for timestamp

      for (let i = 0; i < lines.length; i++) {
        if (i === 0) {
          // First line goes on the same line as timestamp with reduced spacing
          pdf.text(lines[i], 55, yPos); // Reduced from 75 to 55
        } else {
          // Subsequent lines are indented
          yPos += 6;
          if (yPos > pageHeight - 50) {
            pdf.addPage();
            pdf.setDrawColor(0, 0, 0);
            pdf.setLineWidth(0.5);
            pdf.rect(10, 10, pageWidth - 20, pageHeight - 20);
            yPos = 25;
          }
          pdf.text(lines[i], 55, yPos); // Reduced from 75 to 55
        }
      }
      yPos += 10; // Extra space between segments
    }
  } else {
    // Fallback to regular content without timestamps
    const content = templateData.transcriptContent || '{{transcript_body}}';
    const lines = pdf.splitTextToSize(content, pageWidth - 50);

    for (let i = 0; i < lines.length; i++) {
      if (yPos > pageHeight - 50) {
        pdf.addPage();
        // Add border to new page
        pdf.setDrawColor(0, 0, 0);
        pdf.setLineWidth(0.5);
        pdf.rect(10, 10, pageWidth - 20, pageHeight - 20);
        yPos = 25;
      }
      pdf.text(lines[i], 25, yPos);
      yPos += 6;
    }
  }

  // Add footer to all pages
  const pageCount = pdf.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);

    // Add page border if not first page
    if (i > 1) {
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.5);
      pdf.rect(10, 10, pageWidth - 20, pageHeight - 20);
    }

    // Footer content
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text('www.talktotext.ca', 20, pageHeight - 15);
    pdf.text(`Page ${i} of ${pageCount}`, pageWidth - 40, pageHeight - 15);

    // Footer separator line
    pdf.setLineWidth(0.2);
    pdf.line(20, pageHeight - 20, pageWidth - 20, pageHeight - 20);
  }

  const filename = templateData.fileName.split('.')[0];
  pdf.save(`${filename}_transcript.pdf`);
}

// Helper function to generate metadata table rows
function generateMetadataRows(templateData: TranscriptTemplateData): TableRow[] {
  const metadata = [
    ['Date:', templateData.date],
    ['File Name:', templateData.fileName],
    ['Provider Name:', templateData.providerName || 'N/A'],
    ...(templateData.clientName ? [['Client Name:', templateData.clientName]] : []),
    ...(templateData.projectName ? [['Project Name:', templateData.projectName]] : []),
    ...(templateData.patientName ? [['Patient Name:', templateData.patientName]] : []),
    ...(templateData.location ? [['Location:', templateData.location]] : []),
    ...(templateData.time ? [['Time:', templateData.time]] : []),
  ];

  return metadata.map(([label, value]) =>
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({ text: label, bold: true, size: 22 })],
          })],
          width: { size: 30, type: WidthType.PERCENTAGE },
          shading: { fill: "F5F5F5" }, // Light gray background
        }),
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({ text: value, size: 22 })],
          })],
          width: { size: 70, type: WidthType.PERCENTAGE },
        }),
      ],
    })
  );
}

// Helper function to generate DOCX transcript content with timestamps
function generateDocxTranscriptContent(templateData: TranscriptTemplateData): Paragraph[] {
  if (templateData.timestampedTranscript && templateData.timestampedTranscript.length > 0) {
    // Create paragraphs for each timestamped segment
    return templateData.timestampedTranscript.map(segment =>
      new Paragraph({
        children: [
          new TextRun({
            text: `[${formatTimestamp(segment.start)}] `,
            bold: true,
            color: "666666", // Gray color for timestamps
            size: 22,
          }),
          new TextRun({
            text: segment.text,
            size: 22,
          }),
        ],
        spacing: { line: 276, after: 200 }, // Line spacing and space after each segment
      })
    );
  } else {
    // Fallback to regular content
    return [
      new Paragraph({
        children: [
          new TextRun({
            text: templateData.transcriptContent || "{{transcript_body}}",
            size: 22,
          }),
        ],
        spacing: { line: 276 },
      })
    ];
  }
}

export async function exportTranscriptDOCX(templateData: TranscriptTemplateData): Promise<void> {
  const doc = new Document({
    sections: [
      {
        headers: {
          default: new Header({
            children: [
              // Professional header matching PDF
              new Paragraph({
                children: [
                  new TextRun({
                    text: "TALK TO TEXT CANADA",
                    bold: true,
                    size: 36, // Larger like PDF
                    color: "000000",
                  }),
                ],
                alignment: AlignmentType.LEFT,
                spacing: { after: 120 },
              }),
              // Header underline
              new Paragraph({
                children: [new TextRun("")],
                spacing: { after: 240 },
                border: {
                  bottom: {
                    color: "000000",
                    space: 1,
                    style: "single",
                    size: 6,
                  },
                },
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              // Footer with separator line like PDF
              new Paragraph({
                children: [new TextRun("")],
                border: {
                  top: {
                    color: "000000",
                    space: 1,
                    style: "single",
                    size: 6,
                  },
                },
                spacing: { after: 120 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: "www.talktotext.ca",
                    size: 16,
                  }),
                ],
                alignment: AlignmentType.LEFT,
              }),
            ],
          }),
        },
        children: [
          // Spacing after header
          new Paragraph({
            children: [new TextRun("")],
            spacing: { after: 400 },
          }),

          // Metadata table - dynamically build rows for existing data only
          new Table({
            rows: generateMetadataRows(templateData),
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: "single", size: 6, color: "999999" },
              bottom: { style: "single", size: 6, color: "999999" },
              left: { style: "single", size: 6, color: "999999" },
              right: { style: "single", size: 6, color: "999999" },
              insideHorizontal: { style: "single", size: 3, color: "CCCCCC" },
              insideVertical: { style: "single", size: 3, color: "CCCCCC" },
            },
          }),

          // Content separator line
          new Paragraph({
            children: [new TextRun("")],
            spacing: { before: 400, after: 200 },
            border: {
              top: {
                color: "000000",
                space: 1,
                style: "single",
                size: 6,
              },
            },
          }),

          // Transcript section header
          new Paragraph({
            children: [
              new TextRun({
                text: "TRANSCRIPT",
                bold: true,
                size: 24,
              }),
            ],
            alignment: AlignmentType.LEFT,
            spacing: { before: 400, after: 200 },
          }),

          // Transcript content - handle timestamped segments
          ...generateDocxTranscriptContent(templateData),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const blob = new Blob([new Uint8Array(buffer)], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  const filename = templateData.fileName.split('.')[0];
  a.download = `${filename}_transcript.docx`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

export function exportTranscriptTXT(templateData: TranscriptTemplateData): void {
  // Build metadata lines only for fields that have values
  const metadataLines = [
    templateData.clientName && `Client Name: ${templateData.clientName}`,
    templateData.projectName && `Project Name: ${templateData.projectName}`,
    `Date: ${templateData.date}`,
    `File Name: ${templateData.fileName}`,
    `Provider Name: ${templateData.providerName}`,
    templateData.patientName && `Patient Name: ${templateData.patientName}`,
    templateData.location && `Location: ${templateData.location}`,
    templateData.time && `Time: ${templateData.time}`
  ].filter(Boolean).join('\n');

  // Generate transcript content with timestamps if available
  let transcriptContent = '';
  if (templateData.timestampedTranscript && templateData.timestampedTranscript.length > 0) {
    transcriptContent = templateData.timestampedTranscript
      .map(segment => `[${formatTimestamp(segment.start)}] ${segment.text}`)
      .join('\n\n');
  } else {
    transcriptContent = templateData.transcriptContent;
  }

  const content = `TALK TO TEXT CANADA

${metadataLines}

────────────────────────────────────────────────────────────────

${transcriptContent}

────────────────────────────────────────────────────────────────
www.talktotext.ca`;

  const blob = new Blob([content], { type: 'text/plain' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  const filename = templateData.fileName.split('.')[0];
  a.download = `${filename}_transcript.txt`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}