import { ProjectionCanvas, ThreeView } from "../../common/renderers.js";
import { VoxelEditorState } from "../../common/editorState.js";
import { PROJECTION_KEYS } from "../../algorithm/voxelProjection.js";

/**
 * Базовый адрес API.
 *
 * @type {string}
 */
const API_BASE_URL = "http://localhost:3000";

/**
 * Размер сетки при старте.
 *
 * @type {number}
 */
const DEFAULT_GRID_SIZE = 16;

/**
 * Подсказки интерфейса.
 */
const SHAPE_HINT_TEXT = [
  "Режим формы: левая кнопка добавляет пиксели, правая удаляет.",
  "Объем строится только по реально отмеченным клеткам трех проекций,",
  "а красные линии показывают связанное положение курсора.",
].join(" ");

const PAINT_HINT_TEXT = [
  "Режим покраски: форма не меняется.",
  "Клик по проекции красит первый видимый воксель на выбранном луче.",
].join(" ");

/**
 * Общее состояние редактора, вынесенное в `common/editorState.js`.
 *
 * Для lab5 поверх базового состояния добавляется только сценарий сетевого
 * сохранения, загрузки и удаления моделей. Сама модель проекций и снимки
 * состояния уже остаются общими для всех лабораторных.
 */
/**
 * Ссылки на DOM-элементы интерфейса.
 *
 * @type {{
 *   topCanvas: HTMLCanvasElement,
 *   frontCanvas: HTMLCanvasElement,
 *   leftCanvas: HTMLCanvasElement,
 *   threeRoot: HTMLElement,
 *   shapeModeBtn: HTMLButtonElement,
 *   paintModeBtn: HTMLButtonElement,
 *   colorPicker: HTMLInputElement,
 *   gridSizeSelect: HTMLSelectElement,
 *   resetModelBtn: HTMLButtonElement,
 *   saveBtn: HTMLButtonElement,
 *   saveAsBtn: HTMLButtonElement,
 *   loadBtn: HTMLButtonElement,
 *   currentModelName: HTMLElement,
 *   statusText: HTMLElement,
 *   hintText: HTMLElement,
 *   saveDialog: HTMLDialogElement,
 *   saveForm: HTMLFormElement,
 *   modelNameInput: HTMLInputElement,
 *   loadDialog: HTMLDialogElement,
 *   modelsList: HTMLElement,
 *   modelsEmptyText: HTMLElement,
 *   closeLoadDialogBtn: HTMLButtonElement,
 *   modelItemTemplate: HTMLTemplateElement
 * }}
 */
const dom = {
  topCanvas: document.getElementById("topCanvas"),
  frontCanvas: document.getElementById("frontCanvas"),
  leftCanvas: document.getElementById("leftCanvas"),
  threeRoot: document.getElementById("threeRoot"),
  shapeModeBtn: document.getElementById("shapeModeBtn"),
  paintModeBtn: document.getElementById("paintModeBtn"),
  colorPicker: document.getElementById("colorPicker"),
  gridSizeSelect: document.getElementById("gridSizeSelect"),
  resetModelBtn: document.getElementById("resetModelBtn"),
  saveBtn: document.getElementById("saveBtn"),
  saveAsBtn: document.getElementById("saveAsBtn"),
  loadBtn: document.getElementById("loadBtn"),
  currentModelName: document.getElementById("currentModelName"),
  statusText: document.getElementById("statusText"),
  hintText: document.getElementById("hintText"),
  saveDialog: document.getElementById("saveDialog"),
  saveForm: document.getElementById("saveForm"),
  modelNameInput: document.getElementById("modelNameInput"),
  loadDialog: document.getElementById("loadDialog"),
  modelsList: document.getElementById("modelsList"),
  modelsEmptyText: document.getElementById("modelsEmptyText"),
  closeLoadDialogBtn: document.getElementById("closeLoadDialogBtn"),
  modelItemTemplate: document.getElementById("modelItemTemplate"),
};

const DEFAULT_COLOR = dom.colorPicker.value;
const state = new VoxelEditorState({
  size: DEFAULT_GRID_SIZE,
  defaultColor: DEFAULT_COLOR,
  emptyModelName: "Новая модель",
});

