import { supabase } from '../../../lib/supabaseClient';
import { publicDogImage, SITE_URL } from '../../../lib/dogShare';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const alt = '바로나도 강아지 소개 사진';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fallback = () => Response.redirect(`${SITE_URL}/opengraph-image.png`, 307);

export default async function Image({ params }) {
  const { id } = await params;
  if (!supabase || !UUID.test(id || '')) return fallback();

  const { data: dog, error } = await supabase
    .from('dogs').select('images').eq('id', id).maybeSingle();
  if (error || !dog) return fallback();

  const image = publicDogImage(dog, process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (!image) return fallback();

  try {
    const response = await fetch(image, { cache: 'no-store' });
    const type = response.headers.get('content-type')?.split(';')[0]?.toLowerCase();
    if (!response.ok || !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(type)) {
      return fallback();
    }
    return new Response(response.body, {
      headers: { 'Content-Type': type, 'Cache-Control': 'public, max-age=300' }
    });
  } catch {
    return fallback();
  }
}
