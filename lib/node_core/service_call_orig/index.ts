import {authz} from '../authz';
import {serviceCallCtor} from '../service_call';
import {logout} from './logout';

export function clientServiceCallCtor(prefix: string) {
  const sc = serviceCallCtor(prefix);
  sc.register('logout', logout, authz.anyUser);
  return sc.call;
}
