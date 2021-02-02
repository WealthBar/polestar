#!/usr/bin/env ts-node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const readdir_recursive_sync_1 = require("lib_script/src/readdir_recursive_sync");
const main_1 = require("lib_script/src/main");
main_1.main(async () => {
    for (const f of readdir_recursive_sync_1.readdirRecursiveSync("src")) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3FsX3RvX3RzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL3NxbF90b190cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSx5QkFBeUI7QUFDekIsMEZBQW1GO0FBQ25GLHNEQUFpRDtBQUVqRCxXQUFJLENBQUMsS0FBSyxJQUFJLEVBQUU7SUFDZCxLQUFLLE1BQU0sQ0FBQyxJQUFJLDZDQUFvQixDQUFDLEtBQUssQ0FBQyxFQUFFO1FBQzNDLElBQUksQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQ3ZCLFNBQVM7U0FDVjtRQUNELGtCQUFrQjtRQUNsQixNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUN0QyxJQUFJLFFBQVEsR0FBVyxFQUFFLENBQUMsWUFBWSxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUNsRCxRQUFRLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDeEMsUUFBUSxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQzFDLEVBQUUsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRTtFQUM5QixRQUFROztDQUVULENBQUMsQ0FBQztLQUNBO0FBQ0gsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIjIS91c3IvYmluL2VudiB0cy1ub2RlXG5pbXBvcnQgKiBhcyBmcyBmcm9tIFwiZnNcIjtcbmltcG9ydCB7cmVhZGRpclJlY3Vyc2l2ZVN5bmN9IGZyb20gXCJjaWRpaHViX2xpYl9zY3JpcHQvc3JjL3JlYWRkaXJfcmVjdXJzaXZlX3N5bmNcIjtcbmltcG9ydCB7bWFpbn0gZnJvbSBcImNpZGlodWJfbGliX3NjcmlwdC9zcmMvbWFpblwiO1xuXG5tYWluKGFzeW5jICgpID0+IHtcbiAgZm9yIChjb25zdCBmIG9mIHJlYWRkaXJSZWN1cnNpdmVTeW5jKFwic3JjXCIpKSB7XG4gICAgaWYgKCFmLmVuZHNXaXRoKFwiLnNxbFwiKSkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIC8vIGNvbnNvbGUubG9nKGYpO1xuICAgIGNvbnN0IGcgPSBmLnJlcGxhY2UoL1xcLnNxbCQvLCBcIl9zcWxcIik7XG4gICAgbGV0IGNvbnRlbnRzOiBzdHJpbmcgPSBmcy5yZWFkRmlsZVN5bmMoZiwgXCJ1dGY4XCIpO1xuICAgIGNvbnRlbnRzID0gY29udGVudHMucmVwbGFjZShcImBcIiwgXCJcXFxcYFwiKTtcbiAgICBjb250ZW50cyA9IGNvbnRlbnRzLnJlcGxhY2UoXCIke1wiLCBcIlxcXFwke1wiKTtcbiAgICBmcy53cml0ZUZpbGVTeW5jKGAke2d9LnRzYCwgYGV4cG9ydCBjb25zdCB2YWx1ZSA9IFxcYFxuJHtjb250ZW50c31cblxcYDtcbmApO1xuICB9XG59KTtcbiJdfQ==
