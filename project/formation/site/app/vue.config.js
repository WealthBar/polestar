const fs = require('fs');
const path = require('path');

const cwd = process.cwd();

const mcwd = cwd.match(/project\/(?<domain>[^/]+)\/site\/(?<subdomain>[^/]+)/);
if (!mcwd) {
  throw new Error(`invalid cwd: ${cwd}`);
}

const host = `${mcwd.groups.subdomain}.${mcwd.groups.domain}.${process.env.HOST_POSTFIX}`;
const port = +((fs.readFileSync('.port', "utf-8")).split(/[\n\r]/)?.[0]);
if (!port) {
  throw new Error(`invalid .port file`);
}

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
      const pjpath = path.join('node_modules', dest, 'package.json');
      const pj = require(pjpath);
      const main = pj['main'];
      if (main) {
        const mainFile = path.resolve(path.join('node_modules', dest, main));
        const modules = path.resolve(path.join('node_modules', dest, 'node_modules'));
        linkAliases[p.name] = mainFile;
        linkModules.push(modules);
      }
    }
  }
}

console.log(JSON.stringify(linkAliases, undefined, 2));

module.exports = {
  devServer: {
    host,
    port,
    disableHostCheck: true,
  },
  configureWebpack: {
    resolve: {
      symlinks: false,
      alias: linkAliases,
      modules: [
        path.resolve('./node_modules'),
        ...linkModules
      ]
    },
  }
};
