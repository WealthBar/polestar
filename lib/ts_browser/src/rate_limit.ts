import {rateLimitCtor, rateLimitEmitLastCtor} from 'ts_agnostic';

export const rateLimit = rateLimitCtor(() => +Date.now(), window.setTimeout);
export const rateLimitEmitLast = rateLimitEmitLastCtor(() => +Date.now(), window.setTimeout);
