/**
 * TalkToText Canada - Premium Transcription Services
 * Combines Speechmatics + OpenAI for specialized Canadian transcription needs
 */

import { speechmaticsService } from './speechmatics';
import OpenAI from 'openai';
import { generateDocx } from './docx-generator';
import { storage } from './firebase';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface TTTCanadaServiceConfig {
  serviceType: 'ai_human_review' | 'verbatim_multispeaker' | 'indigenous_oral' | 'legal_dictation' | 'copy_typing';
  language: 'en-CA' | 'fr-CA' | 'indigenous';
  addOns: {
    timestamps?: boolean;
    anonymization?: boolean;
    customTemplate?: boolean;
    rushDelivery?: boolean;
  };
  clientInstructions?: string;
  specialRequirements?: string;
}

export interface TTTCanadaResult {
  baseTranscript: string;
  enhancedTranscript?: string;
  humanReviewedTranscript?: string;
  speakers?: string[];
  timestamps?: Array<{ time: string; speaker?: string; text: string }>;
  anonymizedVersion?: string;
  summary?: string;
  status: 'ai_draft_complete' | 'pending_human_review' | 'human_review_complete' | 'completed';
  humanReviewJobId?: string;
  // New: locations for generated DOCX files
  files?: {
    baseDocxUrl?: string;
    enhancedDocxUrl?: string;
    humanReviewedDocxUrl?: string;
    anonymizedDocxUrl?: string;
  };
  metadata: {
    processingTime: number;
    confidenceScore: number;
    wordCount: number;
    serviceType: string;
    addOnsApplied: string[];
    aiDraftCompletedAt?: number;
    humanReviewRequestedAt?: number;
    humanReviewCompletedAt?: number;
  };
}

export class TTTCanadaService {
  
  /**
   * Process audio through the TTT Canada premium pipeline
   */
  async processAudio(
    audioFile: File | Buffer,
    fileName: string,
    config: TTTCanadaServiceConfig
  ): Promise<TTTCanadaResult> {
    console.log('🍁 Starting TTT Canada processing:', config.serviceType);
    
    const startTime = Date.now();
    let result: TTTCanadaResult;
    
    try {
      switch (config.serviceType) {
        case 'ai_human_review':
          result = await this.processAIHumanReview(audioFile, fileName, config);
          break;
        case 'verbatim_multispeaker':
          result = await this.processVerbatimMultiSpeaker(audioFile, fileName, config);
          break;
        case 'indigenous_oral':
          result = await this.processIndigenousOral(audioFile, fileName, config);
          break;
        case 'legal_dictation':
          result = await this.processLegalDictation(audioFile, fileName, config);
          break;
        case 'copy_typing':
          result = await this.processCopyTyping(audioFile, fileName, config);
          break;
        default:
          throw new Error(`Unsupported service type: ${config.serviceType}`);
      }
      
  // Apply add-ons
  result = await this.applyAddOns(result, config);

  // Generate and upload DOCX files
  result.files = await this.generateAndUploadDocxVariants(result, fileName, config);
      
      // Update metadata
      result.metadata.processingTime = Date.now() - startTime;
      
      console.log(`✅ TTT Canada processing complete: ${result.metadata.serviceType}`);
      return result;
      
    } catch (error) {
      console.error('❌ TTT Canada processing error:', error);
      throw error;
    }
  }
  
