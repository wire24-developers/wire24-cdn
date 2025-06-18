import "dotenv/config";
import path from "path";
import fs from "fs/promises";
import {
  S3Client,
  ListObjectsV2Command,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

const {
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET,
  R2_ENDPOINT,
  CDN_BASE_URL,
  WIRE24_CDN_VERSION,
} = process.env;

const s3 = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

const OUTPUT_FILE = path.join("./assets/assets-manifest.json");

async function listAllKeys(prefix) {
  let keys = [];
  let continuationToken;

  do {
    const res = await s3.send(
      new ListObjectsV2Command({
        Bucket: R2_BUCKET,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      })
    );

    const chunk = (res.Contents || []).map((obj) => obj.Key);
    keys = keys.concat(chunk);
    continuationToken = res.IsTruncated ? res.NextContinuationToken : null;
  } while (continuationToken);

  return keys;
}

function parseIconFilename(filename) {
  const regex = /^(.+?)-([^-]+)-(\d+)-([a-f0-9]{8})\.(\w+)$/;
  const match = filename.match(regex);
  if (!match) return null;
  const [, name, color, size, hash, format] = match;
  return { name, color, size: parseInt(size), hash, format };
}

function parseImageFilename(filename) {
  const regex = /^(.+)-(\d+)-([a-f0-9]{8})\.(\w+)$/;
  const match = filename.match(regex);
  if (!match) return null;
  const [, name, size, hash, format] = match;
  return { name, size: parseInt(size), hash, format };
}

function parseFlagFilename(filename) {
  const svgMatch = filename.match(/^(.+)\.svg$/);
  const rasterMatch = filename.match(/^(.+)-(\d+)-([a-f0-9]{8})\.(\w+)$/);

  if (svgMatch) return { name: svgMatch[1], format: "svg" };
  if (rasterMatch) {
    const [, name, size, hash, format] = rasterMatch;
    return { name, size: parseInt(size), hash, format };
  }

  return null;
}

async function uploadManifestToCDN(buffer, filename) {
  const key = `${WIRE24_CDN_VERSION}/${filename}`;
  try {
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: "application/json",
      CacheControl: "no-cache", // For dev; change to immutable for prod
    });
    await s3.send(command);
    console.log(`✅ Uploaded manifest: ${CDN_BASE_URL}${key}`);
  } catch (err) {
    console.error(`❌ Failed to upload ${filename} to CDN:`, err);
  }
}

async function generateManifest() {
  try {
    // OPTIONAL: Wait for recent uploads to propagate
    console.log("⏳ Waiting briefly to ensure keys are indexed...");
    await new Promise((res) => setTimeout(res, 3000));

    const prefix = `${WIRE24_CDN_VERSION}/`;
    const keys = await listAllKeys(prefix);

    const images = {};
    const flags = {};
    const icons = {};

    for (const key of keys) {
      const url = `${CDN_BASE_URL}${key}`;
      const relative = key.replace(`${WIRE24_CDN_VERSION}/`, "");

      if (relative.startsWith("images/")) {
        const filename = relative.replace("images/", "");
        const meta = parseImageFilename(filename);
        if (!meta) continue;
        const { name, size, format } = meta;
        if (!images[name]) images[name] = [];
        images[name].push({ size, format, url });
      } else if (relative.startsWith("flags/")) {
        const filename = relative.replace("flags/", "");
        const meta = parseFlagFilename(filename);
        if (!meta) continue;
        const { name, size, format } = meta;
        if (!flags[name]) flags[name] = [];
        flags[name].push({ size, format, url });
      } else if (relative.startsWith("icons/")) {
        const parts = relative.split("/");
        if (parts.length !== 3) continue;

        const [, iconName, filename] = parts;
        const meta = parseIconFilename(filename);
        if (!meta) continue;

        const { color, size, format } = meta;
        if (!icons[iconName]) icons[iconName] = {};
        if (!icons[iconName][color]) icons[iconName][color] = [];
        icons[iconName][color].push({ size, format, url });
      }
    }

    const manifest = {
      version: WIRE24_CDN_VERSION,
      images: Object.entries(images).map(([name, variants]) => ({
        name,
        variants,
      })),
      flags: Object.entries(flags).map(([name, variants]) => ({
        name,
        variants,
      })),
      icons: Object.entries(icons).map(([name, colors]) => ({
        name,
        variants: Object.entries(colors).map(([color, assets]) => ({
          color,
          assets,
        })),
      })),
    };

    if (manifest.icons.length === 0) {
      console.warn("⚠️ Warning: No icons found in manifest. Skipping upload.");
      return;
    }

    const buffer = Buffer.from(JSON.stringify(manifest, null, 2), "utf8");

    // Write locally
    await fs.writeFile(OUTPUT_FILE, buffer);

    // Upload as timestamped + canonical
    const timestamped = `assets-manifest.${Date.now()}.json`;
    await uploadManifestToCDN(buffer, timestamped);
    await uploadManifestToCDN(buffer, "assets-manifest.json");
  } catch (err) {
    console.error("❌ Manifest generation failed:", err);
  }
}

generateManifest();
