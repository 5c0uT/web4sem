import { ProjectionCanvas } from "../render/projectionCanvas.js";
import { VoxelEditorState } from "../state/editorState.js";
import { PROJECTION_KEYS } from "../algorithm/voxelProjection.js";

const DEFAULT_GRID_SIZE = 16;

const SHAPE_HINT_TEXT = [
  "Режим формы: левая кнопка добавляет пиксели, правая удаляет.",
  "Объем строится только по реально отмеченным клеткам трех проекций,",
  "а красные линии показывают связанное положение курсора.",
].join(" ");

const PAINT_HINT_TEXT = [
  "Режим покраски: форма не меняется.",
  "Клик по проекции красит первый видимый воксель на выбранном луче.",
].join(" ");

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
  paginationControls: document.getElementById("paginationControls"),
  paginationPrevBtn: document.getElementById("paginationPrevBtn"),
  paginationNextBtn: document.getElementById("paginationNextBtn"),
  paginationInfo: document.getElementById("paginationInfo"),
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

let currentModelsPage = 1;
let currentModelsTotalPages = 1;

function resetEditorState(size = state.size) {state.reset(size);}

function updateHoverFromProjection(projectionKey, row, col) {state.model.updateHover(projectionKey, row, col);}

function clearHover(projectionKey) {state.model.clearHover(projectionKey);}

function getCrosshair(projectionKey) {return state.model.getCrosshair(projectionKey);}

function getOverlayColor(projectionKey, row, col) {return state.model.getOverlayColor(projectionKey, row, col);}

function paintRay(projectionKey, row, col, color) {return state.model.paintRay(projectionKey, row, col, color);}

function applyCellAction(projectionKey, row, col, button) {
  if (state.mode === "shape") {
    state.model.setProjectionCell(projectionKey, row, col, button !== 2);
    return;
  }

  paintRay(projectionKey, row, col, state.color);
}

function serializeEditorState() {return state.serializeSnapshot();}

function applySerializedEditorState(snapshot) {state.applySnapshot(snapshot);}

let modelApiModule = null;

async function getModelApi() {
  if (modelApiModule === null) {
    modelApiModule = await import("../api/modelApi.js");
  }

  return modelApiModule;
}

function formatDateTime(isoString) {
  const date = new Date(isoString);

  if (Number.isNaN(date.getTime())) {return isoString;}

  return date.toLocaleString("ru-RU");
}

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

function renderModelsList(models) {
  dom.modelsList.replaceChildren();
  dom.modelsEmptyText.hidden = models.length !== 0;

  models.forEach((model) => {dom.modelsList.append(createModelListItem(model));});
}

function renderModelsPage(pageData) {
  currentModelsPage = pageData.page;
  currentModelsTotalPages = Math.max(pageData.totalPages, 1);

  renderModelsList(pageData.models);
  updatePaginationControls();
}

