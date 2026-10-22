'use client';

export default function ProfileFields({ form, onChange }) {
  return (
    <>
      <fieldset className="profile-fields">
        <legend>나이 기준 정보</legend>
        <p className="small-note">보호소에서 안내받은 날짜와 당시 추정 나이를 입력하세요. 기존 나이 문구는 자동 계산을 끄면 그대로 표시됩니다.</p>
        <div className="profile-field-grid">
          <label>
            <span className="label">안내받은 날짜</span>
            <input className="field" type="date" name="age_reference_date" value={form.age_reference_date ?? ''} onInput={onChange} onChange={onChange} required={Boolean(form.age_auto_update)} />
          </label>
          <label>
            <span className="label">당시 추정 나이 (살)</span>
            <input className="field" type="number" min="0" max="30" step="1" name="age_reference_years" value={form.age_reference_years ?? ''} onChange={onChange} required={Boolean(form.age_auto_update)} placeholder="예: 2" />
          </label>
        </div>
        <label className="check-row age-auto-check">
          <input type="checkbox" name="age_auto_update" checked={Boolean(form.age_auto_update)} onChange={onChange} />
          <strong>날짜가 지날 때마다 추정 나이 자동 업데이트</strong>
        </label>
        <p className="small-note">켜면 목록에는 ‘약 2살 추정’, 상세에는 ‘약 2살 3일 추정’처럼 표시하며, 기준일의 안내 나이도 상세에 함께 남습니다.</p>
      </fieldset>

      <fieldset className="profile-fields">
        <legend>출신 보호소</legend>
        <label>
          <span className="label">보호소 이름</span>
          <input className="field" name="shelter_name" value={form.shelter_name ?? ''} onChange={onChange} placeholder="예: ○○ 보호소" />
        </label>
        <label>
          <span className="label">보호소 홈페이지 주소</span>
          <input className="field" type="url" name="shelter_url" value={form.shelter_url ?? ''} onChange={onChange} placeholder="https://" />
        </label>
      </fieldset>
    </>
  );
}
