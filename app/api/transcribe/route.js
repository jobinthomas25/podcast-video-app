import { AssemblyAI } from 'assemblyai';
import { renderMediaOnLambda } from '@remotion/lambda/client';

export async function POST(request) {
  try {
    const body = await request.json();
    const { filename, title } = body;

    const audioUrl = `https://${process.env.REMOTION_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/sites/podcast-video/public/${filename}`;

    const client = new AssemblyAI({ apiKey: process.env.ASSEMBLYAI_API_KEY });
    const transcript = await client.transcripts.transcribe({
      audio: audioUrl,
      auto_chapters: true,
      punctuate: true,
    });

    const segments = [];
if (transcript.words && transcript.words.length > 0) {
  let current = null;
  for (const word of transcript.words) {
    if (!current) {
      current = { text: word.text, start: word.start, end: word.end };
    } else if (word.start - current.end > 1000 || current.text.split(' ').length >= 12) {
      segments.push(current);
      current = { text: word.text, start: word.start, end: word.end };
    } else {
      current.text += ' ' + word.text;
      current.end = word.end;
    }
  }
  if (current) segments.push(current);
}

    console.log('First segment:', JSON.stringify(segments[0]));

    const autoChapters = transcript.chapters ? transcript.chapters.map(ch => ({
      title: ch.gist,
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