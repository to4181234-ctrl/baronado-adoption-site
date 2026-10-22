export default function AdminAutosaveNotice({ autosave }) {
  if (autosave.pending) return <div className="admin-draft-notice" role="status">
    <strong>작성 중이던 내용이 있어요.</strong>
    <p>이 브라우저에 임시 저장된 내용을 불러올 수 있어요.{autosave.pending.omittedFiles && ' 새로 선택한 사진·동영상·영상 표지는 다시 선택해야 합니다.'}</p>
    <div><button type="button" className="btn" onClick={autosave.restore}>이어서 작성</button><button type="button" className="btn secondary" onClick={autosave.discard}>임시 저장 내용 삭제</button></div>
  </div>;
  return <p className="admin-draft-status" role="status">{autosave.status || '작성 내용은 이 브라우저에 자동으로 임시 저장돼요. 새로 선택한 파일은 다시 선택해야 합니다.'}</p>;
}
