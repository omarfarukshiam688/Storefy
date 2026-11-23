import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { submitDocumentationFeedback } from '@/lib/resource-center';
import { documentationFeedbackSchema } from '@/lib/validation/resource-center';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = documentationFeedbackSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      );
    }

    // Check if article exists and is published
    const supabase = await createClient();
    const { data: article, error: articleError } = await supabase
      .from('documentation_articles')
      .select('id')
      .eq('id', validated.data.article_id)
      .eq('is_published', true)
      .single();

    if (articleError || !article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    const feedback = await submitDocumentationFeedback(validated.data.article_id, validated.data.is_helpful);
    return NextResponse.json(feedback, { status: 201 });
  } catch (error) {
    console.error('Failed to submit documentation feedback:', error);
    return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 });
  }
}