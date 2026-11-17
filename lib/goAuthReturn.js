// Return paths are carried inside the signed Google flow, never accepted as external redirects.
export const AUTH_CONTEXT_KEY = 'meonggo:auth-return:v1';
export function safeGoReturnPath(value) {
 if(typeof value!=='string'||value.length>1600||/%(?:0a|0d|5c)/i.test(value)||/[\\\r\n]/.test(value)||!/^\/go(?:\/|\?|#|$)/.test(value))return '/go';
 try{const url=new URL(value,'https://baronado.local');if(url.origin!=='https://baronado.local'||!/^\/go(?:\/|$)/.test(url.pathname))return '/go';url.searchParams.delete('google');return url.pathname+url.search+url.hash;}catch{return '/go';}
}
export function authReturnContext(value,now=Date.now()){
 if(!value||!Number.isFinite(value.at)||now-value.at>600000||value.at>now+5000)return null;
 return {path:safeGoReturnPath(value.path),scroll:Math.max(0,Math.min(100000,Number(value.scroll)||0)),at:value.at};
}
