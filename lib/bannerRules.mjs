export const MAX_BANNERS = 3;
export const LINK_TYPES = ['none', 'adoption', 'resident', 'go', 'external'];
export const BANNER_ROUTES = Object.freeze({ adoption: '/', resident: '/residents', go: '/go' });
const MAX_NAME = 80;
const MAX_ALT = 200;

export function targetHref(type, externalUrl = '') {
  if (type === 'none') return null;
  if (Object.hasOwn(BANNER_ROUTES, type)) return BANNER_ROUTES[type];
  if (type === 'external') {
    try {
      const url = new URL(externalUrl);
      if (url.protocol !== 'https:' || url.username || url.password || !url.hostname || url.href.length > 2048) return null;
      return url.href;
    } catch { return null; }
  }
  return null;
}
export function validateBanner(input, { allowedImageOrigin } = {}) {
  if (!input || Array.isArray(input) || typeof input !== 'object') throw new Error('배너 정보를 확인해주세요.');
  const name = String(input.name || '').trim();
  const alt = String(input.alt || '').trim();
  const imageUrl = String(input.image_url || '').trim();
  const linkType = String(input.link_type || 'none');
  const externalUrl = linkType === 'external' ? String(input.external_url || '').trim() : null;
  if (!name || name.length > MAX_NAME) throw new Error('관리용 이름을 1~80자로 입력해주세요.');
  if (!alt || alt.length > MAX_ALT) throw new Error('이미지 설명을 1~200자로 입력해주세요.');
  if (!LINK_TYPES.includes(linkType) || (linkType === 'external' && !targetHref('external', externalUrl))) throw new Error('연결 대상을 확인해주세요. 외부 주소는 HTTPS만 가능해요.');
  let parsed;
  try { parsed = new URL(imageUrl); } catch { throw new Error('등록된 배너 이미지를 확인해주세요.'); }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.href.length > 2048 || !parsed.pathname.startsWith('/storage/v1/object/public/dog-images/banners/')) throw new Error('등록된 배너 이미지를 확인해주세요.');
  if (allowedImageOrigin && parsed.origin !== allowedImageOrigin) throw new Error('허용되지 않은 이미지 주소예요.');
  if (typeof input.visible !== 'boolean') throw new Error('노출 상태를 확인해주세요.');
  return {name,alt,image_url:parsed.href,link_type:linkType,external_url:externalUrl,visible:input.visible};
}
export function normalizedOrder(ids, existingIds) {
  if (!Array.isArray(ids) || !Array.isArray(existingIds) || ids.length !== existingIds.length || ids.length > MAX_BANNERS || new Set(ids).size !== ids.length) throw new Error('배너 노출 순서를 확인해주세요.');
  if (!ids.every(id => typeof id === 'string' && existingIds.includes(id))) throw new Error('등록된 배너만 순서를 변경할 수 있어요.');
  return ids;
}
