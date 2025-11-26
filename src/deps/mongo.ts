// deno-lint-ignore-file no-missing-import
import {
  Collection,
  Db,
  MongoClient,
} from "npm:mongodb@7.0.0";

export type Database = Db;
export { Collection, MongoClient };

