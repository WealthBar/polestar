import {crGetSalt, crServerInitChallenge, crClientResponseEg, crServerSetup, crClientSetupInitEg, crServerSetupInit, crServerVerify} from './cr';
import * as assert from 'assert';

describe('cr', () => {
  it('basics', () => {
    const secret = 'asdf';
    const password = 'testing123';

    // -- ACCOUNT CREATION
    // server
    const {nb64} = crServerSetupInit();
    // -- record username initiated login in login_log w/ remote IP & user agent info
    // -- send nb64 to client

    // client
    const {hpnb64} = crClientSetupInitEg(password, nb64);
    // -- send hpn64 to server

    // server
    const {q} = crServerSetup(hpnb64);
    // -- stores n, q, r='' against username.


    // -- LOGIN

    // server
    const {r} = crServerInitChallenge(secret);
    // -- store r against username
    // -- send nb64, r, salt to client

    // client
    const salt = crGetSalt(q);
    const {fb64} = crClientResponseEg(r, nb64, salt, password);

    // -- send fb64 to server

    // server

    // -- verifies rb64 matches for username, token is valid, token is <10 minutes old
    // -- swaps r to '' (one use only)

    const verified = crServerVerify(fb64, r, q, secret);
    // -- record username success/failure of login in login_log  w/ remote IP & user agent info

    assert(verified);
  });
  it('invalid password', () => {
    const secret = 'asdf';
    const password = 'testing123';

    // -- ACCOUNT CREATION
    // server
    const {nb64} = crServerSetupInit();
    // -- record username initiated login in login_log w/ remote IP & user agent info
    // -- send nb64 to client

    // client
    const {hpnb64} = crClientSetupInitEg(password, nb64);
    // -- send hpn64 to server

    // server
    const {q} = crServerSetup(hpnb64);
    // -- stores n, q, r='' against username.


    // -- LOGIN

    // server
    const {r} = crServerInitChallenge(secret);
    // -- store r against username
    // -- send nb64, r, salt to client

    // client
    const salt = crGetSalt(q);
    const {fb64} = crClientResponseEg(r, nb64, salt, 'testing124');

    // -- send fb64 to server

    // server

    // -- verifies rb64 matches for username, token is valid, token is <10 minutes old
    // -- swaps r to '' (one use only)

    const verified = crServerVerify(fb64, r, q, secret);
    // -- record username success/failure of login in login_log  w/ remote IP & user agent info

    assert(!verified);
  });
});
