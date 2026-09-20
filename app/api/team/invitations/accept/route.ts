import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/session';
import { acceptInvitation } from '@/lib/team';

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();

    const body = await req.json();
    const { token } = body;

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const result = await acceptInvitation(token, user.id);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Accept invitation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to accept invitation' },
      { status: 400 }
    );
  }
}
