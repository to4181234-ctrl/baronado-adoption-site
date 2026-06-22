import DogListPage from '../../components/DogListPage';
import { CATEGORY_RESIDENT } from '../../lib/dogs';

export default function ResidentsPage() {
  return <DogListPage title="상주견 소개" category={CATEGORY_RESIDENT} />;
}
