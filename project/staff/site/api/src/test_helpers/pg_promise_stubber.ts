export function pg_promise_stubber(sandbox) {
  const pgPromiseStub = sandbox.stub();
  const db = sandbox.stub();
  pgPromiseStub.returns(db);
  return { pgPromiseFactory: () => pgPromiseStub, db };
}
