import * as http from 'http';
import * as Koa from 'koa';
import * as Router from 'koa-router';
import * as bodyParser from 'koa-bodyparser';
import * as passport from 'koa-passport';
import * as WebSocket from 'ws';

import {main} from '../../../../libs/script/src/main';
import {session} from '../../../../libs/backend/src/middleware/session/session';
import {requestId} from '../../../../libs/backend/src/middleware/request_id/request_id';
import {authCtor, authInstaller} from '../../../../libs/backend/src/middleware/auth';
import {user} from '../../../../libs/backend/src/middleware/user/user';
import {db} from '../../../../libs/backend/src/middleware/db/db';
import {urlPathAuthz} from '../../../../libs/backend/src/middleware/url_path_authz/url_path_authz';
import {authz} from '../../../../libs/backend/src/authz';
import {clientServiceCallCtor} from '../../../../libs/backend/src/service_call';
import {cancellationTokenCtor} from '../../../../libs/agnostic/src/cancellation_token';
import {sessionInfo} from '../../../../libs/backend/src/session_info';
import {getSettings} from './settings';

import {logout} from '../../../../libs/backend/src/service_call/logout';
import debugCtor = require('debug');
import {rpc} from './rpc';

const debug = debugCtor('api');

/* everything here is bootstrap code so the whole file is excluded from coverage. */

/* eslint-disable no-console */
process.on('unhandledRejection', (error: Error) => {
  console.error(`unhandledRejection: ${error}`, error.stack);
});

async function server(): Promise<any> {
  const settings = await getSettings();
  const app = new Koa();
  app.use(requestId);
  app.use(session.middleware);
  await authInstaller(passport);
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(authCtor(passport).middleware);
  app.use(db.middleware);
  app.use(user.middleware);
  app.use(urlPathAuthz('/api/client/service/', authz.anyUser));
  app.use(bodyParser());

  const clientRouter = new Router();
  const clientCall = clientServiceCallCtor('/api/client/service/');
  clientRouter.get('/service/*', clientCall);
  clientRouter.post('/service/*', clientCall);

  const router = new Router({prefix: '/api'});

  router.use('/client', clientRouter.routes(), clientRouter.allowedMethods());
  router.get('/sessionInfo', sessionInfo);
  router.post('/sessionInfo', sessionInfo);

  app.use(router.routes());
  app.use(router.allowedMethods());

  const appCallback = app.callback();
  const server = http.createServer(appCallback);

  const port = +(process.env.PORT || '3100');
  const host = process.env.HOST || '127.0.0.1';

  setTimeout(() => {
    console.log(`listening on http://${host}:${port}/`);
  }, 2000);

  const ct = cancellationTokenCtor();

  server.listen(port, host);

  const projectHost = (settings.projectUrl.match(/^https?:\/*(?<host>[^\/]+)/))?.groups?.host || '-';
  debug('projectHost=%s', projectHost);
  function verifyClient(info: { origin: string; secure: boolean; req: http.IncomingMessage }) {
    const m = info.origin.match(
      /^https?:\/\/(?<host>[^\/]+)/i,
    );
    if (m?.groups) {
      const host = m.groups.host;
      debug('ws connection from: %s', host);

      if (host.startsWith('localhost')
        || host.startsWith('127.0.0.1')
        || host.startsWith(projectHost)) {
        return true;
      }
    }
    return true;
  }

  const wsServer: WebSocket.Server = new WebSocket.Server({
    server,
    path: '/api/rpc',
    verifyClient,
    backlog: 32,
  });

  rpc.init(wsServer, ct);

  function onStop() {
    console.log('stopping...');
    ct.requestCancellation();
  }

  process.on('SIGTERM', onStop);
  process.on('SIGINT', onStop);

  await ct.waitForCancellation();
}

main(server);