let projectionViews = {};
let threeView = null;

/**
 * Полностью сбрасывает состояние редактора.
 *
 * @param {number} [size=state.size] Размер новой сетки.
 * @returns {void}
 */
function resetEditorState(size = state.size) {state.reset(size);}

/**
 * Обновляет координаты перекрестия по клетке конкретной проекции.
 *
 * @param {'top' | 'front' | 'left'} projectionKey Ключ проекции.
 * @param {number} row Строка клетки.
 * @param {number} col Столбец клетки.
 * @returns {void}
 */
function updateHoverFromProjection(projectionKey, row, col) {state.model.updateHover(projectionKey, row, col);}

/**
 * Очищает перекрестие после ухода указателя.
 *
 * @param {'top' | 'front' | 'left'} projectionKey Ключ проекции.
 * @returns {void}
 */
function clearHover(projectionKey) {state.model.clearHover(projectionKey);}

/**
 * Возвращает координаты перекрестия в системе выбранной проекции.
 *
 * @param {'top' | 'front' | 'left'} projectionKey Ключ проекции.
 * @returns {{row: number | null, col: number | null}} Координаты перекрестия.
 */
function getCrosshair(projectionKey) {return state.model.getCrosshair(projectionKey);}

/**
 * Возвращает цвет первого видимого вокселя на луче клетки.
 *
 * @param {'top' | 'front' | 'left'} projectionKey Ключ проекции.
 * @param {number} row Строка клетки.
 * @param {number} col Столбец клетки.
 * @returns {string | null} Цвет вокселя или null.
 */
function getOverlayColor(projectionKey, row, col) {return state.model.getOverlayColor(projectionKey, row, col);}

/**
 * Красит первый видимый воксель на выбранном луче.
 *
 * @param {'top' | 'front' | 'left'} projectionKey Ключ проекции.
 * @param {number} row Строка клетки.
 * @param {number} col Столбец клетки.
 * @param {string} color Цвет в формате `#rrggbb`.
 * @returns {boolean} true, если цвет был изменен.
 */
function paintRay(projectionKey, row, col, color) {return state.model.paintRay(projectionKey, row, col, color);}

/**
 * Применяет действие к клетке проекции.
 *
 * @param {'top' | 'front' | 'left'} projectionKey Ключ проекции.
 * @param {number} row Строка клетки.
 * @param {number} col Столбец клетки.
 * @param {number} button Код кнопки мыши.
 * @returns {void}
 */
function applyCellAction(projectionKey, row, col, button) {
  if (state.mode === "shape") {
    state.model.setProjectionCell(projectionKey, row, col, button !== 2);
    return;
  }

  paintRay(projectionKey, row, col, state.color);
}

/**
 * Собирает компактный снимок текущего состояния редактора.
 *
 * @returns {{
 *   size: number,
 *   mode: 'shape' | 'paint',
 *   color: string,
 *   projections: {top: boolean[][], front: boolean[][], left: boolean[][]},
 *   coloredVoxels: Record<string, string>
 * }} Снимок модели.
 */
function serializeEditorState() {return state.serializeSnapshot();}

/**
 * Восстанавливает редактор из сохраненного снимка.
 *
 * @param {{
 *   size: number,
 *   mode: 'shape' | 'paint',
 *   color: string,
 *   projections: {top: boolean[][], front: boolean[][], left: boolean[][]},
 *   coloredVoxels?: Record<string, string> | string[]
 * }} snapshot Снимок модели.
 * @returns {void}
 */
function applySerializedEditorState(snapshot) {state.applySnapshot(snapshot);}

/**
 * Формирует полный URL ресурса API.
 *
 * @param {string} path Относительный путь.
 * @returns {string} Полный URL.
 */
function buildUrl(path) {return `${API_BASE_URL}${path}`;}

/**
 * Выполняет HTTP-запрос и проверяет код ответа.
 *
 * @param {string} path Путь ресурса.
 * @param {RequestInit} [options={}] Параметры запроса.
 * @returns {Promise<Response>} Ответ сервера.
 */
async function request(path, options = {}) {
  const response = await fetch(buildUrl(path), options);

  if (!response.ok) {throw new Error(`Ошибка HTTP ${response.status}`);}

  return response;
}

