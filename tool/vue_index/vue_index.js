/* eslint-disable @typescript-eslint/no-var-requires */

const fs = require('fs');
const p = require('path');

function readdirRecursiveSync(path, cb) {
  const files = fs.readdirSync(path);
  let stats;

  for (const file of files) {
    stats = fs.lstatSync(p.join(path, file));
    if (stats.isDirectory()) {
      readdirRecursiveSync(p.join(path, file), cb);
    } else {
      cb(p.join(path, file));
    }
  }
}

const dirs = [];
const dirFiles = {};
readdirRecursiveSync('./src', (file) => {
  if (file.endsWith('.vue')) {
    const dir = p.dirname(file);
    const fn = p.basename(file).replace(/\.vue$/i, '');
    if (!dirFiles[dir]) {
      dirFiles[dir] = [];
      dirs.push(dir);
    }
    dirFiles[dir].push(fn);
  }
});

function snakeToCamel(n) {
  return n.replace(/(_[a-z])/i, (m) => m[1].toUpperCase());
}

for (const dir of dirs) {
  const dfn = p.join(dir, 'index.ts');
  const fns = dirFiles[dir];
  const fnsC = fns.map(snakeToCamel);
  const contents
    = fns.map((f, i) => `import ${fnsC[i]}_ from "./${f}.vue";`).join("\n")
    + "\n\n"
    + fns.map((f, i) => `export const ${fnsC[i]} = ${fnsC[i]}_;`).join("\n")
    + "\n"
  ;
  fs.writeFileSync(dfn, contents);
}
