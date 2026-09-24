import { NextRequest, NextResponse } from 'next/server';
import { getInvitationByToken } from '@/lib/team';

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const invitation = await getInvitationByToken(token);
    return NextResponse.json(invitation);
  } catch (error) {
    console.error('Validate invitation error:', error);
    return NextResponse.json({ error: 'Invalid invitation' }, { status: 404 });
  }
}
