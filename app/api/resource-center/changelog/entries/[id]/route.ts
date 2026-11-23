import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/tenant';
import { listChangelogReleases, listChangelogEntries, updateChangelogEntry, deleteChangelogEntry } from '@/lib/resource-center';
import { updateChangelogEntrySchema } from '@/lib/validation/resource-center';
import { handleAuthError } from '@/lib/auth/errors';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();

    const { id } = await params;
    // We need to find the entry by ID - for simplicity, we'll fetch all entries for now
    // In a real implementation, you'd add a getChangelogEntry function
    const releases = await listChangelogReleases(true);
    let entry = null;
    for (const release of releases) {
      const entries = await listChangelogEntries(release.id);
      entry = entries.find((e) => e.id === id);
      if (entry) break;
    }

    if (!entry) {
      return NextResponse.json({ error: 'Changelog entry not found' }, { status: 404 });
    }

    return NextResponse.json(entry);
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    console.error('Failed to fetch changelog entry:', error);
    return NextResponse.json({ error: 'Failed to fetch changelog entry' }, { status: 500 });
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
    const validated = updateChangelogEntrySchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const entry = await updateChangelogEntry(id, validated.data);
    return NextResponse.json(entry);
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    console.error('Failed to update changelog entry:', error);
    return NextResponse.json({ error: 'Failed to update changelog entry' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();

    const { id } = await params;
    await deleteChangelogEntry(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    console.error('Failed to delete changelog entry:', error);
    return NextResponse.json({ error: 'Failed to delete changelog entry' }, { status: 500 });
  }
}