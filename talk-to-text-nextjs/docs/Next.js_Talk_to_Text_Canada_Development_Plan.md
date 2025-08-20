# Talk to Text Canada - Next.js Development Plan

## Executive Summary

This plan outlines the complete development of Talk to Text Canada using Next.js 14 with TypeScript, optimized for Vercel deployment. The platform will provide AI transcription services with multiple tiers, legal document production, and a freemium model.

## Technology Stack

### Frontend Framework
- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Shadcn/ui** for component library
- **React Hook Form** with Zod validation
- **Zustand** for state management

### Backend Services
- **Next.js API Routes** for backend logic
- **Prisma ORM** with PostgreSQL database
- **Vercel Postgres** for database hosting
- **Vercel Blob Storage** for file storage
- **NextAuth.js** for authentication

### External Integrations
- **Speechmatics API** for transcription
- **Stripe** for payment processing
- **Resend** for email notifications
- **Uploadthing** for file uploads

### Deployment & Infrastructure
- **Vercel** for hosting and deployment
- **Vercel Edge Functions** for performance
- **Vercel Analytics** for monitoring
- **GitHub** for version control

## Project Structure

```
talk-to-text-nextjs/
├── README.md
├── next.config.js
├── package.json
├── tailwind.config.js
├── tsconfig.json
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/
│   │   │   ├── projects/
│   │   │   ├── billing/
│   │   │   └── layout.tsx
│   │   ├── (trial)/
│   │   │   ├── trial/
│   │   │   └── layout.tsx
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   ├── transcription/
│   │   │   ├── stripe/
│   │   │   ├── upload/
│   │   │   └── download/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── about/
│   │   ├── pricing/
│   │   ├── legal/
│   │   └── admin/
│   ├── components/
│   │   ├── ui/ (shadcn components)
│   │   ├── forms/
│   │   ├── transcription/
│   │   ├── dashboard/
│   │   └── shared/
│   ├── lib/
│   │   ├── auth.ts
│   │   ├── db.ts
│   │   ├── stripe.ts
│   │   ├── speechmatics.ts
│   │   ├── utils.ts
│   │   └── validations.ts
│   ├── store/
│   │   └── index.ts
│   └── types/
│       └── index.ts
├── public/
│   ├── images/
│   └── favicon.ico
├── docs/
└── .env.example
```

## Development Stages

### Stage 1: Project Foundation & Setup (Week 1)

#### Step 1.1: Project Initialization
**Sub-steps:**
1.1.1. Initialize Next.js project with TypeScript
1.1.2. Install and configure Tailwind CSS
1.1.3. Set up ESLint and Prettier
1.1.4. Configure TypeScript strict mode
1.1.5. Set up Git repository and initial commit

**Deliverables:**
- Working Next.js development environment
- Configured tooling and linting
- Basic project structure

#### Step 1.2: Database Setup
**Sub-steps:**
1.2.1. Install and configure Prisma ORM
1.2.2. Set up Vercel Postgres database
1.2.3. Design database schema for users, projects, subscriptions
1.2.4. Create initial Prisma migrations
1.2.5. Set up database connection and client

**Deliverables:**
- Database schema and migrations
- Prisma client configuration
- Database connection established

#### Step 1.3: Authentication Foundation
**Sub-steps:**
1.3.1. Install and configure NextAuth.js
1.3.2. Set up authentication providers (email/password)
1.3.3. Create user registration and login pages
1.3.4. Implement session management
1.3.5. Set up protected route middleware

**Deliverables:**
- Complete authentication system
- User registration and login flows
- Session management

### Stage 2: Core UI Components & Design System (Week 2)

