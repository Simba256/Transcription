# Talk to Text Canada - Next.js + Firebase Development Plan

## Executive Summary

This comprehensive plan outlines the development of Talk to Text Canada using Next.js 14 with Firebase backend services, implementing modern security standards and best practices. The platform provides AI transcription services with multiple tiers, legal document production, and a freemium model optimized for scalability and security.

## Technology Stack

### Frontend Framework
- **Next.js 14** with App Router and Server Actions
- **TypeScript** with strict mode for type safety
- **Tailwind CSS** with design system approach
- **Shadcn/ui** component library
- **React Hook Form** with Zod validation
- **Zustand** for client-side state management
- **React Query (TanStack Query)** for server state

### Backend Services (Firebase)
- **Firebase Authentication** for user management
- **Cloud Firestore** for NoSQL database
- **Firebase Storage** for file management
- **Firebase Functions** for server-side logic
- **Firebase App Check** for app integrity
- **Firebase Security Rules** for data protection

### External Integrations
- **Speechmatics API** for transcription services
- **Stripe** for payment processing
- **Resend** for transactional emails
- **Sentry** for error monitoring

### Security & Best Practices
- **OWASP compliance** throughout development
- **Content Security Policy (CSP)** implementation
- **HTTPS enforcement** with HSTS headers
- **Rate limiting** and DDoS protection
- **Input validation** and sanitization
- **Secure file upload** with virus scanning
- **GDPR compliance** features

### Development Tools
- **ESLint** with security rules
- **Prettier** for code formatting
- **Husky** for git hooks
- **Lint-staged** for pre-commit checks
- **Jest** and **React Testing Library** for testing
- **Playwright** for E2E testing
- **Storybook** for component documentation

## Project Structure

```
talk-to-text-nextjs/
├── README.md
├── next.config.js
├── package.json
├── tailwind.config.js
├── tsconfig.json
├── .env.local.example
├── .gitignore
├── .eslintrc.json
├── prettier.config.js
├── firebase.json
├── firestore.rules
├── storage.rules
├── functions/
│   ├── src/
│   │   ├── index.ts
│   │   ├── auth/
│   │   ├── transcription/
│   │   ├── payments/
│   │   └── utils/
│   ├── package.json
│   └── tsconfig.json
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── register/
│   │   │   │   └── page.tsx
│   │   │   ├── forgot-password/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx
│   │   │   ├── projects/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── [id]/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── new/
│   │   │   │       └── page.tsx
│   │   │   ├── transcripts/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx
│   │   │   │       └── edit/
│   │   │   │           └── page.tsx
│   │   │   ├── billing/
│   │   │   │   └── page.tsx
│   │   │   ├── settings/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx
│   │   ├── (trial)/
│   │   │   ├── trial/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx
│   │   ├── (legal)/
│   │   │   ├── legalscript/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── templates/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── documents/
│   │   │   │       └── page.tsx
│   │   │   └── layout.tsx
│   │   ├── (admin)/
│   │   │   ├── admin/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── users/
│   │   │   │   ├── analytics/
│   │   │   │   └── settings/
│   │   │   └── layout.tsx
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   └── route.ts
│   │   │   ├── upload/
│   │   │   │   └── route.ts
│   │   │   ├── download/
│   │   │   │   └── [type]/
│   │   │   │       └── [id]/
│   │   │   │           └── route.ts
│   │   │   ├── stripe/
│   │   │   │   ├── checkout/
│   │   │   │   │   └── route.ts
│   │   │   │   └── webhook/
│   │   │   │       └── route.ts
│   │   │   └── health/
│   │   │       └── route.ts
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── loading.tsx
│   │   ├── error.tsx
│   │   ├── not-found.tsx
│   │   ├── about/
│   │   │   └── page.tsx
│   │   ├── pricing/
│   │   │   └── page.tsx
│   │   ├── legal/
│   │   │   ├── privacy/
│   │   │   │   └── page.tsx
│   │   │   ├── terms/
│   │   │   │   └── page.tsx
│   │   │   └── nda/
│   │   │       └── page.tsx
│   │   └── sitemap.xml
│   ├── components/
│   │   ├── ui/ (shadcn components)
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── dialog.tsx
│   │   │   └── ...
│   │   ├── auth/
│   │   │   ├── login-form.tsx
│   │   │   ├── register-form.tsx
│   │   │   └── auth-guard.tsx
│   │   ├── forms/
│   │   │   ├── upload-form.tsx
│   │   │   ├── intake-form.tsx
│   │   │   └── contact-form.tsx
│   │   ├── transcription/
│   │   │   ├── transcript-editor.tsx
│   │   │   ├── transcript-viewer.tsx
│   │   │   └── transcription-status.tsx
│   │   ├── dashboard/
│   │   │   ├── project-card.tsx
│   │   │   ├── usage-stats.tsx
│   │   │   └── quick-actions.tsx
│   │   ├── legal/
│   │   │   ├── template-manager.tsx
│   │   │   ├── document-preview.tsx
│   │   │   └── court-forms.tsx
│   │   ├── admin/
│   │   │   ├── user-management.tsx
│   │   │   ├── analytics-dashboard.tsx
│   │   │   └── system-monitor.tsx
│   │   └── shared/
│   │       ├── header.tsx
│   │       ├── footer.tsx
│   │       ├── sidebar.tsx
│   │       ├── loading-spinner.tsx
│   │       ├── error-boundary.tsx
│   │       └── seo-head.tsx
│   ├── lib/
│   │   ├── firebase/
│   │   │   ├── config.ts
│   │   │   ├── auth.ts
│   │   │   ├── firestore.ts
│   │   │   ├── storage.ts
│   │   │   └── functions.ts
│   │   ├── services/
│   │   │   ├── auth-service.ts
│   │   │   ├── project-service.ts
│   │   │   ├── transcription-service.ts
│   │   │   ├── payment-service.ts
│   │   │   └── file-service.ts
│   │   ├── hooks/
│   │   │   ├── use-auth.ts
│   │   │   ├── use-projects.ts
│   │   │   ├── use-transcription.ts
│   │   │   └── use-subscription.ts
│   │   ├── utils/
│   │   │   ├── security.ts
│   │   │   ├── validation.ts
│   │   │   ├── formatting.ts
│   │   │   ├── constants.ts
│   │   │   └── helpers.ts
│   │   ├── validations/
│   │   │   ├── auth.ts
│   │   │   ├── project.ts
│   │   │   ├── upload.ts
│   │   │   └── user.ts
│   │   └── types/
│   │       ├── auth.ts
│   │       ├── project.ts
│   │       ├── transcription.ts
│   │       └── user.ts
│   ├── store/
│   │   ├── auth-store.ts
│   │   ├── project-store.ts
│   │   └── ui-store.ts
│   └── styles/
│       ├── globals.css
│       └── components.css
├── public/
│   ├── images/
│   │   ├── logo.svg
│   │   ├── favicon.ico
│   │   └── placeholder.png
│   ├── icons/
│   └── manifest.json
├── docs/
│   ├── API.md
│   ├── SECURITY.md
│   ├── DEPLOYMENT.md
│   └── CONTRIBUTING.md
├── tests/
│   ├── __mocks__/
│   ├── components/
│   ├── pages/
│   ├── api/
│   └── e2e/
└── .github/
    └── workflows/
        ├── ci.yml
        ├── security.yml
        └── deploy.yml
```

