export function formatDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return '';
  const [year, month, day] = date.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) return '';
  return `${year}.${String(month).padStart(2, '0')}.${String(day).padStart(2, '0')}`;
}

function utcDay(year, month, day) {
  return Date.UTC(year, month - 1, day);
}

function anniversary(year, month, day) {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return utcDay(year, month, Math.min(day, lastDay));
}

export function getAgeInfo(dog, now = new Date()) {
  const date = dog?.age_reference_date;
  const years = Number(dog?.age_reference_years);
  const hasReference = date && dog.age_reference_years !== null && dog.age_reference_years !== undefined && dog.age_reference_years !== ''
    && Number.isInteger(years) && years >= 0 && years <= 30 && formatDate(date);
  if (!hasReference) return { display: dog?.age || '나이 미정', reference: '' };

  const [year, month, day] = date.split('-').map(Number);
  const today = utcDay(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const reference = `${formatDate(date)} 기준 약 ${years}살로 안내받음`;
  if (!dog.age_auto_update || today < utcDay(year, month, day)) {
    return { display: dog?.age || `약 ${years}살 추정`, reference };
  }

  let elapsedYears = now.getFullYear() - year;
  if (today < anniversary(now.getFullYear(), month, day)) elapsedYears -= 1;
  const lastAnniversary = anniversary(year + elapsedYears, month, day);
  const days = Math.floor((today - lastAnniversary) / 86400000);
  return { display: `약 ${years + elapsedYears}살 ${days}일 추정`, reference };
}

export function getShelterUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : '';
  } catch {
    return '';
  }
}
