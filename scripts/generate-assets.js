import "dotenv/config";
import path from "path";
import sharp from "sharp";
import fs from "fs";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// Load env vars
const {
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET,
  R2_ENDPOINT,
  CDN_BASE_URL,
} = process.env;

// Initialize AWS S3 client with R2 endpoint
const s3 = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

// Configurations
const sizes = [64, 128, 256, 512, 1024];
const formats = ["png", "webp", "avif"];

const originalsPath = path.join("./assets/originals");

const uploadToR2 = async (buffer, key, contentType) => {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  await s3.send(command);
  console.log(`✅ Uploaded: ${CDN_BASE_URL}${key}`);
};

(async () => {
  const files = fs.readdirSync(originalsPath);

  for (const file of files) {
    const inputPath = path.join(originalsPath, file);
    const baseName = path.parse(file).name;

    for (const size of sizes) {
      for (const format of formats) {
        const buffer = await sharp(inputPath)
          .resize(size)
          .toFormat(format)
          .toBuffer();

        const key = `v1/${baseName}/${baseName}-${size}.${format}`;
        const contentType = `image/${format === "jpg" ? "jpeg" : format}`;

        await uploadToR2(buffer, key, contentType);
      }
    }
  }
})();
