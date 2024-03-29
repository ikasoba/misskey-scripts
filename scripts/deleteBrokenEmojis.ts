import colors from "colors";
import { Knex } from "knex";
import fs from "fs";
import path from "path";
import timers from "timers/promises";
import { TypeOf, inject } from "../utils/DI.js";
import { TaskQueue } from "../utils/TaskQueue.js";
import { FetchWorker } from "../utils/FetchWorker.js";
import { MisskeyConfig } from "../configs/index.js";

export interface MiEmoji {
  id: string;
  name: string;
  host: string | null;
  publicUrl: string;
}

export default async function* deleteBrokenEmojis() {
  const knex = yield* inject("knex", TypeOf<Knex>);
  const queue = yield* inject("taskQueue", TypeOf<TaskQueue>);
  const fetchWorker = yield* inject("fetchWorker", TypeOf<FetchWorker>);
  const config = yield* inject("miConfig", TypeOf<MisskeyConfig>);

  const { fetch } = fetchWorker;

  const getEmojis = (
    offset: number,
    limit: number = parseInt(process.env["process_limit"] ?? "10")
  ) =>
    knex
      .select("*")
      .orderBy("id", "asc")
      .whereNotNull("host")
      .limit(limit)
      .offset(offset)
      .from("emoji")
      .then((x: MiEmoji[]) => x);

  const processedIds = new Set<string>();

  await queue.push(
    "Start delete broken emojis",
    async function processDelete(offset: number = 0): Promise<void> {
      const emojis = await getEmojis(offset);

      console.info("🏃 emojis count:", emojis.length, "offset:", offset);

      if (emojis.length <= 0) {
        return;
      }

      queue.push("Delete broken emojis", () =>
        processDelete(offset + emojis.length)
      );

      const emojiIds: string[] = [];
      for (const emoji of emojis) {
        if (processedIds.has(emoji.id) || emoji.host == null) continue;

        console.info(
          "👀 Check if emoji is broken -",
          "name:",
          colors.green(emoji.name),
          "host:",
          colors.green(emoji.host ?? "<null>"),
          "publicUrl:",
          colors.green(emoji.publicUrl)
        );

        const isBroken = await fetch(
          new URL(`./emojis/${emoji.name}@${emoji.host}.webp`, config.url),
          {
            redirect: "manual",
          }
        )
          .then((res) => !res.ok)
          .catch(() => true);

        if (isBroken) {
          emojiIds.push(emoji.id);
        }
      }

      if (emojiIds.length <= 0) return;

      await knex("emoji")
        .whereIn("id", emojiIds)
        .delete()
        .then(() => {
          console.info(`✅ ${emojiIds.length} emojis have been deleted.`);
        })
        .catch((err) => console.error(err));
    }
  );
}
