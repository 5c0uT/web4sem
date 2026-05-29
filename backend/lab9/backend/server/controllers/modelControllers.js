import querystring from "node:querystring";
import { Lab9HttpError } from "../utils/httpErrors.js";
import { readJsonBody } from "../utils/requestBody.js";
import { sendEmpty, sendError, sendJson } from "../utils/responses.js";

export function createLab9ModelControllers(modelService, logger = {}) {
  return {
    getModels: wrapController(async (request, response, context) => {
      const query = querystring.parse(context.url.search.slice(1));
      const page = await modelService.getModels(query);

      sendJson(response, 200, page);
    }, logger),

    getModel: wrapController(async (request, response, context) => {
      const model = await modelService.getModel(context.params.modelId);

      sendJson(response, 200, model);
    }, logger),

    createModel: wrapController(async (request, response) => {
      const payload = await readJsonBody(request);
      const storedModel = await modelService.createModel(payload);

      sendJson(response, 201, storedModel);
    }, logger),

    updateModel: wrapController(async (request, response, context) => {
      const payload = await readJsonBody(request);
      const updatedModel = await modelService.updateModel(context.params.modelId, payload);

      sendJson(response, 200, updatedModel);
    }, logger),

    deleteModel: wrapController(async (request, response, context) => {
      await modelService.deleteModel(context.params.modelId);
      sendEmpty(response, 204);
    }, logger),
  };
}

function wrapController(controller, logger) {
  return async (...args) => {
    const response = args[1];

    try {await controller(...args);} 
    catch (error) {handleControllerError(error, response, logger);}
  };
}

function handleControllerError(error, response, logger) {
  if (response.writableEnded) {return;}

  if (error instanceof Lab9HttpError) {
    sendError(response, error.statusCode, error.message);
    return;
  }

  const message = error instanceof Error ? error.stack ?? error.message : String(error);

  logger.error?.(`Ошибка lab9 API:\n${message}`);
  sendError(response, 500, "Во время работы с базой данных произошла внутренняя ошибка сервера.");
}
