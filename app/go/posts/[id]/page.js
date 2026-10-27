import GoPost from '../../../../components/GoPost.js';
export const metadata = { title: '모두의 도감 게시물 | 멍멍GO' };
export default async function Page({ params }) { const { id } = await params; return <GoPost id={id} />; }
