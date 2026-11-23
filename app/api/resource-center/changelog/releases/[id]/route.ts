import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/tenant';
import { getChangelogRelease, updateChangelogRelease, deleteChangelogRelease } from '@/lib/resource-center';
import { updateChangelogReleaseSchema } from '@/lib/validation/resource-center';
import { handleAuthError } from '@/lib/auth/errors';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();

    const { id } = await params;
    const release = await getChangelogRelease(id);

    return NextResponse.json(release);
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    console.error('Failed to fetch changelog release:', error);
    return NextResponse.json({ error: 'Changelog release not found' }, { status: 404 });
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
    const validated = updateChangelogReleaseSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const release = await updateChangelogRelease(id, validated.data);
    return NextResponse.json(release);
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    console.error('Failed to update changelog release:', error);
    return NextResponse.json({ error: 'Failed to update changelog release' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();

    const { id } = await params;
    await deleteChangelogRelease(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    console.error('Failed to delete changelog release:', error);
    return NextResponse.json({ error: 'Failed to delete changelog release' }, { status: 500 });
  }
}