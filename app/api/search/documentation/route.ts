import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const query = req.nextUrl.searchParams.get('q');

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const supabase = await createClient();
    const term = `%${query}%`;

    const { data: articles, error } = await supabase
      .from('documentation_articles')
      .select('id, title, slug, excerpt, category_id, content')
      .eq('is_published', true)
      .or(`title.ilike.${term},content.ilike.${term},excerpt.ilike.${term}`)
      .limit(10);

    if (error) {
      throw new Error(`Search failed: ${error.message}`);
    }

    if (!articles || articles.length === 0) {
      return NextResponse.json({ results: [] });
    }

    const categoryIds = [...new Set(articles.map((a) => a.category_id).filter(Boolean))];
    const { data: categories } = await supabase
      .from('documentation_categories')
      .select('id, slug')
      .in('id', categoryIds);

    const categoryMap = new Map(categories?.map((c) => [c.id, c.slug]) ?? []);

    const results = articles.map((article) => ({
      article: {
        id: article.id,
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt,
      },
      category: {
        slug: categoryMap.get(article.category_id) ?? '',
      },
    }));

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Documentation search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}