import { TranscriptionMode } from '@/lib/firebase/transcriptions-admin';

interface EmailNotification {
  transcriptionId: string;
  userId: string;
  userEmail: string;
  fileName: string;
  duration: number;
  mode: TranscriptionMode;
  language: string;
  domain?: string;
  rushDelivery?: boolean;
  speakerCount?: number;
  specialInstructions?: string;
  submittedAt: Date;
}

/**
 * Send email notification for human/hybrid transcription submissions
 * This can be configured to use different email providers
 */
export async function sendTranscriptionNotification(data: EmailNotification): Promise<boolean> {
  // Only send notifications for human and hybrid modes
  if (data.mode !== 'human' && data.mode !== 'hybrid') {
    console.log(`[Email] Skipping notification for AI mode transcription`);
    return true;
  }

  // Get email configuration from environment variables
  const notificationEmail = process.env.TRANSCRIPTION_NOTIFICATION_EMAIL;
  const emailApiEndpoint = process.env.EMAIL_API_ENDPOINT;
  const emailApiKey = process.env.EMAIL_API_KEY;

  // If email notification is not configured, skip silently
  if (!notificationEmail || !emailApiEndpoint || !emailApiKey) {
    console.log('[Email] Email notifications not configured, skipping');
    return true;
  }

  try {
    const subject = `New ${data.mode === 'human' ? 'Human' : 'Hybrid'} Transcription Request - ${data.fileName}`;

    const htmlContent = generateEmailHTML(data);
    const textContent = generateEmailText(data);

    // Send email using API endpoint (works with SendGrid, Resend, etc.)
    const response = await fetch(emailApiEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${emailApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: notificationEmail,
        subject,
        html: htmlContent,
        text: textContent,
        from: process.env.EMAIL_FROM_ADDRESS || 'noreply@talktotext.ca',
        replyTo: data.userEmail,
      }),
    });

    if (!response.ok) {
      throw new Error(`Email API responded with ${response.status}`);
    }

    console.log(`[Email] Notification sent successfully for ${data.mode} transcription ${data.transcriptionId}`);
    return true;

  } catch (error) {
    console.error('[Email] Failed to send notification:', error);
    // Don't throw - email failure shouldn't block transcription submission
    return false;
  }
}

