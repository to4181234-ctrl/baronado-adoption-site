import { validateRatings } from './goRatings.js';
const allowed = new Set(['title','description','dogId','ratings']);
export function validatePostEdit(body) {
 if (!body || typeof body!=='object' || Array.isArray(body) || !Object.keys(body).length || Object.keys(body).some(key=>!allowed.has(key))) throw new Error('수정할 수 없는 항목이 포함돼 있어요. 사진·촬영 날짜·작성자는 바꿀 수 없어요.');
 const content=['title','description','dogId'].some(key=>Object.hasOwn(body,key));
 if(content && (!['title','description','dogId'].every(key=>Object.hasOwn(body,key)) || typeof body.title!=='string' || !body.title.trim() || body.title.trim().length>80 || typeof body.description!=='string' || !body.description.trim() || body.description.trim().length>200 || typeof body.dogId!=='string')) throw new Error('제목, 설명, 멍멍이를 확인해주세요.');
 return { editContent:content,editRatings:Object.hasOwn(body,'ratings'),title:content?body.title.trim():null,description:content?body.description.trim():null,dogId:content?body.dogId:null,ratings:Object.hasOwn(body,'ratings')?validateRatings(body.ratings):{cuteness:null,charm:null,affection:null} };
}
