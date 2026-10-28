'use client';
export default function GoSoundButton({enabled,onClick}){
 const label=enabled?'소리 끄기':'소리 켜기';
 return <button className="go-sound-toggle" type="button" aria-label={label} title={label} aria-pressed={enabled} onClick={onClick}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 4 6 8H3v8h3l5 4Z"/>{enabled?<><path d="M15 8a6 6 0 0 1 0 8M18 4a11 11 0 0 1 0 16"/></>:<path d="m16 9 6 6m0-6-6 6"/>}</svg></button>;
}