function updatePaginationControls() {
  dom.paginationControls.hidden = currentModelsTotalPages <= 1;
  dom.paginationInfo.textContent = `Страница ${currentModelsPage} из ${currentModelsTotalPages}`;
  dom.paginationPrevBtn.disabled = currentModelsPage <= 1;
  dom.paginationNextBtn.disabled = currentModelsPage >= currentModelsTotalPages;
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

function updateHint() {
  dom.hintText.textContent = state.mode === "shape" ? SHAPE_HINT_TEXT : PAINT_HINT_TEXT;
  dom.shapeModeBtn.classList.toggle("active", state.mode === "shape");
  dom.paintModeBtn.classList.toggle("active", state.mode === "paint");
}

function updateCurrentModelName() {dom.currentModelName.textContent = state.currentModelName;}

function setStatus(message) {dom.statusText.textContent = message;}

function syncControlsWithState() {
  dom.colorPicker.value = state.color;
  dom.gridSizeSelect.value = String(state.size);
  updateHint();
  updateCurrentModelName();
}

function drawAll() {Object.values(projectionViews).forEach((projectionView) => {projectionView.render();});}

function redrawAll() {
  if (threeView !== null) {threeView.update();}

  drawAll();
}

function resizeAll() {
  Object.values(projectionViews).forEach((projectionView) => {projectionView.resize();});
  drawAll();
}

function createModelPayload(modelName, createdAt) {
  return {
    name: modelName,
    createdAt,
    updatedAt: new Date().toISOString(),
    snapshot: serializeEditorState(),
  };
}

function resetCurrentModel() {
  resetEditorState(state.size);
  syncControlsWithState();
  resizeAll();
  redrawAll();
  setStatus("Редактор сброшен. Текущая модель очищена.");
}

async function saveModel(forceAskName) {
  try {
    setStatus("Сохранение модели...");

    const { createModel, fetchModelById, updateModel } = await getModelApi();

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
    setStatus(`Не удалось сохранить модель: ${error.message}. Проверьте запуск Node.js сервера.`,);
  }
}

async function openLoadDialog() {
  try {
    setStatus("Загрузка списка моделей...");
    currentModelsPage = 1;
    const { fetchModels } = await getModelApi();
    const pageData = await fetchModels(currentModelsPage);

    renderModelsPage(pageData);
    dom.loadDialog.showModal();

    setStatus(`Загружена страница ${pageData.page} из ${Math.max(pageData.totalPages, 1)}.`);
  } 
  catch (error) {setStatus(`Не удалось загрузить список моделей: ${error.message}.`);}
}

async function loadModelIntoEditor(modelId) {
  try {
    setStatus("Загрузка модели...");
    const { fetchModelById } = await getModelApi();
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

async function removeModelFromServer(modelId) {
  try {
    setStatus("Удаление модели...");
    const { deleteModel, fetchModels } = await getModelApi();
    await deleteModel(modelId);

    if (`${state.currentModelId}` === `${modelId}`) {
      state.currentModelId = null;
      state.currentModelName = "Новая модель";
      updateCurrentModelName();
    }

    let pageData = await fetchModels(currentModelsPage);

    if (pageData.models.length === 0 && currentModelsPage > 1) {
      currentModelsPage -= 1;
      pageData = await fetchModels(currentModelsPage);
    }

    renderModelsPage(pageData);
    setStatus("Модель удалена.");
  } 
  catch (error) {setStatus(`Не удалось удалить модель: ${error.message}.`);}
}

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

  dom.paginationPrevBtn.addEventListener("click", async () => {
    if (currentModelsPage <= 1) {return;}

    currentModelsPage -= 1;
    const { fetchModels } = await getModelApi();

    renderModelsPage(await fetchModels(currentModelsPage));
  });

  dom.paginationNextBtn.addEventListener("click", async () => {
    if (currentModelsPage >= currentModelsTotalPages) {return;}

    currentModelsPage += 1;
    const { fetchModels } = await getModelApi();

    renderModelsPage(await fetchModels(currentModelsPage));
  });

  dom.modelsList.addEventListener("click", async (event) => {const target = event.target.closest("button[data-action]");

    if (!target) {return;}

    const { action, modelId } = target.dataset;

    if (action === "load") {await loadModelIntoEditor(modelId);}

    if (action === "delete") {await removeModelFromServer(modelId);}
  });

  window.addEventListener("resize", resizeAll);

  
  function switchMode(nextMode) {
    state.mode = nextMode;
    updateHint();
    drawAll();
  }

  
  function rebuildEditor(size) {
    resetEditorState(size);
    syncControlsWithState();
    resizeAll();
    redrawAll();
  }
}

async function initializeThreeView() {
  const { ThreeView } = await import("../render/threeView.js");

  threeView = new ThreeView({
    container: dom.threeRoot,
    defaultColor: DEFAULT_COLOR,
    getMeshState: () => state.model,
  });
}

export async function initEditor() {
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

await initializeThreeView();

resetEditorState();
syncControlsWithState();
bindUi();
resizeAll();
redrawAll();
setStatus("Готово к работе. Для сохранения и загрузки запустите Node.js сервер.");
}
