import colors from "colors";
import { TaskQueue } from "./TaskQueue.js";

import timers from "timers/promises";

export class FetchWorker {
  static threshold = parseInt(process.env["FetchWorker_threshold"] ?? "30000");

  private hosts: Map<string, { delay: number; lastUpdatedAt: number }> =
    new Map();

  fetch = (_url: URL | string, init?: RequestInit): Promise<Response> => {
    const url = new URL(_url);

    const info = this.hosts.get(url.hostname) ?? {
      delay: 0,
      lastUpdatedAt: Date.now(),
    };

    this.hosts.set(url.hostname, info);

    if (Date.now() - info.lastUpdatedAt >= FetchWorker.threshold) {
      info.delay =
        info.delay <= 1
          ? 1
          : info.delay -
            Math.round(
              (Date.now() - info.lastUpdatedAt) / FetchWorker.threshold
            );
    }

    info.delay += 1;
    info.lastUpdatedAt = Date.now();

    const delay = info.delay;

    console.info(
      `🌐👀 fetch requested - delay: ${colors.yellow(
        (2 ** delay).toString() + "s"
      )} method: ${colors.yellow(init?.method ?? "GET")} url: ${colors.green(
        url.toString()
      )}`
    );

    return timers.setTimeout(2 ** delay * 1000).then(() => {
      console.info(
        `🌐🏃 fetch started - method: ${colors.yellow(
          init?.method ?? "GET"
        )} url: ${colors.green(url.toString())}`
      );

      return fetch(url, init).then((res) => {
        console.info(
          "🌐✅ fetch end -",
          colors.green(url.toString()),
          "status:",
          res.status,
          "ok:",
          res.ok
        );

        return res;
      });
    });
  };
}
