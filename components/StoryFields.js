'use client';

import { STORY_FIELDS, storyForDog } from '../lib/dog-story';

export default function StoryFields({ form, onStoryChange }) {
  const story = storyForDog(form);
  const setIntroduction = (value) => onStoryChange((previous) => ({ ...previous, introduction: value }));
  const setAnswer = (key, value) => onStoryChange((previous) => ({ ...previous, answers: { ...previous.answers, [key]: value } }));
  const setExtra = (index, key, value) => onStoryChange((previous) => ({ ...previous, extra_questions: previous.extra_questions.map((item, i) => i === index ? { ...item, [key]: value } : item) }));

  return (
    <fieldset className="profile-fields story-fields">
      <legend>상세 소개</legend>
      <p className="small-note">기존 소개글은 아래 항목으로 나누어 옮겨 두었습니다. 비어 있는 항목은 상세 페이지에 표시되지 않습니다.</p>
      <label>
        <span className="label">소개 글</span>
        <textarea className="field" value={story.introduction} onChange={(event) => setIntroduction(event.target.value)} placeholder="아이를 간단히 소개해 주세요." />
      </label>
      {STORY_FIELDS.map(([key, label]) => (
        <label key={key}>
          <span className="label">{label}</span>
          <textarea className="field" value={story.answers[key]} onChange={(event) => setAnswer(key, event.target.value)} placeholder={`${label}에 대한 답변을 적어 주세요.`} />
        </label>
      ))}
      <div className="story-extra-head">
        <strong>추가 질문과 답변</strong>
        <button type="button" className="btn secondary" onClick={() => onStoryChange((previous) => ({ ...previous, extra_questions: [...previous.extra_questions, { question: '', answer: '' }] }))}>질문 추가</button>
      </div>
      {story.extra_questions.map((item, index) => (
        <div className="story-extra-row" key={index}>
          <label><span className="label">추가 질문 {index + 1}</span><input className="field" value={item.question} onChange={(event) => setExtra(index, 'question', event.target.value)} placeholder="질문" /></label>
          <label><span className="label">답변</span><textarea className="field" value={item.answer} onChange={(event) => setExtra(index, 'answer', event.target.value)} placeholder="답변" /></label>
          <button type="button" className="story-remove" onClick={() => onStoryChange((previous) => ({ ...previous, extra_questions: previous.extra_questions.filter((_, i) => i !== index) }))}>이 질문 삭제</button>
        </div>
      ))}
    </fieldset>
  );
}
