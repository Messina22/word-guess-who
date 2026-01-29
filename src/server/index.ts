import type { ServerWebSocket } from "bun";
import { loadConfigsFromFiles } from "./config-manager";
import {
  handleOptions,
  handleListConfigs,
  handleGetConfig,
  handleCreateConfig,
  handleUpdateConfig,
  handleDeleteConfig,
} from "./routes/api";
import {
  handleCreateGame,
  handleGetGame,
} from "./routes/game";
import { sessionManager, type WebSocketData } from "./session-manager";
import type { ClientMessage } from "@shared/types";

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
    ul { list-style: none; padding: 0; }
    li { margin: 8px 0; }
  </style>
</head>
<body>
  <h1>Sight Word Guess Who</h1>
  <p>A two-player educational game for practicing sight words</p>
  <div class="status">Phase 2 Complete - Game Logic</div>
  <div class="api-link">
    <p>API endpoints:</p>
    <ul>
      <li><a href="/api/configs">/api/configs</a> - Game configurations</li>
      <li>/api/games - Game sessions (POST to create)</li>
      <li>/ws - WebSocket connection</li>
    </ul>
  </div>
</body>
</html>`;

/** Route an incoming request */
async function handleRequest(request: Request, server: ReturnType<typeof Bun.serve>): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // Handle CORS preflight
  if (method === "OPTIONS") {
    return handleOptions();
  }

  // Handle WebSocket upgrade
  if (path === "/ws") {
    const upgraded = server.upgrade(request, {
      data: {
        gameCode: null,
        playerId: null,
        playerIndex: null,
      },
    });
    if (upgraded) {
      return undefined as unknown as Response; // Bun handles the upgrade
    }
    return new Response("WebSocket upgrade failed", { status: 400 });
  }

  // Serve index page
  if (path === "/" && method === "GET") {
    return new Response(indexHtml, {
      headers: { "Content-Type": "text/html" },
    });
  }

  // Config API routes
  if (path === "/api/configs") {
    if (method === "GET") {
      return handleListConfigs();
    }
    if (method === "POST") {
      return handleCreateConfig(request);
    }
  }

  // Config API routes with ID parameter
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

  // Game API routes
  if (path === "/api/games") {
    if (method === "POST") {
      return handleCreateGame(request);
    }
  }

  // Game API routes with code parameter
  const gameMatch = path.match(/^\/api\/games\/([^/]+)$/);
  if (gameMatch) {
    const code = decodeURIComponent(gameMatch[1]);
    if (method === "GET") {
      return handleGetGame(code);
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

  const server = Bun.serve<WebSocketData>({
    port: PORT,
    fetch(request, server) {
      return handleRequest(request, server);
    },
    websocket: {
      open(ws: ServerWebSocket<WebSocketData>) {
        // Connection opened, waiting for join_game message
      },
      message(ws: ServerWebSocket<WebSocketData>, message: string | Buffer) {
        try {
          const data = JSON.parse(message.toString()) as ClientMessage;
          sessionManager.handleMessage(ws, data);
        } catch {
          ws.send(JSON.stringify({ type: "error", message: "Invalid message format" }));
        }
      },
      close(ws: ServerWebSocket<WebSocketData>) {
        sessionManager.handleDisconnect(ws);
      },
    },
  });

  console.log(`Server running at http://localhost:${server.port}`);
  console.log(`WebSocket available at ws://localhost:${server.port}/ws`);
}

main();
