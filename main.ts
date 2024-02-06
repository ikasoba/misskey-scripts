#!/usr/bin/env node

import knex from "knex";
import { loadMisskeyConfiguration } from "./configs/index.js";
import resolveBrokenAvatars from "./scripts/resolveBrokenAvatars.js";
import { bindContext } from "./utils/DI.js";
import { TaskQueue } from "./utils/TaskQueue.js";
import { FetchWorker } from "./utils/FetchWorker.js";
import path from "path";
import deleteNonExistentFiles from "./scripts/deleteNonExistentFiles.js";
import deleteBrokenEmojis from "./scripts/deleteBrokenEmojis.js";

const args = process.argv.slice(2);

const configPath = args[0];
const config = await loadMisskeyConfiguration(configPath);

const taskQueue = new TaskQueue();

const scriptContext = {
  miConfig: config,
  miConfigDirectory: path.dirname(configPath),
  knex: knex({
    client: "pg",
    connection: {
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.pass,
      database: config.db.db,
    },
  }),
  taskQueue,
  fetchWorker: new FetchWorker(),
};

const scripts: Record<string, () => Promise<void>> = {
  resolveBrokenAvatars: bindContext(resolveBrokenAvatars, scriptContext),
  deleteNonExistentFiles: bindContext(deleteNonExistentFiles, scriptContext),
  deleteBrokenEmojis: bindContext(deleteBrokenEmojis, scriptContext),
};

const scriptName = args[1];

if (scriptName in scripts) {
  taskQueue.push("Run Script", () => scripts[scriptName]());
} else {
  console.log("scripts:\n  - " + Object.keys(scripts).join("\n  - "));

  process.exit(1);
}

await taskQueue.start();

await scriptContext.knex.destroy();
