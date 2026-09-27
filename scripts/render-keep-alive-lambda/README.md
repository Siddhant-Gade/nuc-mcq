# Render Keep-Alive Lambda

Pings `https://nuc-mcq-server.onrender.com/health` every 10 minutes to prevent Render's free-tier cold starts.

## Deploy (AWS Console — 5 steps)

1. **Create function** → Lambda → "Create function" → Author from scratch
   - Name: `render-keep-alive`
   - Runtime: **Node.js 22.x**
   - Click "Create function"

2. **Paste code** → In the inline editor, replace `index.mjs` contents with the file in this folder. Handler: `index.handler`

3. **Optional env var** → Configuration → Environment variables → Add `HEALTH_URL` if you ever change the endpoint (defaults are baked in as fallback).

4. **Add trigger** → Add trigger → **EventBridge (CloudWatch Events)**
   - Rule: Create new → Schedule expression → `rate(10 minutes)`

5. **Test** → Test tab → any event payload → should return `statusCode: 200` and log `{"ok":true, "latencyMs":...}` in CloudWatch Logs.

## CloudWatch Logs

Monitor at **CloudWatch → Log groups → `/aws/lambda/render-keep-alive`**.  
Each invocation emits a single JSON line:

```json
{"timestamp":"2026-09-27T12:45:00.000Z","statusCode":200,"latencyMs":712,"ok":true}
```

Errors (timeout / network) emit to `stderr` with an `"error"` field instead.
