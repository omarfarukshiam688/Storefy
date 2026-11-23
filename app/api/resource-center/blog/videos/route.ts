import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/tenant';
import { listBlogVideos, createBlogVideo } from '@/lib/resource-center';
import { createBlogVideoSchema } from '@/lib/validation/resource-center';
import { handleAuthError } from '@/lib/auth/errors';

export async function GET(req: NextRequest) {
  try {
    await requireSuperAdmin();

    const categoryId = req.nextUrl.searchParams.get('category_id') ?? undefined;
    const includeUnpublished = req.nextUrl.searchParams.get('include_unpublished') === 'true';

    const videos = await listBlogVideos(categoryId, includeUnpublished);

    return NextResponse.json({ videos });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    console.error('Failed to fetch blog videos:', error);
    return NextResponse.json({ error: 'Failed to fetch blog videos' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireSuperAdmin();

    const body = await req.json();
    const validated = createBlogVideoSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const video = await createBlogVideo(validated.data);
    return NextResponse.json(video, { status: 201 });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    console.error('Failed to create blog video:', error);
    return NextResponse.json({ error: 'Failed to create blog video' }, { status: 500 });
  }
}