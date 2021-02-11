#!/usr/bin/env node
import * as fs from "fs";
import {readdirRecursiveSync} from "node_script";
import {main} from "node_script";

main(async () => {
  for (const f of readdirRecursiveSync("src")) {
    if (!f.endsWith(".sql")) {
      continue;
    }
    // console.log(f);
    const g = f.replace(/\.sql$/, "_sql");
    let contents: string = fs.readFileSync(f, "utf8");
    contents = contents.replace("`", "\\`");
    contents = contents.replace("${", "\\${");
    fs.writeFileSync(`${g}.ts`, `export const value = \`
${contents}
\`;
`);
  }
});