function generateEmailHTML(data: EmailNotification): string {
  const modeColor = data.mode === 'human' ? '#9333ea' : '#3b82f6';
  const modeLabel = data.mode === 'human' ? 'HUMAN TRANSCRIPTION' : 'HYBRID REVIEW';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: ${modeColor}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 8px 8px; }
        .details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 8px; border: 1px solid #e5e5e5; }
        .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding-bottom: 10px; border-bottom: 1px solid #eee; }
        .detail-row:last-child { border-bottom: none; }
        .label { font-weight: bold; color: #666; }
        .value { color: #333; }
        .urgent { background-color: #fef2f2; border: 1px solid #fca5a5; padding: 10px; border-radius: 5px; margin: 15px 0; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
        .button { display: inline-block; padding: 12px 24px; background-color: ${modeColor}; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2 style="margin: 0;">New Transcription Request</h2>
          <div style="margin-top: 10px; font-size: 18px; font-weight: bold;">${modeLabel}</div>
        </div>

        <div class="content">
          <p><strong>A new ${data.mode} transcription has been submitted and requires processing.</strong></p>

          ${data.rushDelivery ? `
          <div class="urgent">
            <strong>⚠️ RUSH DELIVERY REQUESTED</strong><br>
            This transcription has been marked for expedited processing.
          </div>
          ` : ''}

          <div class="details">
            <h3 style="margin-top: 0; color: #333;">Transcription Details</h3>

            <div class="detail-row">
              <span class="label">Transcription ID:</span>
              <span class="value">${data.transcriptionId}</span>
            </div>

            <div class="detail-row">
              <span class="label">File Name:</span>
              <span class="value">${data.fileName}</span>
            </div>

            <div class="detail-row">
              <span class="label">Duration:</span>
              <span class="value">${Math.round(data.duration)} minutes</span>
            </div>

            <div class="detail-row">
              <span class="label">Language:</span>
              <span class="value">${data.language === 'fr' ? 'French' : 'English'}</span>
            </div>

            <div class="detail-row">
              <span class="label">Domain:</span>
              <span class="value">${data.domain || 'General'}</span>
            </div>

            <div class="detail-row">
              <span class="label">Speakers:</span>
              <span class="value">${data.speakerCount || 'Not specified'}</span>
            </div>

            <div class="detail-row">
              <span class="label">Submitted At:</span>
              <span class="value">${data.submittedAt.toLocaleString()}</span>
            </div>
          </div>

          <div class="details">
            <h3 style="margin-top: 0; color: #333;">Customer Information</h3>

            <div class="detail-row">
              <span class="label">User ID:</span>
              <span class="value">${data.userId}</span>
            </div>

            <div class="detail-row">
              <span class="label">Email:</span>
              <span class="value"><a href="mailto:${data.userEmail}">${data.userEmail}</a></span>
            </div>
          </div>

          ${data.specialInstructions ? `
          <div class="details">
            <h3 style="margin-top: 0; color: #333;">Special Instructions</h3>
            <p style="margin: 0;">${data.specialInstructions}</p>
          </div>
          ` : ''}

          <div style="text-align: center; margin-top: 20px;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://www.talktotext.ca'}/admin/transcriptions" class="button">
              View in Admin Panel
            </a>
          </div>

          <div class="footer">
            <p>This is an automated notification from Talk To Text Canada transcription service.</p>
            <p>Do not reply to this email. Contact the customer directly at ${data.userEmail} if needed.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateEmailText(data: EmailNotification): string {
  const modeLabel = data.mode === 'human' ? 'HUMAN TRANSCRIPTION' : 'HYBRID REVIEW';

  return `
NEW TRANSCRIPTION REQUEST - ${modeLabel}

${data.rushDelivery ? '⚠️ RUSH DELIVERY REQUESTED\n\n' : ''}

TRANSCRIPTION DETAILS:
----------------------
Transcription ID: ${data.transcriptionId}
File Name: ${data.fileName}
Duration: ${Math.round(data.duration)} minutes
Language: ${data.language === 'fr' ? 'French' : 'English'}
Domain: ${data.domain || 'General'}
Speakers: ${data.speakerCount || 'Not specified'}
Submitted At: ${data.submittedAt.toLocaleString()}

CUSTOMER INFORMATION:
--------------------
User ID: ${data.userId}
Email: ${data.userEmail}

${data.specialInstructions ? `SPECIAL INSTRUCTIONS:\n${data.specialInstructions}\n\n` : ''}

View in Admin Panel: ${process.env.NEXT_PUBLIC_APP_URL || 'https://www.talktotext.ca'}/admin/transcriptions

---
This is an automated notification from Talk To Text Canada transcription service.
Do not reply to this email. Contact the customer directly at ${data.userEmail} if needed.
  `;
}

/**
 * Alternative: Send using nodemailer (requires nodemailer package)
 * Uncomment this section if you prefer to use SMTP directly
 */
/*
import nodemailer from 'nodemailer';

export async function sendTranscriptionNotificationSMTP(data: EmailNotification): Promise<boolean> {
  if (data.mode !== 'human' && data.mode !== 'hybrid') {
    return true;
  }

  const notificationEmail = process.env.TRANSCRIPTION_NOTIFICATION_EMAIL;
  if (!notificationEmail) {
    console.log('[Email] Notification email not configured');
    return true;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_FROM_ADDRESS || 'noreply@talktotext.ca',
      to: notificationEmail,
      replyTo: data.userEmail,
      subject: `New ${data.mode === 'human' ? 'Human' : 'Hybrid'} Transcription - ${data.fileName}`,
      html: generateEmailHTML(data),
      text: generateEmailText(data),
    });

    console.log(`[Email] Notification sent for ${data.mode} transcription ${data.transcriptionId}`);
    return true;
  } catch (error) {
    console.error('[Email] Failed to send notification:', error);
    return false;
  }
}
*/