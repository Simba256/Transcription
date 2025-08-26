import vision from '@google-cloud/vision';

export interface OCRResult {
  text: string;
  pages: number;
  warnings?: string[];
}

// Initialize client from env credentials
function getVisionClient() {
  const projectId = process.env.GCP_PROJECT_ID;
  const clientEmail = process.env.GCP_CLIENT_EMAIL;
  let privateKey = process.env.GCP_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Google Vision credentials missing: GCP_PROJECT_ID, GCP_CLIENT_EMAIL, GCP_PRIVATE_KEY');
  }

  // Next/Node will have \n in env strings; replace with real newlines
  privateKey = privateKey.replace(/\\n/g, '\n');

  return new vision.ImageAnnotatorClient({
    projectId,
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
  });
}

/**
 * Run OCR on an image or PDF buffer using Google Cloud Vision.
 * For images: uses textDetection; pages = 1.
 * For PDFs: uses documentTextDetection with mime application/pdf; pages from response.
 */
export async function runOCR(buffer: Buffer, fileName: string): Promise<OCRResult> {
  const client = getVisionClient();
  const lower = fileName.toLowerCase();
  const isPdf = lower.endsWith('.pdf');
  const warnings: string[] = [];

  if (isPdf) {
    // Use document text detection for PDFs
    const [result] = await client.documentTextDetection({
      image: { content: buffer.toString('base64') },
      imageContext: { languageHints: ['en', 'fr'] },
    } as any);

    const pages = result.fullTextAnnotation?.pages?.length || 1;
    const text = result.fullTextAnnotation?.text || '';
    if (!text) warnings.push('No text detected in PDF');
    return { text, pages, warnings };
  }

  // Images (png, jpg, etc.)
  const [res] = await client.textDetection({
    image: { content: buffer.toString('base64') },
    imageContext: { languageHints: ['en', 'fr'] },
  } as any);

  const text = res.fullTextAnnotation?.text || res.textAnnotations?.[0]?.description || '';
  if (!text) warnings.push('No text detected in image');
  return { text, pages: 1, warnings };
}

/**
 * Estimate pages from plain text length (fallback when file type unknown).
 * Roughly 500 words per page.
 */
export function estimatePagesFromText(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 500));
}
