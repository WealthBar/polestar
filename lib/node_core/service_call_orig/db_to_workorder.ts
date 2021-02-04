export function dbToWorkorder(dbRow) {
  if (dbRow) {
    return {
      wordOrderId: dbRow.workorder_id,
      contextName: dbRow.context_name,
      contentHash: dbRow.content_hash,
      currentContentHash: dbRow.current_content_hash,
      state: dbRow.state,
      frozenAt: dbRow.frozen_at,
    };
  }
}
