import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file size (500MB limit)
    const maxSize = 500 * 1024 * 1024; // 500MB in bytes
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 500MB.' },
        { status: 400 }
      );
    }

    // Validate file type (audio/video files)
    const allowedTypes = [
      'audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/m4a', 'audio/aac', 
      'audio/ogg', 'audio/flac', 'audio/webm', 'audio/x-ms-wma',
      'video/mp4', 'video/mov', 'video/avi', 'video/mkv', 'video/quicktime'
    ];

    const isValidType = allowedTypes.includes(file.type) || 
                       file.name.match(/\.(mp3|wav|m4a|mp4|aac|ogg|flac|webm|wma|mov|avi|mkv)$/i);

    if (!isValidType) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload audio or video files only.' },
        { status: 400 }
      );
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'uploads', 'temp');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const fileExtension = path.extname(file.name);
    const fileName = `upload_${timestamp}_${randomSuffix}${fileExtension}`;
    const filePath = path.join(uploadsDir, fileName);

    // Convert File to Buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    await writeFile(filePath, buffer);

    // Return the file URL/path for processing
    const fileUrl = `/uploads/temp/${fileName}`;

    console.log(`✅ File uploaded successfully: ${fileName} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`);

    return NextResponse.json({
      success: true,
      fileName: file.name,
      uploadedFileName: fileName,
      fileUrl: filePath, // Use local path for processing
      publicUrl: fileUrl, // Public URL if needed
      fileSize: file.size,
      fileType: file.type,
      message: 'File uploaded successfully'
    });

  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json(
      { 
        error: 'File upload failed', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'File Upload API',
    methods: ['POST'],
    maxSize: '500MB',
    allowedTypes: [
      'Audio: MP3, WAV, M4A, AAC, OGG, FLAC, WEBM, WMA',
      'Video: MP4, MOV, AVI, MKV'
    ]
  });
}