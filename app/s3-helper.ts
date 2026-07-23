import { PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { s3 } from "@/app/config";
import { AWS_BUCKET } from "@/app/constants";

export async function putObject(key: string, data: unknown) {
  await s3.send(new PutObjectCommand({
    Bucket: AWS_BUCKET,
    Key: key,
    Body: JSON.stringify(data),
    ContentType: "application/json",
  }));
}

export async function getObject(key: string) {
  const res = await s3.send(new GetObjectCommand({
    Bucket: AWS_BUCKET,
    Key: key,
  }));

  const body = await res.Body?.transformToString();
  return body ? JSON.parse(body) : null;
}

export async function listObjects(prefix: string) {
  const res = await s3.send(new ListObjectsV2Command({
    Bucket: AWS_BUCKET,
    Prefix: prefix,
  }));

  const items = await Promise.all(
    (res.Contents ?? []).map(async (obj) => {
      if (!obj.Key) return null;

      const file = await s3.send(new GetObjectCommand({
        Bucket: AWS_BUCKET,
        Key: obj.Key,
      }));

      const body = await file.Body?.transformToString();
      return body ? JSON.parse(body) : null;
    })
  );

  return items.filter(Boolean);
}

export async function deleteObject(key: string) {
  await s3.send(new DeleteObjectCommand({
    Bucket: AWS_BUCKET,
    Key: key,
  }));
}
