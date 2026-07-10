import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({ region: process.env.AWS_REGION });

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const filename = `podcast-${Date.now()}.mp3`;

  const command = new PutObjectCommand({
    Bucket: process.env.REMOTION_BUCKET,
    Key: `sites/podcast-video/public/${filename}`,
    ContentType: 'audio/mpeg',
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

  return Response.json({ uploadUrl, filename });
}