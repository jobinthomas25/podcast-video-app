import { AssemblyAI } from 'assemblyai';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { renderMediaOnLambda } from '@remotion/lambda/client';

const s3 = new S3Client({ region: process.env.AWS_REGION });

export async function POST(request) {
  try {
    const formData = await request.formData();
    const audio = formData.get('audio');
    const title = formData.get('title') || 'Episode';

    const bytes = await audio.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filename = `podcast-${Date.now()}.mp3`;
    const tmpPath = join(tmpdir(), filename);
    await writeFile(tmpPath, buffer);

    await s3.send(new PutObjectCommand({
      Bucket: process.env.REMOTION_BUCKET,
      Key: `sites/podcast-video/public/${filename}`,
      Body: buffer,
      ContentType: 'audio/mpeg',
    }));

    const client = new AssemblyAI({ apiKey: process.env.ASSEMBLYAI_API_KEY });
    const transcript = await client.transcripts.transcribe({
  audio: tmpPath,
  auto_chapters: true,
  punctuate: true,
});

    const segments = transcript.sentences ? transcript.sentences.map(s => ({
  text: s.text,
  start: s.start,
  end: s.end,
})) : [];
console.log('First 3 segments:', JSON.stringify(segments.slice(0, 3)));
    const autoChapters = transcript.chapters ? transcript.chapters.map(ch => ({
      title: ch.headline,
      start: Math.floor((ch.start / 1000) * 30),
      end: Math.floor((ch.end / 1000) * 30),
    })) : [];

    const { renderId, bucketName } = await renderMediaOnLambda({
      region: process.env.AWS_REGION,
      functionName: process.env.REMOTION_FUNCTION,
      serveUrl: `https://${process.env.REMOTION_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/sites/podcast-video/index.html`,
      composition: 'MyComp',
      inputProps: { segments, title, chapters: autoChapters, audioFile: filename },
      codec: 'h264',
      framesPerLambda: 200,
    });

    return Response.json({ renderId, bucketName, segments, title, chapters: autoChapters });
  } catch (err) {
    console.error(err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}