## Development Stages

### Stage 1: Foundation & Security Setup (Week 1)

#### Step 1.1: Project Initialization & Security Foundation
**Sub-steps:**
1.1.1. Initialize Next.js 14 project with TypeScript strict mode
1.1.2. Configure ESLint with security rules (@typescript-eslint, eslint-plugin-security)
1.1.3. Set up Prettier with consistent formatting
1.1.4. Configure Husky and lint-staged for pre-commit hooks
1.1.5. Set up comprehensive .gitignore with security patterns
1.1.6. Configure next.config.js with security headers

**Security Configurations:**
```javascript
// next.config.js
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin'
  },
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
  }
];
```

**Deliverables:**
- Secure Next.js project foundation
- Security-focused development environment
- Automated code quality checks

#### Step 1.2: Firebase Project Setup & Security Rules
**Sub-steps:**
1.2.1. Create Firebase project with security configuration
1.2.2. Set up Firebase Authentication with security settings
1.2.3. Configure Cloud Firestore with security rules
1.2.4. Set up Firebase Storage with access controls
1.2.5. Configure Firebase App Check for app integrity
1.2.6. Set up Firebase Functions with secure deployment

**Firebase Security Rules:**
```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Projects are user-specific
    match /projects/{projectId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
    }
    
    // Admin-only collections
    match /admin/{document=**} {
      allow read, write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}

// storage.rules
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // User-specific file access
    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // File size and type restrictions
    match /{allPaths=**} {
      allow write: if request.resource.size < 100 * 1024 * 1024 && // 100MB limit
        request.resource.contentType.matches('(audio|application)/(mp3|wav|m4a|pdf|vnd.openxmlformats-officedocument.wordprocessingml.document)');
    }
  }
}
```

**Deliverables:**
- Secure Firebase project configuration
- Comprehensive security rules
- App integrity verification

#### Step 1.3: Authentication & Authorization System
**Sub-steps:**
1.3.1. Implement Firebase Authentication integration
1.3.2. Create secure authentication flows (login, register, password reset)
1.3.3. Set up multi-factor authentication (MFA)
1.3.4. Implement role-based access control (RBAC)
1.3.5. Create authentication middleware and guards
1.3.6. Set up session security and token management

**Deliverables:**
- Complete authentication system
- MFA implementation
- RBAC system
- Secure session management

### Stage 2: Database Design & Security (Week 2)

#### Step 2.1: Firestore Schema Design
**Sub-steps:**
2.1.1. Design normalized Firestore collections
2.1.2. Implement data validation schemas with Zod
2.1.3. Create indexes for optimal query performance
2.1.4. Set up audit logging for data changes
2.1.5. Implement data encryption for sensitive fields
2.1.6. Create backup and disaster recovery procedures