#### Step 2.1: Design System Setup
**Sub-steps:**
2.1.1. Install and configure Shadcn/ui
2.1.2. Customize theme with Talk to Text Canada colors (#003366 navy)
2.1.3. Create design tokens and CSS variables
2.1.4. Set up typography system
2.1.5. Create brand guidelines and component library

**Deliverables:**
- Complete design system
- Brand-compliant UI components
- Typography and color system

#### Step 2.2: Layout Components
**Sub-steps:**
2.2.1. Create main layout component
2.2.2. Build navigation header with logo
2.2.3. Implement responsive sidebar
2.2.4. Create footer component
2.2.5. Set up layout variants (public, auth, dashboard)

**Deliverables:**
- Responsive layout system
- Navigation components
- Layout variants

#### Step 2.3: Form Components
**Sub-steps:**
2.3.1. Set up React Hook Form with Zod validation
2.3.2. Create reusable form components
2.3.3. Build file upload component
2.3.4. Implement form validation patterns
2.3.5. Create error handling components

**Deliverables:**
- Form component library
- Validation system
- File upload functionality

### Stage 3: File Management & Storage (Week 3)

#### Step 3.1: File Upload System
**Sub-steps:**
3.1.1. Set up Vercel Blob Storage
3.1.2. Configure file upload API routes
3.1.3. Implement secure file upload with validation
3.1.4. Create progress tracking for uploads
3.1.5. Set up file type and size restrictions

**Deliverables:**
- Secure file upload system
- File validation and restrictions
- Upload progress tracking

#### Step 3.2: File Organization
**Sub-steps:**
3.2.1. Implement client-based file organization
3.2.2. Create project-based folder structure
3.2.3. Set up file metadata tracking
3.2.4. Implement file access controls
3.2.5. Create file cleanup utilities

**Deliverables:**
- Organized file storage system
- File metadata management
- Access control implementation

### Stage 4: Speechmatics Integration (Week 4)

#### Step 4.1: Transcription Service Setup
**Sub-steps:**
4.1.1. Install Speechmatics SDK
4.1.2. Configure API credentials and endpoints
4.1.3. Create transcription API routes
4.1.4. Implement job submission logic
4.1.5. Set up job status polling

**Deliverables:**
- Speechmatics API integration
- Job management system
- Status polling mechanism

#### Step 4.2: Transcription Workflow
**Sub-steps:**
4.2.1. Create upload → transcribe workflow
4.2.2. Implement job queue management
4.2.3. Add transcription result processing
4.2.4. Create error handling and retries
4.2.5. Set up real-time status updates

**Deliverables:**
- Complete transcription workflow
- Job queue system
- Real-time updates

### Stage 5: Trial System Implementation (Week 5)

#### Step 5.1: Coupon System
**Sub-steps:**
5.1.1. Create coupon database schema
5.1.2. Implement coupon generation and validation
5.1.3. Create trial usage tracking
5.1.4. Set up 3 upload / 3 hour limits
5.1.5. Build trial expiration logic

**Deliverables:**
- Coupon management system
- Usage tracking
- Trial limitations

#### Step 5.2: Trial User Interface
**Sub-steps:**
5.2.1. Create trial landing page
5.2.2. Build trial upload interface
5.2.3. Implement usage display
5.2.4. Create trial expiration notifications
5.2.5. Set up conversion prompts

**Deliverables:**
- Trial user interface
- Usage monitoring
- Conversion flow

### Stage 6: Document Processing & Downloads (Week 6)

#### Step 6.1: PDF Generation
**Sub-steps:**
6.1.1. Set up PDF generation library (Puppeteer/Playwright)
6.1.2. Create document templates
6.1.3. Implement PDF locking functionality
6.1.4. Set up DOCX to PDF conversion
6.1.5. Create canonical file naming system

**Deliverables:**
- PDF generation system
- Document locking functionality
- File naming conventions

#### Step 6.2: Download System
**Sub-steps:**
6.2.1. Create secure download API routes
6.2.2. Implement access control for downloads
6.2.3. Set up format-specific download rules
6.2.4. Create download tracking
6.2.5. Implement file cleanup after download

**Deliverables:**
- Secure download system
- Format-specific rules
- Access controls

### Stage 7: Stripe Payment Integration (Week 7)

#### Step 7.1: Payment Setup
**Sub-steps:**
7.1.1. Configure Stripe integration
7.1.2. Set up subscription products and pricing
7.1.3. Create checkout session API
7.1.4. Implement webhook handling
7.1.5. Set up customer portal

**Deliverables:**
- Stripe payment integration
- Subscription management
- Webhook processing

#### Step 7.2: Billing Interface
**Sub-steps:**
7.2.1. Create pricing page
7.2.2. Build subscription dashboard
7.2.3. Implement billing history
7.2.4. Add payment method management
7.2.5. Create subscription upgrade/downgrade flows

**Deliverables:**
- Billing user interface
- Subscription management
- Payment flows

### Stage 8: Dashboard & Project Management (Week 8)

#### Step 8.1: Main Dashboard
**Sub-steps:**
8.1.1. Create dashboard overview page
8.1.2. Build project listing component
8.1.3. Implement usage statistics
8.1.4. Add quick action buttons
8.1.5. Create recent activity feed

**Deliverables:**
- Dashboard interface
- Project overview
- Usage statistics

#### Step 8.2: Project Management
**Sub-steps:**
8.2.1. Create project creation flow
8.2.2. Build project detail pages
8.2.3. Implement project switching
8.2.4. Add project settings
8.2.5. Create project sharing features

**Deliverables:**
- Project management system
- Project switching
- Project settings

### Stage 9: Transcript Editor (Week 9)

#### Step 9.1: Editor Interface
**Sub-steps:**
9.1.1. Set up rich text editor (Tiptap/Slate)
9.1.2. Create transcript display and editing
9.1.3. Implement auto-save functionality
9.1.4. Add formatting tools
9.1.5. Create speaker identification

**Deliverables:**
- Transcript editor
- Auto-save functionality
- Formatting tools

#### Step 9.2: Editor Features
**Sub-steps:**
9.2.1. Add timestamp navigation
9.2.2. Implement search and replace
9.2.3. Create confidence scoring display
9.2.4. Add annotation features
9.2.5. Implement version history

**Deliverables:**
- Advanced editor features
- Version control
- Search functionality

### Stage 10: LegalScript Studio (Week 10)

#### Step 10.1: Legal Document System
**Sub-steps:**
10.1.1. Create legal template system
10.1.2. Build Ontario Court Forms library
10.1.3. Implement template upload
10.1.4. Create document merge functionality
10.1.5. Set up legal-specific workflows

**Deliverables:**
- Legal template system
- Court forms library
- Document merging

#### Step 10.2: Legal Interface
**Sub-steps:**
10.2.1. Create LegalScript dashboard
10.2.2. Build template management interface
10.2.3. Implement intake form system
10.2.4. Create document preview
10.2.5. Add legal-specific validation

**Deliverables:**
- LegalScript interface
- Template management
- Intake system

### Stage 11: Admin Panel (Week 11)

#### Step 11.1: Admin Authentication
**Sub-steps:**
11.1.1. Set up admin role system
11.1.2. Create admin authentication
11.1.3. Implement admin route protection
11.1.4. Set up admin permissions
11.1.5. Create admin session management

**Deliverables:**
- Admin authentication
- Role-based access
- Admin permissions

#### Step 11.2: Admin Features
**Sub-steps:**
11.2.1. Create user management interface
11.2.2. Build subscription management
11.2.3. Implement usage analytics
11.2.4. Add system monitoring
11.2.5. Create admin reporting

**Deliverables:**
- Admin interface
- User management
- System monitoring

### Stage 12: API Development & Optimization (Week 12)

#### Step 12.1: API Routes
**Sub-steps:**
12.1.1. Create comprehensive API documentation
12.1.2. Implement rate limiting
12.1.3. Add API authentication
12.1.4. Set up error handling
12.1.5. Create API versioning

**Deliverables:**
- Complete API system
- Rate limiting
- API documentation

#### Step 12.2: Performance Optimization
**Sub-steps:**
12.2.1. Implement caching strategies
12.2.2. Optimize database queries
12.2.3. Set up CDN for assets
12.2.4. Implement lazy loading
12.2.5. Add performance monitoring

**Deliverables:**
- Performance optimizations
- Caching system
- Monitoring setup

### Stage 13: Testing & Quality Assurance (Week 13)

#### Step 13.1: Test Setup
**Sub-steps:**
13.1.1. Set up Jest and React Testing Library
13.1.2. Configure Playwright for E2E testing
13.1.3. Create test utilities and mocks
13.1.4. Set up test database
13.1.5. Implement CI/CD testing pipeline

**Deliverables:**
- Testing framework
- Test utilities
- CI/CD pipeline

#### Step 13.2: Test Implementation
**Sub-steps:**
13.2.1. Write unit tests for components
13.2.2. Create integration tests for API routes
13.2.3. Implement E2E test scenarios
13.2.4. Add performance testing
13.2.5. Create security testing

**Deliverables:**
- Comprehensive test suite
- E2E test coverage
- Security tests

### Stage 14: Security & Compliance (Week 14)

#### Step 14.1: Security Implementation
**Sub-steps:**
14.1.1. Implement CSRF protection
14.1.2. Add rate limiting and DDoS protection
14.1.3. Set up file upload security
14.1.4. Implement data encryption
14.1.5. Add security headers

**Deliverables:**
- Security measures
- Data protection
- File security

#### Step 14.2: Compliance Features
**Sub-steps:**
14.2.1. Implement GDPR compliance
14.2.2. Add data retention policies
14.2.3. Create privacy controls
14.2.4. Set up audit logging
14.2.5. Implement data export/deletion

**Deliverables:**
- GDPR compliance
- Privacy controls
- Audit system

### Stage 15: Vercel Deployment & Production Setup (Week 15)

#### Step 15.1: Deployment Configuration
**Sub-steps:**
15.1.1. Configure Vercel project settings
15.1.2. Set up environment variables
15.1.3. Configure domain and SSL
15.1.4. Set up database connections
15.1.5. Configure edge functions

**Deliverables:**
- Production deployment
- Environment configuration
- SSL setup

#### Step 15.2: Production Optimization
**Sub-steps:**
15.2.1. Configure caching strategies
15.2.2. Set up monitoring and alerts
15.2.3. Implement error tracking
15.2.4. Configure backup systems
15.2.5. Set up performance monitoring

**Deliverables:**
- Production optimizations
- Monitoring systems
- Backup procedures

## Database Schema

### Core Tables

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  image         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  // Subscription info
  subscriptionId String?
  subscriptionStatus String?
  customerId    String?
  
  // Trial info
  trialUsed     Boolean   @default(false)
  trialUploads  Int       @default(0)
  trialHours    Int       @default(0)
  
  projects      Project[]
  sessions      Session[]
  accounts      Account[]
}