  /**
   * AI Draft + Human Review ($1.75 CAD/min)
   * Two-phase process: AI draft first, then human review
   */
  private async processAIHumanReview(
    audioFile: File | Buffer,
    fileName: string,
    config: TTTCanadaServiceConfig
  ): Promise<TTTCanadaResult> {
    
    // Step 1: Generate AI Draft
    console.log('🤖 Generating AI draft...');
    
    const speechmaticsConfig = {
      type: 'transcription' as const,
      transcription_config: {
        language: config.language === 'fr-CA' ? 'fr' : 'en',
        diarization: 'speaker' as const
      }
    };
    
    const { job_id } = await speechmaticsService.submitTranscriptionJob(
      audioFile,
      fileName,
      speechmaticsConfig
    );
    
    const baseTranscript = await this.waitForCompletion(job_id);
    
    // AI enhancement for initial draft
    const aiDraftTranscript = await this.enhanceWithOpenAI(baseTranscript, {
      task: 'ai_draft_preparation',
      instructions: `
        Create an AI draft for human review with Canadian professional standards:
        1. Fix obvious spelling and grammar errors using Canadian English
        2. Structure the text for readability
        3. Preserve ALL original content and meaning
        4. Mark uncertain sections with [AI_UNCERTAIN: original_text]
        5. Note speaker changes and important audio cues
        6. Format for human reviewer to easily edit
        
        This is a DRAFT for human review - prioritize accuracy over perfection.
      `
    });
    
    const aiDraftCompletedAt = Date.now();
    
    // Step 2: Queue for Human Review
    console.log('👤 Queueing for human review...');
    const humanReviewJobId = await this.queueForHumanReview({
      fileName,
      baseTranscript,
      aiDraftTranscript,
      serviceConfig: config,
      priority: config.addOns.rushDelivery ? 'high' : 'normal'
    });
    
    // Return AI draft with pending human review status
  return {
      baseTranscript,
      enhancedTranscript: aiDraftTranscript,
      status: 'pending_human_review',
      humanReviewJobId,
      metadata: {
        processingTime: 0, // Will be updated when human review completes
        confidenceScore: 0.85, // AI draft confidence
        wordCount: aiDraftTranscript.split(' ').length,
        serviceType: 'AI Draft + Human Review',
        addOnsApplied: [],
        aiDraftCompletedAt,
        humanReviewRequestedAt: Date.now()
      }
    };
  }
  
  /**
   * Verbatim / Multi-Speaker ($2.25 CAD/min)
   * Enhanced speaker identification and verbatim formatting
   */
  private async processVerbatimMultiSpeaker(
    audioFile: File | Buffer,
    fileName: string,
    config: TTTCanadaServiceConfig
  ): Promise<TTTCanadaResult> {
    
    // Speechmatics with speaker diarization
    const speechmaticsConfig = {
      type: 'transcription' as const,
      transcription_config: {
        language: config.language === 'fr-CA' ? 'fr' : 'en',
        diarization: 'speaker' as const
      }
    };
    
    const { job_id } = await speechmaticsService.submitTranscriptionJob(
      audioFile,
      fileName,
      speechmaticsConfig
    );
    
    const rawTranscript = await this.waitForCompletion(job_id);
    
    // OpenAI enhancement for verbatim formatting
    const enhancedTranscript = await this.enhanceWithOpenAI(rawTranscript, {
      task: 'verbatim_multispeaker_formatting',
      instructions: `
        Convert this transcript to professional verbatim format:
        1. Preserve ALL words including fillers (um, uh, ah)
        2. Mark interruptions with [interruption]
        3. Note non-verbal sounds [laughter], [pause], [inaudible]
        4. Format speakers clearly with names/labels
        5. Include emotional context where relevant
        6. Maintain exact timing and flow of conversation
        
        Format:
        [Speaker 1]: [00:01:23] Exact words including um, pauses...
        [Speaker 2]: [00:01:45] Interrupting or responding...
      `
    });
    
    return {
      baseTranscript: rawTranscript,
      enhancedTranscript,
      speakers: this.extractSpeakerList(enhancedTranscript),
      status: 'completed',
      metadata: {
        processingTime: 0,
        confidenceScore: 0.98,
        wordCount: enhancedTranscript.split(' ').length,
        serviceType: 'Verbatim Multi-Speaker',
        addOnsApplied: []
      }
    };
  }
  
  /**
   * Indigenous / Oral History ($2.50 CAD/min)
   * Cultural context and respectful formatting
   */
  private async processIndigenousOral(
    audioFile: File | Buffer,
    fileName: string,
    config: TTTCanadaServiceConfig
  ): Promise<TTTCanadaResult> {
    
    // Standard Speechmatics transcription
    const speechmaticsConfig = {
      type: 'transcription' as const,
      transcription_config: {
        language: 'en', // Most Indigenous oral histories are in English
        diarization: 'speaker' as const
      }
    };
    
    const { job_id } = await speechmaticsService.submitTranscriptionJob(
      audioFile,
      fileName,
      speechmaticsConfig
    );
    
    const baseTranscript = await this.waitForCompletion(job_id);
    
    // OpenAI with cultural sensitivity instructions
    const enhancedTranscript = await this.enhanceWithOpenAI(baseTranscript, {
      task: 'indigenous_oral_history',
      instructions: `
        Format this Indigenous oral history or storytelling transcript with cultural sensitivity:
        
        1. Preserve the natural flow and rhythm of oral tradition
        2. Respect cultural terminology and proper nouns
        3. Note ceremonial or traditional elements respectfully
        4. Include pauses and emphasis that carry cultural meaning
        5. Format according to oral history documentation standards
        6. Preserve the storyteller's unique voice and phrasing
        7. Note cultural context where appropriate: [Traditional song], [Ceremony], [Sacred reference]
        8. Use respectful language throughout
        
        Remember: This may contain sacred or culturally sensitive content that requires respectful handling.
      `
    });
    
    return {
      baseTranscript,
      enhancedTranscript,
      status: 'completed',
      metadata: {
        processingTime: 0,
        confidenceScore: 0.93,
        wordCount: enhancedTranscript.split(' ').length,
        serviceType: 'Indigenous Oral History',
        addOnsApplied: ['cultural_sensitivity']
      }
    };
  }
  
