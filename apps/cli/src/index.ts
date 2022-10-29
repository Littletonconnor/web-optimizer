import { runCli } from "./cli";
import { logger } from "./logger";
import { renderTitle } from "./utils";

async function main() {
  renderTitle(!/-h|--help/.test(process.argv.join("")));

  await runCli();
}

main().catch((err) => {
  logger.error(err);
});

export default main;
