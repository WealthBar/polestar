import {createHash, createHmac, randomBytes} from 'crypto';
import * as bcrypt from 'bcryptjs';

function buffer_xor(a, b) {
  const length = Math.max(a.length, b.length);
  const buffer = Buffer.allocUnsafe(length);

  for (let i = 0; i < length; ++i) {
    buffer[i] = a[i] ^ b[i];
  }

  return buffer;
}

/*
-- Setup:
-- 1. Client provides server with Username and P = password
-- 2. Server generates N = large Nonce (256bits), R = ''
-- 3. Server computes HPN = sha512(P,N)
-- 4. Server computes Q = bcrypt(HPN, salt) and stores (Username, N, Q, R)

note: Q contains the salt as a prefix.

Storing bcrypt(H(P,N)) instead of bcrypt(password) makes cracking attempts a bit harder.
N is bigger than the standard bcrypt salt, making the total salt size effectively 384 bits.

*/

export function crSetup(password: string): { nb64: string, q: string } {
  const n = randomBytes(32);
  const hpn64 = createHash('sha512').update(password).update(n).digest('base64');
  const nb64 = n.toString('base64');
  const salt = bcrypt.genSaltSync();
  const q = bcrypt.hashSync(hpn64, salt);
  return {nb64, q};
}

/*
-- 1. Client sends login request to server with Username
-- 2. Server generates R = HMAC_sha512(large Nonce (128bits) + timestamp, ServerSecret)
-- 3. Server updates R associated with Username
-- 4. Server sends R, salt, and N (looked up from Username) to the client

R here is basically a once-time-use session key.
*/

export function crInitChallenge(secret: string): { rb64: string } {
  const n = randomBytes(32);
  const ts = Date.now().toString(16);
  const r = createHmac('sha512', secret).update(n).update(ts).digest();
  const rb64 = r.toString('base64');
  return {rb64};
}

/*
-- 5. Client computes HPN = sha512(P,N)
-- 6. Client computes Q = bcrypt(HPN, salt)
-- 7. Client computes Cc = HMAC_sha512(Q, R)
-- 8. Client computes F = XOR(HPN, Cc)
-- 9. Client sends F, R and Username to the server

R, N and the salt are provided by the server.
HPN here depends on the client knowing the password.
Q is derived directly from HPN and the salt
Cc is the symmetric key to xor encrypt HPN against, derived using Q and R (the one time use session key)
Since cc's derivation includes the password cc is as hard to guess as the password is.
F is the xor encrypted HPN using Cc as the key

F and R are returned to the server.
*/

export function crGetSalt(q: string): string {
  return q.substr(0,29);
}

export function crResponse(rb64: string, nb64: string, salt: string, password: string): { fb64: string } {
  const n = Buffer.from(nb64, 'base64');
  const r = Buffer.from(rb64, 'base64');
  const hpn = createHash('sha512').update(password).update(n).digest();
  const hpn64 = hpn.toString('base64');
  const q = bcrypt.hashSync(hpn64, salt);
  const cc = createHmac('sha512', r).update(q).digest();
  const f = buffer_xor(hpn, cc);
  const fb64 = f.toString('base64');
  return {fb64};
}

/*
-- 9. Server validates R and atomically updates Username.R to '' against the R provided, on failure aborts. (i.e. only allow the R to be used once to login.)
-- 10. Server computes C_s = HMAC(Q, R)
-- 11. Server computes T_s = XOR(F, C_s)
-- 12. Server computes H(T_s) and compares it with Q (looked up from Username)

R is validated against the user before calling verify

F comes from the client, R has matched, and Q (which contains the salt as well) comes from the password store based on the user
Cs is the encryption key derived from R and Q (which we computed in setup, based on the password)
HPN is decrypted from F using Cs
if bcrypt(HPN, salt) matches Q the password the client had must be a match.
*/

export function crVerify(fb64: string, rb64: string, q: string): boolean {
  const f = Buffer.from(fb64, 'base64');
  const r = Buffer.from(rb64, 'base64');
  const cs = createHmac('sha512', r).update(q).digest();
  const hpn = buffer_xor(f, cs);
  const hpn64 = hpn.toString('base64');
  const salt = crGetSalt(q);
  const v = bcrypt.hashSync(hpn64, salt);
  return q === v;
}
