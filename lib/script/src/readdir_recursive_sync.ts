import * as fs from "fs";
import * as p from "path";

/* istanbul ignore file */

export const readdirRecursiveSync = function* readdirRecursiveSync(path) {
  const files = fs.readdirSync(path);
  let stats;

  for (const file of files) {

    stats = fs.lstatSync(p.join(path, file));
    if (stats.isDirectory()) {
      yield* readdirRecursiveSync(p.join(path, file));
    } else {
      yield p.join(path, file);
    }
  }
};
