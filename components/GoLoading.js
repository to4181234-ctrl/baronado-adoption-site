'use client';
export default function GoLoading({label='도감을 불러오는 중이에요.',compact=false}) {
 return <div className={`go-loading go-loading-bounce${compact?' compact':''}`} role="status" aria-label={label}><div className="go-loading-stage" aria-hidden="true"><div className="go-loading-ball"><img src="/go-capture-ball.webp" alt=""/></div></div>{label&&<span>{label}</span>}</div>;
}