model Project {
  id            String    @id @default(cuid())
  name          String
  status        String    @default("active")
  serviceType   String    // ai, human, hybrid, legalscript
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  userId        String
  user          User      @relation(fields: [userId], references: [id])
  
  uploads       Upload[]
  transcripts   Transcript[]
  documents     Document[]
}

model Upload {
  id            String    @id @default(cuid())
  filename      String
  originalName  String
  fileSize      Int
  mimeType      String
  storagePath   String
  createdAt     DateTime  @default(now())
  
  projectId     String
  project       Project   @relation(fields: [projectId], references: [id])
  
  transcripts   Transcript[]
}

model Transcript {
  id            String    @id @default(cuid())
  content       String
  status        String    // pending, processing, completed, failed
  jobId         String?   // Speechmatics job ID
  confidence    Float?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  projectId     String
  project       Project   @relation(fields: [projectId], references: [id])
  
  uploadId      String
  upload        Upload    @relation(fields: [uploadId], references: [id])
  
  documents     Document[]
}

model Document {
  id            String    @id @default(cuid())
  filename      String
  fileType      String    // pdf, docx
  storagePath   String
  isLocked      Boolean   @default(false)
  createdAt     DateTime  @default(now())
  
  projectId     String
  project       Project   @relation(fields: [projectId], references: [id])
  
  transcriptId  String?
  transcript    Transcript? @relation(fields: [transcriptId], references: [id])
}

