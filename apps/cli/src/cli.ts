import { Command } from "commander";
import execa from "execa";
import { constants, promises as fs } from "fs";
import path from "path";
import sharp from "sharp";
import { ASSETS, DEVICE_SIZES } from "./constants";
import { logger } from "./logger";
import {
  getFileExtension,
  isAssetSupported,
  pluck,
  renderTitle,
} from "./utils";

const defaultOptions = {
  asset: "image",
  flags: {
    image: false,
    svg: false,
    video: false,
  },
};

async function getTransformer(filename: string) {
  const imageBuffer = await fs.readFile(filename);
  return sharp(imageBuffer);
}

export async function runCli() {
  const cliResults = defaultOptions;

  const program = new Command().name(renderTitle(false));

  program
    .description("A CLI for optimizing web assets")
    .argument("[asset]", "A space separated list of assets to optimize")
    .option("-o, --output <type>", "Directory to write the asset files to.")
    .option("-f, --format <type>", "Force output to a given format.")
    .option(
      "-s, --sizes <type>",
      "What width you would like to resize your image to.",
      DEVICE_SIZES
    )
    .option(
      "-d, --descriptor <x | w>",
      "What descriptor you would like to use for your image.",
      "w"
    )
    .option(
      "-q, --quality <type>",
      "What quality you would like to use for your image.",
      "75"
    )
    .option(
      "-b, --backup <type>",
      "If you want to create a backup file of the original asset (.bak). If false, the original file will be overwritten.",
      true
    )
    .option(
      "    --jsx <boolean>",
      "Whether to output JSX or optimize the svg.",
      false
    )
    .option(
      "    --crf <type>",
      "What Constant Rate Factor you would like to use for your video.",
      "23"
    )
    .parse(process.argv);

  const options = program.opts();
  const args = program.args;
  console.log("options", options);
  console.log("args", args);

  const assets = await parseAssets(program.args);
  console.log("assets", assets);

  // now that we have the assets parsed we need to check that all the required flags are set with those assets
  // throw warnings for default values
  const flags = await parseFlags(options);
  console.log("FLAGS", flags);

  if (flags.image) {
    optimizeImages(assets.image, flags.image);
  }
}

export async function parseAssets(filenames: string[]) {
  const assets: { svg: string[]; image: string[]; video: string[] } = {
    svg: [],
    image: [],
    video: [],
  };

  for (const filename of filenames) {
    try {
      await fs.access(filename, constants.F_OK);
      isAssetSupported(filename);

      const ext = getFileExtension(filename);

      if (ASSETS.image.includes(ext)) {
        assets.image.push(filename);
      }

      if (ASSETS.svg.includes(ext)) {
        assets.svg.push(filename);
      }

      if (ASSETS.video.includes(ext)) {
        assets.video.push(filename);
      }
    } catch (error: unknown) {
      logger.error(
        `[web-optimizer] ${filename} does not exist, or the file extension is not currently supported.`
      );
    }
  }

  return assets;
}

export async function parseFlags(options: Record<string, unknown>) {
  if (!options.output) {
    logger.info("No output directory specified, using current directory.");
  }

  return {
    image: await getImageFlags(options),
    svg: await getSvgFlags(options),
    video: await getVideoFlags(options),
  };
}

export async function getImageFlags(options: Record<string, unknown>) {
  const imageFlags: Record<string, unknown> = {};

  // info logging
  if (!options.quality) {
    logger.info(
      "[web-optimizer] No quality flag set, using default value of 75."
    );
    imageFlags.quality = 75;
  } else if (!options.descriptor) {
    logger.info(
      "[web-optimizer] No descriptor flag set, using pixel density descriptor."
    );
    imageFlags.descriptor = "w";
  } else if (!options.sizes) {
    logger.info(
      `[web-optimizer] No sizes flag set, using default value of ${DEVICE_SIZES}.`
    );
    imageFlags.sizes = DEVICE_SIZES;
  } else if (!options.format) {
    logger.info(
      '[web-optimizer] No format flag set, using default value of "jpeg".'
    );
    imageFlags.format = "jpeg";
  }

  // TODO: error logging

  return {
    ...imageFlags,
    ...pluck(options, "quality", "descriptor", "sizes", "format"),
  };
}

export async function getSvgFlags(options: Record<string, unknown>) {
  // TODO: info logging
  // TODO: error logging
}

export async function getVideoFlags(options: Record<string, unknown>) {
  // TODO: info logging
  // TODO: error logging
}

export async function optimizeImages(
  filenames: string[],
  flags: Record<string, unknown>
) {
  for (const filename of filenames) {
    const transformer = await getTransformer(filename);
    addBackup(filename);

    if (flags.descriptor === "w") {
      for (const width of DEVICE_SIZES) {
        const transformerClone = transformer.clone();
        const { width: metaWidth } = await transformerClone.metadata();

        if (metaWidth && metaWidth > Number(width)) {
          transformerClone.resize(Number(width));
          (transformerClone as any)[flags.format as string]({
            quality: Number(flags.quality),
          });

          const outputPath = path.join(
            flags.output as string,
            `${path.basename(
              filename,
              path.extname(filename)
            )}-${width}w${path.extname(filename)}`
          );

          await fs.mkdir(path.dirname(outputPath), { recursive: true });

          transformerClone.toFile(outputPath);
        }
      }
    }
  }
}

function addBackup(filename: string) {
  const parsedPath = path.parse(filename);
  execa("cp", [
    filename,
    `${parsedPath.dir}/${parsedPath.name}.bak${parsedPath.ext}`,
  ]);
}