**Firestore Collections:**
```typescript
// User Collection
interface User {
  uid: string;
  email: string;
  displayName: string;
  role: 'user' | 'admin' | 'legal';
  subscriptionStatus: 'trial' | 'active' | 'cancelled' | 'expired';
  subscriptionTier: 'ai' | 'human' | 'hybrid' | 'legalscript';
  trialData: {
    uploadsUsed: number;
    hoursUsed: number;
    expiresAt: Timestamp;
  };
  profile: {
    company?: string;
    phone?: string;
    preferences: Record<string, any>;
  };
  security: {
    mfaEnabled: boolean;
    lastLoginAt: Timestamp;
    loginAttempts: number;
    lockedUntil?: Timestamp;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Project Collection
interface Project {
  id: string;
  userId: string;
  name: string;
  description?: string;
  serviceType: 'ai' | 'human' | 'hybrid' | 'legalscript';
  status: 'active' | 'completed' | 'archived';
  settings: {
    language: string;
    speakerCount?: number;
    confidentiality: 'standard' | 'high';
  };
  metadata: {
    totalFiles: number;
    totalDuration: number;
    estimatedCost: number;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Deliverables:**
- Optimized Firestore schema
- Data validation system
- Audit logging implementation
- Backup procedures

#### Step 2.2: Data Security & Privacy Implementation
**Sub-steps:**
2.2.1. Implement field-level encryption for sensitive data
2.2.2. Set up GDPR compliance features (data export/deletion)
2.2.3. Create data retention policies
2.2.4. Implement privacy controls and consent management
2.2.5. Set up data anonymization for analytics
2.2.6. Create security monitoring and alerting

**Deliverables:**
- GDPR compliance features
- Data encryption system
- Privacy controls
- Security monitoring

### Stage 3: UI/UX Foundation with Security (Week 3)

#### Step 3.1: Design System & Accessibility
**Sub-steps:**
3.1.1. Set up Tailwind CSS with design tokens
3.1.2. Install and configure Shadcn/ui components
3.1.3. Create brand-compliant design system (Navy #003366)
3.1.4. Implement accessibility standards (WCAG 2.1 AA)
3.1.5. Set up dark/light theme support
3.1.6. Create responsive breakpoint system

**Deliverables:**
- Accessible design system
- Responsive component library
- Brand compliance
- Theme support

#### Step 3.2: Core Layout Components
**Sub-steps:**
3.2.1. Create secure authentication layouts
3.2.2. Build responsive dashboard layouts
3.2.3. Implement navigation with role-based visibility
3.2.4. Create error boundaries and fallback components
3.2.5. Set up loading states and skeleton components
3.2.6. Implement toast notifications system

**Deliverables:**
- Complete layout system
- Error handling components
- Loading states
- Notification system

### Stage 4: File Upload & Security (Week 4)

#### Step 4.1: Secure File Upload System
**Sub-steps:**
4.1.1. Implement Firebase Storage integration
4.1.2. Create secure file upload with validation
4.1.3. Add virus scanning and malware detection
4.1.4. Implement file size and type restrictions
4.1.5. Set up upload progress tracking
4.1.6. Create file encryption and secure storage

**Security Features:**
```typescript
// File validation
const fileValidation = z.object({
  file: z.instanceof(File)
    .refine((file) => file.size <= 100 * 1024 * 1024, "File too large") // 100MB
    .refine((file) => ALLOWED_TYPES.includes(file.type), "Invalid file type")
    .refine((file) => !hasVirus(file), "File contains malware"),
  projectId: z.string().uuid(),
  metadata: z.object({
    originalName: z.string(),
    duration: z.number().optional(),
    quality: z.enum(['standard', 'high']).optional(),
  })
});

// Secure upload function
export async function secureUpload(file: File, path: string) {
  // Validate file
  const validation = fileValidation.safeParse({ file });
  if (!validation.success) throw new Error("Invalid file");
  
  // Generate secure filename
  const secureFilename = generateSecureFilename(file.name);
  
  // Upload with encryption
  const uploadTask = uploadBytesResumable(
    ref(storage, `${path}/${secureFilename}`),
    file,
    {
      customMetadata: {
        encrypted: 'true',
        uploadedBy: getCurrentUser()?.uid || 'anonymous'
      }
    }
  );
  
  return uploadTask;
}
```

**Deliverables:**
- Secure file upload system
- Virus scanning integration
- File encryption
- Upload validation

#### Step 4.2: File Management & Organization
**Sub-steps:**
4.2.1. Create project-based file organization
4.2.2. Implement file versioning system
4.2.3. Set up file access controls and permissions
4.2.4. Create file metadata management
4.2.5. Implement file cleanup and retention policies
4.2.6. Set up file sharing with secure links

**Deliverables:**
- File organization system
- Access controls
- File versioning
- Secure sharing

### Stage 5: Speechmatics Integration & Security (Week 5)

#### Step 5.1: Secure API Integration
**Sub-steps:**
5.1.1. Set up Speechmatics SDK with secure configuration
5.1.2. Implement API key management and rotation
5.1.3. Create transcription job queue with Firebase Functions
5.1.4. Set up secure webhook handling
5.1.5. Implement job status monitoring
5.1.6. Add transcription result encryption

**Secure Integration:**
```typescript
// Firebase Function for transcription
export const startTranscription = onCall(
  { cors: true, enforceAppCheck: true },
  async (request) => {
    // Verify authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }
    
    // Rate limiting
    await enforceRateLimit(request.auth.uid, 'transcription');
    
    // Input validation
    const { projectId, fileUrl } = transcriptionSchema.parse(request.data);
    
    // Verify project ownership
    const project = await verifyProjectOwnership(projectId, request.auth.uid);
    
    // Submit to Speechmatics with secure headers
    const job = await speechmaticsClient.createJob({
      config: {
        type: 'transcription',
        transcription_config: {
          language: project.settings.language,
          operating_point: 'enhanced',
          diarization: 'speaker'
        }
      },
      audio_url: fileUrl,
      callback_url: `${process.env.FUNCTION_URL}/transcription-webhook`
    });
    
    // Store job reference with encryption
    await storeTranscriptionJob(projectId, job.id, request.auth.uid);
    
    return { jobId: job.id, status: 'submitted' };
  }
);
```

**Deliverables:**
- Secure Speechmatics integration
- Job queue system
- Webhook security
- Result encryption

#### Step 5.2: Transcription Processing & Security
**Sub-steps:**
5.2.1. Implement secure result processing
5.2.2. Create transcript validation and sanitization
5.2.3. Set up confidence scoring and quality metrics
5.2.4. Implement transcript versioning
5.2.5. Add speaker identification and timestamps
5.2.6. Create audit trail for transcription changes

**Deliverables:**
- Secure transcript processing
- Quality metrics
- Version control
- Audit trails

### Stage 6: Trial System with Security (Week 6)

#### Step 6.1: Secure Trial Management
**Sub-steps:**
6.1.1. Implement coupon generation with cryptographic security
6.1.2. Create usage tracking with tamper protection
6.1.3. Set up trial limitations (3 uploads / 3 hours)
6.1.4. Implement fraud detection and abuse prevention
6.1.5. Create trial expiration and cleanup
6.1.6. Set up conversion tracking

**Secure Trial System:**
```typescript
// Secure coupon generation
export function generateSecureCoupon(): string {
  const randomBytes = crypto.getRandomValues(new Uint8Array(16));
  const couponCode = btoa(String.fromCharCode(...randomBytes))
    .replace(/[+/=]/g, '')
    .substring(0, 12)
    .toUpperCase();
  return couponCode;
}

