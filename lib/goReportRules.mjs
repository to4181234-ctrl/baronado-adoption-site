export const REPORT_REASONS=Object.freeze([
 ['unrelated','강아지와 관련 없는 사진'],
 ['inappropriate','부적절한 내용'],
 ['spam','중복/도배'],
 ['other','기타']
]);
export function validateReport(reason,detail=''){
 if(!REPORT_REASONS.some(([value])=>value===reason))throw new Error('신고 이유를 선택해주세요.');
 if(reason==='other'&&(typeof detail!=='string'||Array.from(detail.trim()).length<10||Array.from(detail.trim()).length>300))throw new Error('기타 신고 사유는 10~300자로 입력해주세요.');
 return {reason,detail:reason==='other'?detail.trim():null};
}