/**
 * Загружает список моделей.
 *
 * @returns {Promise<Array<{id: number, name: string, createdAt: string, updatedAt: string, snapshot: object}>>}
 *   Список записей.
 */
async function fetchModels() {
  const response = await request("/models?_sort=-updatedAt");

  return response.json();
}

/**
 * Загружает модель по идентификатору.
 *
 * @param {string | number} modelId Идентификатор модели.
 * @returns {Promise<{id: number, name: string, createdAt: string, updatedAt: string, snapshot: object}>}
 *   Запись модели.
 */
async function fetchModelById(modelId) {
  const response = await request(`/models/${modelId}`);

  return response.json();
}

/**
 * Создает новую запись модели.
 *
 * @param {object} modelPayload Данные модели.
 * @returns {Promise<object>} Созданная запись.
 */
async function createModel(modelPayload) {
  const response = await request("/models", {
    method: "POST",
    headers: {"Content-Type": "application/json",},
    body: JSON.stringify(modelPayload),
  });

  return response.json();
}

/**
 * Полностью обновляет существующую запись модели.
 *
 * @param {string | number} modelId Идентификатор модели.
 * @param {object} modelPayload Новые данные записи.
 * @returns {Promise<object>} Обновленная запись.
 */
async function updateModel(modelId, modelPayload) {
  const response = await request(`/models/${modelId}`, {
    method: "PUT",
    headers: {"Content-Type": "application/json",},
    body: JSON.stringify(modelPayload),
  });

  return response.json();
}

/**
 * Удаляет модель с сервера.
 *
 * @param {string | number} modelId Идентификатор модели.
 * @returns {Promise<void>} Завершение операции удаления.
 */
async function deleteModel(modelId) {await request(`/models/${modelId}`, {method: "DELETE",});}

/**
 * Преобразует ISO-дату в локальную строку.
 *
 * @param {string} isoString Дата в формате ISO 8601.
 * @returns {string} Отформатированная дата.
 */
function formatDateTime(isoString) {
  const date = new Date(isoString);

  if (Number.isNaN(date.getTime())) {return isoString;}

  return date.toLocaleString("ru-RU");
}

/**
 * Открывает диалог сохранения и возвращает введенное имя.
 *
 * @param {string} suggestedName Начальное имя.
 * @returns {Promise<string | null>} Имя модели или null.
 */
function askModelName(suggestedName) {
  return new Promise((resolve) => {
    dom.modelNameInput.value = suggestedName;
    dom.saveDialog.showModal();
    dom.modelNameInput.focus();
    dom.modelNameInput.select();

    const onClose = () => {dom.saveDialog.removeEventListener("close", onClose);

      if (dom.saveDialog.returnValue !== "confirm") {
        resolve(null);
        return;
      }

      const trimmedName = dom.modelNameInput.value.trim();
      resolve(trimmedName || suggestedName);
    };

    dom.saveDialog.addEventListener("close", onClose);
  });
}

/**
 * Отрисовывает список сохраненных моделей.
 *
 * @param {Array<{id: number, name: string, createdAt: string, updatedAt: string}>} models
 *   Список моделей.
 * @returns {void}
 */
function renderModelsList(models) {
  dom.modelsList.replaceChildren();
  dom.modelsEmptyText.hidden = models.length !== 0;

  models.forEach((model) => {dom.modelsList.append(createModelListItem(model));});
}

function createModelListItem(model) {
  const fragment = dom.modelItemTemplate.content.cloneNode(true);
  const item = fragment.querySelector(".model-item");
  const nameNode = fragment.querySelector(".model-name");
  const createdNode = fragment.querySelector('[data-role="createdAt"]');
  const updatedNode = fragment.querySelector('[data-role="updatedAt"]');

  nameNode.textContent = model.name;
  createdNode.textContent = `Создана: ${formatDateTime(model.createdAt)}`;
  updatedNode.textContent = `Изменена: ${formatDateTime(model.updatedAt)}`;

  fragment.querySelectorAll("button[data-action]").forEach((button) => 
    {button.dataset.modelId = String(model.id);});

  return item;
}

/**
 * Обновляет текст подсказки и состояние кнопок режима.
 *
 * @returns {void}
 */
