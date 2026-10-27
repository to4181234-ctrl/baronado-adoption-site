import GoPage from '../../../components/GoPage.js';

export const metadata = { title: '멍멍 도감 | 멍멍GO' };
export default async function Page({ params }) { const { id } = await params; return <GoPage dogId={id} />; }
