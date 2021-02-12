import {crInitChallenge, crResponse, crSetup, crVerify, crGetSalt} from './cr';
import * as assert from 'assert';

describe('cr', () => {
  it('basics', () => {
    const secret = 'asdf';
    const password = 'testing123';

    // the only time the password is sent is on setup
    const {nb64, q} = crSetup(password);

    // client initiates login
    const {rb64} = crInitChallenge(secret);
    // store rb64

    // send nb64, rb64, salt to client
    // client provides password
    const salt = crGetSalt(q);
    const {fb64} = crResponse(rb64, nb64, salt, password);

    // client sends back fb64
    // server verifies rb64 matches for login, swaps to '', fails if rb64 doesn't match.

    // verify fb64 against rb64 and q
    const verified = crVerify(fb64, rb64, q);

    assert(verified);
  });
  it('invalid password', () => {
    const secret = 'asdf';
    const password = 'testing123';
    const {nb64, q} = crSetup(password);
    const {rb64} = crInitChallenge(secret);
    const salt = crGetSalt(q);
    const {fb64} = crResponse(rb64, nb64, salt, 'attacker');
    const verified = crVerify(fb64, rb64, q);

    assert(!verified);
  });
});
