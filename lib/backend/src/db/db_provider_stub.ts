import {dbType} from "./db_provider";

export function dbProviderStub(sinon) {
  const db = sinon.stub();

  ["one", "any", "none", "query", "result", "oneOrNone"].forEach((toStub) => {
    db[toStub] = sinon.stub();
  });
  async function wrapperFull<T>(auditUser: string, q: (db: dbType) => Promise<T>, trackingTag = ""): Promise<T> {
    return q(db);
  }

  async function wrapperAnon<T>(q: (db: dbType) => Promise<T>, trackingTag = ""): Promise<T> {
    return q(db);
  }

  async function wrapperCtx<T>(q: (db: dbType) => Promise<T>): Promise<T> {
    return q(db);
  }
  const dbProvider = sinon.spy(wrapperFull);
  const dbProviderAnon = sinon.spy(wrapperAnon);
  const ctxDbProvider = sinon.spy(wrapperCtx);
  return {dbProvider, dbProviderAnon, ctxDbProvider, db};
}
