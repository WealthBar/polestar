import debugCtor = require('debug');

const debug = debugCtor('setting');

const requiredFromEnv = {
  databaseUrl: 'DB_URL',
  databaseUrlTest: 'TEST_DB_URL',
  googleAuthId: 'GOOGLE_AUTH_CLIENT_ID',
  googleAuthSecret: 'GOOGLE_AUTH_CLIENT_SECRET',
  projectUrl: 'PROJECT_URL',
  sessionSecret: 'SESSION_SECRET',
};

const optionalFromEnv = {
  slackHook: 'SLACK_HOOK',
  sessionCookieName: 'SESSION_COOKIE_NAME',
  sessionCookieMaxAge: 'SESSION_COOKIE_MAX_AGE',
  sessionCookieSecure: 'SESSION_COOKIE_SECURE',
};

export type settingsType = {
  readonly databaseUrl: string,
  readonly databaseUrlTest: string,
  readonly googleAuthId: string,
  readonly googleAuthSecret: string,
  readonly projectUrl: string,
  readonly sessionSecret: string,
  readonly sessionCookieName?: string,
  readonly sessionCookieMaxAge?: string,
  readonly slackHook?: string,
  readonly sessionCookieSecure?: string,
};

let _settings: Partial<settingsType>;

export async function getSettings(): Promise<settingsType> {
  if (!_settings) {
    _settings = {};
    const missingFromEnv: string[] = [];

    Object.keys(requiredFromEnv).forEach((k) => {
      const envName = requiredFromEnv[k];
      const v = process.env[envName];
      if (v === undefined) {
        missingFromEnv.push(envName);
      }
      debug(`${k}=${v} [${envName}]`);
      _settings[k] = v;
    });

    Object.keys(optionalFromEnv).forEach((k) => {
      const envName = optionalFromEnv[k];
      const v = process.env[envName];
      debug(`${k}=${v} [${envName}]`);
      _settings[k] = v;
    });

    if (missingFromEnv.length) {
      throw new Error(`Setting(s) missing in ENV: ${missingFromEnv.join(', ')}`);
    }
  }
  return _settings as settingsType;
}

export type getSettingsType = () => Promise<settingsType>;
