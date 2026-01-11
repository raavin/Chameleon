import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildManifestReorderOperations } from '../src/utils/manifestOrder.js';

test('buildManifestReorderOperations builds ordered bulk operations', () => {
  const ops = buildManifestReorderOperations(['a', 'b', 'c']);
  assert.equal(ops.length, 3);
  assert.deepEqual(ops[0], {
    updateOne: {
      filter: { id: 'a' },
      update: { $set: { order: 0 } }
    }
  });
  assert.deepEqual(ops[2], {
    updateOne: {
      filter: { id: 'c' },
      update: { $set: { order: 2 } }
    }
  });
});

test('buildManifestReorderOperations rejects non-array input', () => {
  assert.throws(() => buildManifestReorderOperations('nope'), /ids must be an array/);
});

test('buildManifestReorderOperations rejects empty or non-string ids', () => {
  assert.throws(() => buildManifestReorderOperations(['', 'b']), /non-empty strings/);
  assert.throws(() => buildManifestReorderOperations([42]), /non-empty strings/);
});

test('buildManifestReorderOperations rejects duplicate ids', () => {
  assert.throws(() => buildManifestReorderOperations(['a', 'a']), /unique/);
});