// Trial usage tracking with integrity checks
export async function trackTrialUsage(
  userId: string, 
  type: 'upload' | 'time', 
  amount: number
) {
  const userRef = doc(firestore, 'users', userId);
  
  return runTransaction(firestore, async (transaction) => {
    const userDoc = await transaction.get(userRef);
    const userData = userDoc.data();
    
    // Verify trial limits
    if (type === 'upload' && userData.trialData.uploadsUsed >= 3) {
      throw new Error('Trial upload limit exceeded');
    }
    if (type === 'time' && userData.trialData.hoursUsed >= 3) {
      throw new Error('Trial time limit exceeded');
    }
    
    // Update with integrity hash
    const newUsage = {
      uploadsUsed: type === 'upload' ? 
        userData.trialData.uploadsUsed + 1 : 
        userData.trialData.uploadsUsed,
      hoursUsed: type === 'time' ? 
        userData.trialData.hoursUsed + amount : 
        userData.trialData.hoursUsed
    };
    
    transaction.update(userRef, {
      'trialData': newUsage,
      'trialData.lastUpdated': serverTimestamp(),
      'trialData.integrityHash': generateIntegrityHash(newUsage)
    });
  });
}
```

**Deliverables:**
- Secure trial system
- Fraud prevention
- Usage tracking
- Conversion analytics

### Stage 7: Payment Integration & PCI Compliance (Week 7)

#### Step 7.1: Secure Stripe Integration
**Sub-steps:**
7.1.1. Set up Stripe with PCI compliance
7.1.2. Implement secure checkout sessions
7.1.3. Create subscription management
7.1.4. Set up secure webhook handling
7.1.5. Implement payment method security
7.1.6. Add billing dispute handling

**PCI Compliant Integration:**
```typescript
// Secure Stripe checkout
export async function createSecureCheckout(
  userId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string
) {
  // Verify user authentication
  const user = await verifyUser(userId);
  if (!user) throw new Error('Unauthorized');
  
  // Create or retrieve Stripe customer
  let customer = await stripe.customers.list({
    email: user.email,
    limit: 1
  });
  
  if (customer.data.length === 0) {
    customer = await stripe.customers.create({
      email: user.email,
      metadata: { firebaseUID: userId }
    });
  }
  
  // Create secure checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customer.data[0]?.id || customer.id,
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { firebaseUID: userId },
    // Security features
    billing_address_collection: 'required',
    payment_intent_data: {
      setup_future_usage: 'off_session'
    }
  });
  
  return session;
}

