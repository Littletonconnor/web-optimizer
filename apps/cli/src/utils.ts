import { promises as fs, constants } from "fs";
import figlet from "figlet";
import { gradient, TITLE, ASSETS } from "./constants";
import { logger } from "./logger";

type AssetType = keyof typeof ASSETS;
type Asset = typeof ASSETS[AssetType][number];

export function renderTitle(log = true) {
  const title = gradient.multiline(figlet.textSync(TITLE, {}));
  if (log) {
    console.log(title);
  }

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

export function pluck(options: Record<string, unknown>, ...flags: string[]) {
  return flags.reduce(
    (acc: Record<string, unknown>, flag) => {
      if (options[flag]) {
        acc[flag] = options[flag];
      }

      return acc;
    },
    { output: options.output }
  );
}
