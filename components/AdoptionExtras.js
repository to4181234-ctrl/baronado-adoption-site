'use client';

export default function AdoptionExtras({ form, setForm }) {
  const profile = form.profile || {};
  const setProfile = (values) => setForm(prev => ({ ...prev, profile: { ...prev.profile, ...values } }));
  const questions = Array.isArray(profile.extra_questions) ? profile.extra_questions : [];

  return <>
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
      <legend>추가 소개와 답변</legend>
      {questions.map((entry, index) => <div className="extra-question" key={index}>
        <label><span className="label">소개 {index + 1}</span><input className="field" value={entry.question || ''} onChange={event => setProfile({ extra_questions: questions.map((q, i) => i === index ? { ...q, question: event.target.value } : q) })} /></label>
        <label><span className="label">답변</span><textarea className="field" rows={3} value={entry.answer || ''} onChange={event => setProfile({ extra_questions: questions.map((q, i) => i === index ? { ...q, answer: event.target.value } : q) })} /></label>
        <button className="btn secondary" type="button" onClick={() => setProfile({ extra_questions: questions.filter((_, i) => i !== index) })}>소개 삭제</button>
      </div>)}
      <button className="btn secondary" type="button" onClick={() => setProfile({ extra_questions: [...questions, { question: '', answer: '' }] })}>소개 추가</button>
    </fieldset>
  </>;
}
