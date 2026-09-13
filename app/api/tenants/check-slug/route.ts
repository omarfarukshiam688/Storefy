import { NextRequest, NextResponse } from 'next/server';
import { isSlugAvailable } from '@/lib/tenants';

export async function GET(req: NextRequest) {
  try {
    const slug = req.nextUrl.searchParams.get('slug');

    if (!slug) {
      return NextResponse.json(
        { error: 'Slug parameter is required' },
        { status: 400 }
      );
    }

    const available = await isSlugAvailable(slug);

    return NextResponse.json(
      {
        available,
        slug,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Slug availability check error:', error);
    return NextResponse.json(
      { error: 'Failed to check slug availability' },
      { status: 500 }
    );
  }
}