  /**
   * Legal Dictation ($1.85 CAD/min)
   * Canadian legal formatting and terminology
   */
  private async processLegalDictation(
    audioFile: File | Buffer,
    fileName: string,
    config: TTTCanadaServiceConfig
  ): Promise<TTTCanadaResult> {
    
    const speechmaticsConfig = {
      type: 'transcription' as const,
      transcription_config: {
        language: config.language === 'fr-CA' ? 'fr' : 'en'
      }
    };
    
    const { job_id } = await speechmaticsService.submitTranscriptionJob(
      audioFile,
      fileName,
      speechmaticsConfig
    );
    
    const baseTranscript = await this.waitForCompletion(job_id);
    
    // OpenAI legal formatting
    const enhancedTranscript = await this.enhanceWithOpenAI(baseTranscript, {
      task: 'canadian_legal_formatting',
      instructions: `
        Format this legal dictation according to Canadian legal standards:
        
        1. Use proper Canadian legal terminology and citations
        2. Format case references according to Canadian citation standards
        3. Structure as appropriate legal document (memo, letter, brief)
        4. Ensure proper paragraph numbering and section headers
        5. Correct legal abbreviations and Latin terms
        6. Apply appropriate Canadian legal document formatting
        7. Preserve all case names, statutes, and legal references exactly
        8. Use Canadian English spelling and terminology
        
        Legal Context: Canadian federal and provincial law
      `
    });
    
    return {
      baseTranscript,
      enhancedTranscript,
      status: 'completed',
      metadata: {
        processingTime: 0,
        confidenceScore: 0.97,
        wordCount: enhancedTranscript.split(' ').length,
        serviceType: 'Legal Dictation',
        addOnsApplied: ['legal_formatting']
      }
    };
  }
  
  /**
   * Copy Typing ($2.80-$3.00 per page)
   * OCR + OpenAI text enhancement
   */
  private async processCopyTyping(
    audioFile: File | Buffer,
    fileName: string,
    config: TTTCanadaServiceConfig
  ): Promise<TTTCanadaResult> {
    
    // For copy typing, we might receive an image/PDF instead of audio
    // This would use OpenAI Vision API for OCR + enhancement
    
    const enhancedTranscript = await this.enhanceWithOpenAI('', {
      task: 'copy_typing_enhancement',
      instructions: `
        Clean up and format this scanned/handwritten text:
        
        1. Correct any OCR errors
        2. Improve formatting and structure  
        3. Maintain original meaning and intent
        4. Apply consistent styling and layout
        5. Fix spelling and grammar errors
        6. Preserve important formatting elements
        7. Create clean, professional document format
      `
    });
    
    return {
      baseTranscript: '[Copy typing from source document]',
      enhancedTranscript,
      status: 'completed',
      metadata: {
        processingTime: 0,
        confidenceScore: 0.92,
        wordCount: enhancedTranscript.split(' ').length,
        serviceType: 'Copy Typing',
        addOnsApplied: ['ocr_enhancement']
      }
    };
  }
  
  /**
   * Apply premium add-ons to the transcript
   */
  private async applyAddOns(
    result: TTTCanadaResult,
    config: TTTCanadaServiceConfig
  ): Promise<TTTCanadaResult> {
    
    if (config.addOns.anonymization) {
      result.anonymizedVersion = await this.anonymizeTranscript(result.enhancedTranscript || result.baseTranscript);
      result.metadata.addOnsApplied.push('anonymization');
    }
    
    if (config.addOns.timestamps) {
      result.timestamps = await this.addDetailedTimestamps(result.enhancedTranscript || result.baseTranscript);
      result.metadata.addOnsApplied.push('timestamps');
    }
    
    if (config.addOns.customTemplate) {
      result.enhancedTranscript = await this.applyCustomTemplate(result.enhancedTranscript || result.baseTranscript, config);
      result.metadata.addOnsApplied.push('custom_template');
    }
    
    return result;
  }

