import "dotenv/config";
import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";

const { R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_ENDPOINT } =
  process.env;

const s3 = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

export default async function clearBucketPrefix(prefix) {
  console.log(
    `🧹 Deleting all objects in "${prefix}" from bucket "${R2_BUCKET}"\n`
  );

  try {
    let isTruncated = true;
    let continuationToken = undefined;
    let totalDeleted = 0;

    while (isTruncated) {
      const listParams = {
        Bucket: R2_BUCKET,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      };

      const listResponse = await s3.send(new ListObjectsV2Command(listParams));
      const objects = (listResponse.Contents || []).map((obj) => ({
        Key: obj.Key,
      }));

      if (objects.length > 0) {
        const deleteParams = {
          Bucket: R2_BUCKET,
          Delete: { Objects: objects },
        };

        await s3.send(new DeleteObjectsCommand(deleteParams));
        totalDeleted += objects.length;
        console.log(`🗑️  Deleted ${objects.length} objects...`);
      }

      isTruncated = listResponse.IsTruncated;
      continuationToken = listResponse.NextContinuationToken;
    }

    console.log(`✅ Finished. Total deleted: ${totalDeleted} from "${prefix}"`);
  } catch (err) {
    console.error("❌ Failed to clear prefix:", err.message);
  }
}
