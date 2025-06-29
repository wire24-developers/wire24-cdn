import "dotenv/config";
import path from "path";
import sharp from "sharp";
import fs from "fs/promises";
import fsSync from "fs";
import crypto from "crypto";
import pLimit from "p-limit";
import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import prettyMs from "pretty-ms";

const {
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET,
  R2_ENDPOINT,
  CDN_BASE_URL,
} = process.env;

const s3 = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

const sizes = [64, 128, 256, 512, 1024];
const formats = ["png", "webp", "avif"];
const concurrencyLimit = 5;
const limit = pLimit(concurrencyLimit);

const SUPPORTED_IMAGE_EXTENSIONS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".tiff",
  ".gif",
  ".svg",
];
const WIRE24_EXTENSION = ".w24";

const imagesPath = path.join("./assets/originals/images");
const flagsPath = path.join("./assets/originals/flags");
const iconsPath = path.join("./assets/originals/icons");
const iconsRedoPath = path.join("./assets/originals/icons/redo");
const iconColorsPath = path.join("./config/icon-colors.json");
const logsPath = path.join("./logs");

fsSync.mkdirSync(logsPath, { recursive: true });

let successfulUploads = 0;
let skippedFiles = 0;
let failedUploads = 0;
let failedConversions = 0;
const errorLog = [];

const generateHash = (buffer) =>
  crypto.createHash("sha256").update(buffer).digest("hex").slice(0, 8);

const objectExists = async (key) => {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
};

const uploadToR2 = async (buffer, key, contentType, dryRun) => {
  if (dryRun)
    return console.log(`(dry) ✅ Would upload: ${CDN_BASE_URL}${key}`);

  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    );
    successfulUploads++;
    console.log(`✅ Uploaded: ${CDN_BASE_URL}${key}`);
  } catch (err) {
    failedUploads++;
    errorLog.push(`❌ Upload failed: ${CDN_BASE_URL}${key}`);
  }
};

const determineNextVersion = async () => {
  const result = await s3.send(
    new ListObjectsV2Command({ Bucket: R2_BUCKET, Prefix: "v" })
  );
  const versions = (result.Contents || [])
    .map((obj) => obj.Key.split("/")[0])
    .filter((prefix) => /^v\d+$/.test(prefix))
    .map((v) => parseInt(v.substring(1)))
    .sort((a, b) => b - a);
  const nextVersion = versions.length === 0 ? 1 : versions[0] + 1;
  console.log("🔨 Ready to upload assets to CDN!\n");
  console.log(`🔢 CDN Version: v${nextVersion}\n`);
  return `v${nextVersion}`;
};

const processImageFile = async (file, version, basePath, dryRun, type) => {
  const inputPath = path.join(basePath, file);
  const baseName = path.parse(file).name;
  const ext = path.extname(file).toLowerCase();

  if (
    !SUPPORTED_IMAGE_EXTENSIONS.includes(ext) ||
    file.endsWith(WIRE24_EXTENSION)
  )
    return;

  try {
    for (const size of sizes) {
      for (const format of formats) {
        const buffer = await sharp(inputPath)
          .resize(size)
          .toFormat(format)
          .toBuffer();

        const hash = generateHash(buffer);
        const key = `${version}/${type}/${baseName}-${size}-${hash}.${format}`;
        const contentType = `image/${format === "jpg" ? "jpeg" : format}`;
        const exists = await objectExists(key);

        if (!exists) {
          await uploadToR2(buffer, key, contentType, dryRun);
        } else {
          skippedFiles++;
        }
      }
    }

    if (!dryRun) {
      await fs.rename(inputPath, inputPath + WIRE24_EXTENSION);
    }
  } catch (err) {
    failedConversions++;
    errorLog.push(`❌ Failed to convert: ${file}`);
  }
};

const flattenIconColors = async () => {
  const map = JSON.parse(await fs.readFile(iconColorsPath, "utf-8"));
  const flattened = [];
  for (const [group, colors] of Object.entries(map)) {
    for (const [name, hex] of Object.entries(colors)) {
      flattened.push({ slug: `${group}-${name}`, hex });
    }
  }
  return flattened;
};

const processRedoIcons = async (version, dryRun) => {
  const icons = await fs.readdir(iconsRedoPath);
  const colorVariants = await flattenIconColors();
  // const iconPath = isFullPath ? file : path.join(iconsPath, file);

  const redoTasks = icons
    .filter((f) => f.endsWith(".svg") && !f.endsWith(WIRE24_EXTENSION))
    .map((f) =>
      limit(() =>
        processIconFile(
          path.join("redo", f),
          version,
          dryRun,
          colorVariants,
          false
        )
      )
    );

  await Promise.all(redoTasks);
};

