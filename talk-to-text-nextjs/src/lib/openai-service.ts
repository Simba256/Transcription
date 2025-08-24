import OpenAI from 'openai';

// Prevent this module from being used on the client-side
if (typeof window !== 'undefined') {
  throw new Error('OpenAI service should only be used on the server-side');
}

// OpenAI configuration interfaces
export interface WhisperOptions {
  language?: string;
  response_format?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
  temperature?: number;
  timestamp_granularities?: ('word' | 'segment')[];
}

export interface GPTEnhancementOptions {
  model?: 'gpt-4' | 'gpt-3.5-turbo';
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
}

export interface TranscriptionResult {
  text: string;
  segments?: Array<{
    id: number;
    seek: number;
    start: number;
    end: number;
    text: string;
    tokens: number[];
    temperature: number;
    avg_logprob: number;
    compression_ratio: number;
    no_speech_prob: number;
  }>;
  words?: Array<{
    word: string;
    start: number;
    end: number;
  }>;
}

export interface EnhancedTranscriptionResult {
  originalTranscript: string;
  enhancedTranscript: string;
  processingTime: number;
  wordCount: number;
  confidence: number;
}

// Canadian-specific service types for TTT Canada
export type CanadianServiceType = 
  | 'ai_human_review'
  | 'verbatim_multispeaker' 
  | 'indigenous_oral'
  | 'legal_dictation'
  | 'copy_typing';

