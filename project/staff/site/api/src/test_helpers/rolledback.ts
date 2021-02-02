const rollbackError = new Error("rollback");

export async function rolledback(db, f) {
  try {
    await db.tx(async (db) => {
      await f(db);
      throw rollbackError;
    });
  } catch (e) {
    /* istanbul ignore next */
    if (e !== rollbackError) {
      /* istanbul ignore next */
      throw e;
    }
  }
}
