export type sendMailType = (to: string, templateName: string, params: Record<string, string>) => Promise<void>;

export function sendMailCtor(): sendMailType {
  async function sendMail(to: string, templateName: string, params: Record<string, string>): Promise<void> {
    console.log({to, templateName, params});
  }

  return sendMail;
}

export const sendMail = sendMailCtor();
