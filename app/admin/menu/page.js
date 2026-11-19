import {redirect} from 'next/navigation';
/** Keep historical /admin/menu bookmarks and resident-category links working. */
export default async function LegacyAdminMenu({searchParams}){
 const params=await searchParams;
 const category=params?.category==='resident'?'resident':'adoption';
 redirect('/admin/dogs?category='+category);
}
