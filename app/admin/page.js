import {redirect} from 'next/navigation';
/** Landing is visit certification; explicit legacy category links remain supported. */
export default async function AdminHome({searchParams}){
 const params=await searchParams;
 if(params?.category==='resident')redirect('/admin/dogs?category=resident');
 if(params?.category==='adoption')redirect('/admin/dogs?category=adoption');
 redirect('/admin/go/visit');
}
