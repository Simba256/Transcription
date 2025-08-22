# Transcription Modes Database Schema

This document outlines the database schema changes required to support multiple transcription modes (AI, Human, Hybrid).

## New Collections

### 1. `transcriptions` (Enhanced)
Extended the existing collection with new fields:

```typescript
interface ExtendedTranscriptionJobData {
  // Existing fields...
  id?: string;
  userId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  status: 'pending' | 'processing' | 'completed' | 'error' | 'assigned' | 'human_review';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  
  // New fields
  mode: 'ai' | 'human' | 'hybrid';
  
  // AI-specific fields
  speechmaticsJobId?: string;
  speechmaticsStatus?: string;
  aiTranscript?: string;
  
  // Human transcription fields
  assignedTranscriber?: string;
  humanAssignmentId?: string;
  humanTranscript?: string;
  humanNotes?: string;
  
  // Hybrid mode fields
  hybridData?: {
    aiTranscript?: string;
    aiConfidence?: number;
    aiProcessingTime?: number;
    humanTranscript?: string;
    humanNotes?: string;
    humanProcessingTime?: number;
    qualityScore?: number;
    reviewedBy?: string;
    reviewedAt?: Timestamp;
  };
  
  // Final output
  finalTranscript?: string;
  
  // Quality and feedback
  qualityRating?: number;
  clientFeedback?: string;
  internalNotes?: string;
}
```

### 2. `human_transcribers` (New)
Manages human transcriber profiles:

```typescript
interface HumanTranscriber {
  id?: string;
  userId: string;
  email: string;
  name: string;
  status: 'active' | 'inactive' | 'busy';
  specializations: string[];
  rating: number;
  completedJobs: number;
  averageCompletionTime: number;
  languages: string[];
  certifications?: string[];
  createdAt: Timestamp;
  lastActiveAt: Timestamp;
}
```

### 3. `transcriber_assignments` (New)
Tracks job assignments to human transcribers:

```typescript
interface HumanTranscriberAssignment {
  id?: string;
  transcriptionId: string;
  transcriberId: string;
  assignedAt: Timestamp;
  status: 'assigned' | 'in_progress' | 'completed' | 'rejected';
  estimatedCompletion?: Timestamp;
  notes?: string;
  completedAt?: Timestamp;
}
```

## Migration Steps

### Step 1: Update Existing Documents
Add default mode to existing transcription documents:

```javascript
// Firestore update script
const batch = writeBatch(db);
const existingDocs = await getDocs(collection(db, 'transcriptions'));

existingDocs.forEach((doc) => {
  const docRef = doc.ref;
  batch.update(docRef, {
    mode: 'ai', // Default existing jobs to AI mode
    priority: 'normal'
  });
});

await batch.commit();
```

### Step 2: Create Indexes
Add indexes for efficient querying:

```javascript
// Firestore indexes needed:
// transcriptions: mode, status, createdAt
// transcriptions: assignedTranscriber, status
// transcriptions: userId, mode, status
// transcriber_assignments: transcriberId, status, assignedAt
// human_transcribers: status, rating
```

### Step 3: Create Initial Transcriber Accounts
Set up human transcriber accounts:

```javascript
// Example transcriber creation
const transcriberData = {
  userId: 'transcriber_user_id',
  email: 'transcriber@example.com',
  name: 'Professional Transcriber',
  status: 'active',
  specializations: ['medical', 'legal', 'academic'],
  rating: 5.0,
  completedJobs: 0,
  averageCompletionTime: 45,
  languages: ['en', 'es'],
  createdAt: serverTimestamp(),
  lastActiveAt: serverTimestamp()
};

await addDoc(collection(db, 'human_transcribers'), transcriberData);
```

## Security Rules

Update Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Transcriptions - users can only access their own
    match /transcriptions/{transcriptionId} {
      allow read, write: if request.auth != null && 
        (request.auth.uid == resource.data.userId || 
         request.auth.uid == resource.data.assignedTranscriber);
    }
    
    // Human transcribers - only transcribers can read their profile
    match /human_transcribers/{transcriberId} {
      allow read: if request.auth != null && 
        request.auth.uid == resource.data.userId;
      allow write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
    
    // Transcriber assignments - accessible to assigned transcriber and job owner
    match /transcriber_assignments/{assignmentId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        request.auth.uid == resource.data.transcriberId;
    }
  }
}
```

## API Endpoints

### New Endpoints:
- `POST /api/transcription/modes/process` - Create transcription with mode selection
- `GET /api/transcriber/assignments` - Get transcriber assignments
- `POST /api/transcriber/assignments` - Submit/reject transcription
- `GET /api/admin/transcribers` - Admin: manage transcribers
- `POST /api/admin/transcribers` - Admin: create/update transcribers

### Enhanced Endpoints:
- `GET /api/transcription/status` - Now includes mode-specific status
- `GET /api/transcription/result` - Returns final transcript based on mode

## Workflow Changes

### AI Mode (Existing)
1. User uploads → AI processing → Complete

### Human Mode (New)
1. User uploads → Assign to transcriber → Human transcription → Complete

### Hybrid Mode (New)
1. User uploads → AI processing → Assign to human for review → Human review → Complete

## Quality Metrics

Track quality metrics for each mode:

```typescript
interface QualityMetrics {
  mode: TranscriptionMode;
  averageAccuracy: number;
  averageCompletionTime: number;
  customerSatisfaction: number;
  costEfficiency: number;
}
```

## Cost Calculation

Pricing structure by mode:
- AI: $0.10/minute
- Human: $1.50/minute  
- Hybrid: $0.75/minute

Priority multipliers:
- Low: 1.0x
- Normal: 1.0x
- High: 1.5x
- Urgent: 2.0x

Quality multipliers:
- Standard: 1.0x
- Premium: 1.25x
- Enterprise: 1.5x