function updateHint() {
  dom.hintText.textContent = state.mode === "shape" ? SHAPE_HINT_TEXT : PAINT_HINT_TEXT;
  dom.shapeModeBtn.classList.toggle("active", state.mode === "shape");
  dom.paintModeBtn.classList.toggle("active", state.mode === "paint");
}

/**
 * Обновляет имя текущей модели в интерфейсе.
 *
 * @returns {void}
 */
function updateCurrentModelName() {dom.currentModelName.textContent = state.currentModelName;}

/**
 * Показывает текст текущего статуса.
 *
 * @param {string} message Сообщение статуса.
 * @returns {void}
 */
function setStatus(message) {dom.statusText.textContent = message;}

/**
 * Синхронизирует элементы управления с текущим состоянием.
 *
 * @returns {void}
 */
function syncControlsWithState() {
  dom.colorPicker.value = state.color;
  dom.gridSizeSelect.value = String(state.size);
  updateHint();
  updateCurrentModelName();
}

/**
 * Перерисовывает все 2D-проекции.
 *
 * @returns {void}
 */
function drawAll() {Object.values(projectionViews).forEach((projectionView) => {projectionView.render();});}

/**
 * Перерисовывает 2D-проекции и 3D-представление.
 *
 * @returns {void}
 */
function redrawAll() {
  threeView.update();
  drawAll();
}

/**
 * Обновляет размеры областей визуализации.
 *
 * @returns {void}
 */
function resizeAll() {
  Object.values(projectionViews).forEach((projectionView) => {projectionView.resize();});
  drawAll();
}

/**
 * Формирует данные для POST и PUT-запросов.
 *
 * @param {string} modelName Имя модели.
 * @param {string} createdAt Дата создания записи.
 * @returns {{name: string, createdAt: string, updatedAt: string, snapshot: object}} Полезная нагрузка.
 */
function createModelPayload(modelName, createdAt) {
  return {
    name: modelName,
    createdAt,
    updatedAt: new Date().toISOString(),
    snapshot: serializeEditorState(),
  };
}

/**
 * Сбрасывает текущую модель до пустого состояния.
 *
 * @returns {void}
 */
function resetCurrentModel() {
  resetEditorState(state.size);
  syncControlsWithState();
  resizeAll();
  redrawAll();
  setStatus("Редактор сброшен. Текущая модель очищена.");
}

/**
 * Сохраняет модель на сервер.
 *
 * @param {boolean} forceAskName Нужно ли обязательно запросить имя.
 * @returns {Promise<void>} Завершение операции сохранения.
 */
async function saveModel(forceAskName) {
  try {
    setStatus("Сохранение модели...");

    if (state.currentModelId !== null && !forceAskName) {
      const existingModel = await fetchModelById(state.currentModelId);
      const updatedModel = await updateModel(
        state.currentModelId,
        createModelPayload(state.currentModelName, existingModel.createdAt),
      );

      state.currentModelName = updatedModel.name;
      updateCurrentModelName();

      setStatus(`Модель «${updatedModel.name}» сохранена.`);
      return;
    }

    const suggestedName = forceAskName ? state.currentModelName : "Модель без названия";
    const modelName = await askModelName(suggestedName);

    if (modelName === null) {
      setStatus("Сохранение отменено.");
      return;
    }

    const createdModel = await createModel(createModelPayload(modelName, new Date().toISOString()),);

    state.currentModelId = createdModel.id;
    state.currentModelName = createdModel.name;
    updateCurrentModelName();

    setStatus(`Модель «${createdModel.name}» сохранена как новая.`);
  } 
  catch (error) {
    setStatus(`Не удалось сохранить модель: ${error.message}. Проверьте запуск json-server.`,);
  }
}

/**
 * Открывает диалог загрузки и показывает список моделей.
 *
 * @returns {Promise<void>} Завершение операции.
 */
async function openLoadDialog() {
  try {
    setStatus("Загрузка списка моделей...");
    const models = await fetchModels();

    renderModelsList(models);
    dom.loadDialog.showModal();

    setStatus(`Доступно моделей: ${models.length}.`);
  } 
  catch (error) {setStatus(`Не удалось загрузить список моделей: ${error.message}.`);}
}

