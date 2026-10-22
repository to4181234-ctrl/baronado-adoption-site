import { vaccinationLabels } from '../lib/vaccinations';

export default function VaccinationDetails({ profile }) {
  const labels = vaccinationLabels(profile);
  if (!labels.length) return null;
  return <section className="profile-section">
    <h2>접종 여부</h2>
    <p>{labels.join(', ')}</p>
  </section>;
}
