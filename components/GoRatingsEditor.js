'use client';
import { useId } from 'react';
import { RATING_TRAITS } from '../lib/goRatings.js';

export function RatingStar({ filled }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className={filled ? 'go-star filled' : 'go-star'}><path d="m12 2.9 2.8 5.7 6.3.9-4.5 4.4 1.1 6.3L12 17.2l-5.7 3 1.1-6.3L2.9 9.5l6.3-.9Z" /></svg>;
}

export default function GoRatingsEditor({ value, onChange, disabled = false }) {
  const prefix = useId();
  return <div className="go-ratings-editor"><p className="go-note">귀여움·매력·애교를 각각 1~5점으로 선택해주세요. 세 항목 모두 필수예요.</p>{RATING_TRAITS.map(trait => <fieldset key={trait.key} disabled={disabled}><legend>{trait.label}</legend><div className="go-rating-options">{[1,2,3,4,5].map(score => <label key={score}><input type="radio" required name={`${prefix}-${trait.key}`} value={score} checked={value[trait.key] === score} onChange={() => onChange({ ...value, [trait.key]: score })} aria-label={`${trait.label} ${score}점`} /><RatingStar filled={score <= (value[trait.key] || 0)} /></label>)}</div></fieldset>)}</div>;
}