model Coupon {
  id            String    @id @default(cuid())
  code          String    @unique
  remaining     Int       @default(3)
  maxUploads    Int       @default(3)
  maxHours      Int       @default(3)
  createdAt     DateTime  @default(now())
  lastUsed      DateTime?
}
```

## API Routes Structure

### Authentication Routes
- `POST /api/auth/signup` - User registration
- `POST /api/auth/signin` - User login
- `POST /api/auth/signout` - User logout
- `GET /api/auth/session` - Get current session

### Upload Routes
- `POST /api/upload` - Upload audio file
- `GET /api/upload/[id]` - Get upload details
- `DELETE /api/upload/[id]` - Delete upload

### Transcription Routes
- `POST /api/transcription/start` - Start transcription job
- `GET /api/transcription/[id]` - Get transcription status
- `GET /api/transcription/[id]/result` - Get transcription result

### Project Routes
- `GET /api/projects` - List user projects
- `POST /api/projects` - Create new project
- `GET /api/projects/[id]` - Get project details
- `PUT /api/projects/[id]` - Update project
- `DELETE /api/projects/[id]` - Delete project

### Download Routes
- `GET /api/download/pdf/[id]` - Download locked PDF
- `GET /api/download/docx/[id]` - Download editable DOCX

### Payment Routes
- `POST /api/stripe/create-checkout` - Create Stripe checkout
- `POST /api/stripe/webhook` - Handle Stripe webhooks
- `GET /api/stripe/portal` - Customer portal link

### Trial Routes
- `POST /api/trial/validate` - Validate trial coupon
- `POST /api/trial/use` - Use trial session
- `GET /api/trial/status` - Get trial status

## Critical Business Rules Implementation

### Download Format Rules
```typescript
// API route: /api/download/[type]/[id]
export async function GET(
  request: Request,
  { params }: { params: { type: string; id: string } }
) {
  const { type, id } = params;
  const project = await getProject(id);
  
  if (type === 'pdf') {
    // Always locked PDF for AI/Human/Hybrid services
    if (['ai', 'human', 'hybrid'].includes(project.serviceType)) {
      return generateLockedPDF(project);
    }
    return new Response('PDF not available for LegalScript', { status: 400 });
  }
  
  if (type === 'docx') {
    // Only editable DOCX for LegalScript
    if (project.serviceType === 'legalscript') {
      return generateEditableDOCX(project);
    }
    return new Response('DOCX not available for this service', { status: 400 });
  }
}
```

### Trial Limitations
```typescript
// Trial validation middleware
export async function validateTrial(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  
  if (!user) return false;
  
  // Check 3 upload limit
  if (user.trialUploads >= 3) return false;
  
  // Check 3 hour limit
  if (user.trialHours >= 3) return false;
  
  return true;
}
```

## Deployment Strategy

### Vercel Configuration
```javascript
// next.config.js
module.exports = {
  experimental: {
    serverActions: true,
  },
  images: {
    domains: ['blob.vercel-storage.com'],
  },
  env: {
    SPEECHMATICS_API_KEY: process.env.SPEECHMATICS_API_KEY,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  },
};
```

### Environment Variables
```bash
# Database
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Authentication
NEXTAUTH_URL="https://yourdomain.com"
NEXTAUTH_SECRET="your-secret"

