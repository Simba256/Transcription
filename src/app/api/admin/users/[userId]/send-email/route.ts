import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

/**
 * API route to send feedback/check-in email to a user
 * POST /api/admin/users/[userId]/send-email
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - Missing token' },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);

    // Check if user is admin
    const adminDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
    const adminData = adminDoc.data();

    if (adminData?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const { userId } = params;

    // Get user data
    const userDoc = await adminDb.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    const userEmail = userData?.email;
    const userName = userData?.name || 'Valued User';

    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email not found' },
        { status: 400 }
      );
    }

    // Send email using Resend
    const RESEND_API_KEY = process.env.RESEND_API_KEY;

    if (!RESEND_API_KEY) {
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      );
    }

    const subject = 'How is your experience with Talk To Text?';

    // Professional and friendly email text
    const text = `
Hi ${userName},

We hope this message finds you well!

We wanted to take a moment to check in and see how your experience has been with Talk To Text. Your feedback is incredibly valuable to us as we continuously work to improve our transcription services.

We'd love to hear from you about:

• How has your overall experience been so far?
• Are our transcription services meeting your needs?
• Is there anything we can help you with?
• Do you have any suggestions or feedback for us?

Whether you have questions, concerns, or just want to share your thoughts, we're here to listen and help in any way we can.

Feel free to reply directly to this email at jennifer@talktotext.ca, and I'll personally make sure you get the assistance you need.

Thank you for choosing Talk To Text. We truly appreciate your business!

Best regards,
Jennifer
Talk To Text Team

---
Talk To Text - Professional Transcription Services
jennifer@talktotext.ca
https://www.talktotext.ca
`;

    // HTML version for better formatting
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #003366; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">Talk To Text</h1>
  </div>

  <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px;">Hi <strong>${userName}</strong>,</p>

    <p style="font-size: 16px;">We hope this message finds you well!</p>

    <p style="font-size: 16px;">
      We wanted to take a moment to check in and see how your experience has been with Talk To Text.
      Your feedback is incredibly valuable to us as we continuously work to improve our transcription services.
    </p>

    <div style="background-color: white; padding: 20px; border-left: 4px solid #003366; margin: 20px 0;">
      <p style="font-size: 16px; margin: 0 0 15px 0;"><strong>We'd love to hear from you about:</strong></p>
      <ul style="font-size: 16px; margin: 0; padding-left: 20px;">
        <li style="margin-bottom: 8px;">How has your overall experience been so far?</li>
        <li style="margin-bottom: 8px;">Are our transcription services meeting your needs?</li>
        <li style="margin-bottom: 8px;">Is there anything we can help you with?</li>
        <li style="margin-bottom: 8px;">Do you have any suggestions or feedback for us?</li>
      </ul>
    </div>

    <p style="font-size: 16px;">
      Whether you have questions, concerns, or just want to share your thoughts, we're here to listen
      and help in any way we can.
    </p>

    <p style="font-size: 16px;">
      Feel free to reply directly to this email at
      <a href="mailto:jennifer@talktotext.ca" style="color: #003366; text-decoration: none;">
        <strong>jennifer@talktotext.ca</strong>
      </a>,
      and I'll personally make sure you get the assistance you need.
    </p>

    <p style="font-size: 16px;">
      Thank you for choosing Talk To Text. We truly appreciate your business!
    </p>

    <p style="font-size: 16px; margin-top: 30px;">
      Best regards,<br>
      <strong>Jennifer</strong><br>
      <span style="color: #666;">Talk To Text Team</span>
    </p>

    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

    <p style="font-size: 14px; color: #666; text-align: center;">
      <strong>Talk To Text</strong> - Professional Transcription Services<br>
      <a href="mailto:jennifer@talktotext.ca" style="color: #003366;">jennifer@talktotext.ca</a> •
      <a href="https://www.talktotext.ca" style="color: #003366;">www.talktotext.ca</a>
    </p>
  </div>
</body>
</html>
`;

    // Use onboarding@resend.dev for all environments (no domain verification needed)
    // If you verify talktotext.ca domain in Resend, you can use: 'Talk To Text <noreply@talktotext.ca>'
    const fromEmail = 'Talk To Text <onboarding@resend.dev>';

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: userEmail,
        reply_to: 'jennifer@talktotext.ca',
        subject,
        text,
        html,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Email] Failed to send:', errorText);
      return NextResponse.json(
        { error: 'Failed to send email', details: errorText },
        { status: 500 }
      );
    }

    const result = await response.json();
    console.log('[Email] Feedback email sent to:', userEmail);

    return NextResponse.json({
      success: true,
      message: `Email sent successfully to ${userName} (${userEmail})`,
      emailId: result.id,
    });

  } catch (error) {
    console.error('[API] Error sending email:', error);
    return NextResponse.json(
      {
        error: 'Failed to send email',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
