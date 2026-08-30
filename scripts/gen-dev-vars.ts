import { writeFileSync } from "node:fs";

import { loadConfig } from "./load-config.ts";

const DEV_VARS_PATH = ".dev.vars";

const dotenvLine = (key: string, value: string): string => `${key}='${value}'`;

const main = (): void => {
  const secrets = loadConfig();

  const contents =
    Object.entries(secrets)
      .map(([key, value]) => dotenvLine(key, value))
      .join("\n") + "\n";
  writeFileSync(DEV_VARS_PATH, contents, { mode: 0o600 });

  console.log(`Wrote ${DEV_VARS_PATH} from .env.yaml.`);
};

main();
