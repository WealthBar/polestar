const messages: { [locale: string]: { [tag: string]: string } } = {
  en: {
    S_ENTER_EMAIL: 'Enter your email',
    S_ENTER_PASSWORD_KNOWN: 'Enter your password',
    S_ENTER_PASSWORD_FORGET: 'Enter a new password',
    S_ENTER_PASSWORD_NEW: 'Enter a password',
    S_ENTER_CODE_FORGET: 'Enter the code sent to: {{email}}',
    S_ENTER_CODE_SENT: 'Enter the code sent to: {{email}}',
    S_SEND_CODE: 'Click Send Code to proceed',
    S_LOGIN: 'Click login to proceed',
    E_LOGIN_NOT_KNOWN: 'Account not found',
    E_LOGIN_EXISTS: 'Account already exists',
    E_LOGIN_FAILED: 'Login failed',
    E_CODE_INVALID: 'Invalid code',
    E_EMAIL_INVALID: 'Please enter a valid email',
    E_PASSWORD_INVALID: 'Please enter a valid password',
    W_STANDBY: 'Please stand by',
    E_ERROR: 'Please try again later',
  },
};

const messageTypeMap: { [key: string]: string } = {
  N: '',
  S: 'is-success',
  SL: 'is-success is-light',
  I: 'is-info',
  IL: 'is-info is-light',
  W: 'is-warning is-light',
  WL: 'is-warning',
  E: 'is-danger',
  EL: 'is-danger is-light',
};

export function getMessageType(message: string): string {
  return messageTypeMap[message?.split('_')?.[0] || 'E'] || 'is-danger';
}

export function getMessage(locale: string, tag: string, options: { [key: string]: string } = {}): string {
  let msg = messages[locale]?.[tag];
  if (!msg) {
    if (messages['en']?.[tag]) {
      msg = '[?' + messages['en']?.[tag] + '?]';
    } else {
      msg = `[!${locale}:${tag}!]`;
    }
  }
  msg = msg.replace(/{{[^}]*}}/g, (m) => {
    const key = m.substr(2, m.length - 4);
    return options[key] || '';
  });
  return msg;
}
