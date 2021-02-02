import sinon from 'sinon';
import assert from 'assert';
import { handleError } from './http';

context('http', async () => {
  specify('401 Error', async () => {
    const windowStub = { location: { reload: sinon.stub() } };
    const consoleStub = { error: sinon.stub() };
    const error = { response: { status: 401 } };
    const handler = handleError(windowStub, consoleStub);
    try {
      await handler(error);
      assert(false);
    } catch (e) {
      assert(windowStub.location.reload.called, 'window location reloaded');
      assert(consoleStub.error.calledWith(e), 'error written to console');
    }
  });

  specify('non-401 error', async () => {
    const windowStub = { location: { reload: sinon.stub() } };
    const consoleStub = { error: sinon.stub() };
    const error = { response: { status: 404 } };
    const handler = handleError(windowStub, consoleStub);
    try {
      await handler(error);
      assert(false);
    } catch (e) {
      assert(windowStub.location.reload.notCalled, 'window location unchanged after non 401 error');
      assert(consoleStub.error.calledWith(e), 'error written to console');
    }
  });
});
