'use client';

import { VACCINATION_GROUPS } from '../lib/vaccinations';

export default function VaccinationEditor({ form, setForm }) {
  const profile = form.profile || {};
  const checked = Array.isArray(profile.vaccinations_checked) ? profile.vaccinations_checked : [];
  const toggle = key => setForm(prev => {
    const current = Array.isArray(prev.profile?.vaccinations_checked) ? prev.profile.vaccinations_checked : [];
    return { ...prev, profile: { ...prev.profile, vaccinations_checked: current.includes(key) ? current.filter(item => item !== key) : [...current, key] } };
  });
  return <fieldset className="profile-editor vaccination-editor">
    <legend>접종 여부</legend>
    <p className="small-note">접종 기록으로 확인된 항목만 체크하세요. 체크하지 않은 항목은 미접종이라는 뜻이 아닙니다. 접종 차수나 추가 접종 필요 여부는 수의사와 확인해주세요.</p>
    {VACCINATION_GROUPS.map(group => <div className="vaccination-group" key={group.label}>
      <strong>{group.label}</strong>
      {group.options.map(option => <label className="check-row" key={option.key}>
        <input type="checkbox" checked={checked.includes(option.key)} onChange={() => toggle(option.key)} /> {option.label}
      </label>)}
    </div>)}
    {profile.vaccinations && <p className="small-note vaccination-legacy"><strong>기존 접종 기록</strong><br />{profile.vaccinations}</p>}
    <p className="small-note">항목 구성 참고: <a href="https://wsava.org/global-guidelines/vaccination-guidelines/" target="_blank" rel="noopener noreferrer">WSAVA 예방접종 지침 ↗</a></p>
  </fieldset>;
}
