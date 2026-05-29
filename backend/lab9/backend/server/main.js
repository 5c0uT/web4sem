import { createAppServer } from "./app.js";

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 3000;

function logInfo(message) {
  process.stdout.write(`${message}
`);
}

function logError(message) {
  process.stderr.write(`${message}
`);
}

function resolvePort(value) {
  if (value === undefined) {
    return DEFAULT_PORT;
  }

  const parsedPort = Number.parseInt(value, 10);

  if (!Number.isInteger(parsedPort) || parsedPort <= 0) {
    return DEFAULT_PORT;
  }

  return parsedPort;
}

function startListening(application, host, port) {
  return new Promise((resolve, reject) => {
    application.once("error", reject);
    application.listen(port, host, () => {
      application.off("error", reject);
      resolve();
    });
  });
}

async function bootstrap() {
  const host = process.env.HOST ?? DEFAULT_HOST;
  const port = resolvePort(process.env.PORT);
  const logger = { info: logInfo, error: logError };
  const application = await createAppServer({ logger });

  await startListening(application, host, port);

  const address = application.address();

  if (address !== null && typeof address === "object") {
    logInfo(`Сервер запущен: http://${address.address}:${address.port}`);
    logInfo(`Редактор: http://${address.address}:${address.port}/`);
    return;
  }

  logInfo(`Сервер запущен на порту ${port}`);
}

bootstrap().catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);

  logError(`Не удалось запустить сервер:
${message}`);
  process.exitCode = 1;
});
