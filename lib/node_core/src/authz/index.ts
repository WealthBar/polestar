// import debugCtor = require('debug');
// const debug = debugCtor('authz');

export type ctxAuthzType = {
  sessionInfo?: {
    permission?: {
      [name: string]: boolean,
    },
    userId?: string,
  },
};

export type authzType = (ctx: ctxAuthzType) => boolean;

const anon: authzType = function (ctx: ctxAuthzType) {
  return true;
};

const anyUser: authzType = function (ctx: ctxAuthzType) {
  return !!(ctx.sessionInfo && ctx.sessionInfo.userId);
};

function allOf(perm: string[]): authzType {
  return (ctx: ctxAuthzType) => {
    const {sessionInfo} = ctx;
    if (!sessionInfo) {
      return false;
    }

    const {permission} = sessionInfo;
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
    const {sessionInfo} = ctx;
    if (!sessionInfo) {
      return false;
    }

    const {permission} = sessionInfo;
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
