'use client';

import { dateOnly, elapsedCalendarMonths, getAgeEditorValues, getAgeInfo } from '../lib/dogProfile';

const years = Array.from({ length: 31 }, (_, index) => index);
const months = Array.from({ length: 12 }, (_, index) => index);

export default function AgeEditor({ form, setForm }) {
  const values = getAgeEditorValues(form);
  const exact = values.age_kind === 'exact';

  const update = (changes) => setForm(prev => {
    const profile = { ...prev.profile, ...getAgeEditorValues(prev), ...changes };
    const next = { ...prev, profile };
    return { ...next, age: getAgeInfo(next).listDisplay };
  });

  const setBirthday = value => {
    const birth = dateOnly(value);
    const today = new Date();
    const current = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(today);
    const part = type => current.find(item => item.type === type)?.value;
    const total = birth ? elapsedCalendarMonths(birth, `${part('year')}-${part('month')}-${part('day')}`) : null;
    update({ birth_date: value, ...(total === null ? {} : { age_years: Math.floor(total / 12), age_months: total % 12 }) });
  };

  return <fieldset className="age-editor field-group">
    <legend className="label">*나이</legend>
    <div className="radio-group wrap" aria-label="나이 종류">
      <label><input type="radio" name="age_kind" checked={exact} onChange={() => update({ age_kind: 'exact' })} /> 정확한 생년월일</label>
      <label><input type="radio" name="age_kind" checked={!exact} onChange={() => update({ age_kind: 'estimated' })} /> 추정 나이</label>
    </div>
    {exact && <label><span className="label">생년월일</span>
      <input className="field" type="date" value={values.birth_date || ''} onChange={event => setBirthday(event.target.value)} />
    </label>}
    <div className="age-pickers">
      <label><span className="label">년</span><select className="field" value={values.age_years} onChange={event => update({ age_years: Number(event.target.value) })} disabled={exact && values.age_auto_update && Boolean(values.birth_date)}>
        {years.map(year => <option key={year} value={year}>{year}살</option>)}
      </select></label>
      <label><span className="label">개월</span><select className="field" value={values.age_months} onChange={event => update({ age_months: Number(event.target.value) })} disabled={exact && values.age_auto_update && Boolean(values.birth_date)}>
        {months.map(month => <option key={month} value={month}>{month}개월</option>)}
      </select></label>
    </div>
    <label className="check-row"><input type="checkbox" checked={values.age_auto_update} onChange={event => update({ age_auto_update: event.target.checked })} /> 나이 자동 계산</label>
    <p className="small-note age-explanation">
      {exact
        ? '자동 계산을 켜면 생년월일부터 오늘까지 지난 개월 수로 계산합니다. 매월 생일과 같은 날에 1개월씩 늘고, 12개월이 되면 1살이 됩니다. 끄면 위에서 선택한 나이가 그대로 표시됩니다.'
        : '자동 계산을 켜면 바로나도에 온 날에 위에서 선택한 추정 나이였다고 보고, 그날부터 한 달마다 1개월씩 더합니다. 끄면 선택한 추정 나이가 그대로 표시됩니다. 자동 계산에는 바로나도에 온 날짜가 필요합니다.'} 입양 완료 시 나이 증가가 멈춥니다.
    </p>
    {exact && values.age_auto_update && !values.birth_date && <p className="small-note age-error">자동 계산을 사용하려면 생년월일을 입력해주세요.</p>}
    {!exact && values.age_auto_update && !form.arrived_at && <p className="small-note age-error">자동 계산을 사용하려면 아래 ‘바로나도에 온 날’을 입력해주세요.</p>}
    {form.age && !form.profile?.age_kind && <p className="small-note">기존 나이 표기: {form.age} · 새 나이 설정으로 저장하면 선택한 값이 반영됩니다.</p>}
  </fieldset>;
}
