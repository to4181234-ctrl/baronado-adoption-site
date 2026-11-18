// Server-configured immutable member IDs only. Never authorize by editable nickname/email.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function adminMemberIds(value){
 if(typeof value!=='string'||value.length>8192)return [];
 const ids=value.split(/[\s,]+/).filter(Boolean);
 if(!ids.length||ids.some(id=>!UUID.test(id)))return [];
 return [...new Set(ids.map(id=>id.toLowerCase()))];
}
export function isAllowedAdminMember(member,ids){
 return Boolean(member&&!member.disabled&&typeof member.id==='string'&&ids.includes(member.id.toLowerCase()));
}