// Secure webhook processing
export const stripeWebhook = onRequest(
  { cors: false, timeoutSeconds: 30 },
  async (req, res) => {
    const signature = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    try {
      // Verify webhook signature
      const event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        webhookSecret
      );
      
      // Process event securely
      await processStripeEvent(event);
      
      res.status(200).send('Webhook processed');
    } catch (error) {
      logger.error('Webhook signature verification failed', error);
      res.status(400).send(`Webhook Error: ${error.message}`);
    }
  }
);
```

**Deliverables:**
- PCI compliant payment system
- Secure subscription management
- Webhook security
- Billing interface

### Stage 8: Document Processing & DRM (Week 8)

#### Step 8.1: Secure Document Generation
**Sub-steps:**
8.1.1. Set up secure PDF generation with Puppeteer
8.1.2. Implement document templating system
8.1.3. Create PDF watermarking and DRM
8.1.4. Set up DOCX generation and protection
8.1.5. Implement document encryption
8.1.6. Create secure download system

**Secure Document Processing:**
```typescript
// PDF generation with DRM
export async function generateSecurePDF(
  transcriptData: TranscriptData,
  options: PDFOptions
): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Generate HTML with watermarks
    const html = generateSecureHTML(transcriptData, {
      watermark: `${transcriptData.userId}-${Date.now()}`,
      restrictions: options.restrictions
    });
    
    await page.setContent(html);
    
    // Generate PDF with protection
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '1in', bottom: '1in', left: '1in', right: '1in' }
    });
    
    // Apply DRM protection
    const protectedPDF = await applyDRMProtection(pdf, {
      permissions: {
        printing: false,
        copying: false,
        editing: false
      },
      ownerPassword: generateSecurePassword(),
      watermark: transcriptData.userId
    });
    
    return protectedPDF;
  } finally {
    await browser.close();
  }
}
```

**Deliverables:**
- Secure document generation
- DRM implementation
- Watermarking system
- Encrypted downloads

### Stage 9: Dashboard & Analytics with Security (Week 9)

#### Step 9.1: Secure Dashboard Implementation
**Sub-steps:**
9.1.1. Create role-based dashboard views
9.1.2. Implement real-time data with security filters
9.1.3. Set up usage analytics with privacy protection
9.1.4. Create project management interface
9.1.5. Implement secure data visualization
9.1.6. Add export functionality with access controls

**Deliverables:**
- Secure dashboard system
- Real-time updates
- Privacy-compliant analytics
- Export controls

### Stage 10: LegalScript Studio with Enhanced Security (Week 10)

#### Step 10.1: Legal Document Security
**Sub-steps:**
10.1.1. Create secure legal template system
10.1.2. Implement Ontario Court Forms library
10.1.3. Set up template version control
10.1.4. Create secure document merging
10.1.5. Implement legal-grade audit trails
10.1.6. Add digital signatures and attestation

**Deliverables:**
- Legal template system
- Court forms integration
- Audit trails
- Digital signatures

### Stage 11: Admin Panel with Advanced Security (Week 11)

#### Step 11.1: Secure Admin Features
**Sub-steps:**
11.1.1. Implement admin authentication with MFA
11.1.2. Create user management with audit logs
11.1.3. Set up system monitoring and alerts
11.1.4. Implement security analytics
11.1.5. Create backup and recovery tools
11.1.6. Add compliance reporting

**Deliverables:**
- Secure admin panel
- System monitoring
- Compliance tools
- Security analytics

### Stage 12: Advanced Security Features (Week 12)

#### Step 12.1: Security Hardening
**Sub-steps:**
12.1.1. Implement advanced threat detection
12.1.2. Set up automated security scanning
12.1.3. Create incident response procedures
12.1.4. Implement zero-trust architecture
12.1.5. Add behavioral analytics
12.1.6. Set up security orchestration

**Deliverables:**
- Threat detection system
- Security automation
- Incident response
- Zero-trust implementation

### Stage 13: Testing & Security Validation (Week 13)

#### Step 13.1: Comprehensive Testing Suite
**Sub-steps:**
13.1.1. Set up unit testing with security focus
13.1.2. Create integration tests for all APIs
13.1.3. Implement E2E testing with Playwright
13.1.4. Add security testing and penetration testing
13.1.5. Create performance testing suite
13.1.6. Set up accessibility testing

**Security Testing:**
```typescript
// Security test examples
describe('Authentication Security', () => {
  test('prevents brute force attacks', async () => {
    const { page } = await loginAttempts(6, 'wrong-password');
    expect(await page.textContent('.error')).toContain('Account locked');
  });
  
  test('validates JWT tokens', async () => {
    const response = await fetch('/api/protected', {
      headers: { Authorization: 'Bearer invalid-token' }
    });
    expect(response.status).toBe(401);
  });
  
  test('prevents CSRF attacks', async () => {
    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file: 'malicious' })
    });
    expect(response.status).toBe(403);
  });
});
```

**Deliverables:**
- Complete testing suite
- Security validation
- Performance benchmarks
- Accessibility compliance

### Stage 14: Compliance & Documentation (Week 14)

#### Step 14.1: Compliance Implementation
**Sub-steps:**
14.1.1. Complete GDPR compliance audit
14.1.2. Implement SOC 2 Type II controls
14.1.3. Create PIPEDA compliance features
14.1.4. Set up data classification system
14.1.5. Implement privacy by design
14.1.6. Create compliance documentation

**Deliverables:**
- GDPR compliance
- SOC 2 controls
- Privacy frameworks
- Compliance documentation

### Stage 15: Production Deployment & Monitoring (Week 15)

#### Step 15.1: Secure Production Deployment
**Sub-steps:**
15.1.1. Set up production Firebase environment
15.1.2. Configure Vercel deployment with security
15.1.3. Implement SSL/TLS with HSTS
15.1.4. Set up CDN with security headers
15.1.5. Configure monitoring and alerting
15.1.6. Create disaster recovery procedures

**Production Security Configuration:**
```javascript
// vercel.json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=63072000; includeSubDomains; preload"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=()"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/$1"
    }
  ]
}
```

**Deliverables:**
- Production deployment
- Security monitoring
- Performance monitoring
- Disaster recovery

## Security Best Practices Implementation

### 1. Authentication & Authorization Security
```typescript
// Multi-factor authentication
export async function enableMFA(userId: string) {
  const user = await admin.auth().getUser(userId);
  
  // Generate secure backup codes
  const backupCodes = Array.from({ length: 10 }, () => 
    crypto.randomBytes(4).toString('hex').toUpperCase()
  );
  
  // Store encrypted backup codes
  await firestore.collection('users').doc(userId).update({
    'security.mfaEnabled': true,
    'security.backupCodes': await encryptBackupCodes(backupCodes),
    'security.mfaSetupAt': admin.firestore.FieldValue.serverTimestamp()
  });
  
  return backupCodes;
}

