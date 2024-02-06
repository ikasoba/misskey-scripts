import colors from "colors";
import { Knex } from "knex";
import fs from "fs/promises";
import { TypeOf, bindContext, inject } from "../utils/DI.js";
import { FetchWorker } from "../utils/FetchWorker.js";
import { TaskQueue } from "../utils/TaskQueue.js";
import { MisskeyConfig } from "../configs/index.js";
import path from "path";

export interface MiFile {
  id: string;
  name: string;
  url: string;
  storedInternal: boolean;
}

export default async function* deleteNonExistentFiles() {
  const knex = yield* inject("knex", TypeOf<Knex>);
  const queue = yield* inject("taskQueue", TypeOf<TaskQueue>);
  const miConfigDirectory = yield* inject("miConfigDirectory", TypeOf<string>);

  const filesRoot = path.join(miConfigDirectory, "../files");

  const getFiles = (
    offset: number,
    limit: number = parseInt(process.env["process_limit"] ?? "10")
  ) =>
    knex
      .select("*")
      .andWhere("storedInternal", true)
      .orderBy("id", "asc")
      .limit(limit)
      .offset(offset)
      .from("drive_file")
      .then((x: MiFile[]) => x);

  const processedIds = new Set<string>();

  await queue.push(
    "Start delete non-existent files",
    async function processResolve(offset: number = 0): Promise<void> {
      const files = await getFiles(offset);

      console.info("🏃 files count:", files.length, "offset:", offset);

      if (files.length <= 0) {
        return;
      }

      queue.push("Delete non-existent files", () =>
        processResolve(offset + files.length)
      );

      const fileIds: string[] = [];

      for (const file of files) {
        if (processedIds.has(file.id)) continue;

        processedIds.add(file.id);

        console.info(
          "👀 Check file existence -",
          "name:",
          colors.green(file.name),
          "url:",
          colors.green(file.url)
        );

        const fileName = new URL(file.url).pathname.match(
          /files\/([^\/]+)\/?$/
        )?.[1];
        if (fileName) {
          const isNonExistentFile = await fs
            .access(path.join(filesRoot, fileName))
            .catch((err) => err?.code == "ENOENT")
            .then(() => false);

          if (!isNonExistentFile) continue;
        }

        fileIds.push(file.id);
      }

      if (fileIds.length == 0) return;

      await knex("drive_file")
        .whereIn("id", fileIds)
        .delete()
        .then(() => {
          console.info(`✅ ${fileIds.length} files have been updated.`);
        })
        .catch((err) => console.error(err));
    }
  );
}
