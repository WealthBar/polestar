/* eslint-disable no-console */
/* istanbul ignore file */

export const main = ((function mainCtor() {
  process.on(
    "unhandledRejection",
    (error: Error) => {
      /* istanbul ignore next */
      console.error(
        `unhandledRejection: ${error}`,
        error.stack,
      );
    },
  );
  return function main(f:()=>Promise<any>):void {
    (async function () {
      try {
        await f();
      } catch (e) {
        console.error(e);
        process.exit(-1);
      }
      console.log("done");
      process.exit(0);
    })();
  };
})());

