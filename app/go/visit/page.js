import GoShell from '../../../components/GoShell.js';
import GoVisitPanel from '../../../components/GoVisitPanel.js';

export const metadata = { title: '방문 인증 | 멍멍GO!' };
export default function Page() {
  return <GoShell active="quests"><GoVisitPanel /></GoShell>;
}
