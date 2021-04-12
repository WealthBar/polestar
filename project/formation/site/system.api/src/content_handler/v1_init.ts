import {resolvedVoid} from 'ts_agnostic';
import {ctxBody, ctxType, secureTokenVerify} from 'node_core';
import {value as initGetSql} from './v1_init_get_sql';
import {value as initSql} from './v1_init_sql';
import {Object} from 'ts-toolbelt';

const errorInvalidRequest = JSON.stringify({error: 'INVALID_REQUEST'});
const errorMismatch = JSON.stringify({error: 'MISMATCH'});

function systemNote(ctx: Pick<ctxType, 'note'>): {
  bearerToken?: string,
  systemId?: string,
  systemName?: string,
  domain?: string,
  secretKey?: string,
  errorUrl?: string
} {
  return ctx?.note?.['system'] as {
    bearerToken?: string,
    systemId?: string,
    systemName?: string,
    domain?: string,
    secretKey?: string,
    errorUrl?: string
  };
}

type initType = {
  formKey: string,
  brand: string,
  jurisdiction: string, // {country_iso2}(_{region_iso2}): ca, ca_bc, ca_ab, us, us_wa, etc.
  signingDate: string,
  locale: string, // {locale_iso2}: en, fr
  validUntil: string, // iso datetime: YYYY-MM-EEThh-mm-ssZ
  data: Record<string, string>
};
const initRequired = [
'formKey',
  'brand',
  'jurisdiction',
  'signingDate',
  'locale',
  'validUntil',
  'data',
];

// subset ctx to the fields we use to make testing easier.
export async function v1InitHandler(ctx: Pick<ctxType, 'url' | 'body' | 'note' | 'db'> & Object.P.Pick<ctxType, ['res', 'statusCode' | 'setHeader' | 'end']> & Object.P.Pick<ctxType, ['req', 'method' | 'on']>): Promise<void> {
  if (!ctx.url.path.startsWith('/v1/init/')) {
    return resolvedVoid;
  }
  ctx.res.statusCode = 200;
  ctx.res.setHeader('Content-Type', 'application/json');

  const system = systemNote(ctx);
  if (!system?.systemId || !system?.secretKey) {
    ctx.res.end(errorInvalidRequest);
    return resolvedVoid;
  }

  const stoken = ctx.url.path.substr(9); // remove leading '/v1/init/'
  if (!system?.secretKey || !secureTokenVerify(stoken, system?.secretKey)) {
    ctx.res.end(errorInvalidRequest);
    return resolvedVoid;
  }

  if (!(await ctxBody(ctx)) || !ctx.body) {
    ctx.res.end(errorInvalidRequest);
    return resolvedVoid;
  }

  try {
    const init = JSON.parse(ctx.body) as Partial<initType>;
    if (initRequired.some(f => init[f] === undefined || init[f] === null)) {
      ctx.res.end(errorInvalidRequest);
      return resolvedVoid;
    }
    await ctx.db(async db => {
      // ctx db is already in a transaction
      const binds = {
        stoken,
        formKey: init.formKey,
        systemName: system.systemName,
        brand: init.brand,
        jurisdiction: init.jurisdiction,
        signingDate: init.signingDate,
        locale: init.locale,
        validUntil: init.validUntil,
        data: init.data,
      };
      const m = await db.oneOrNone<{ matches: boolean }>(initGetSql, binds);
      if (m) {
        if (m.matches) {
          ctx.res.end('{}');
        } else {
          ctx.res.end(errorMismatch);
        }
      } else {
        await db.none(initSql, binds);
        ctx.res.end('{}');
      }
    });
  } catch (e) {
    console.log(e);
    ctx.res.end(errorInvalidRequest);
  }

  return resolvedVoid;
}
