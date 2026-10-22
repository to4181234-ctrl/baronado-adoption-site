'use client';

import { BASIC_VACCINATION_KEYS, VACCINATION_GROUPS } from '../lib/vaccinations';

export default function VaccinationEditor({ form, setForm }) {
  const profile = form.profile || {};
  const checked = Array.isArray(profile.vaccinations_checked) ? profile.vaccinations_checked : [];
  const dates = profile.vaccination_dates || {};
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date());
  const toggle = key => setForm(prev => {
    const current = Array.isArray(prev.profile?.vaccinations_checked) ? prev.profile.vaccinations_checked : [];
    const removing = current.includes(key);
    const nextDates = { ...prev.profile?.vaccination_dates };
    if (removing) delete nextDates[key];
    return { ...prev, profile: { ...prev.profile, vaccination_dates: nextDates,
      vaccinations_checked: removing ? current.filter(item => item !== key) : [...current, key] } };
  });
  const allBasic = BASIC_VACCINATION_KEYS.every(key => checked.includes(key));
  const toggleBasic = () => setForm(prev => {
    const current = Array.isArray(prev.profile?.vaccinations_checked) ? prev.profile.vaccinations_checked : [];
    const allSelected = BASIC_VACCINATION_KEYS.every(key => current.includes(key));
    const nextDates = { ...prev.profile?.vaccination_dates };
    if (allSelected) BASIC_VACCINATION_KEYS.forEach(key => { delete nextDates[key]; });
    return { ...prev, profile: { ...prev.profile, vaccination_dates: nextDates, vaccinations_checked: allSelected
      ? current.filter(key => !BASIC_VACCINATION_KEYS.includes(key))
      : [...new Set([...current, ...BASIC_VACCINATION_KEYS])] } };
  });
  const setDate = (key, value) => setForm(prev => {
    const nextDates = { ...prev.profile?.vaccination_dates };
    if (value) nextDates[key] = value;
    else delete nextDates[key];
    return { ...prev, profile: { ...prev.profile, vaccination_dates: nextDates } };
  });
  return <fieldset className="profile-editor vaccination-editor">
    <legend>접종 여부</legend>
    <p className="small-note">접종 기록으로 확인된 항목만 체크하세요. 체크하지 않은 항목은 미접종이라는 뜻이 아닙니다. 확인한 날짜는 달력에서 선택할 수 있으며 비워두어도 됩니다.</p>
    {VACCINATION_GROUPS.map(group => <div className="vaccination-group" key={group.label}>
      <strong>{group.label}</strong>
      {group === VACCINATION_GROUPS[0] && <label className="check-row vaccination-all"><input type="checkbox" checked={allBasic} onChange={toggleBasic} /> 기본접종 5종 전체 선택</label>}
      {group.options.map(option => <div className="vaccination-entry" key={option.key}>
        <label className="check-row"><input type="checkbox" checked={checked.includes(option.key)} onChange={() => toggle(option.key)} /> {option.label}</label>
        {checked.includes(option.key) && <label className="vaccination-date"><span>기록 확인 날짜 (선택)</span>
          <input type="date" className="field" value={dates[option.key] || ''} max={today} onChange={event => setDate(option.key, event.target.value)} />
        </label>}
      </div>)}
    </div>)}
    {profile.vaccinations && <p className="small-note vaccination-legacy"><strong>기존 접종 기록</strong><br />{profile.vaccinations}</p>}
    <p className="small-note">항목 구성 참고: <a href="https://wsava.org/global-guidelines/vaccination-guidelines/" target="_blank" rel="noopener noreferrer">WSAVA 예방접종 지침 ↗</a></p>
  </fieldset>;
}
