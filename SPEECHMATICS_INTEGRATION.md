# Speechmatics AI Transcription Integration

This document describes the Speechmatics AI transcription integration that has been added to your Firebase transcription application.

## Overview

Speechmatics AI has been integrated to automatically process transcription jobs for **AI mode** and **hybrid mode** workflows:

- **AI Mode**: Files are processed with Speechmatics and marked as `complete` when finished
- **Hybrid Mode**: Files are processed with Speechmatics and marked as `pending-review` for human verification
- **Human Mode**: Remains unchanged - jobs are marked as `pending-transcription` for manual processing

## Components Added

### 1. API Routes

#### `/api/transcribe` (Direct transcription endpoint)
- Direct file upload and transcription for testing
- Handles file upload, Speechmatics processing, and returns transcript
- Supports language and operating point configuration

#### `/api/transcriptions/process` (Job processing endpoint)  
- Processes existing transcription jobs with Speechmatics
- Downloads audio from Firebase Storage
- Updates job status based on transcription mode
- Used by upload workflow for automatic processing

#### `/api/admin/process-job` (Admin manual processing)
- Allows admins to manually trigger Speechmatics processing
- Admin authentication required
- Useful for reprocessing failed or queued jobs

### 2. Service Layer

#### `src/lib/speechmatics/service.ts`
- `SpeechmaticsService` class for API communication
- Handles job creation, file upload, polling, and cleanup
- Configurable transcription settings (language, operating point, diarization)
- Error handling and timeout management

### 3. UI Integration

#### Upload Page Updates
- Automatic Speechmatics processing for AI/hybrid modes
- Graceful error handling - upload succeeds even if processing fails
- Progress notifications for users

#### Admin Queue Updates
- "Process AI" button for queued/failed AI and hybrid jobs
- Manual processing capability for administrators
- Real-time status updates

## Configuration

### Environment Variables
Required variables in `.env.local`:

```env
SPEECHMATICS_API_KEY=your_speechmatics_api_key
SPEECHMATICS_API_URL=https://asr.api.speechmatics.com/v2
```

### Default Settings
- **Language**: English (`en`)
- **Operating Point**: Enhanced (better accuracy)
- **Diarization**: Enabled (speaker identification)
- **Punctuation**: Enabled
- **Timeout**: 10 minutes maximum processing time

## Workflow

### Automatic Processing (AI/Hybrid Mode)
1. User uploads file and selects AI or hybrid mode
2. File uploaded to Firebase Storage
3. Transcription job created in Firestore with status `queued`
4. Credits consumed and transaction recorded
5. **NEW**: Speechmatics processing automatically triggered
6. Job status updated to `processing`
7. Audio downloaded from Storage and sent to Speechmatics
8. Speechmatics transcribes the audio
9. Job status updated:
   - **AI Mode**: `complete` with transcript
   - **Hybrid Mode**: `pending-review` with transcript for human verification

### Manual Processing (Admin)
1. Admin views transcription queue
2. Admin clicks "Process AI" button on queued/failed AI or hybrid jobs
3. Speechmatics processing triggered manually
4. Same processing flow as automatic processing

### Human Mode (Unchanged)
1. User uploads file and selects human mode
2. Job created with status `queued`
3. Admin manually assigns to human transcriber
4. Status updated to `pending-transcription`
5. Human transcriber completes work
6. Status updated to `complete`

## Error Handling

### Graceful Degradation
- Upload always succeeds even if Speechmatics processing fails
- Failed processing jobs remain in queue for manual retry
- User notified of processing warnings but upload continues

### Retry Mechanisms
- Admin can manually retry failed jobs
- Failed jobs remain accessible in admin queue
- Processing attempts are logged for debugging

### Timeout Handling
- 10-minute maximum processing time per job
- Automatic cleanup of Speechmatics resources
- Failed jobs can be retried

## Monitoring

### Logs
- All Speechmatics interactions logged with `[Speechmatics]` prefix
- Job status changes tracked in Firestore
- Error details preserved for debugging

### Admin Interface
- Real-time queue status monitoring
- Manual processing controls
- Job status and transcript preview

## Cost Management

### Credit System Integration
- Credits consumed upfront during upload
- No additional credit charges for processing
- Failed processing doesn't affect credits (already consumed)

### API Usage
- Speechmatics jobs automatically cleaned up after completion
- Efficient polling with 5-second intervals
- Resource cleanup on timeouts and errors

## Testing

### Test with Sample Files
1. Upload a short audio file (MP3/WAV) in AI mode
2. Monitor job progress in admin queue
3. Verify transcript appears when processing completes
4. Test manual processing with "Process AI" button

### Verify Integration
1. Check logs for Speechmatics processing messages
2. Confirm job status updates in admin queue
3. Test both AI and hybrid mode workflows
4. Verify error handling with invalid files

## Troubleshooting

### Common Issues

#### "Invalid API credentials"
- Verify `SPEECHMATICS_API_KEY` in `.env.local`
- Check API key has sufficient credits/permissions

#### "Transcription service configuration error"
- Ensure both `SPEECHMATICS_API_KEY` and `SPEECHMATICS_API_URL` are set
- Restart development server after environment changes

#### Jobs stuck in "processing"
- Check network connectivity to Speechmatics API
- Verify API key is valid and has sufficient quota
- Use admin "Process AI" button to retry

#### Processing fails silently
- Check browser console and server logs
- Verify audio file is accessible from Firebase Storage
- Confirm Speechmatics supports the audio format

### Debug Steps
1. Check browser console for client-side errors
2. Check server logs for Speechmatics API responses
3. Verify Firebase Storage permissions for audio files
4. Test direct transcription endpoint (`/api/transcribe`) with sample file

## Next Steps

### Optional Enhancements
1. **Queue System**: Implement proper job queue (Redis/Bull) for production
2. **Progress Tracking**: Real-time progress updates for long audio files
3. **Language Detection**: Automatic language detection for multi-language support
4. **Batch Processing**: Process multiple files simultaneously
5. **Webhook Integration**: Speechmatics webhook support for async processing

### Production Considerations
1. **Rate Limiting**: Implement API rate limiting to prevent abuse
2. **Monitoring**: Add application performance monitoring
3. **Scaling**: Consider serverless functions for processing
4. **Backup**: Implement transcript backup/versioning
5. **Analytics**: Track transcription accuracy and processing times