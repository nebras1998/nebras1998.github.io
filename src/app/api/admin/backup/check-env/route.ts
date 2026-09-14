import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({
    ENDPOINT: { defined: !!process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT, len: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT?.length },
    PROJECT: { defined: !!process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID, len: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID?.length },
    API_KEY: { defined: !!process.env.APPWRITE_API_KEY, len: process.env.APPWRITE_API_KEY?.length },
  });
}