const processIconFile = async (
  file,
  version,
  dryRun,
  colorVariants,
  isFullPath = false
) => {
  const iconPath = isFullPath
    ? path.join(iconsPath, file)
    : path.join(iconsPath, file);
  const iconName = path.parse(file).name;
  const originalSvg = await fs.readFile(iconPath, "utf8");

  for (const { slug: colorSlug, hex } of colorVariants) {
    try {
      const needsBackground = hex.toLowerCase() === "#ffffff";
      const styledSvg = originalSvg.replace(
        /<svg([^>]*)>/,
        `<svg$1>
    ${
      needsBackground ? '<rect width="100%" height="100%" fill="#000000"/>' : ""
    }
    <style>
      * { fill: none; stroke: ${hex}; stroke-width: 2; }
    </style>`
      );

      const svgHash = generateHash(Buffer.from(styledSvg));
      const svgKey = `${version}/icons/${iconName}/${iconName}-${colorSlug}-${svgHash}.svg`;

      if (!(await objectExists(svgKey))) {
        await uploadToR2(
          Buffer.from(styledSvg),
          svgKey,
          "image/svg+xml",
          dryRun
        );
      } else {
        skippedFiles++;
      }

      const bufferForConversion = await sharp(Buffer.from(styledSvg))
        .resize(1024)
        .png()
        .toBuffer();

      for (const size of sizes) {
        for (const format of formats) {
          const resized = await sharp(bufferForConversion)
            .resize(size)
            .toFormat(format)
            .toBuffer();
          const hash = generateHash(resized);
          const key = `${version}/icons/${iconName}/${iconName}-${colorSlug}-${size}-${hash}.${format}`;
          const contentType = `image/${format === "jpg" ? "jpeg" : format}`;
          const exists = await objectExists(key);

          if (!exists) {
            await uploadToR2(resized, key, contentType, dryRun);
          } else {
            skippedFiles++;
          }
        }
      }
    } catch {
      failedConversions++;
      errorLog.push(`❌ Icon conversion failed: ${iconName} (${colorSlug})`);
    }
  }

  if (!dryRun) {
    await fs.rename(iconPath, iconPath + WIRE24_EXTENSION);
  }
};

const processAssetsInParallel = async (version, dryRun) => {
  const [images, flags, icons, colorVariants] = await Promise.all([
    fs.readdir(imagesPath),
    fs.readdir(flagsPath),
    fs.readdir(iconsPath),
    flattenIconColors(),
  ]);

  const flagTasks = flags.map((file) =>
    limit(() => processImageFile(file, version, flagsPath, dryRun, "flags"))
  );

  const imageTasks = images.map((file) =>
    limit(() => processImageFile(file, version, imagesPath, dryRun, "images"))
  );
  const iconTasks = icons
    .filter((file) => file.endsWith(".svg") && !file.endsWith(WIRE24_EXTENSION))
    .map((file) =>
      limit(() => processIconFile(file, version, dryRun, colorVariants))
    );

  await Promise.all([...imageTasks, ...flagTasks, ...iconTasks]);
};

const writeLogs = () => {
  const logFile = path.join(logsPath, `upload-log-${Date.now()}.txt`);
  const summary = `
✅ Successful Uploads: ${successfulUploads}
⏩ Skipped Existing: ${skippedFiles}
❌ Failed Conversions: ${failedConversions}
❌ Upload Errors: ${failedUploads}
`;

  const errorDetails = errorLog.length
    ? "\n--- Error Details ---\n" + errorLog.join("\n")
    : "\n✅ No errors logged.\n";

  fsSync.writeFileSync(logFile, summary + errorDetails, "utf8");
  console.log(summary);
  console.log("📝 Log file saved to", logFile);
};

export default async function runPipeline({
  versionOverride,
  dryRun = false,
  iconsOnly = false,
  flagsOnly = false,
  redoOnly = false,
} = {}) {
  const version = versionOverride || (await determineNextVersion());
  const start = Date.now();

  if (iconsOnly) {
    const icons = await fs.readdir(iconsPath);
    const colorVariants = await flattenIconColors();
    const iconTasks = icons
      .filter((f) => f.endsWith(".svg") && !f.endsWith(WIRE24_EXTENSION))
      .map((f) =>
        limit(() => processIconFile(f, version, dryRun, colorVariants))
      );
    await Promise.all(iconTasks);
  } else if (flagsOnly) {
    const flags = await fs.readdir(flagsPath);

    const flagTasks = flags.map((file) =>
      limit(() => processImageFile(file, version, flagsPath, dryRun, "flags"))
    );
    await Promise.all(flagTasks);
  } else if (redoOnly) {
    await processRedoIcons(version, dryRun);
  } else {
    await processAssetsInParallel(version, dryRun);
  }

  const end = Date.now();
  console.log(`\n🚀 Pipeline completed in ${prettyMs(end - start)}\n`);
  writeLogs();
}
