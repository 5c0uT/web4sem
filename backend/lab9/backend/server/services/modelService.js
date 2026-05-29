import { randomUUID } from "node:crypto";
import { Lab9BadRequestError, Lab9NotFoundError } from "../utils/httpErrors.js";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;
const SORT_FIELDS = new Set(["id", "name", "createdAt", "updatedAt"]);

export class Lab9ModelService {
  #repository;

  
  constructor(repository) {
    this.#repository = repository;
  }

  
  async getModels(query) {
    const page = parsePositiveInteger(getQueryValue(query.page), "page", DEFAULT_PAGE);
    const limit = parsePositiveInteger(getQueryValue(query.limit), "limit", DEFAULT_LIMIT);
    const sort = normalizeSort(getQueryValue(query._sort));

    if (limit > MAX_LIMIT) {
      throw new Lab9BadRequestError(`Параметр limit не должен быть больше ${MAX_LIMIT}.`);
    }

    const totalModels = await this.#repository.countAll();
    const totalPages = Math.max(Math.ceil(totalModels / limit), 1);
    const models = await this.#repository.findAll({...sort, limit, offset: (page - 1) * limit,});

    return {page, limit, totalPages, models,};
  }

  async getModel(modelId) {
    const model = await this.#repository.findById(modelId);

    if (model === null) {
      throw new Lab9NotFoundError("Модель с указанным идентификатором не найдена.");
    }

    return model;
  }

  
  async createModel(payload) {
    const normalizedPayload = normalizeModelPayload(payload);
    const timestamp = new Date().toISOString();
    const model = {
      id: randomUUID(),
      name: normalizedPayload.name,
      createdAt: timestamp,
      updatedAt: timestamp,
      snapshot: normalizedPayload.snapshot,
    };

    return this.#repository.create(model);
  }

  
  async updateModel(modelId, payload) {
    const currentModel = await this.#repository.findById(modelId);

    if (currentModel === null) {
      throw new Lab9NotFoundError("Нельзя обновить модель, которой не существует.");
    }

    const normalizedPayload = normalizeModelPayload(payload);
    const savedModel = await this.#repository.update(modelId, {
      ...currentModel,
      name: normalizedPayload.name,
      snapshot: normalizedPayload.snapshot,
      updatedAt: new Date().toISOString(),
    });

    if (savedModel === null) {
      throw new Lab9NotFoundError("Нельзя обновить модель, которой не существует.");
    }

    return savedModel;
  }

  
  async deleteModel(modelId) {
    const wasDeleted = await this.#repository.delete(modelId);

    if (!wasDeleted) {
      throw new Lab9NotFoundError("Нельзя удалить модель, которой не существует.");
    }
  }
}


function getQueryValue(value) {
  if (Array.isArray(value)) {return value[0];}

  return value;
}


function parsePositiveInteger(value, parameterName, defaultValue) {
  if (value === undefined) {return defaultValue;}

  const parsedValue = Number.parseInt(value, 10);

  if (!Number.isInteger(parsedValue) || String(parsedValue) !== value || parsedValue <= 0) {
    throw new Lab9BadRequestError(`Параметр ${parameterName} должен быть положительным целым числом.`);
  }

  return parsedValue;
}


function normalizeSort(sortExpression) {
  if (sortExpression === undefined) {
    return {sortField: "updatedAt", sortDirection: "DESC"};
  }

  const isDescending = sortExpression.startsWith("-");
  const sortField = isDescending ? sortExpression.slice(1) : sortExpression;

  if (!SORT_FIELDS.has(sortField)) {
    throw new Lab9BadRequestError("Параметр _sort содержит неизвестное поле.");
  }

  return {sortField, sortDirection: isDescending ? "DESC" : "ASC",};
}


function normalizeModelPayload(payload) {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Lab9BadRequestError("Тело запроса должно содержать объект модели.");
  }

  const record =  (payload);
  const name = typeof record.name === "string" ? record.name.trim() : "";

  if (name === "") {
    throw new Lab9BadRequestError("Поле name обязательно и должно быть непустой строкой.");
  }

  if (record.snapshot === undefined || record.snapshot === null || typeof record.snapshot !== "object" || Array.isArray(record.snapshot)) {
    throw new Lab9BadRequestError("Поле snapshot обязательно и должно быть объектом.");
  }

  return {name, snapshot: record.snapshot,};
}
