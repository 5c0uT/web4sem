import http from "node:http";
import { sendBadRequest, sendEmpty, sendPreparedFile, sendServerError } from "./httpResponses.js";
import { loadStaticFiles } from "./staticFiles.js";
import { Lab9HttpError } from "../utils/httpErrors.js";
import { sendError } from "../utils/responses.js";

export class VanillaApp {
  #dynamicRoutes = [];
  #logger;
  #routes = new Map();
  #server;
  #staticFiles = new Map();

  constructor(options = {}) {
    this.#logger = options.logger ?? { info: () => {}, error: () => {} };
    this.#server = http.createServer((request, response) => {
      void this.#handleRequest(request, response);
    });
    this.#server.on("connection", (socket) => {
      this.#logger.info(`Новое подключение: ${socket.remoteAddress ?? "unknown"}:${socket.remotePort ?? "unknown"}`);
    });
  }

  add(method, routePath, controller) {
    const normalizedMethod = method.toUpperCase();
    const route = createRoute(normalizedMethod, routePath, controller);

    this.#routes.set(createRouteKey(normalizedMethod, routePath), route);

    if (route.parameterNames.length > 0) {
      this.#dynamicRoutes.push(route);
    }
  }

  static(rootPath) {
    this.#staticFiles = loadStaticFiles(rootPath);
  }

  listen(port, host, callback) {
    return this.#server.listen(port, host, callback);
  }

  address() {
    return this.#server.address();
  }

  once(eventName, listener) {
    return this.#server.once(eventName, listener);
  }

  off(eventName, listener) {
    return this.#server.off(eventName, listener);
  }

  async #handleRequest(request, response) {
    const method = request.method ?? "GET";
    const requestUrl = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
    const pathname = normalizePathname(requestUrl.pathname);

    this.#logger.info(`Получен запрос: ${method} ${request.url ?? "/"}`);

    try {
      if (method === "OPTIONS") {
        sendEmpty(response, 204);
        return;
      }

      const route = this.#findRoute(method, pathname);

      if (route !== null) {
        await route.controller(request, response, { url: requestUrl, params: route.params });
        return;
      }

      if (method === "GET") {
        const staticFile = this.#staticFiles.get(pathname);

        if (staticFile !== undefined) {
          sendPreparedFile(response, 200, staticFile);
          return;
        }

        const notFoundPage = this.#staticFiles.get("/404.html");

        if (notFoundPage !== undefined) {
          sendPreparedFile(response, 404, notFoundPage);
          return;
        }
      }

      sendBadRequest(response, "Запрошенный путь или HTTP-метод не поддерживается.");
    } catch (error) {
      this.#handleError(error, response);
    }
  }

  #findRoute(method, pathname) {
    const exactRoute = this.#routes.get(createRouteKey(method, pathname));

    if (exactRoute !== undefined && exactRoute.parameterNames.length === 0) {
      return { controller: exactRoute.controller, params: {} };
    }

    for (const route of this.#dynamicRoutes) {
      if (route.method !== method) {
        continue;
      }

      const match = pathname.match(route.pattern);

      if (match !== null) {
        return { controller: route.controller, params: createRouteParams(route.parameterNames, match) };
      }
    }

    return null;
  }

  #handleError(error, response) {
    if (response.writableEnded) {
      return;
    }

    if (error instanceof Lab9HttpError) {
      sendError(response, error.statusCode, error.message);
      return;
    }

    const errorMessage = error instanceof Error ? error.stack ?? error.message : String(error);

    this.#logger.error(`Ошибка обработки запроса:
${errorMessage}`);
    sendServerError(response, "Во время обработки запроса произошла внутренняя ошибка сервера.");
  }
}

function createRouteKey(method, routePath) {
  return `${method.toUpperCase()} ${routePath}`;
}

function createRoute(method, routePath, controller) {
  const parameterNames = [];
  const patternSource = routePath
    .split("/")
    .map((part) => {
      if (!part.startsWith(":")) {
        return escapeRegExp(part);
      }

      parameterNames.push(part.slice(1));
      return "([^/]+)";
    })
    .join("/");

  return { method, path: routePath, controller, parameterNames, pattern: new RegExp(`^${patternSource}$`, "u") };
}

function createRouteParams(parameterNames, match) {
  return Object.fromEntries(parameterNames.map((name, index) => [name, decodeURIComponent(match[index + 1])]));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function normalizePathname(pathname) {
  if (pathname !== "/" && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }

  return pathname;
}
