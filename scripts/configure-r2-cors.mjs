import {
  GetBucketCorsCommand,
  PutBucketCorsCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const required = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
];

for (const name of required) {
  if (!process.env[name]) throw new Error(`Missing ${name}`);
}

const client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const Bucket = process.env.R2_BUCKET_NAME;
const appOrigin = process.env.APP_ORIGIN;
if (!appOrigin) throw new Error("Missing APP_ORIGIN");

await client.send(
  new PutBucketCorsCommand({
    Bucket,
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedOrigins: ["http://localhost:3000", appOrigin],
          AllowedMethods: ["GET", "HEAD", "PUT"],
          AllowedHeaders: ["Content-Type"],
          ExposeHeaders: ["ETag"],
          MaxAgeSeconds: 3600,
        },
      ],
    },
  }),
);

const configured = await client.send(new GetBucketCorsCommand({ Bucket }));
console.log(`Configured ${configured.CORSRules?.length ?? 0} CORS rule for ${Bucket}.`);
