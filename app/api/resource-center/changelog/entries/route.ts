import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/tenant';
import { listChangelogEntries, createChangelogEntry } from '@/lib/resource-center';
import { createChangelogEntrySchema } from '@/lib/validation/resource-center';
import { handleAuthError } from '@/lib/auth/errors';

export async function GET(req: NextRequest) {
  try {
    await requireSuperAdmin();

    const releaseId = req.nextUrl.searchParams.get('release_id');

    if (!releaseId) {
      return NextResponse.json({ error: 'release_id is required' }, { status: 400 });
    }

    const entries = await listChangelogEntries(releaseId);

    return NextResponse.json({ entries });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    console.error('Failed to fetch changelog entries:', error);
    return NextResponse.json({ error: 'Failed to fetch changelog entries' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireSuperAdmin();

    const body = await req.json();
    const validated = createChangelogEntrySchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const entry = await createChangelogEntry(validated.data);
    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    console.error('Failed to create changelog entry:', error);
    return NextResponse.json({ error: 'Failed to create changelog entry' }, { status: 500 });
  }
}