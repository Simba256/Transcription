import { NextRequest, NextResponse } from 'next/server';
import { seedTestTranscribers, removeTestTranscribers } from '@/lib/seed-transcribers';

export async function POST(request: NextRequest) {
  try {
    // In a production app, you'd want proper authentication here
    // For now, we'll allow it for development
    
    const body = await request.json().catch(() => ({}));
    const { reseed = false } = body;
    
    if (reseed) {
      console.log('🔄 Reseeding transcribers (removing old ones first)...');
      await removeTestTranscribers();
    }
    
    await seedTestTranscribers();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Test transcribers seeded successfully',
      action: reseed ? 'reseeded' : 'seeded'
    });
    
  } catch (error) {
    console.error('Error seeding transcribers:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to seed transcribers' 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST to seed transcribers',
    endpoint: '/api/admin/seed-transcribers',
    method: 'POST'
  });
}