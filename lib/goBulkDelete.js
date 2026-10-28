export const MAX_GO_BULK_DELETE = 50;

const CARD_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Validate the complete selection before any destructive operation.
export function parseBulkCardIds(ids) {
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > MAX_GO_BULK_DELETE) {
    throw new Error(`삭제할 카드를 1~${MAX_GO_BULK_DELETE}개 선택해주세요.`);
  }
  if (ids.some(id => typeof id !== 'string' || !CARD_ID.test(id)) || new Set(ids).size !== ids.length) {
    throw new Error('선택한 카드 목록을 확인해주세요.');
  }
  return ids;
}
