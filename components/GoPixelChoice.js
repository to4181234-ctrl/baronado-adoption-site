'use client';
import {useState} from 'react';
export default function GoPixelChoice({children,onClick,href,disabled=false,initial=false}){
 const [focused,setFocused]=useState(initial);
 const contents=<><img className="v3-choice-arrow" src="/figma-v3/discovery-select-arrow.svg" alt="" aria-hidden="true"/>{children}</>;
 const props={className:'v3-pixel-choice'+(focused?' is-current':''),onFocus:()=>setFocused(true),onBlur:()=>setFocused(false),onClick};
 return href?<a {...props} href={href}>{contents}</a>:<button {...props} type="button" disabled={disabled}>{contents}</button>;
}
