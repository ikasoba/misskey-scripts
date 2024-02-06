import { readFile } from "fs/promises";
import YAML from "yaml";

export interface MisskeyConfig {
  url: string;
  port: number;
  db: {
    host: string;
    port: number;
    db: string;
    user: string;
    pass: string;
  };
}

export async function loadMisskeyConfiguration(path: string) {
  return YAML.parse(await readFile(path, "utf-8")) as MisskeyConfig;
}