  /**
   * Generate DOCX variants (base, enhanced, humanReviewed, anonymized) and upload to Firebase Storage
   */
  private async generateAndUploadDocxVariants(
    result: TTTCanadaResult,
    fileName: string,
    config: TTTCanadaServiceConfig
  ): Promise<TTTCanadaResult['files']> {
    // If Firebase Storage isn't configured, skip uploading safely
    if (!storage) {
      console.warn('Firebase Storage not initialized; skipping DOCX upload');
      return {};
    }

    const baseTitle = `TTT Canada - ${config.serviceType.replace(/_/g, ' ')}`;
    const basePathRoot = `ttt-canada-docs/${Date.now()}`;
    const files: TTTCanadaResult['files'] = {};

    // Helper to upload a single doc
    const uploadDoc = async (docTitle: string, content: string, suffix: string) => {
      const buffer = await generateDocx({
        title: docTitle,
        content,
        footerNote: 'Talk-to-Text Canada — Confidential',
        metadata: {
          author: 'Talk-to-Text Canada',
          subject: `${config.serviceType} transcript`,
          keywords: ['transcription', 'Canada', 'TTT Canada'],
        },
      });
      const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const path = `${basePathRoot}/${safeName.replace(/\.[^.]+$/, '')}_${suffix}.docx`;
      const objectRef = ref(storage, path);
      const snapshot = await uploadBytes(objectRef, buffer, { contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const url = await getDownloadURL(snapshot.ref);
      return { url, path };
    };

    try {
      if (result.baseTranscript) {
        const { url } = await uploadDoc(`${baseTitle} — Base Transcript`, result.baseTranscript, 'base');
        files.baseDocxUrl = url;
      }
      if (result.enhancedTranscript) {
        const { url } = await uploadDoc(`${baseTitle} — Enhanced`, result.enhancedTranscript, 'enhanced');
        files.enhancedDocxUrl = url;
      }
      if (result.humanReviewedTranscript) {
        const { url } = await uploadDoc(`${baseTitle} — Human Reviewed`, result.humanReviewedTranscript, 'human');
        files.humanReviewedDocxUrl = url;
      }
      if (result.anonymizedVersion) {
        const { url } = await uploadDoc(`${baseTitle} — Anonymized`, result.anonymizedVersion, 'anonymized');
        files.anonymizedDocxUrl = url;
      }
    } catch (e) {
      console.error('Failed generating/uploading DOCX files:', e);
    }

    return files;
  }
  
  /**
   * Enhance transcript using OpenAI
   */
  private async enhanceWithOpenAI(
    transcript: string,
    task: { task: string; instructions: string }
  ): Promise<string> {
    
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are a professional Canadian transcription editor specializing in ${task.task}. ${task.instructions}`
          },
          {
            role: "user",
            content: transcript
          }
        ],
        temperature: 0.1, // Low temperature for consistent, accurate results
        max_tokens: 4000
      });
      
      return completion.choices[0]?.message?.content || transcript;
      
    } catch (error) {
      console.error('OpenAI enhancement error:', error);
      return transcript; // Fallback to original
    }
  }
  
  /**
   * Wait for Speechmatics job completion
   */
  private async waitForCompletion(jobId: string): Promise<string> {
    // Use your existing polling logic
    let attempts = 0;
    const maxAttempts = 60; // 10 minutes max
    
    while (attempts < maxAttempts) {
      const status = await speechmaticsService.getJobStatusDirect(jobId);
      
      if (status.status === 'done') {
        const result = await speechmaticsService.getTranscriptDirect(jobId, 'txt');
        return result;
      } else if (status.status === 'rejected') {
        throw new Error('Speechmatics job was rejected');
      }
      
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
      attempts++;
    }
    
    throw new Error('Transcription timeout');
  }
  
  /**
   * Extract speaker list from transcript
   */
  private extractSpeakerList(transcript: string): string[] {
    const speakerMatches = transcript.match(/\[Speaker \d+\]|\[.*?\]:/g) || [];
    return [...new Set(speakerMatches)];
  }
  
  /**
   * Anonymize transcript using OpenAI
   */
  private async anonymizeTranscript(transcript: string): Promise<string> {
    return await this.enhanceWithOpenAI(transcript, {
      task: 'anonymization',
      instructions: `
        Remove or replace all personally identifiable information (PII) from this transcript:
        1. Replace names with [PARTICIPANT 1], [PARTICIPANT 2], etc.
        2. Remove specific locations, addresses, phone numbers
        3. Replace company names with [ORGANIZATION A], [ORGANIZATION B]
        4. Remove dates of birth, social security numbers, etc.
        5. Maintain the flow and meaning of the conversation
        6. Comply with Canadian PIPEDA privacy requirements
      `
    });
  }
  
  /**
   * Add detailed timestamps
   */
  private async addDetailedTimestamps(transcript: string): Promise<Array<{ time: string; speaker?: string; text: string }>> {
    // This would integrate with Speechmatics timing data
    // For now, return a basic structure
    return [
      { time: "00:00:00", text: transcript.substring(0, 100) + "..." }
    ];
  }
  
  /**
   * Queue transcription for human review
   */
  private async queueForHumanReview(reviewRequest: {
    fileName: string;
    baseTranscript: string;
    aiDraftTranscript: string;
    serviceConfig: TTTCanadaServiceConfig;
    priority: 'normal' | 'high';
  }): Promise<string> {
    
    const humanReviewJobId = `hr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // In a real implementation, this would:
    // 1. Store the job in a human review queue database
    // 2. Notify available human reviewers
    // 3. Track estimated completion time based on queue length
    // 4. Send notifications when review is complete
    
    console.log(`👤 Human review job ${humanReviewJobId} queued for file: ${reviewRequest.fileName}`);
    console.log(`📝 AI draft ready for human reviewer (${reviewRequest.aiDraftTranscript.split(' ').length} words)`);
    console.log(`⚡ Priority: ${reviewRequest.priority}`);
    
    // Simulate queueing process
    // TODO: Integrate with actual human reviewer workflow system
    
    return humanReviewJobId;
  }
  
  /**
   * Check human review status and get completed transcript
   */
  async getHumanReviewStatus(humanReviewJobId: string): Promise<{
    status: 'pending' | 'in_progress' | 'completed';
    estimatedCompletionTime?: number;
    humanReviewedTranscript?: string;
    reviewerNotes?: string;
  }> {
    
    // In a real implementation, this would check the human review queue
    // For demo purposes, we'll simulate different states
    
    console.log(`🔍 Checking human review status for job: ${humanReviewJobId}`);
    
    // TODO: Implement actual human review status checking
    // This would query your human review queue database
    
    return {
      status: 'pending',
      estimatedCompletionTime: Date.now() + (2 * 60 * 60 * 1000) // 2 hours from now
    };
  }
  
  /**
   * Complete human review workflow (called when human reviewer finishes)
   */
  async completeHumanReview(humanReviewJobId: string, humanReviewedTranscript: string, reviewerNotes?: string): Promise<TTTCanadaResult> {
    
    console.log(`✅ Human review completed for job: ${humanReviewJobId}`);
    
    // This would be called by your human reviewer interface
    // when a reviewer submits their completed work
    
    // TODO: Implement actual workflow completion
    // 1. Update job status in database
    // 2. Notify customer that transcription is ready
    // 3. Update billing and credits
    // 4. Generate final formatted output
    
    const result: TTTCanadaResult = {
      baseTranscript: '',
      enhancedTranscript: '',
      humanReviewedTranscript,
      status: 'human_review_complete',
      metadata: {
        processingTime: 0,
        confidenceScore: 0.98, // Human review confidence
        wordCount: humanReviewedTranscript.split(' ').length,
        serviceType: 'AI Draft + Human Review',
        addOnsApplied: [],
        humanReviewCompletedAt: Date.now()
      }
    };

    // Try to generate and upload the human-reviewed DOCX immediately
    try {
      const files = await this.generateAndUploadDocxVariants(result, `human_review_${humanReviewJobId}.txt`, {
        serviceType: 'ai_human_review',
        language: 'en-CA',
        addOns: {},
      } as any);
      result.files = files;
    } catch (e) {
      console.warn('Could not upload human-reviewed DOCX:', e);
    }

    return result;
  }

  /**
   * Apply custom template formatting
   */
  private async applyCustomTemplate(transcript: string, config: TTTCanadaServiceConfig): Promise<string> {
    return await this.enhanceWithOpenAI(transcript, {
      task: 'custom_template_formatting',
      instructions: `
        Format this transcript according to the client's custom template requirements:
        ${config.clientInstructions || 'Apply professional Canadian document formatting'}
        
        Maintain professional standards while following specific formatting requests.
      `
    });
  }
}

export const tttCanadaService = new TTTCanadaService();