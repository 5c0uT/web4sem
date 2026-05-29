const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const ERROR_NAMES = {
  400: "Bad Request",
  404: "Not Found",
  500: "Internal Server Error",
};

export function sendJson(response, statusCode, payload) {
  const content = JSON.stringify(payload, null, 2);

  response.writeHead(statusCode, {
    ...CORS_HEADERS,
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(content, "utf8"),
  });
  response.end(content);
}

export function sendEmpty(response, statusCode) {
  response.writeHead(statusCode, CORS_HEADERS);
  response.end();
}

export function sendError(response, statusCode, message) {
  sendJson(response, statusCode, {
    error: ERROR_NAMES[statusCode] ?? ERROR_NAMES[500],
    message,});
}
