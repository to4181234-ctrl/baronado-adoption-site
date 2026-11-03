import { vaccinationLabels } from '../lib/vaccinations';

export default function VaccinationDetails({ profile, inline = false }) {
  const labels = vaccinationLabels(profile);
  if (!labels.length) return null;
  if (inline) return <p className="vaccination-inline">{labels.join(', ')}</p>;
  return <section className="profile-section">
    <h2>접종 여부</h2>
    <p>{labels.join(', ')}</p>
  </section>;
}
