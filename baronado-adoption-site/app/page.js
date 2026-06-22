import DogListPage from '../components/DogListPage';
import { CATEGORY_ADOPTION } from '../lib/dogs';

export default function HomePage() {
  return <DogListPage title="가족을 찾아요" category={CATEGORY_ADOPTION} />;
}
