const HEALTH_URL = process.env.HEALTH_URL ?? "https://nuc-mcq-server.onrender.com/health";

export const handler = async () => {
  const start = Date.now();

  try {
    const res = await fetch(HEALTH_URL, { signal: AbortSignal.timeout(9_000) });
    const latencyMs = Date.now() - start;

    const log = {
      timestamp: new Date().toISOString(),
      statusCode: res.status,
      latencyMs,
      ok: res.ok,
    };

    console.log(JSON.stringify(log));

    return { statusCode: 200, body: JSON.stringify(log) };
  } catch (err) {
    const log = {
      timestamp: new Date().toISOString(),
      error: err.message,
      latencyMs: Date.now() - start,
    };

    console.error(JSON.stringify(log));

    return { statusCode: 500, body: JSON.stringify(log) };
  }
};
