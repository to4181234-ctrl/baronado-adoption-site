const PROFILE_FIELDS = [
  'age_reference_date', 'age_reference_years', 'age_auto_update',
  'shelter_name', 'shelter_url', 'story'
];
const MARKER = /\n\n<!-- baronado-profile-v1:([^\n]*?) -->$/;

export function readProfileDescription(value) {
  const description = String(value || '');
  const match = description.match(MARKER);
  if (!match) return { description, profile: {} };
  try {
    const decoded = JSON.parse(decodeURIComponent(match[1]));
    if (!decoded || typeof decoded !== 'object' || Array.isArray(decoded)) throw new Error('Invalid profile');
    return {
      description: description.slice(0, match.index),
      profile: Object.fromEntries(PROFILE_FIELDS.filter((key) => Object.hasOwn(decoded, key)).map((key) => [key, decoded[key]]))
    };
  } catch {
    // Leave malformed or hand-written content untouched.
    return { description, profile: {} };
  }
}

export function writeProfileDescription(description, profile) {
  const original = readProfileDescription(description).description;
  const fields = Object.fromEntries(PROFILE_FIELDS.map((key) => [key, profile[key]]));
  return `${original}\n\n<!-- baronado-profile-v1:${encodeURIComponent(JSON.stringify(fields))} -->`;
}

export function isMissingProfileColumn(error) {
  return ['PGRST204', '42703'].includes(error?.code)
    && PROFILE_FIELDS.some((key) => String(error?.message || '').includes(key));
}
