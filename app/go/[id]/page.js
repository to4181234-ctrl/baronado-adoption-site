import GoPage from '../../../components/GoPage.js';

export const metadata = { title: '친구 파일 | 멍멍GO' };
export default async function Page({ params }) { const { id } = await params; return <GoPage dogId={id} />; }
