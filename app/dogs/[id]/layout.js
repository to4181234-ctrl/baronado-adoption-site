import { supabase } from '../../../lib/supabaseClient';
import { publicDogImage, SITE_URL } from '../../../lib/dogShare';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params }) {
  const { id } = await params;
  if (!supabase || !UUID.test(id || '')) return {};

  const { data: dog, error } = await supabase
    .from('dogs')
    .select('name, images, category')
    .eq('id', id)
    .maybeSingle();
  if (error || !dog) return {};

  const title = `${dog.name} · 바로나도`;
  const description = dog.category === 'resident'
    ? `바로나도 상주견 ${dog.name}의 이야기를 만나보세요.`
    : `새로운 가족을 기다리는 ${dog.name}의 이야기를 만나보세요.`;
  // Photos are public Supabase Storage URLs; the brand artwork remains the fallback.
  const firstPhoto = publicDogImage(dog, process.env.NEXT_PUBLIC_SUPABASE_URL);
  const image = firstPhoto || `${SITE_URL}/opengraph-image.png`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      url: `${SITE_URL}/dogs/${id}`,
      images: [{ url: image, alt: firstPhoto ? `${dog.name} 사진` : '바로나도 캐릭터와 로고' }]
    },
    twitter: { card: 'summary_large_image', title, description, images: [image] }
  };
}

export default function DogDetailLayout({ children }) {
  return children;
}
