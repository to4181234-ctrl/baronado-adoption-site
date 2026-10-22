'use client';

import { EDITABLE_PROFILE_FIELDS } from '../lib/dogProfile';

export default function ProfileQuestionEditor({ form, setForm }) {
  const profile = form.profile || {};
  const hidden = Array.isArray(profile.hidden_fields) ? profile.hidden_fields : [];
  const active = field => !hidden.includes(field.key) && Object.hasOwn(profile, field.key);
  const toggle = (key, enabled) => setForm(prev => {
    const current = prev.profile || {};
    const oldHidden = Array.isArray(current.hidden_fields) ? current.hidden_fields : [];
    return { ...prev, profile: {
      ...current,
      ...(enabled && !Object.hasOwn(current, key) ? { [key]: '' } : {}),
      hidden_fields: enabled ? oldHidden.filter(item => item !== key) : [...new Set([...oldHidden, key])]
    } };
  });
  const toggleAll = enabled => setForm(prev => {
    const current = prev.profile || {};
    const oldHidden = Array.isArray(current.hidden_fields) ? current.hidden_fields : [];
    const keys = EDITABLE_PROFILE_FIELDS.map(field => field.key);
    return { ...prev, profile: {
      ...current,
      ...(enabled ? Object.fromEntries(keys.map(key => [key, current[key] || ''])) : {}),
      hidden_fields: enabled ? oldHidden.filter(key => !keys.includes(key)) : [...new Set([...oldHidden, ...keys])]
    } };
  });
  return <fieldset className="profile-editor">
    <legend>상세 소개 질문</legend>
    <label className="check-row"><input type="checkbox" checked={EDITABLE_PROFILE_FIELDS.every(active)} onChange={event => toggleAll(event.target.checked)} /> 전체 선택</label>
    {EDITABLE_PROFILE_FIELDS.map(field => <div className="profile-field" key={field.key}>
      <label className="check-row"><input type="checkbox" checked={active(field)} onChange={event => toggle(field.key, event.target.checked)} />{field.label}</label>
      {active(field) && <textarea className="field" rows={3} value={profile[field.key] || ''} onChange={event => setForm(prev => ({ ...prev, profile: { ...prev.profile, [field.key]: event.target.value } }))} placeholder={`${field.label} 내용을 입력하세요.`} />}
    </div>)}
  </fieldset>;
}