// Rate limiting implementation
export async function enforceRateLimit(
  identifier: string, 
  action: string, 
  limit: number = 10
): Promise<void> {
  const key = `rate_limit:${action}:${identifier}`;
  const window = 15 * 60 * 1000; // 15 minutes
  
  const attempts = await redis.incr(key);
  if (attempts === 1) {
    await redis.expire(key, window / 1000);
  }
  
  if (attempts > limit) {
    throw new HttpsError(
      'resource-exhausted',
      `Rate limit exceeded for ${action}`
    );
  }
}
```

### 2. Data Protection & Privacy
```typescript
// Field-level encryption
export class EncryptionService {
  private static readonly algorithm = 'aes-256-gcm';
  private static readonly keyDerivation = 'pbkdf2';
  
  static async encrypt(data: string, key: string): Promise<EncryptedData> {
    const salt = crypto.randomBytes(16);
    const derivedKey = crypto.pbkdf2Sync(key, salt, 100000, 32, 'sha256');
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher(this.algorithm, derivedKey);
    cipher.setAAD(salt);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      salt: salt.toString('hex'),
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }
  
  static async decrypt(encryptedData: EncryptedData, key: string): Promise<string> {
    const { encrypted, salt, iv, authTag } = encryptedData;
    const derivedKey = crypto.pbkdf2Sync(
      key, 
      Buffer.from(salt, 'hex'), 
      100000, 
      32, 
      'sha256'
    );
    
    const decipher = crypto.createDecipher(this.algorithm, derivedKey);
    decipher.setAAD(Buffer.from(salt, 'hex'));
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}

// GDPR compliance
export class GDPRService {
  static async exportUserData(userId: string): Promise<UserDataExport> {
    const userData = await firestore.collection('users').doc(userId).get();
    const projects = await firestore
      .collection('projects')
      .where('userId', '==', userId)
      .get();
    const transcripts = await firestore
      .collection('transcripts')
      .where('userId', '==', userId)
      .get();
    
    return {
      user: userData.data(),
      projects: projects.docs.map(doc => doc.data()),
      transcripts: transcripts.docs.map(doc => ({
        ...doc.data(),
        content: '[REDACTED]' // Don't export sensitive content
      })),
      exportedAt: new Date().toISOString(),
      format: 'json'
    };
  }
  
  static async deleteUserData(userId: string): Promise<void> {
    const batch = firestore.batch();
    
    // Delete user document
    batch.delete(firestore.collection('users').doc(userId));
    
    // Delete user projects
    const projects = await firestore
      .collection('projects')
      .where('userId', '==', userId)
      .get();
    
    projects.forEach(doc => batch.delete(doc.ref));
    
    // Delete from storage
    await this.deleteUserFiles(userId);
    
    await batch.commit();
  }
}
```

### 3. Input Validation & Sanitization
```typescript
// Comprehensive input validation
export const schemas = {
  upload: z.object({
    file: z.instanceof(File)
      .refine(file => file.size <= 100 * 1024 * 1024, "File too large")
      .refine(file => ALLOWED_MIME_TYPES.includes(file.type), "Invalid file type")
      .refine(async file => !(await containsMalware(file)), "Malware detected"),
    projectId: z.string().uuid("Invalid project ID"),
    metadata: z.object({
      originalName: z.string().max(255).regex(/^[a-zA-Z0-9._-]+$/, "Invalid filename"),
      description: z.string().max(1000).optional(),
    }).optional()
  }),
  
  project: z.object({
    name: z.string()
      .min(1, "Name required")
      .max(100, "Name too long")
      .regex(/^[a-zA-Z0-9\s._-]+$/, "Invalid characters"),
    description: z.string().max(500).optional(),
    serviceType: z.enum(['ai', 'human', 'hybrid', 'legalscript']),
    settings: z.object({
      language: z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/, "Invalid language code"),
      confidentiality: z.enum(['standard', 'high']),
    })
  }),
  
  user: z.object({
    email: z.string().email("Invalid email").max(254),
    displayName: z.string()
      .min(1, "Name required")
      .max(100, "Name too long")
      .regex(/^[a-zA-Z\s]+$/, "Invalid name format"),
    company: z.string().max(100).optional(),
  })
};

