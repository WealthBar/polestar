import {wsCtor} from 'ts_browser';

export const deps = {window};

function wsHostName(): string {
  return deps.window.location.hostname.replace('app.','api.');
}

export const ws = wsCtor(wsHostName());
