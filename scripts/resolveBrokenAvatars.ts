import colors from "colors";
import { Knex } from "knex";
import { TypeOf, bindContext, inject } from "../utils/DI.js";
import { FetchWorker } from "../utils/FetchWorker.js";
import { TaskQueue } from "../utils/TaskQueue.js";
import { MisskeyConfig } from "../configs/index.js";

export interface User {
  id: string;
  username: string;
  host: string | null;
  avatarUrl: string | null;
  uri: string | null;
}

export async function* resolveAvatarFromUser(user: User) {
  if (user.avatarUrl == null || user.host == null || user.uri == null) return;

  const { fetch } = yield* inject("fetchWorker", TypeOf<FetchWorker>);

  const result = await fetch(user.uri, {
    headers: {
      Accept: "application/activity+json",
    },
  });

  if (!result.ok) return;

  const userObject: unknown = await result.json();
  if (typeof userObject != "object" || userObject == null) return;

  if (
    !("icon" in userObject) ||
    typeof userObject.icon != "object" ||
    userObject.icon == null
  )
    return;

  if (!("url" in userObject.icon) || typeof userObject.icon.url != "string")
    return;

  return userObject.icon.url;
}

export default async function* resolveBrokenAvatars() {
  const knex = yield* inject("knex", TypeOf<Knex>);
  const queue = yield* inject("taskQueue", TypeOf<TaskQueue>);
  const fetchWorker = yield* inject("fetchWorker", TypeOf<FetchWorker>);
  const config = yield* inject("miConfig", TypeOf<MisskeyConfig>);

  const { fetch } = fetchWorker;

  const bindedResolveAvatarFromUser = bindContext(resolveAvatarFromUser, {
    fetchWorker,
  });

  const getUsers = (
    offset: number,
    limit: number = parseInt(process.env["process_limit"] ?? "3")
  ) =>
    knex
      .select("*")
      .whereNotNull("host")
      .whereNotNull("avatarUrl")
      .orderBy("id", "asc")
      .limit(limit)
      .offset(offset)
      .from("user")
      .then((x: User[]) => x);

  const processedIds = new Set<string>();

  await queue.push(
    "Start script to resolve broken avatars",
    async function processResolve(offset: number = 0): Promise<void> {
      const users = await getUsers(offset);

      console.info("🏃 users count:", users.length, "offset:", offset);

      if (users.length <= 0) {
        process.exit(0);
      }

      queue.push("Resolve broken avatars", () =>
        processResolve(offset + users.length)
      );

      const fixedUsers = new Map<User, string>();

      for (const user of users) {
        if (
          processedIds.has(user.id) ||
          user.avatarUrl == null ||
          user.host == null ||
          user.uri == null
        )
          continue;

        processedIds.add(user.id);

        console.info(
          "👀 Check if avatar is broken -",
          "name:",
          colors.green(user.username),
          "host:",
          colors.green(user.host),
          "avatarUrl:",
          colors.green(user.avatarUrl)
        );

        const { ok: isSafe } = await fetch(user.avatarUrl);

        if (!isSafe) {
          console.info(
            "🛠 Resolve broken avatars remotely -",
            "name:",
            colors.green(user.username),
            "host:",
            colors.green(user.host)
          );

          const url = await bindedResolveAvatarFromUser(user);

          if (url == null) continue;

          console.info(
            "😋 Resolved avatar URL -",
            "name:",
            colors.green(user.username),
            "host:",
            colors.green(user.host),
            "url:",
            colors.green(url),
            "\n"
          );

          fixedUsers.set(user, url);
        }
      }

      await knex
        .transaction((trx) =>
          Promise.all(
            [...fixedUsers.entries()].map(([user, url]) => {
              const proxyUrl = new URL("./proxy/avatar.webp", config.url);

              proxyUrl.searchParams.set("avatar", "1");
              proxyUrl.searchParams.set("url", url);

              return trx("user")
                .update({
                  avatarUrl: proxyUrl.toString(),
                })
                .where("id", user.id)
                .limit(1);
            })
          )
        )
        .then((inserts) => {
          console.info(`✅ ${inserts.length} users have been updated.`);
        })
        .catch((err) => {
          console.error(err);
        });
    }
  );
}
