import { VoxelEditorState } from "../common/editorState.js";
import { ProjectionCanvas, ThreeView } from "../common/renderers.js";
import { PROJECTION_KEYS } from "../algorithm/voxelProjection.js";

/**
 * Текст подсказки для режима построения формы.
 *
 * @type {string}
 */
const SHAPE_HINT_TEXT = [
  "Режим формы: левая кнопка мыши добавляет пиксели на проекции, правая удаляет.",
  "Объем строится только по реально отмеченным клеткам трех проекций.",
].join(" ");

/**
 * Текст подсказки для режима покраски.
 *
 * @type {string}
 */
const PAINT_HINT_TEXT = [
  "Режим покраски: форма модели зафиксирована.",
  "Цвет можно наносить через проекции на первый видимый воксель по выбранной оси или прямо по 3D-модели.",
].join(" ");

/**
 * Находит и возвращает все DOM-узлы, с которыми работает приложение.
 *
 * @returns {{
 *   topCanvas: HTMLCanvasElement,
 *   frontCanvas: HTMLCanvasElement,
 *   leftCanvas: HTMLCanvasElement,
 *   threeRoot: HTMLElement,
 *   shapeModeBtn: HTMLButtonElement,
 *   paintModeBtn: HTMLButtonElement,
 *   colorPicker: HTMLInputElement,
 *   gridSizeSelect: HTMLSelectElement,
 *   clearBtn: HTMLButtonElement,
 *   hintText: HTMLElement
 * }} Набор элементов интерфейса.
 */
function queryDomNodes() {
  return {
    topCanvas: document.getElementById("topCanvas"),
    frontCanvas: document.getElementById("frontCanvas"),
    leftCanvas: document.getElementById("leftCanvas"),
    threeRoot: document.getElementById("threeRoot"),
    shapeModeBtn: document.getElementById("shapeModeBtn"),
    paintModeBtn: document.getElementById("paintModeBtn"),
    colorPicker: document.getElementById("colorPicker"),
    gridSizeSelect: document.getElementById("gridSizeSelect"),
    clearBtn: document.getElementById("clearBtn"),
    hintText: document.getElementById("hintText"),
  };
}

/**
 * Главная точка входа лабораторной работы.
 *
 * Функция собирает лабораторную из общей основы:
 * - состояние редактора берется из `common/editorState.js`;
 * - 2D-рендереры и 3D-визуализация берутся из `common/renderers.js`;
 * - специфичными для lab4 остаются только подсказки, кнопки и сценарии работы.
 *
 * @returns {void}
 */
