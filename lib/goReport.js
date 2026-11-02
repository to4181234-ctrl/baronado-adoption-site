export const REPORT_REASONS=[['unrelated','강아지와 관련 없는 사진'],['inappropriate','부적절한 내용'],['spam','중복·도배'],['other','기타']];
export function validateReport(body){
 if(!body||typeof body!=='object'||Array.isArray(body)||!REPORT_REASONS.some(([key])=>key===body.reason))throw Error('신고 사유를 선택해주세요.');
 const details=typeof body.details==='string'?body.details.trim():'';
 if(body.reason==='other'&&(details.length<10||details.length>300))throw Error('기타 상세 사유를 10~300자로 입력해주세요.');
 return {reason:body.reason,details:body.reason==='other'?details:''};
}
