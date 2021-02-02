/* eslint-disable @typescript-eslint/no-explicit-any,@typescript-eslint/explicit-module-boundary-types */
import {installGoogleCtor, installGoogleCtorType, settingsType} from './google';
import debugCtor = require('debug');

export type userCallbackType = (err?: string | Error, user?: Record<string, unknown>) => void;

const debug = debugCtor(
  'middleware:auth',
);

export function serializeUser(
  user: Record<string, unknown>,
  done: userCallbackType,
): void {
  debug(`serializeUser(${JSON.stringify(user)}`);
  done(
    undefined,
    user,
  );
}

export type serializerUserType = typeof serializeUser;

export function deserializeUser(
  user: Record<string, unknown>,
  done: userCallbackType,
): void {
  debug(`deserializeUser(${JSON.stringify(user)}`);
  if (user.email) {
    done(
      undefined,
      user,
    );
  } else {
    done(
      undefined,
      undefined,
    );
  }
}

export type deserializerUserType = typeof deserializeUser;

export type passportType = {
  use(s: any): void,
  serializeUser(cb: serializerUserType): void,
  deserializeUser(cb: deserializerUserType): void,
  authenticate(strategyName: string, options: Record<string, string>): any,
};

export function authInstallerCtor<T extends passportType>(installGoogleCtor: installGoogleCtorType): (T, settings: settingsType) => Promise<void> {
  return async function authInstaller(passport: T, settings: settingsType): Promise<void> {
    await installGoogleCtor(settings)(passport);
    passport.serializeUser(serializeUser);
    passport.deserializeUser(deserializeUser);
  };
}

export function authCtor(passport: passportType) {
  return async function middleware(ctx: any, next: any): Promise<void> {
    if (ctx.url.match(/^\/[^/]*\/auth/)) {
      const auth = passport.authenticate('google', {
        successRedirect: '/app/',
        failureRedirect: '/app/',
      });
      await auth(ctx, next);
    } else {
      return next();
    }
  };
}

export const authInstaller = authInstallerCtor(installGoogleCtor);
