// Reference: WSAVA 2024 vaccination guidelines and AAHA 2022 guideline (2024 update).
export const VACCINATION_GROUPS = [
  { label: '기본 접종 확인', options: [
    { key: 'distemper', label: '개 홍역(디스템퍼)' },
    { key: 'adenovirus', label: '아데노바이러스(전염성 간염)' },
    { key: 'parvovirus', label: '파보바이러스' },
    { key: 'leptospirosis', label: '렙토스피라증' },
    { key: 'rabies', label: '광견병' }
  ] },
  { label: '생활 환경에 따라 확인', options: [
    { key: 'parainfluenza', label: '파라인플루엔자' },
    { key: 'bordetella', label: '보르데텔라(켄넬코프)' },
    { key: 'influenza', label: '개 인플루엔자' }
  ] }
];

export const VACCINATION_OPTIONS = VACCINATION_GROUPS.flatMap(group => group.options);
export const VACCINATION_KEYS = new Set(VACCINATION_OPTIONS.map(option => option.key));

export function vaccinationLabels(profile) {
  const checked = new Set(Array.isArray(profile?.vaccinations_checked) ? profile.vaccinations_checked : []);
  return VACCINATION_OPTIONS.filter(option => checked.has(option.key)).map(option => option.label);
}
