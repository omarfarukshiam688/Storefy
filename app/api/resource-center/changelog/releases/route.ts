import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/tenant';
import { listChangelogReleases, createChangelogRelease } from '@/lib/resource-center';
import { createChangelogReleaseSchema } from '@/lib/validation/resource-center';
import { handleAuthError } from '@/lib/auth/errors';

export async function GET(req: NextRequest) {
  try {
    await requireSuperAdmin();

    const includeUnpublished = req.nextUrl.searchParams.get('include_unpublished') === 'true';

    const releases = await listChangelogReleases(includeUnpublished);

    return NextResponse.json({ releases });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    console.error('Failed to fetch changelog releases:', error);
    return NextResponse.json({ error: 'Failed to fetch changelog releases' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireSuperAdmin();

    const body = await req.json();
    const validated = createChangelogReleaseSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const release = await createChangelogRelease(validated.data);
    return NextResponse.json(release, { status: 201 });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    console.error('Failed to create changelog release:', error);
    return NextResponse.json({ error: 'Failed to create changelog release' }, { status: 500 });
  }
}