// Sanitization utilities
export class SanitizationService {
  static sanitizeHTML(input: string): string {
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em'],
      ALLOWED_ATTR: []
    });
  }
  
  static sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9._-]/g, '')
      .substring(0, 255);
  }
  
  static validateAndSanitizeInput<T>(
    schema: z.ZodSchema<T>, 
    input: unknown
  ): T {
    const result = schema.safeParse(input);
    if (!result.success) {
      throw new ValidationError(result.error.issues);
    }
    return result.data;
  }
}
```

## Critical Business Rules with Security

### 1. Download Format Rules (Tamper-Proof)
```typescript
export class SecureDownloadService {
  static async generateDownload(
    projectId: string, 
    userId: string, 
    format: 'pdf' | 'docx'
  ): Promise<SecureDownloadResult> {
    // Verify ownership
    const project = await this.verifyProjectOwnership(projectId, userId);
    
    // Apply business rules with cryptographic verification
    const rules = await this.getBusinessRules(project.serviceType);
    
    if (format === 'pdf') {
      // Only AI, Human, Hybrid services get locked PDFs
      if (!['ai', 'human', 'hybrid'].includes(project.serviceType)) {
        throw new BusinessRuleError(
          'PDF downloads not available for LegalScript services'
        );
      }
      
      return this.generateLockedPDF(project, userId);
    }
    
    if (format === 'docx') {
      // Only LegalScript gets editable DOCX
      if (project.serviceType !== 'legalscript') {
        throw new BusinessRuleError(
          'DOCX downloads only available for LegalScript services'
        );
      }
      
      return this.generateEditableDOCX(project, userId);
    }
    
    throw new BusinessRuleError('Invalid format requested');
  }
  
  private static async generateLockedPDF(
    project: Project, 
    userId: string
  ): Promise<SecureDownloadResult> {
    const pdf = await this.createPDF(project);
    
    // Apply DRM with user-specific encryption
    const lockedPDF = await this.applyDRMProtection(pdf, {
      userId,
      projectId: project.id,
      permissions: {
        print: false,
        copy: false,
        edit: false,
        extract: false
      },
      watermark: `${userId}-${project.id}-${Date.now()}`
    });
    
    // Generate secure download URL with expiration
    const downloadUrl = await this.generateSecureURL(lockedPDF, {
      expiresIn: 3600, // 1 hour
      userId,
      auditLog: true
    });
    
    return {
      url: downloadUrl,
      filename: `FinalDocument_${project.name}.pdf`,
      expiresAt: new Date(Date.now() + 3600000),
      checksum: await this.generateChecksum(lockedPDF)
    };
  }
}
```

### 2. Trial System Security
```typescript
export class SecureTrialService {
  private static readonly TRIAL_LIMITS = {
    uploads: 3,
    hours: 3,
    duration: 30 * 24 * 60 * 60 * 1000 // 30 days
  };
  
  static async validateTrialUsage(
    userId: string, 
    action: 'upload' | 'time',
    amount: number = 1
  ): Promise<TrialValidationResult> {
    const user = await firestore.collection('users').doc(userId).get();
    const userData = user.data();
    
    if (!userData?.trialData) {
      throw new SecurityError('Invalid trial data');
    }
    
    // Verify trial integrity
    const expectedHash = this.calculateTrialHash(userData.trialData);
    if (userData.trialData.integrityHash !== expectedHash) {
      await this.reportTrialTampering(userId);
      throw new SecurityError('Trial data compromised');
    }
    
    // Check trial expiration
    if (userData.trialData.expiresAt.toDate() < new Date()) {
      return { valid: false, reason: 'Trial expired' };
    }
    
    // Check limits
    if (action === 'upload' && userData.trialData.uploadsUsed >= this.TRIAL_LIMITS.uploads) {
      return { valid: false, reason: 'Upload limit reached' };
    }
    
    if (action === 'time' && userData.trialData.hoursUsed + amount > this.TRIAL_LIMITS.hours) {
      return { valid: false, reason: 'Time limit reached' };
    }
    
    // Device fingerprinting to prevent abuse
    const deviceFingerprint = await this.getDeviceFingerprint();
    if (await this.isDeviceAbused(deviceFingerprint)) {
      return { valid: false, reason: 'Device limit exceeded' };
    }
    
    return { valid: true };
  }
  
  private static calculateTrialHash(trialData: TrialData): string {
    const content = `${trialData.uploadsUsed}-${trialData.hoursUsed}-${trialData.expiresAt}`;
    return crypto.createHash('sha256').update(content).digest('hex');
  }
  
  private static async reportTrialTampering(userId: string): Promise<void> {
    await firestore.collection('security_incidents').add({
      type: 'trial_tampering',
      userId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      severity: 'high',
      details: 'Trial data integrity check failed'
    });
  }
}
```

## Monitoring & Incident Response

### Security Monitoring
```typescript
export class SecurityMonitoringService {
  static async logSecurityEvent(event: SecurityEvent): Promise<void> {
    const enrichedEvent = {
      ...event,
      timestamp: new Date().toISOString(),
      userAgent: event.userAgent || 'unknown',
      ipAddress: await this.getClientIP(event.request),
      geoLocation: await this.getGeoLocation(event.ipAddress),
      riskScore: await this.calculateRiskScore(event)
    };
    
    // Log to multiple destinations
    await Promise.all([
      this.logToFirestore(enrichedEvent),
      this.logToSentry(enrichedEvent),
      this.alertIfCritical(enrichedEvent)
    ]);
  }
  
