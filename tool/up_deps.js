// node ~/work/polestar/tool/up_deps.js | sh

const pj = require(`${process.cwd()}/package.json`);

const dds = [];
const ds = [];

if (pj.devDependencies) {
  for (const dd of Object.entries(pj.devDependencies)) {
    if (dd[1].startsWith('link')) {
      continue;
    }
    dds.push(dd[0]);
  }
}

if (pj.devDependencies) {
  for (const dd of Object.entries(pj.dependencies)) {
    if (dd[1].startsWith('link')) {
      continue;
    }

    ds.push(dd[0]);
  }
}

console.log(`yarn add -D ${dds.join(' ')}`);
console.log(`yarn add ${ds.join(' ')}`);