# Speechmatics
SPEECHMATICS_API_KEY="your-api-key"
SPEECHMATICS_BASE_URL="https://asr.api.speechmatics.com/v2"

# Stripe
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PUBLISHABLE_KEY="pk_live_..."

# File Storage
BLOB_READ_WRITE_TOKEN="vercel_blob_..."

# Email
RESEND_API_KEY="re_..."
```

## Success Metrics & KPIs

### Technical Metrics
- **Page Load Time**: < 2 seconds
- **API Response Time**: < 500ms
- **Upload Success Rate**: > 99%
- **Transcription Accuracy**: Speechmatics dependent
- **Download Success Rate**: > 99%

### Business Metrics
- **Trial to Paid Conversion**: Target 15%+
- **Monthly Recurring Revenue**: Growth tracking
- **Customer Acquisition Cost**: Optimization
- **Customer Lifetime Value**: Maximization

### Quality Metrics
- **User Satisfaction**: > 4.5/5
- **Support Ticket Volume**: < 5% of users
- **System Uptime**: > 99.9%
- **Security Incidents**: 0 tolerance

## Timeline Summary

| Stage | Duration | Focus Area | Key Deliverables |
|-------|----------|------------|------------------|
| 1 | Week 1 | Foundation | Project setup, DB, Auth |
| 2 | Week 2 | UI/UX | Design system, components |
| 3 | Week 3 | File Management | Upload, storage system |
| 4 | Week 4 | Transcription | Speechmatics integration |
| 5 | Week 5 | Trial System | Coupon system, limits |
| 6 | Week 6 | Documents | PDF generation, downloads |
| 7 | Week 7 | Payments | Stripe integration |
| 8 | Week 8 | Dashboard | Project management |
| 9 | Week 9 | Editor | Transcript editing |
| 10 | Week 10 | Legal | LegalScript Studio |
| 11 | Week 11 | Admin | Admin panel |
| 12 | Week 12 | API | API optimization |
| 13 | Week 13 | Testing | QA and testing |
| 14 | Week 14 | Security | Security & compliance |
| 15 | Week 15 | Deployment | Production launch |

## Risk Mitigation

### Technical Risks
- **Speechmatics API downtime**: Implement retry logic and status monitoring
- **File storage limits**: Monitor usage and implement cleanup procedures
- **Database performance**: Optimize queries and implement caching

### Business Risks
- **Trial abuse**: Implement IP tracking and device fingerprinting
- **Payment failures**: Comprehensive error handling and notifications
- **Legal compliance**: Regular compliance audits and updates

### Security Risks
- **Data breaches**: End-to-end encryption and access controls
- **File security**: Signed URLs and access validation
- **Payment security**: PCI compliance and secure handling

## Conclusion

This Next.js implementation provides modern architecture, excellent performance, and seamless Vercel deployment. The 15-week timeline ensures thorough development while maintaining rapid iteration cycles. The tech stack choice enables:

✅ **Modern Development Experience**: TypeScript, React 18, Next.js 14
✅ **Excellent Performance**: Edge functions, CDN, optimized builds
✅ **Scalable Architecture**: Serverless functions, database scaling
✅ **Developer Productivity**: Hot reloading, type safety, modern tooling
✅ **Production Ready**: Built-in security, monitoring, analytics

The platform will be production-ready with enterprise-grade security, compliance features, and optimal user experience across all devices.