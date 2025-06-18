#!/usr/bin/env node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import runPipeline from "../scripts/generate-image-assets.js";
import clearBucketPrefix from "../scripts/clear-bucket-prefix.js";
import boxen from "boxen";
import chalk from "chalk";

console.log(
  boxen(chalk.green.bold("Wire24 CDN CLI 🚀"), {
    padding: 1,
    borderColor: "green",
    margin: 1,
    dimBorder: true,
  })
);

const { argv } = yargs(hideBin(process.argv))
  .usage("Usage: wire24 [options]")
  .option("tag", {
    alias: "t",
    describe: "Specify CDN version tag (e.g. v5)",
    type: "string",
  })
  .option("dry", {
    alias: "d",
    describe: "Run pipeline in dry-run mode",
    type: "boolean",
    default: false,
  })
  .option("icons-only", {
    describe: "Only process and upload icons",
    type: "boolean",
    default: false,
  })
  .option("clear-all", {
    describe: "Clear all CDN assets under the provided --tag prefix",
    type: "boolean",
    default: false,
  })
  .help("h")
  .alias("h", "help")
  .example("wire24 --tag v5 --dry", "Dry-run upload for version v5")
  .example("wire24 --tag v5 --clear-all", "Delete all files under v5/")
  .wrap(100);

const { tag, dry, iconsOnly, clearAll } = argv;

(async () => {
  if (!tag) {
    console.error("❌ You must specify a version tag using --tag (e.g. v5)");
    process.exit(1);
  }

  if (clearAll) {
    await clearBucketPrefix(tag.endsWith("/") ? tag : `${tag}/`);
    return;
  }

  await runPipeline({
    versionOverride: tag,
    dryRun: dry,
    iconsOnly,
  });
})();
