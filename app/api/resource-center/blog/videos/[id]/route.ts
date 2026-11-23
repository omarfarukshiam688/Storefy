import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/tenant';
import { listBlogVideos, updateBlogVideo, deleteBlogVideo } from '@/lib/resource-center';
import { updateBlogVideoSchema } from '@/lib/validation/resource-center';
import { handleAuthError } from '@/lib/auth/errors';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();

    const { id } = await params;
    const videos = await listBlogVideos(undefined, true);
    const video = videos.find((v) => v.id === id);

    if (!video) {
      return NextResponse.json({ error: 'Blog video not found' }, { status: 404 });
    }

    return NextResponse.json(video);
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    console.error('Failed to fetch blog video:', error);
    return NextResponse.json({ error: 'Failed to fetch blog video' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();

    const { id } = await params;
    const body = await req.json();
    const validated = updateBlogVideoSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const video = await updateBlogVideo(id, validated.data);
    return NextResponse.json(video);
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    console.error('Failed to update blog video:', error);
    return NextResponse.json({ error: 'Failed to update blog video' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();

    const { id } = await params;
    await deleteBlogVideo(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    console.error('Failed to delete blog video:', error);
    return NextResponse.json({ error: 'Failed to delete blog video' }, { status: 500 });
  }
}