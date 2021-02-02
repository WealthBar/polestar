export type verifyCallback = (err?: string | Error, user?: { name:string|undefined, email:string|undefined}) => void;
export type profileType = {
  emails: { value: string }[] | undefined,
  displayName: string | undefined,
};

export type verifyType = (
  accessToken: string | undefined,
  refreshToken: string | undefined,
  profile: profileType | undefined,
  done: verifyCallback,
) => void;

export function verifyCtor(): verifyType {
//(err?: string | Error, user?: any, info?: any) => void
  return function verify(accessToken: string | undefined, refreshToken: string | undefined, profile: profileType | undefined, done: verifyCallback): void {
    const email = profile?.emails?.[0]?.value;
    const name = profile?.displayName;

    if (typeof (email) === 'string' && email.length > 2 && email.indexOf('@') > 0) {
      const userInfo = {email, name};
      done(undefined, userInfo);
    } else {
      done(`Sorry, ${email} not valid.`, undefined);
    }
  };
}

export const verify = verifyCtor();