class OpenAIService {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    if (!process.env.OPENAI_API_KEY) {
      console.warn('OPENAI_API_KEY not found in environment variables');
    } else {
      console.log('OpenAI service initialized');
    }
  }

  /**
   * Test if the OpenAI API is properly configured and accessible
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('API key not configured');
      }
      
      // Make a simple request to test the connection
      const response = await this.client.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: "Test" }],
        max_tokens: 5
      });
      
      console.log('OpenAI API connection test successful');
      return true;
    } catch (error: any) {
      console.error('OpenAI API connection test failed:', error.message);
      return false;
    }
  }

  /**
   * Transcribe audio using Whisper API
   */
  async transcribeAudio(
    audioFile: File | Buffer,
    options: WhisperOptions = {}
  ): Promise<TranscriptionResult> {
    
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      // Convert Buffer to File if necessary
      let fileToSend: File;
      if (audioFile instanceof Buffer) {
        // Create a File object from Buffer for OpenAI API
        fileToSend = new File([audioFile], 'audio.wav', { type: 'audio/wav' });
      } else {
        fileToSend = audioFile;
      }

      const transcription = await this.client.audio.transcriptions.create({
        file: fileToSend,
        model: "whisper-1",
        language: options.language || undefined,
        response_format: options.response_format || 'verbose_json',
        temperature: options.temperature || 0,
        timestamp_granularities: options.timestamp_granularities || ['word', 'segment']
      });

      console.log('🎤 Whisper transcription completed');
      
      return transcription as TranscriptionResult;

    } catch (error: any) {
      console.error('OpenAI transcription error:', error.message);
      
      if (error.status === 401) {
        throw new Error('Invalid OpenAI API key');
      } else if (error.status === 429) {
        throw new Error('OpenAI rate limit exceeded. Please try again later.');
      } else if (error.status === 413) {
        throw new Error('Audio file too large for OpenAI processing');
      }
      
      throw new Error(`Transcription failed: ${error.message}`);
    }
  }

  /**
   * Enhance transcript using GPT-4 for specific use cases
   */
  async enhanceTranscript(
    transcript: string,
    enhancementType: 'grammar' | 'professional' | 'legal' | 'medical' | 'academic' | 'canadian_professional',
    options: GPTEnhancementOptions = {}
  ): Promise<string> {
    
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    const systemPrompts = {
      grammar: "You are a professional transcription editor. ONLY fix punctuation, capitalization, and add paragraph breaks where natural pauses occur. DO NOT change any words. Preserve every single word exactly as spoken, including filler words like 'um', 'uh', 'like', etc. Only improve punctuation for readability.",
      professional: "You are a professional transcription editor. ONLY add proper punctuation (periods, commas, question marks) and capitalize sentences. DO NOT change, replace, or rephrase any words. Keep every word exactly as transcribed, including casual language and filler words. Only improve punctuation and capitalization for professional formatting.",
      legal: "You are a legal transcription specialist. ONLY add punctuation and proper capitalization. DO NOT change any words or terminology. Preserve every word exactly as spoken, including any informal language or filler words. Legal accuracy requires exact word preservation - only improve punctuation structure.",
      medical: "You are a medical transcription specialist. ONLY add punctuation and capitalize sentences. DO NOT change any words, medical terms, or informal language. Preserve every word exactly as spoken. Medical accuracy requires verbatim transcription - only improve punctuation for clarity.",
      academic: "You are an academic transcription editor. ONLY add proper punctuation and capitalization. DO NOT change any words or rephrase anything. Academic integrity requires exact word preservation - only improve punctuation structure and paragraph breaks where appropriate.",
      canadian_professional: "You are a professional transcription editor. ONLY add punctuation, capitalize sentences, and format paragraphs. DO NOT change any words or spelling. Preserve every word exactly as spoken, including casual language. Only improve punctuation and formatting structure."
    };

    try {
      const completion = await this.client.chat.completions.create({
        model: options.model || "gpt-4",
        messages: [
          {
            role: "system",
            content: systemPrompts[enhancementType]
          },
          {
            role: "user",
            content: `IMPORTANT: Only fix punctuation and capitalization. Do NOT change any words. Here is the transcript to format:\n\n${transcript}`
          }
        ],
        temperature: options.temperature || 0.1,
        max_tokens: options.max_tokens || 2000,
        top_p: options.top_p || 1,
        presence_penalty: options.presence_penalty || 0,
        frequency_penalty: options.frequency_penalty || 0
      });

      const enhancedText = completion.choices[0]?.message?.content || transcript;
      console.log(`📝 GPT-4 enhancement completed (${enhancementType})`);
      
      return enhancedText;

    } catch (error: any) {
      console.error('OpenAI enhancement error:', error.message);
      
      // Return original transcript if enhancement fails
      console.warn('Returning original transcript due to enhancement failure');
      return transcript;
    }
  }

  /**
   * Process Canadian-specific transcription services
   */
  async processCanadianService(
    transcript: string,
    serviceType: CanadianServiceType,
    options: {
      clientInstructions?: string;
      specialRequirements?: string;
      customTemplate?: string;
    } = {}
  ): Promise<string> {
    
    const servicePrompts = {
      ai_human_review: `
        You are a professional Canadian transcription editor specializing in AI draft + human review.
        
        Instructions:
        1. Fix any errors using Canadian English spelling (colour, centre, etc.)
        2. Correct grammar and punctuation professionally
        3. Maintain the original speaker's tone and intent
        4. Format according to Canadian professional standards
        5. Preserve all technical terms and proper nouns
        6. Ensure 99%+ accuracy for professional use
        
        ${options.clientInstructions ? `Client Instructions: ${options.clientInstructions}` : ''}
      `,
      
      verbatim_multispeaker: `
        You are a Canadian verbatim transcription specialist.
        
        Instructions:
        1. Preserve ALL words including fillers (um, uh, ah)
        2. Mark interruptions with [interruption]
        3. Note non-verbal sounds [laughter], [pause], [inaudible]
        4. Format speakers clearly with consistent labels
        5. Include emotional context where relevant: [frustrated], [excited]
        6. Maintain exact timing and flow of conversation
        7. Use Canadian English spelling
        
        Format each speaker change as:
        [Speaker 1]: [timestamp] Exact words including um, pauses...
        [Speaker 2]: [timestamp] Interrupting or responding...
      `,
      
      indigenous_oral: `
        You are a culturally-sensitive Canadian transcription specialist trained in Indigenous oral tradition preservation.
        
        Instructions:
        1. Preserve the natural flow and rhythm of oral tradition
        2. Respect cultural terminology and proper nouns
        3. Note ceremonial or traditional elements respectfully
        4. Include pauses and emphasis that carry cultural meaning
        5. Format according to oral history documentation standards
        6. Preserve the storyteller's unique voice and phrasing
        7. Note cultural context respectfully: [Traditional song], [Ceremony], [Sacred reference]
        8. Use respectful, culturally appropriate language throughout
        
        IMPORTANT: This may contain sacred or culturally sensitive content. Handle with utmost respect.
        
        ${options.specialRequirements ? `Special Requirements: ${options.specialRequirements}` : ''}
      `,
      
      legal_dictation: `
        You are a professional Canadian legal transcription specialist.
        
        Instructions:
        1. Use proper Canadian legal terminology and citations
        2. Format case references according to Canadian citation standards (Supreme Court, Provincial courts)
        3. Structure as appropriate legal document (memo, letter, brief, affidavit)
        4. Ensure proper paragraph numbering and section headers
        5. Correct legal abbreviations and Latin terms
        6. Apply appropriate Canadian legal document formatting
        7. Preserve all case names, statutes, and legal references exactly
        8. Use Canadian English spelling and legal terminology
        9. Follow Canadian legal writing conventions
        
        Legal Context: Canadian federal and provincial law, including Common Law provinces and Quebec Civil Code where applicable.
      `,
      
      copy_typing: `
        You are a professional Canadian document formatting specialist.
        
        Instructions:
        1. Clean up and format this text from scanned/handwritten source
        2. Correct any OCR errors while preserving original meaning
        3. Improve formatting and document structure
        4. Apply consistent styling and professional layout
        5. Fix spelling and grammar errors using Canadian English
        6. Preserve important formatting elements (headers, lists, tables)
        7. Create clean, professional document format
        8. Maintain original document structure and hierarchy
        
        ${options.customTemplate ? `Use this template format: ${options.customTemplate}` : ''}
      `
    };

    return this.enhanceTranscript(
      transcript,
      'canadian_professional',
      {
        model: 'gpt-4',
        temperature: serviceType === 'indigenous_oral' ? 0.1 : 0,
        max_tokens: serviceType === 'legal_dictation' ? 4000 : 2500,
        top_p: serviceType === 'indigenous_oral' ? 0.95 : 1
      }
    );
  }

  /**
   * Complete transcription workflow (Whisper + optional GPT enhancement)
   */
  async completeTranscription(
    audioFile: File | Buffer,
    options: {
      language?: string;
      enhancementType?: 'grammar' | 'professional' | 'legal' | 'medical' | 'academic' | 'canadian_professional' | 'none';
      canadianService?: CanadianServiceType;
      clientInstructions?: string;
      specialRequirements?: string;
    } = {}
  ): Promise<EnhancedTranscriptionResult> {
    
    const startTime = Date.now();
    
    // Step 1: Transcribe with Whisper
    const whisperResult = await this.transcribeAudio(audioFile, {
      language: options.language,
      response_format: 'verbose_json',
      timestamp_granularities: ['word', 'segment']
    });

    const originalTranscript = whisperResult.text;
    
    // Step 2: Enhance with GPT-4 (optional)
    let enhancedTranscript: string;
    
    if (options.enhancementType === 'none') {
      // Skip enhancement, use original Whisper output
      enhancedTranscript = originalTranscript;
      console.log('🎤 Skipping GPT-4 enhancement, using pure Whisper output');
    } else if (options.canadianService) {
      enhancedTranscript = await this.processCanadianService(
        originalTranscript,
        options.canadianService,
        {
          clientInstructions: options.clientInstructions,
          specialRequirements: options.specialRequirements
        }
      );
    } else {
      enhancedTranscript = await this.enhanceTranscript(
        originalTranscript,
        options.enhancementType || 'professional'
      );
    }

    const processingTime = Date.now() - startTime;
    const wordCount = enhancedTranscript.split(' ').length;
    
    // Calculate confidence based on Whisper segments
    const confidence = whisperResult.segments
      ? whisperResult.segments.reduce((acc, seg) => acc + (1 - seg.no_speech_prob), 0) / whisperResult.segments.length
      : 0.95;

    console.log(`✅ Complete transcription workflow finished in ${processingTime}ms`);
    
    return {
      originalTranscript,
      enhancedTranscript,
      processingTime,
      wordCount,
      confidence
    };
  }

  /**
   * Estimate processing cost for a transcription
   */
  estimateTranscriptionCost(durationMinutes: number): {
    whisperCost: number;
    gptCost: number;
    totalUSD: number;
  } {
    // OpenAI Whisper pricing: $0.006 per minute
    const whisperCost = durationMinutes * 0.006;
    
    // GPT-4 pricing estimate (assuming ~1000 tokens input, 1500 tokens output)
    // Input: $0.03 per 1K tokens, Output: $0.06 per 1K tokens
    const gptCost = (0.03 * 1) + (0.06 * 1.5); // ~$0.12 per transcription
    
    const totalUSD = whisperCost + gptCost;
    
    return {
      whisperCost: Math.round(whisperCost * 100) / 100,
      gptCost: Math.round(gptCost * 100) / 100,
      totalUSD: Math.round(totalUSD * 100) / 100
    };
  }
}

// Export singleton instance
export const openaiService = new OpenAIService();
export default openaiService;