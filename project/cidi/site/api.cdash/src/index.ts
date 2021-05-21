// istanbul ignore file
// -- bootstrap

import {main} from 'node_script';
import {settings} from './settings';
import {exitPromise, server} from 'node_core';
import {contentHandlerArray} from './content_handler';

main(async () => {
  await server(
    settings,
    contentHandlerArray
  );

  await exitPromise;
});