/**
 * Загружает модель в редактор.
 *
 * @param {string | number} modelId Идентификатор модели.
 * @returns {Promise<void>} Завершение операции.
 */
async function loadModelIntoEditor(modelId) {
  try {
    setStatus("Загрузка модели...");
    const model = await fetchModelById(modelId);

    applySerializedEditorState(model.snapshot);
    state.currentModelId = model.id;
    state.currentModelName = model.name;
    syncControlsWithState();
    resizeAll();
    redrawAll();
    dom.loadDialog.close();

    setStatus(`Модель «${model.name}» загружена.`);
  } 
  catch (error) {setStatus(`Не удалось загрузить модель: ${error.message}.`);}
}

/**
 * Удаляет модель с сервера и обновляет список.
 *
 * @param {string | number} modelId Идентификатор модели.
 * @returns {Promise<void>} Завершение операции.
 */
async function removeModelFromServer(modelId) {
  try {
    setStatus("Удаление модели...");
    await deleteModel(modelId);

    if (`${state.currentModelId}` === `${modelId}`) {
      state.currentModelId = null;
      state.currentModelName = "Новая модель";
      updateCurrentModelName();
    }

    const models = await fetchModels();

    renderModelsList(models);
    setStatus("Модель удалена.");
  } 
  catch (error) {setStatus(`Не удалось удалить модель: ${error.message}.`);}
}

/**
 * Навешивает обработчики интерфейса.
 *
 * @returns {void}
 */
function bindUi() {
  dom.shapeModeBtn.addEventListener("click", () => switchMode("shape"));
  dom.paintModeBtn.addEventListener("click", () => switchMode("paint"));

  dom.colorPicker.addEventListener("input", (event) => {state.color = event.target.value;});

  dom.gridSizeSelect.addEventListener("change", (event) => 
  { rebuildEditor(Number.parseInt(event.target.value, 10));
    setStatus("Размер сетки изменен. Создана новая пустая модель.");});

  dom.resetModelBtn.addEventListener("click", () => {resetCurrentModel();});

  dom.saveBtn.addEventListener("click", async () => {await saveModel(false);});

  dom.saveAsBtn.addEventListener("click", async () => {await saveModel(true);});

  dom.loadBtn.addEventListener("click", async () => {await openLoadDialog();});

  dom.closeLoadDialogBtn.addEventListener("click", () => {dom.loadDialog.close();});

  dom.modelsList.addEventListener("click", async (event) => {const target = event.target.closest("button[data-action]");

    if (!target) {return;}

    const { action, modelId } = target.dataset;

    if (action === "load") {await loadModelIntoEditor(modelId);}

    if (action === "delete") {await removeModelFromServer(modelId);}
  });

  window.addEventListener("resize", resizeAll);

  /**
   * Переключает режим работы редактора.
   *
   * @param {'shape' | 'paint'} nextMode Новый режим.
   * @returns {void}
   */
  function switchMode(nextMode) {
    state.mode = nextMode;
    updateHint();
    drawAll();
  }

  /**
   * Полностью обновляет состояние и представления после смены сетки.
   *
   * @param {number} size Новый размер сетки.
   * @returns {void}
   */
  function rebuildEditor(size) {
    resetEditorState(size);
    syncControlsWithState();
    resizeAll();
    redrawAll();
  }
}

const projectionCanvases = {
  top: dom.topCanvas,
  front: dom.frontCanvas,
  left: dom.leftCanvas,
};

projectionViews = Object.fromEntries(
  PROJECTION_KEYS.map((projectionKey) => [
    projectionKey,
    new ProjectionCanvas({
      canvas: projectionCanvases[projectionKey],
      key: projectionKey,
      getState: () => state,
      drawAll,
      redrawAll,
      onCellAction: applyCellAction,
      onHover: updateHoverFromProjection,
      onLeave: clearHover,
      getCrosshair,
      getOverlayColor,
    }),
  ]),
);

threeView = new ThreeView({
  container: dom.threeRoot,
  defaultColor: DEFAULT_COLOR,
  getMeshState: () => state.model,
});

resetEditorState();
syncControlsWithState();
bindUi();
resizeAll();
redrawAll();
setStatus("Готово к работе. Для сохранения запустите json-server.");
