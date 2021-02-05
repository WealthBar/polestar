const fs = require('fs');

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

module.exports = {
  devServer: {
    host,
    port,
    disableHostCheck: true,
  },
};