  private static async calculateRiskScore(event: SecurityEvent): Promise<number> {
    let score = 0;
    
    // Check for suspicious patterns
    if (await this.isFromKnownBadIP(event.ipAddress)) score += 50;
    if (await this.isRapidRequests(event.userId)) score += 30;
    if (await this.isUnusualGeoLocation(event.userId, event.geoLocation)) score += 20;
    if (await this.isNewDevice(event.userId, event.deviceFingerprint)) score += 10;
    
    return Math.min(score, 100);
  }
  
  private static async alertIfCritical(event: SecurityEvent): Promise<void> {
    if (event.riskScore >= 80 || event.severity === 'critical') {
      await this.sendAlert({
        channel: 'security',
        message: `Critical security event: ${event.type}`,
        details: event,
        priority: 'high'
      });
    }
  }
}
```

## Performance & Scalability Considerations

### 1. Database Optimization
```typescript
// Firestore optimization strategies
export class DatabaseOptimizationService {
  // Implement proper indexing
  static setupIndexes(): void {
    // Composite indexes for common queries
    // users: [userId, createdAt]
    // projects: [userId, status, updatedAt]
    // transcripts: [projectId, status, createdAt]
  }
  
  // Pagination for large datasets
  static async getPaginatedProjects(
    userId: string, 
    lastDoc?: DocumentSnapshot,
    limit: number = 20
  ): Promise<PaginatedResult<Project>> {
    let query = firestore
      .collection('projects')
      .where('userId', '==', userId)
      .orderBy('updatedAt', 'desc')
      .limit(limit);
    
    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }
    
    const snapshot = await query.get();
    
    return {
      documents: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      lastDoc: snapshot.docs[snapshot.docs.length - 1],
      hasMore: snapshot.docs.length === limit
    };
  }
  
  // Batch operations for efficiency
  static async batchUpdateProjects(
    updates: Array<{ id: string; data: Partial<Project> }>
  ): Promise<void> {
    const batch = firestore.batch();
    
    updates.forEach(update => {
      const ref = firestore.collection('projects').doc(update.id);
      batch.update(ref, update.data);
    });
    
    await batch.commit();
  }
}
```

### 2. Caching Strategy
```typescript
// Multi-layer caching
export class CacheService {
  private static readonly cache = new Map<string, CacheEntry>();
  
  static async get<T>(key: string): Promise<T | null> {
    // Check memory cache first
    const memoryResult = this.cache.get(key);
    if (memoryResult && !this.isExpired(memoryResult)) {
      return memoryResult.data;
    }
    
    // Check Redis cache
    const redisResult = await redis.get(key);
    if (redisResult) {
      const data = JSON.parse(redisResult);
      this.cache.set(key, { data, expiresAt: Date.now() + 300000 }); // 5 min
      return data;
    }
    
    return null;
  }
  
  static async set<T>(
    key: string, 
    data: T, 
    ttl: number = 3600
  ): Promise<void> {
    // Set in both memory and Redis
    this.cache.set(key, { data, expiresAt: Date.now() + ttl * 1000 });
    await redis.setex(key, ttl, JSON.stringify(data));
  }
  
  private static isExpired(entry: CacheEntry): boolean {
    return entry.expiresAt < Date.now();
  }
}
```

## Deployment & CI/CD Security

### GitHub Actions Security Pipeline
```yaml
# .github/workflows/security.yml
name: Security Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Run security audit
        run: |
          npm audit --audit-level=moderate
          npm run lint:security
      
      - name: SAST scan
        uses: github/codeql-action/analyze@v2
        with:
          languages: typescript, javascript
      
      - name: Dependency check
        uses: dependency-check/Dependency-Check_Action@main
        with:
          project: 'talk-to-text-canada'
          path: '.'
          format: 'ALL'
      
      - name: Container security scan
        run: |
          docker run --rm -v "${{ github.workspace }}":/workspace \
            aquasec/trivy fs --security-checks vuln,config /workspace
      
      - name: OWASP ZAP security test
        uses: zaproxy/action-full-scan@v0.4.0
        with:
          target: ${{ env.PREVIEW_URL }}
```

## Documentation & Compliance

### Security Documentation Requirements
1. **Security Architecture Document**
2. **Data Flow Diagrams with Security Controls**
3. **Threat Model and Risk Assessment**
4. **Incident Response Procedures**
5. **Business Continuity Plan**
6. **GDPR Compliance Checklist**
7. **SOC 2 Control Documentation**
8. **Security Training Materials**

## Conclusion

This comprehensive Next.js + Firebase development plan provides:

✅ **Enterprise-Grade Security**: OWASP compliance, advanced threat protection
✅ **Modern Architecture**: Next.js 14, TypeScript, serverless functions
✅ **Scalable Backend**: Firebase suite with security rules
✅ **Compliance Ready**: GDPR, SOC 2, PIPEDA compliance
✅ **Performance Optimized**: Caching, optimization, monitoring
✅ **Production Ready**: CI/CD pipeline, monitoring, incident response

**Timeline**: 15 weeks with security-first approach
**Deployment**: Vercel with Firebase backend
**Compliance**: Multiple frameworks supported
**Security**: Zero-trust architecture with defense in depth

The platform will be production-ready with enterprise-grade security, regulatory compliance, and optimal performance across all devices and use cases.