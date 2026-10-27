'use client';
export default function GoLoading({ mode='reveal',label='도감을 불러오는 중이에요.',compact=false }) {
 return <div className={`go-loading go-loading-${mode}${compact?' compact':''}`} role={mode==='bounce'?'img':'status'} aria-label={label||'불러오는 중'}><div className="go-loading-stage" aria-hidden="true">{mode!=='bounce'&&<img className="go-loading-mascot" src="/loading-character.png" alt=""/>}<div className="go-loading-ball">{mode==='bounce'?<img src="/go-capture-ball.webp" alt=""/>:<><div className="go-ball-half upper"><img src="/go-capture-ball.webp" alt=""/></div><div className="go-ball-half lower"><img src="/go-capture-ball.webp" alt=""/></div></>}</div></div>{label&&<span>{label}</span>}</div>;
}
