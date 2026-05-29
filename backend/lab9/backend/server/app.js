import path from "node:path";
import { fileURLToPath } from "node:url";
import { createLab9ModelControllers } from "./controllers/modelControllers.js";
import { SqliteModelRepository } from "./repositories/sqliteModelRepository.js";
import { Lab9ModelService } from "./services/modelService.js";
import { VanillaApp } from "./core/vanillaApp.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLIENT_DIRECTORY = path.join(__dirname, "..", "client");
const DATABASE_FILE_PATH = path.join(__dirname, "..", "comments.db");

export async function createAppServer(options) {
  const modelRepository = new SqliteModelRepository(options.databaseFilePath ?? DATABASE_FILE_PATH);

  await modelRepository.load();

  const modelService = new Lab9ModelService(modelRepository);
  const modelControllers = createLab9ModelControllers(modelService, options.logger);
  const application = new VanillaApp({ logger: options.logger });

  application.add("GET", "/models", modelControllers.getModels);
  application.add("GET", "/models/:modelId", modelControllers.getModel);
  application.add("POST", "/models", modelControllers.createModel);
  application.add("PUT", "/models/:modelId", modelControllers.updateModel);
  application.add("DELETE", "/models/:modelId", modelControllers.deleteModel);
  application.static(CLIENT_DIRECTORY);

  return application;
}
