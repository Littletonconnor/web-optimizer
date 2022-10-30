import { Command } from "commander";
import { transform } from "@svgr/core";
import execa from "execa";
import { constants, promises as fs } from "fs";
import path from "path";
import sharp from "sharp";
import { ASSETS, DEVICE_SIZES } from "./constants";
import { logger } from "./logger";
import { optimize } from "svgo";
import {
  camelCase,
  capitalize,
  getFileExtension,
  isAssetSupported,
  pluck,
  renderTitle,
} from "./utils";

export interface CliOptions {
  output: string;
  format: string;
  descriptor: string;
  sizes: string[];
  quality: string;
  jsx: boolean;
  crf: string;
}

async function getTransformer(filename: string) {
  const imageBuffer = await fs.readFile(filename);
  return sharp(imageBuffer);
}

export async function runCli() {
  const program = new Command().name(renderTitle());

  program
    .description("A CLI for optimizing web assets")
    .argument("[asset]", "A space separated list of assets to optimize")
    .option("-o, --output <type>", "Directory to write the asset files to.")
    .option("-f, --format <type>", "Force output to a given format.", "png")
    .option(
      "-s, --sizes <numbers...>",
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
    .option("    --jsx", "Whether to output JSX or optimize the svg.", false)
    .option(
      "    --crf <type>",
      "What Constant Rate Factor you would like to use for your video.",
      "23"
    )
    .addHelpText("after", "\nExamples: TODO")
    .parse(process.argv);

  const options: CliOptions = program.opts();

  const assets = await parseAssets(program.args);
  const flags = await parseFlags(options);

  if (assets.image.length > 0) {
    optimizeImages(assets.image, flags.image);
  }
  if (assets.svg.length > 0) {
    optimizeSvgs(assets.svg, flags.svg);
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

export async function parseFlags(options: CliOptions) {
  return {
    image: getImageFlags(options),
    svg: getSvgFlags(options),
    video: getVideoFlags(options),
  };
}

function getImageFlags(options: CliOptions) {
  if (Number(options.quality) < 0 || Number(options.quality) > 100) {
    logger.error("[web-optimizer] Quality must be between 0 and 100.");
  } else if (options.descriptor !== "x" && options.descriptor !== "w") {
    logger.error('[web-optimizer] Descriptor must be either "x" or "w".');
  } else if (invalidSizes(options.sizes)) {
    logger.error(
      "[web-optimizer] sizes must be a space separated list of numbers."
    );
  }

  return pluck(options, "quality", "descriptor", "sizes", "format");
}

function getSvgFlags(options: CliOptions) {
  return pluck(options, "jsx");
}

function getVideoFlags(options: CliOptions) {}

function invalidSizes(sizes: string[]) {
  sizes.forEach((size) => {
    if (isNaN(Number(size))) {
      return true;
    }
  });

  return false;
}

function transformToFormat(
  transformer: any,
  format: unknown,
  quality: unknown
) {
  const _format = format === "jpg" ? "jpeg" : (format as string);
  const _quality = Number(quality) as number;

  return transformer[_format]({
    quality: _quality,
  });
}

function addBackup(filename: string) {
  const parsedPath = path.parse(filename);
  execa("cp", [
    filename,
    `${parsedPath.dir}/${parsedPath.name}.bak${parsedPath.ext}`,
  ]);
}

async function optimizeImages(filenames: string[], flags: CliOptions) {
  for (const filename of filenames) {
    const transformer = await getTransformer(filename);
    if (!flags.output && flags.format === getFileExtension(filename)) {
      logger.info(
        "[web-optimizer] No output directory specified, using current directory and creating backups."
      );
      addBackup(filename);
    }

    const outputPath = path.join(
      (flags.output as string) || path.dirname(filename),
      `${path.basename(filename, path.extname(filename))}.${flags.format}`
    );

    const transformerClone = transformer.clone();

    transformToFormat(transformerClone, flags.format, flags.quality);

    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    transformerClone.toFile(outputPath);

    if (flags.descriptor === "w") {
      for (const width of flags.sizes) {
        const transformerClone = transformer.clone();
        const { width: metaWidth } = await transformerClone.metadata();

        if (metaWidth && metaWidth > Number(width)) {
          transformerClone.resize(Number(width));
          transformToFormat(transformerClone, flags.format, flags.quality);

          const outputPath = path.join(
            (flags.output as string) || path.dirname(filename),
            `${path.basename(filename, path.extname(filename))}-${width}w.${
              flags.format
            }`
          );

          transformerClone.toFile(outputPath);
        }
      }
    } else if (flags.descriptor === "x") {
      const transformerClone = transformer.clone();
      const { width, height } = await transformerClone.metadata();

      if (width && height) {
        transformerClone.resize(width * 2, height * 2);
        transformToFormat(transformerClone, flags.format, flags.quality);

        const outputPath = path.join(
          (flags.output as string) || path.dirname(filename),
          `${path.basename(filename, path.extname(filename))}@2x.${
            flags.format
          }`
        );

        transformerClone.toFile(outputPath);
      }
    }
  }
}

// TODO: (maybe) add jsxOutput flag?
async function optimizeSvgs(filenames: string[], flags: CliOptions) {
  for (const filename of filenames) {
    const svgString = await fs.readFile(filename, "utf8");
    const { data } = optimize(svgString, { multipass: true });
    const outputPath = path.join(
      flags.output || path.dirname(filename),
      `${path.basename(
        filename,
        path.extname(filename)
      )}.optimized${path.extname(filename)}`
    );
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, data);

    if (flags.jsx) {
      const componentName = capitalize(
        camelCase(path.basename(filename, ".svg"))
      );
      const svgString = await fs.readFile(filename, "utf8");
      const jsx = await transform(
        svgString,
        {
          plugins: [
            "@svgr/plugin-svgo",
            "@svgr/plugin-jsx",
            "@svgr/plugin-prettier",
          ],
          svgo: true,
          icon: false,
          // TODO: (maybe) optionally make this js or ts
          typescript: true,
          template: (variables, context) => {
            return context.tpl`
              ${variables.imports};

              ${variables.interfaces};

              function ${variables.componentName}(${variables.props}: Props): JSX.Element {
                return (
                  ${variables.jsx}
                )
              };

              ${variables.exports};
            `;
          },
        },
        { componentName }
      );

      const jsxOutputPath = path.join(
        flags.output || path.dirname(filename),
        `${path.basename(filename, path.extname(filename))}.tsx`
      );
      await fs.writeFile(jsxOutputPath, jsx);
    }
  }
}
