import {cached, call} from './';
import {Duration} from 'luxon';

export type sessionInfoType = {
  userId?: string;
  displayName?: string;
  email?: string;
  sessionId?: string;
  permission: {
    [name: string]: boolean;
  };
};

export const sessionInfo = cached<sessionInfoType | undefined>(
  async () => {
    const sessionInfoResponse = await call(`/api/sessionInfo`, {url: window.location.href});
    if (sessionInfoResponse === undefined) {
      return;
    }
    const {userId, displayName, email, sessionId, permission} = sessionInfoResponse.data;
    return {
      userId,
      displayName,
      email,
      sessionId,
      permission: permission || {},
    };
  },
  Duration.fromObject({minutes: 1}),
);
