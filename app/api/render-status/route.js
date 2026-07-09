import { getRenderProgress } from '@remotion/lambda/client';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const renderId = searchParams.get('renderId');
  const bucketName = searchParams.get('bucketName');

  try {
    const progress = await getRenderProgress({
      renderId,
      bucketName,
      functionName: process.env.REMOTION_FUNCTION,
      region: process.env.AWS_REGION,
    });

    if (progress.done) {
      return Response.json({ done: true, url: progress.outputFile });
    }

    if (progress.fatalErrorEncountered) {
      return Response.json({ error: progress.errors[0]?.message || 'Render failed' });
    }

    return Response.json({ done: false, progress: progress.overallProgress });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}