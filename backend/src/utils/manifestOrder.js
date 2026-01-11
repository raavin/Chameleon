export function buildManifestReorderOperations(ids) {
  if (!Array.isArray(ids)) {
    throw new TypeError('ids must be an array');
  }

  const seen = new Set();
  return ids.map((id, index) => {
    if (typeof id !== 'string' || id.trim().length === 0) {
      throw new TypeError('ids must be non-empty strings');
    }
    if (seen.has(id)) {
      throw new Error('ids must be unique');
    }
    seen.add(id);
    return {
      updateOne: {
        filter: { id },
        update: { $set: { order: index } }
      }
    };
  });
}
