export function validatePostEdit(body){
 if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).length!==1||!Object.hasOwn(body,'title')||typeof body.title!=='string')throw Error('카드 제목만 수정할 수 있어요.');
 const title=body.title.trim();if(!title||title.length>30)throw Error('제목은 1~30자로 입력해주세요.');
 return {title};
}
