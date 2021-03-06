#!/usr/bin/env yarn ts-node
import {main} from "../../../../lib/script/src/main";
import * as debugCtor from "debug";
import * as fs from "fs";
import * as path from "path";
import * as pgPromise from "pg-promise";

const debug = debugCtor("db:migration");

const pgPromiseOptions = {
  query:
    (e) => {
      debug(
        "QUERY: ",
        e.query,
      );
      if (e.params) {
        debug(
          "PARAMS:",
          e.params,
        );
      }
    },
};
const pgp = pgPromise(pgPromiseOptions);
const databaseUrl = process.env.DB_URL;
const testDatabaseUrl = process.env.TEST_DB_URL;

main(async () => {
  if (!databaseUrl) {
    console.log("DB_URL environment variable must be set.");
    process.exit(-1);
  } else {
    console.log("Migrating db.");
    const db = pgp(databaseUrl);
    await doMigrations(db, fs, path);
  }
  if (testDatabaseUrl) {
    console.log("Migrating TEST db.");
    const db = pgp(testDatabaseUrl);
    await doMigrations(db, fs, path);
  }
});

async function doMigrations(db, fs, path) {
  await db.tx(async (db) => {
    const baseDataMigrationsDir = "./data/migrations/";
    const migrationsPresent = fs.readdirSync(baseDataMigrationsDir).filter((filename) => filename.endsWith(".sql"));
    if (migrationsPresent.length === 0) {
      return;
    }
    const notApplied = await db.any(
      `
SELECT x.id FROM unnest(ARRAY[$(migrationsPresent:csv)]) x(migration_identifier) 
LEFT JOIN meta.migration m 
ON x.migration_identifier = m.migration_identifier
WHERE m.migration_identifier IS NULL;`
      ,
      {
        migrationsPresent,
      },
    );
    for (const {id: migration_identifier} of notApplied) {
      const contents = fs.readFileSync(path.join(baseDataMigrationsDir, migration_identifier), "utf-8");
      try {
        await db.none(contents);
      } catch (e) {
        console.log(`${migration_identifier} not applied do to error:
${e}`);
        continue;
      }
      await db.none(`INSERT INTO meta.migration VALUES ($(migration_identifier))`, {id: migration_identifier});
    }
    if (process.env.DRY_RUN !== undefined) {
      throw new Error("Rollback");
    }
  });
}
