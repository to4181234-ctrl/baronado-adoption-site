'use client';

/** Figma pixel-dialogue-box 4, node 698:163511.
 * Purely informational: collar images above this box are the ONLY selection targets.
 * Keep the arrow decorative, with no option button or click handler.
 */
export default function GoCollarDialogue(){
 return <div className="go-collar-dialogue" aria-label="목줄 세 개 중 하나를 선택하세요">
  <img className="go-collar-dialogue-bg" src="/figma-v3/discovery-dialog-bg.svg" alt="" aria-hidden="true"/>
  <img className="go-collar-dialogue-outer" src="/figma-v3/discovery-dialog-outer.svg" alt="" aria-hidden="true"/>
  <img className="go-collar-dialogue-inner" src="/figma-v3/discovery-dialog-inner.svg" alt="" aria-hidden="true"/>
  <p className="go-collar-dialogue-question">오늘의 멍멍이는 누구일까요?</p>
  <div className="go-collar-dialogue-option">
   <img src="/figma-v3/discovery-select-arrow.svg" alt="" aria-hidden="true"/>
   <span>세 개 중 하나를 고른다</span>
  </div>
 </div>;
}