function bootstrapEditor() {
  const dom = queryDomNodes();
  const defaultColor = dom.colorPicker.value;
  const state = new VoxelEditorState({
    size: Number.parseInt(dom.gridSizeSelect.value, 10),
    defaultColor,
    emptyModelName: "Новая модель",
  });

  const projectionCanvases = {
    top: dom.topCanvas,
    front: dom.frontCanvas,
    left: dom.leftCanvas,
  };

  let threeView = null;
  const projectionViews = Object.fromEntries(
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
    getMeshState: () => state.model,
    onVoxelPick: paintVoxelFromThreeView,
  });

  bindUi();
  syncControlsWithState();
  resizeAll();
  redrawAll();

  /**
   * Полностью перерисовывает только 2D-представления.
   *
   * @returns {void}
   */
  function drawAll() {Object.values(projectionViews).forEach((projectionView) => projectionView.render());}

  /**
   * Полностью обновляет и 2D-, и 3D-представления.
   *
   * @returns {void}
   */
  function redrawAll() {
    drawAll();
    threeView.update();
  }

  /**
   * Подгоняет размеры всех отображений под текущий размер контейнеров.
   *
   * @returns {void}
   */
  function resizeAll() {
    Object.values(projectionViews).forEach((projectionView) => projectionView.resize());
    threeView.resize();
    drawAll();
  }

  /**
   * Синхронизирует элементы управления страницы с текущим состоянием редактора.
   *
   * @returns {void}
   */
  function syncControlsWithState() {
    dom.colorPicker.value = state.color;
    dom.gridSizeSelect.value = String(state.size);
    dom.shapeModeBtn.classList.toggle("is-active", state.mode === "shape");
    dom.paintModeBtn.classList.toggle("is-active", state.mode === "paint");
    dom.hintText.textContent = state.mode === "shape" ? SHAPE_HINT_TEXT : PAINT_HINT_TEXT;
  }

  /**
   * Сбрасывает модель и интерфейс к начальному состоянию.
   *
   * @param {number} [size=state.size] Новый размер сетки.
   * @returns {void}
   */
  function resetEditor(size = state.size) {
    state.reset(size);
    syncControlsWithState();
    resizeAll();
    redrawAll();
  }

  /**
   * Обновляет координаты общего перекрестия по наведению на одну из проекций.
   *
   * @param {'top' | 'front' | 'left'} projectionKey Ключ активной проекции.
   * @param {number} row Индекс строки наведенной клетки.
   * @param {number} column Индекс столбца наведенной клетки.
   * @returns {void}
   */
  function updateHoverFromProjection(projectionKey, row, column) {state.model.updateHover(projectionKey, row, column);}

  /**
   * Сбрасывает перекрестие после ухода указателя с активной панели.
   *
   * @param {'top' | 'front' | 'left'} projectionKey Ключ панели, с которой ушел курсор.
   * @returns {void}
   */
  function clearHover(projectionKey) {state.model.clearHover(projectionKey);}

  /**
   * Возвращает координаты перекрестия в системе координат выбранной проекции.
   *
   * @param {'top' | 'front' | 'left'} projectionKey Ключ проекции.
   * @returns {{row: number | null, col: number | null}} Координаты для отрисовки перекрестия.
   */
  function getCrosshair(projectionKey) {return state.model.getCrosshair(projectionKey);}

  /**
   * Возвращает цвет первого видимого вокселя на луче клетки.
   *
   * В режиме покраски эта функция позволяет показывать на 2D-проекциях уже
   * окрашенные видимые поверхности.
   *
   * @param {'top' | 'front' | 'left'} projectionKey Ключ проекции.
   * @param {number} row Строка клетки.
   * @param {number} column Столбец клетки.
   * @returns {string | null} Цвет в формате `#rrggbb` или `null`, если видимого вокселя нет.
   */
  function getOverlayColor(projectionKey, row, column) {return state.model.getOverlayColor(projectionKey, row, column);}

  /**
   * Применяет действие пользователя к выбранной клетке одной из проекций.
   *
   * В режиме формы клетка добавляет или удаляет силуэт, а затем модель целиком
   * пересчитывается алгоритмом Space Carving. В режиме покраски изменяется цвет
   * первого видимого вокселя на луче выбранной проекции.
   *
   * @param {'top' | 'front' | 'left'} projectionKey Ключ проекции.
   * @param {number} row Строка клетки.
   * @param {number} column Столбец клетки.
   * @param {number} button Код кнопки мыши.
   * @returns {void}
   */
  function applyCellAction(projectionKey, row, column, button) {
    if (state.mode === "shape") {
      state.model.setProjectionCell(projectionKey, row, column, button !== 2);
      return;
    }

    state.model.paintRay(projectionKey, row, column, state.color);
  }

  /**
   * Красит воксель, выбранный кликом по 3D-мешу.
   *
   * @param {{x: number, y: number, z: number}} coordinates Координаты выбранного вокселя.
   * @returns {void}
   */
  function paintVoxelFromThreeView(coordinates) {
    if (state.mode !== "paint") {return;}

    if (!state.model.paintVoxel(coordinates.x, coordinates.y, coordinates.z, state.color)) {return;}

    redrawAll();
  }

  /**
   * Навешивает все обработчики интерфейса, специфичные для lab4.
   *
   * @returns {void}
   */
  function bindUi() {
    dom.shapeModeBtn.addEventListener("click", () => {
      state.mode = "shape";
      syncControlsWithState();
      drawAll();
    });

    dom.paintModeBtn.addEventListener("click", () => {
      state.mode = "paint";
      syncControlsWithState();
      drawAll();
    });

    dom.colorPicker.addEventListener("input", (event) => {state.color = event.target.value;});

    dom.gridSizeSelect.addEventListener("change", (event) => {resetEditor(Number.parseInt(event.target.value, 10));});

    dom.clearBtn.addEventListener("click", () => {resetEditor(state.size);});

    window.addEventListener("resize", resizeAll);
  }
}

bootstrapEditor();
