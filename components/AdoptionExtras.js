'use client';

export default function AdoptionExtras({ form, setForm }) {
  const profile = form.profile || {};
  const setProfile = (values) => setForm(prev => ({ ...prev, profile: { ...prev.profile, ...values } }));
  const questions = Array.isArray(profile.extra_questions) ? profile.extra_questions : [];

  return <>
    <fieldset className="profile-editor">
      <legend>추정 나이 기준</legend>
      <label><span className="label">안내받은 날짜</span>
        <input className="field" type="date" value={profile.age_reference_date || ''} onChange={event => setProfile({ age_reference_date: event.target.value })} />
      </label>
      <label><span className="label">당시 추정 나이 (만 나이)</span>
        <input className="field" type="number" min="0" max="30" step="1" value={profile.age_reference_years ?? ''} onChange={event => setProfile({ age_reference_years: event.target.value })} />
      </label>
      <label className="check-row"><input type="checkbox" checked={Boolean(profile.age_auto_update)} onChange={event => setProfile({ age_auto_update: event.target.checked })} /> 날짜에 따라 추정 나이 자동 업데이트</label>
      <p className="small-note">목록에는 몇 살 추정인지 표시하고, 상세에서 경과 일수와 안내받은 기준일을 함께 보여줍니다.</p>
    </fieldset>
    <fieldset className="profile-editor">
      <legend>보호소 정보</legend>
      <label><span className="label">보호소 이름</span>
        <input className="field" value={profile.shelter_name || ''} onChange={event => setProfile({ shelter_name: event.target.value })} />
      </label>
      <label><span className="label">보호소 홈페이지</span>
        <input className="field" type="url" value={profile.shelter_url || ''} onChange={event => setProfile({ shelter_url: event.target.value })} placeholder="https://" />
      </label>
    </fieldset>
    <fieldset className="profile-editor">
      <legend>추가 질문과 답변</legend>
      {questions.map((entry, index) => <div className="extra-question" key={index}>
        <label><span className="label">질문 {index + 1}</span><input className="field" value={entry.question || ''} onChange={event => setProfile({ extra_questions: questions.map((q, i) => i === index ? { ...q, question: event.target.value } : q) })} /></label>
        <label><span className="label">답변</span><textarea className="field" rows={3} value={entry.answer || ''} onChange={event => setProfile({ extra_questions: questions.map((q, i) => i === index ? { ...q, answer: event.target.value } : q) })} /></label>
        <button className="btn secondary" type="button" onClick={() => setProfile({ extra_questions: questions.filter((_, i) => i !== index) })}>질문 삭제</button>
      </div>)}
      <button className="btn secondary" type="button" onClick={() => setProfile({ extra_questions: [...questions, { question: '', answer: '' }] })}>질문 추가</button>
    </fieldset>
  </>;
}
