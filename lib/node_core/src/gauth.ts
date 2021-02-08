import {ctxType, gauthUserInfoType, contentHandlerType} from './server.type';
import {resolvedVoid} from 'ts_agnostic';
import {secureTokenCtorType, secureTokenVerifyType} from './stoken';
import {toUrlParam} from 'ts_agnostic';
import {kvpArrayToObject} from 'ts_agnostic';
import {userVivifyType} from './user';

export function gauthInitCtor(
  settings: {
    sessionSecret: string;
    google: {
      redirectUri: string;
      id: string;
    },
  },
  secureTokenCtor: secureTokenCtorType,
): contentHandlerType {

  function gauthInit(ctx: ctxType): Promise<void> {
    if (ctx.url.path !== '/gauth/init') {
      return resolvedVoid;
    }
    const token = secureTokenCtor(settings.sessionSecret);
    const params: [string, string][] = [
      ['client_id', settings.google.id],
      ['redirect_uri', settings.google.redirectUri],
      ['response_type', 'code'],
      ['scope', 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile'],
      ['state', token],
      ['access_type', 'offline'],
      ['include_granted_scopes', 'true'],
      ['prompt', 'select_account consent'],
    ];
    const location = 'https://accounts.google.com/o/oauth2/v2/auth?' + toUrlParam(params);

    ctx.res.writeHead(
      303,
      {
        Location: location,
      });
    ctx.res.end();
    return resolvedVoid;
  }

  return gauthInit;
}

export function gauthContinueCtor(
  settings: {
    appUrl: string;
    sessionSecret: string;
    google: {
      secret: string;
      redirectUri: string;
      id: string;
    },
  },
  secureTokenVerify: secureTokenVerifyType,
  userVivify: userVivifyType,
  poster: <T>(url: string, body: string, options: { headers: Record<string, string> }) => Promise<{ data: T }>,
): contentHandlerType {
  function jwtTrustedDecode(data: string) {
    // doesn't check the signature, as we already trust the source.
    return JSON.parse(Buffer.from(data.split('.')[1], 'base64').toString('utf-8'));
  }

  async function gauthContinue(ctx: ctxType): Promise<void> {
    if (ctx.url.path !== '/gauth/continue') {
      return resolvedVoid;
    }
    const {state, code} = kvpArrayToObject(ctx.url.params) as { state: string, code: string };
    const stuid = secureTokenVerify(state, settings.sessionSecret);

    // TODO: check age of stuid, reject if older than X mins.
    if (!state || !code || !stuid) {
      ctx.res.statusCode = 400;
      ctx.res.end('Invalid Request');
      return resolvedVoid;
    }
    try {
      const r = await poster<Record<string, unknown>>(
        'https://oauth2.googleapis.com/token',
        toUrlParam([
          ['code', code],
          ['client_id', settings.google.id],
          ['redirect_uri', settings.google.redirectUri],
          ['client_secret', settings.google.secret],
          ['grant_type', 'authorization_code'],
        ]),
        {headers: {'Content-Type': 'application/x-www-form-urlencoded'}},
      );
      const userData = jwtTrustedDecode(r.data.id_token as string) as gauthUserInfoType;
      ctx.session.userId = await userVivify(userData, JSON.stringify(r.data));
      ctx.res.writeHead(303, {Location: settings.appUrl});
      ctx.res.end();
    } catch (e) {
      ctx.res.statusCode = 400;
      ctx.res.end('Invalid Request');
    }
    return resolvedVoid;
  }

  return gauthContinue;
}

