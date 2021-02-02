import {DateTime, Duration} from 'luxon';
import {router} from '@/router';
import {http} from '@/http';
import {AxiosInstance} from 'axios';
import {settings} from '@/settings';

function callCtor(http: AxiosInstance) {
  if (!http) {
    console.error('http invalid');
  }

  async function call(url: string, args: any): Promise<any> {
    return await http.post(url, args);
  }

  return call;
}

export const call = callCtor(http);

type callType = typeof call;

function serviceCallCtor(
  prefix: string,
  call: callType,
  onAuthorizationRequired: () => Promise<void>,
) {
  let id = 0;

  async function serviceCall(
    serviceName: string,
    parameterObject: { [key: string]: any } = {},
  ): Promise<any> {
    try {
      parameterObject.id = ++id;
      const res = await call(`/api/${prefix}/service/${serviceName}`, parameterObject);
      // console.debug(JSON.stringify(res, undefined, 2));
      return res.data;
    } catch (res) {
      if (res.status === 401) {
        await onAuthorizationRequired();
        return {err: `Status ${res.status}: Assuming login expired, reloading page.`};
      } else {
        return {err: JSON.stringify(res, undefined, 2)};
      }
    }
  }

  return serviceCall;
}

// instanbul ignore next
async function onAuthorizationRequired() {
  const redirectKey = `${settings.projectName}_redirectTo`;
  window.sessionStorage[redirectKey] = router.currentRoute.path;
  window.location.assign('/api/auth');
}

// router has to be deferred because it can be undefined during startup because the router depends on the components
// which depend on the router, leading the a circular dependency in which the creation or the router is deferred
// until after this module loads.
export const clientServiceCall = serviceCallCtor('client', call, onAuthorizationRequired);

export function cached<T>(
  func: (...args: any[]) => Promise<T>,
  cacheFor: Duration,
): () => Promise<T> {
  let lastRead: DateTime | undefined;
  let lastResult: T;

  async function fetch(): Promise<T> {
    if (lastResult === undefined || lastRead === undefined || lastRead.diffNow() > cacheFor) {
      lastRead = DateTime.utc();
      lastResult = await func();
    }
    return lastResult;
  }

  return fetch;
}
