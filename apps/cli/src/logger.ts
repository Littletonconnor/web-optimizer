import chalk from "chalk";

export const logger = {
  error: (...args: unknown[]) => {
    console.log(chalk.red(...args));
    process.exit(1);
  },
  warn: (...args: unknown[]) => {
    console.log(chalk.yellow(...args));
  },
  info: (...args: unknown[]) => {
    console.log(chalk.cyan(...args));
  },
  success: (...args: unknown[]) => {
    console.log(chalk.cyan(...args));
  },
};
