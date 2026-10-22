'use client';

import { useState } from 'react';

export default function DogLoading() {
  const [failed, setFailed] = useState(false);
  return (
    <div className="character-loader" role="status" aria-label="불러오는 중">
      <img
        src={failed ? '/baronado-logo.png' : '/loading-character.png'}
        alt=""
        aria-hidden="true"
        className="character-loader-img"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
