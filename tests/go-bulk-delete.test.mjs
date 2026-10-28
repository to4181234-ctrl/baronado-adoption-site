import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_GO_BULK_DELETE, parseBulkCardIds } from '../lib/goBulkDelete.js';

const id = n => `123e4567-e89b-42d3-a456-${String(n).padStart(12,'0')}`;

test('bulk-delete selection accepts unique valid UUIDs', () => {
  assert.deepEqual(parseBulkCardIds([id(1),id(2)]),[id(1),id(2)]);
});

test('bulk-delete selection refuses zero or oversized batches', () => {
  assert.throws(()=>parseBulkCardIds([]),/1~/);
  assert.throws(()=>parseBulkCardIds(Array.from({length:MAX_GO_BULK_DELETE+1},(_,i)=>id(i))),/1~/);
});

test('bulk-delete selection refuses repeated and malformed IDs', () => {
  assert.throws(()=>parseBulkCardIds([id(1),id(1)]),/목록/);
  assert.throws(()=>parseBulkCardIds(['not-a-card']),/목록/);
  assert.throws(()=>parseBulkCardIds('wrong shape'),/1~/);
});
