import path from "node:path";

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const CONTENT_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
};

export function getContentType(filePath) {
  return CONTENT_TYPES[path.extname(filePath).toLowerCase()] ?? "application/octet-stream";
}

export function sendPreparedFile(response, statusCode, preparedResponse) {
  response.writeHead(statusCode, {
    ...CORS_HEADERS,
    "Content-Type": preparedResponse.contentType,
    "Content-Length": preparedResponse.contentLength,
  });
  response.end(preparedResponse.content);
}

export function sendText(response, statusCode, content, contentType) {
  response.writeHead(statusCode, {
    ...CORS_HEADERS,
    "Content-Type": contentType,
    "Content-Length": Buffer.byteLength(content, "utf8"),
  });
  response.end(content);
}

export function sendJson(response, statusCode, payload) {
  const content = JSON.stringify(payload, null, 2);

  sendText(response, statusCode, content, "application/json; charset=utf-8");
}

export function sendEmpty(response, statusCode) {
  response.writeHead(statusCode, CORS_HEADERS);
  response.end();
}

export function sendBadRequest(response, message) {
  sendJson(response, 400, { error: "Bad Request", message });
}

export function sendNotFound(response, message) {
  sendJson(response, 404, { error: "Not Found", message });
}

export function sendServerError(response, message) {
  sendJson(response, 500, { error: "Internal Server Error", message });
}
