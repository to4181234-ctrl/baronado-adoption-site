import GoRecorder from '../../../../components/GoRecorder.js';
export const metadata={title:'멍기록가 프로필 | 멍멍GO!'};
export default async function Page({params}){const {id}=await params;return <GoRecorder key={id} id={id}/>;}
