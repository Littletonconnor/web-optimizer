import { runCli } from "./cli";
import { logger } from "./logger";

async function main() {
  await runCli();
}

main().catch((err) => {
  logger.error(err);
});

export default main;
