/* eslint-disable @typescript-eslint/no-explicit-any */
import * as url from 'url';
import debugCtor = require('debug');
import {verify, verifyType} from './verify';
import {Strategy} from 'passport-google-oauth20';

const debug = debugCtor(
  'middleware:auth:google',
);
export type settingsType = { googleAuthId: string, googleAuthSecret: string, projectUrl: string };

// tslint:disable:variable-name
export function googleCtor(verify: verifyType, settings: settingsType) {
  return function google(passport: { use(s: any) }): void {
    const {googleAuthId, googleAuthSecret, projectUrl} = settings;
    const config = {
      scope: ['email', 'profile'],
      clientID: googleAuthId,
      clientSecret: googleAuthSecret,
      callbackURL: url.resolve(projectUrl, 'api/auth/google'),
    };
    debug('installing');
    const strategy = new Strategy(config, verify);
    passport.use(strategy);
  };
}

// istanbul ignore next
export const installGoogleCtor = (settings: settingsType) => googleCtor(verify, settings);
// istanbul ignore next
export type installGoogleCtorType = typeof installGoogleCtor;
