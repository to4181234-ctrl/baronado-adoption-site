'use client';

import { useState } from 'react';

export default function ExpandableText({ text, limit = 180, className = '' }) {
  const [expanded, setExpanded] = useState(false);
  const content = String(text || '');
  const long = content.length > limit;
  return <div className="expandable-text">
    <p className={className}>{long && !expanded ? `${content.slice(0, limit).trimEnd()}…` : content}</p>
    {long && <button type="button" className="read-more" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? '접기' : '더 읽기'}</button>}
  </div>;
}
