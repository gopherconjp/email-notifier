import { writeFileSync } from "node:fs";

import { loadConfig } from "./load-config.ts";

const DEV_VARS_PATH = ".dev.vars";

const dotenvLine = (key: string, value: string): string => `${key}='${value}'`;

const main = (): void => {
  const secrets = loadConfig();

  const contents =
    [
      dotenvLine("DISCORD_WEBHOOK_MAP", secrets.DISCORD_WEBHOOK_MAP),
      dotenvLine("FORWARD_EMAIL_DOMAIN", secrets.FORWARD_EMAIL_DOMAIN),
    ].join("\n") + "\n";
  writeFileSync(DEV_VARS_PATH, contents, { mode: 0o600 });

  console.log(`Wrote ${DEV_VARS_PATH} from .env.yaml.`);
};

main();
