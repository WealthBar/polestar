const fs = require('fs');
const path = require('path');

const cwd = process.cwd();
const mcwd = cwd.match(/project\/(?<domain>[^/]+)\/site\/(?<subdomain>[^/]+)/);
if (!mcwd) {
  throw new Error(`invalid cwd: ${cwd}`);
}

const host = `${mcwd.groups.subdomain}.${mcwd.groups.domain}.local`;
const port = +((fs.readFileSync('.port', "utf-8")).split(/[\n\r]/)?.[0]);
if (!port) {
  throw new Error(`invalid .port file`);
}

// webpack is a steaming pile of shit that doesn't support linked packages
// this is a pile of hacks to make them "work".
//
// you'll have to run ./dev _twice_. The first time it'll fail (it tries to link the linked packages code).
// the second time it'll fetch from cache and not lint.
//

const linkAliases = {};
const linkModules = [];
{
  const d = fs.opendirSync('node_modules');
  for (; ;) {
    const p = d.readSync();
    if (!p) {
      break;
    }
    if (p.isSymbolicLink()) {
      const dest = fs.readlinkSync(path.join('node_modules', p.name));
      // TODO: this shouldn't assume 'dist'; it should read 'main' the package.json
      linkAliases[p.name] = path.resolve(path.join('node_modules', dest, 'dist'));
      linkModules.push(path.resolve(path.join('node_modules', dest, 'node_modules')));
    }
  }
}

module.exports = {
  devServer: {
    host,
    port,
    disableHostCheck: true,
  },
  configureWebpack: {
    resolve: {
      symlinks: false,
      alias:
        {
          ...linkAliases
        },
      modules: [
        path.resolve('./node_modules'),
        ...linkModules
      ]
    },
  }
};
