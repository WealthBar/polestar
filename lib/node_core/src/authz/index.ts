import debugCtor = require('debug');
const debug = debugCtor('authz');

export type ctxAuthzType = {
  permission?: {
    [name: string]: boolean,
  },
  user?: {
    login: string
  }
};

export type authzType = (ctx: ctxAuthzType) => boolean;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const anon: authzType = function (ctx: ctxAuthzType) {
  return true;
};

const anyUser: authzType = function (ctx: ctxAuthzType) {
  return !!(ctx.permission && ctx.user?.login);
};

function allOf(perm: string[]): authzType {
  return (ctx: ctxAuthzType) => {
    const {permission} = ctx;
    if (!permission) {
      return false;
    }

    for (const p of perm) {
      if (!permission[p]) {
        return false;
      }
    }

    return perm.length > 0;
  };
}

function anyOf(perm: string[]): authzType {
  return (ctx: ctxAuthzType) => {
    const {permission} = ctx;
    if (!permission) {
      return false;
    }
    for (const p of perm) {
      if (permission[p]) {
        return true;
      }
    }
    return false;
  };
}

function anyOfAuthz(az: authzType[]): authzType {
  return (ctx: ctxAuthzType) => {
    for (const authz of az) {
      if (authz(ctx)) {
        return true;
      }
    }
    return false;
  };
}

function allOfAuthz(az: authzType[]): authzType {
  return (ctx: ctxAuthzType) => {
    for (const authz of az) {
      if (!authz(ctx)) {
        return false;
      }
    }
    return az.length > 0;
  };
}

export const authz = {
  anon,
  anyUser,
  allOf,
  anyOf,
  allOfAuthz,
  anyOfAuthz,
};
