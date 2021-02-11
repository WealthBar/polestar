#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const node_script_1 = require("node_script");
const node_script_2 = require("node_script");
node_script_2.main(async () => {
    for (const f of node_script_1.readdirRecursiveSync("src")) {
        if (!f.endsWith(".sql")) {
            continue;
        }
        // console.log(f);
        const g = f.replace(/\.sql$/, "_sql");
        let contents = fs.readFileSync(f, "utf8");
        contents = contents.replace("`", "\\`");
        contents = contents.replace("${", "\\${");
        fs.writeFileSync(`${g}.ts`, `export const value = \`
${contents}
\`;
`);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3FsX3RvX3RzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL3NxbF90b190cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSx5QkFBeUI7QUFDekIsNkNBQWlEO0FBQ2pELDZDQUFpQztBQUVqQyxrQkFBSSxDQUFDLEtBQUssSUFBSSxFQUFFO0lBQ2QsS0FBSyxNQUFNLENBQUMsSUFBSSxrQ0FBb0IsQ0FBQyxLQUFLLENBQUMsRUFBRTtRQUMzQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUN2QixTQUFTO1NBQ1Y7UUFDRCxrQkFBa0I7UUFDbEIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDdEMsSUFBSSxRQUFRLEdBQVcsRUFBRSxDQUFDLFlBQVksQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDbEQsUUFBUSxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3hDLFFBQVEsR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztRQUMxQyxFQUFFLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUU7RUFDOUIsUUFBUTs7Q0FFVCxDQUFDLENBQUM7S0FDQTtBQUNILENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiIyEvdXNyL2Jpbi9lbnYgbm9kZVxuaW1wb3J0ICogYXMgZnMgZnJvbSBcImZzXCI7XG5pbXBvcnQge3JlYWRkaXJSZWN1cnNpdmVTeW5jfSBmcm9tIFwibm9kZV9zY3JpcHRcIjtcbmltcG9ydCB7bWFpbn0gZnJvbSBcIm5vZGVfc2NyaXB0XCI7XG5cbm1haW4oYXN5bmMgKCkgPT4ge1xuICBmb3IgKGNvbnN0IGYgb2YgcmVhZGRpclJlY3Vyc2l2ZVN5bmMoXCJzcmNcIikpIHtcbiAgICBpZiAoIWYuZW5kc1dpdGgoXCIuc3FsXCIpKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgLy8gY29uc29sZS5sb2coZik7XG4gICAgY29uc3QgZyA9IGYucmVwbGFjZSgvXFwuc3FsJC8sIFwiX3NxbFwiKTtcbiAgICBsZXQgY29udGVudHM6IHN0cmluZyA9IGZzLnJlYWRGaWxlU3luYyhmLCBcInV0ZjhcIik7XG4gICAgY29udGVudHMgPSBjb250ZW50cy5yZXBsYWNlKFwiYFwiLCBcIlxcXFxgXCIpO1xuICAgIGNvbnRlbnRzID0gY29udGVudHMucmVwbGFjZShcIiR7XCIsIFwiXFxcXCR7XCIpO1xuICAgIGZzLndyaXRlRmlsZVN5bmMoYCR7Z30udHNgLCBgZXhwb3J0IGNvbnN0IHZhbHVlID0gXFxgXG4ke2NvbnRlbnRzfVxuXFxgO1xuYCk7XG4gIH1cbn0pO1xuIl19