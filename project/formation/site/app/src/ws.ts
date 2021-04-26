import {wsCtor} from 'ts_browser';

export const deps = {window};

function wsHostName(): string {
  const m = deps.window.location.hostname.toLowerCase().match(/(?<domain>[^.]+\.[^.]+$)/);
  return 'api.' + m?.groups?.domain;
}

export const ws = wsCtor(wsHostName());
