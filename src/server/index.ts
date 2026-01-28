import { loadConfigsFromFiles } from "./config-manager";
import {
  handleOptions,
  handleListConfigs,
  handleGetConfig,
  handleCreateConfig,
  handleUpdateConfig,
  handleDeleteConfig,
} from "./routes/api";

const PORT = process.env.PORT || 3000;

/** Simple HTML page for root */
const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sight Word Guess Who</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      max-width: 600px;
      margin: 100px auto;
      padding: 20px;
      text-align: center;
    }
    h1 { color: #2563eb; }
    .status {
      background: #dcfce7;
      color: #166534;
      padding: 12px 24px;
      border-radius: 8px;
      display: inline-block;
      margin-top: 20px;
    }
    .api-link {
      margin-top: 30px;
      color: #6b7280;
    }
    a { color: #2563eb; }
  </style>
</head>
<body>
  <h1>Sight Word Guess Who</h1>
  <p>A two-player educational game for practicing sight words</p>
  <div class="status">Phase 1 Complete</div>
  <div class="api-link">
    <p>API available at <a href="/api/configs">/api/configs</a></p>
  </div>
</body>
</html>`;

/** Route an incoming request */
async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // Handle CORS preflight
  if (method === "OPTIONS") {
    return handleOptions();
  }

  // Serve index page
  if (path === "/" && method === "GET") {
    return new Response(indexHtml, {
      headers: { "Content-Type": "text/html" },
    });
  }

  // API routes
  if (path === "/api/configs") {
    if (method === "GET") {
      return handleListConfigs();
    }
    if (method === "POST") {
      return handleCreateConfig(request);
    }
  }

  // API routes with ID parameter
  const configMatch = path.match(/^\/api\/configs\/([^/]+)$/);
  if (configMatch) {
    const id = decodeURIComponent(configMatch[1]);
    if (method === "GET") {
      return handleGetConfig(id);
    }
    if (method === "PUT") {
      return handleUpdateConfig(id, request);
    }
    if (method === "DELETE") {
      return handleDeleteConfig(id);
    }
  }

  // 404 for unmatched routes
  return new Response(JSON.stringify({ success: false, error: "Not found" }), {
    status: 404,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

/** Start the server */
async function main() {
  // Load config files into database on startup
  await loadConfigsFromFiles();

  const server = Bun.serve({
    port: PORT,
    fetch: handleRequest,
  });

  console.log(`Server running at http://localhost:${server.port}`);
}

main();
