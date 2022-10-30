import { promises as fs, constants } from "fs";
import figlet from "figlet";
import { gradient, TITLE, ASSETS } from "./constants";
import { logger } from "./logger";
import { CliOptions } from "./cli";

type AssetType = keyof typeof ASSETS;
type Asset = typeof ASSETS[AssetType][number];

export function renderTitle() {
  const title = gradient.multiline(figlet.textSync(TITLE, {}));
  return `\n${title}\n`;
}

export function isAsset(ext: string): ext is Asset {
  return (
    Object.values(ASSETS)
      .flat()
      .includes(ext as Asset) !== undefined
  );
}

export function getFileExtension(filename: string) {
  const ext = filename.split(".").pop();
  if (!ext) {
    throw new Error(`File: [${filename}] does not have an extension.`);
  }
  return ext;
}

export function isAssetSupported(filename: string) {
  const ext = getFileExtension(filename);
  const isSupported = isAsset(ext);
  if (!isSupported) {
    throw new Error(`Asset ${filename} is not supported`);
  }

  return true;
}

export function pluck(options: CliOptions, ...flags: (keyof CliOptions)[]) {
  const initialState: Partial<CliOptions> = {
    output: options.output,
  };

  return flags.reduce((acc: any, flag) => {
    if (options[flag]) {
      acc[flag] = options[flag];
    }

    return acc;
  }, initialState);
}
