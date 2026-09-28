import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/tenant';
import { listAnnouncements, createAnnouncement } from '@/lib/announcements';
import { createAnnouncementSchema } from '@/lib/validation/announcement';
import { handleAuthError } from '@/lib/auth/errors';

export async function GET() {
  try {
    await requireSuperAdmin();

    const announcements = await listAnnouncements({
      sort_by: 'created_at',
      sort_order: 'desc',
    });

    return NextResponse.json({ announcements });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    console.error('Failed to fetch announcements:', error);
    return NextResponse.json({ error: 'Failed to fetch announcements' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireSuperAdmin();

    const body = await req.json();
    const validated = createAnnouncementSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const announcement = await createAnnouncement(validated.data);
    return NextResponse.json(announcement, { status: 201 });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    console.error('Failed to create announcement:', error);
    return NextResponse.json({ error: 'Failed to create announcement' }, { status: 500 });
  }
}
