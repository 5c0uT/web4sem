"use strict";

/*
Лабораторная работа №2.
Мини-Paint на canvas.

Что демонстрирует работа:
1. DOM: поиск элементов, создание узлов, добавление и удаление элементов,
   работа с атрибутами и CSS-классами.
2. События: addEventListener(), removeEventListener(), preventDefault(),
   делегирование событий, работа с pointer events.
3. Canvas: рисование карандашом, ластиком и прямой линией.
*/

/*
Функция init() выполняет всю стартовую инициализацию:
- находит обязательные DOM-элементы;
- создает кнопки инструментов и палитру;
- подготавливает canvas;
- навешивает обработчики событий;
- приводит интерфейс к начальному состоянию.

Такой подход удобен для проверки стартового состояния и делает
структуру программы понятнее.
*/
function init() {
  // Получаем ссылки на обязательные элементы страницы.
  const dom = {
    tools: document.getElementById("tools"),
    palette: document.getElementById("palette"),
    status: document.getElementById("status"),
    clearBtn: document.getElementById("clearBtn"),
    canvas: document.getElementById("canvas"),
    domHint: document.getElementById("domHint"),
  };

  // Если какого-то важного элемента нет, дальше приложение работать не сможет.
  if (
    !dom.tools ||
    !dom.palette ||
    !dom.status ||
    !dom.clearBtn ||
    !dom.canvas ||
    !dom.domHint
  ) {
    throw new Error("Не найдены обязательные элементы интерфейса.");
  }

  // Получаем 2D-контекст холста.
  const ctx = dom.canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    throw new Error("Не удалось получить 2D-контекст canvas.");
  }

  // Набор доступных инструментов.
  const tools = [
    { id: "pencil", label: "Карандаш (P)" },
    { id: "eraser", label: "Ластик (E)" },
    { id: "line", label: "Линия (L)" },
  ];

  // Палитра из 10 заранее заданных цветов.
  const palette = [
    { label: "Черный", color: "#111111" },
    { label: "Темно-серый", color: "#4b4b4b" },
    { label: "Серый", color: "#8a8a8a" },
    { label: "Светло-серый", color: "#cfcfcf" },
    { label: "Красный", color: "#e23d28" },
    { label: "Темно-красный", color: "#9b1d12" },
    { label: "Зеленый", color: "#1e9b4b" },
    { label: "Темно-зеленый", color: "#0f5a2a" },
    { label: "Синий", color: "#1f7bd1" },
    { label: "Темно-синий", color: "#163a7a" },
  ];

  // Текущее состояние приложения.
  const state = {
    tool: tools[0].id,
    color: palette[0].color,
    isDrawing: false,
    lastPoint: null,
    lineStart: null,
    snapshot: null,
    pointerId: null,
  };

  /*
  Полностью удаляет дочерние элементы.
  Здесь специально используется removeChild(), чтобы показать
  работу с DOM без упрощенного innerHTML.
  */
  function clearChildren(element) {
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }

  /*
  Переключает активное состояние кнопок внутри контейнера.
  Используется и для панели инструментов, и для палитры.
  */
  function updatePressed(container, attrName, activeValue) {
    const nodes = container.querySelectorAll(`[${attrName}]`);

    for (const node of nodes) {
      const isActive = node.getAttribute(attrName) === activeValue;
      node.setAttribute("aria-pressed", String(isActive));
      node.classList.toggle("is-active", isActive);
    }
  }

  /*
  Обновляет строку состояния.
  Здесь не используется innerHTML, чтобы не вставлять разметку строкой из JS.
  */
  function renderStatus(point) {
    const toolLabel =
      tools.find((tool) => tool.id === state.tool)?.label ?? state.tool;
    const x = point ? Math.round(point.x) : "-";
    const y = point ? Math.round(point.y) : "-";

    dom.status.textContent = `Инструмент: ${toolLabel} | Цвет: ${state.color} | x: ${x} | y: ${y}`;
  }

  // Переключает активный инструмент.
  function setTool(toolId) {
    state.tool = toolId;
    updatePressed(dom.tools, "data-tool", toolId);
    renderStatus();
  }

  // Переключает активный цвет.
  function setColor(color) {
    state.color = color;
    updatePressed(dom.palette, "data-color", color);
    renderStatus();
  }

  /*
  Создает кнопки инструментов динамически через DOM API.
  Это демонстрация createElement(), setAttribute(), appendChild().
  */
  function buildTools() {
    clearChildren(dom.tools);

    for (const tool of tools) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "btn";
      button.textContent = tool.label;
      button.setAttribute("data-tool", tool.id);
      button.setAttribute("aria-pressed", "false");
      dom.tools.appendChild(button);
    }

    setTool(state.tool);
  }

  /*
  Создает палитру цветов динамически через DOM API.
  Цвет кнопки задается через style.backgroundColor.
  */
  function buildPalette() {
    clearChildren(dom.palette);

    for (const item of palette) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "swatch";
      button.setAttribute("title", item.label);
      button.setAttribute("aria-label", item.label);
      button.setAttribute("data-color", item.color);
      button.setAttribute("aria-pressed", "false");
      button.style.backgroundColor = item.color;
      dom.palette.appendChild(button);
    }

    setColor(state.color);
  }

  /*
  Рисует тонкую рамку по краю холста.
  Рамка помогает визуально показать границы области рисования.
  */
  function drawCanvasFrame() {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.strokeStyle = "#d0d0d0";
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, dom.canvas.width - 1, dom.canvas.height - 1);
    ctx.restore();
  }

  /*
  Изменяет внутренний размер canvas под фактический размер элемента на странице.
  При этом старый рисунок сохраняется.
  */
  function resizeCanvasPreserve() {
    const rect = dom.canvas.getBoundingClientRect();
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const nextWidth = Math.max(1, Math.round(rect.width * dpr));
    const nextHeight = Math.max(1, Math.round(rect.height * dpr));

    if (dom.canvas.width === nextWidth && dom.canvas.height === nextHeight) {
      return;
    }

    const bufferCanvas = document.createElement("canvas");
    bufferCanvas.width = dom.canvas.width || nextWidth;
    bufferCanvas.height = dom.canvas.height || nextHeight;

    const bufferContext = bufferCanvas.getContext("2d");
    if (bufferContext && dom.canvas.width && dom.canvas.height) {
      bufferContext.drawImage(dom.canvas, 0, 0);
    }

    dom.canvas.width = nextWidth;
    dom.canvas.height = nextHeight;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, dom.canvas.width, dom.canvas.height);

    if (bufferContext) {
      ctx.drawImage(
        bufferCanvas,
        0,
        0,
        bufferCanvas.width,
        bufferCanvas.height,
        0,
        0,
        dom.canvas.width,
        dom.canvas.height,
      );
    }

    drawCanvasFrame();
  }

  /*
  Полностью очищает холст:
  - clearRect() удаляет текущее содержимое;
  - затем рисуется белый фон;
  - после этого снова рисуется рамка.
  */
  function clearCanvas() {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, dom.canvas.width, dom.canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, dom.canvas.width, dom.canvas.height);
    drawCanvasFrame();
    ctx.restore();
  }

  // Переводит координаты указателя из окна браузера в координаты canvas.
  function getPointFromEvent(event) {
    const rect = dom.canvas.getBoundingClientRect();
    const dpr = Math.max(1, window.devicePixelRatio || 1);

    return {
      x: (event.clientX - rect.left) * dpr,
      y: (event.clientY - rect.top) * dpr,
    };
  }

  /*
  Подготавливает параметры кисти перед рисованием.
  Ластик рисует белым цветом и большей толщиной.
  */
  function applyBrush() {
    if (state.tool === "eraser") {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 22;
      return;
    }

    ctx.strokeStyle = state.color;
    ctx.lineWidth = state.tool === "line" ? 4 : 4;
  }

  // Рисует один отрезок между двумя точками.
  function drawSegment(from, to) {
    applyBrush();
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }

  /*
  Для инструмента "Линия" сначала восстанавливается сохраненный снимок,
  а потом поверх него рисуется новый вариант линии-предпросмотра.
  */
  function drawLinePreview(start, end) {
    if (!state.snapshot) {
      return;
    }

    ctx.putImageData(state.snapshot, 0, 0);
    applyBrush();
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  }

  /*
  Начало рисования.
  Для карандаша и ластика сразу ставим маленькую точку, чтобы клик без движения
  тоже оставлял след.
  Для линии запоминаем стартовую точку и снимок холста.
  */
  function onPointerDown(event) {
    if (event.button !== undefined && event.button !== 0) {
      return;
    }

    event.preventDefault();
    resizeCanvasPreserve();

    const point = getPointFromEvent(event);
    state.isDrawing = true;
    state.pointerId = event.pointerId;
    state.lastPoint = point;

    dom.canvas.setPointerCapture(event.pointerId);

    if (state.tool === "line") {
      state.lineStart = point;
      state.snapshot = ctx.getImageData(
        0,
        0,
        dom.canvas.width,
        dom.canvas.height,
      );
    } else {
      drawSegment(point, { x: point.x + 0.01, y: point.y + 0.01 });
    }

    renderStatus(point);
  }

  /*
  Движение указателя.
  Пока рисование не началось, только обновляем координаты в статусе.
  */
  function onPointerMove(event) {
    const point = getPointFromEvent(event);
    renderStatus(point);

    if (!state.isDrawing || state.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();

    if (state.tool === "line") {
      if (state.lineStart) {
        drawLinePreview(state.lineStart, point);
      }
      return;
    }

    if (!state.lastPoint) {
      state.lastPoint = point;
      return;
    }

    drawSegment(state.lastPoint, point);
    state.lastPoint = point;
  }

  /*
  Завершение рисования.
  Для линии финальный вариант линии остается на холсте.
  После этого состояние рисования сбрасывается.
  */
  function endDrawing(event) {
    if (!state.isDrawing || state.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    const point = getPointFromEvent(event);

    if (state.tool === "line" && state.lineStart && state.snapshot) {
      drawLinePreview(state.lineStart, point);
    }

    state.isDrawing = false;
    state.lastPoint = null;
    state.lineStart = null;
    state.snapshot = null;
    state.pointerId = null;
  }

  /*
  Делегирование событий:
  обработчик ставится на общий контейнер, а нужная кнопка ищется через closest().
  */
  dom.tools.addEventListener("click", (event) => {
    const button = event.target.closest("[data-tool]");
    if (!button) {
      return;
    }

    setTool(button.getAttribute("data-tool"));
  });

  dom.palette.addEventListener("click", (event) => {
    const button = event.target.closest("[data-color]");
    if (!button) {
      return;
    }

    setColor(button.getAttribute("data-color"));
  });

  dom.clearBtn.addEventListener("click", () => {
    clearCanvas();
    renderStatus();
  });

  /*
  Демонстрация removeEventListener().
  Подсказка подсвечивается только при первом начале рисования,
  после чего обработчик удаляется.
  */
  function onFirstPointerDownHint() {
    dom.domHint.classList.add("is-active");

    window.setTimeout(() => {
      dom.domHint.classList.remove("is-active");
    }, 350);

    dom.canvas.removeEventListener("pointerdown", onFirstPointerDownHint);
  }

  dom.canvas.addEventListener("pointerdown", onFirstPointerDownHint);
  dom.canvas.addEventListener("pointerdown", onPointerDown, { passive: false });
  dom.canvas.addEventListener("pointermove", onPointerMove, { passive: false });
  dom.canvas.addEventListener("pointerup", endDrawing, { passive: false });
  dom.canvas.addEventListener("pointercancel", endDrawing, { passive: false });

  // Горячие клавиши переключения инструментов.
  window.addEventListener("keydown", (event) => {
    const tagName = event.target?.tagName;
    if (tagName === "INPUT" || tagName === "TEXTAREA") {
      return;
    }

    const key = event.key.toLowerCase();
    if (key === "p") {
      setTool("pencil");
    }
    if (key === "e") {
      setTool("eraser");
    }
    if (key === "l") {
      setTool("line");
    }
  });

  // При изменении размера окна сохраняем рисунок и подгоняем размер canvas.
  window.addEventListener("resize", () => {
    resizeCanvasPreserve();
  });

  /*
  Стартовая инициализация интерфейса.
  Именно здесь задается корректное начальное состояние приложения.
  */
  buildTools();
  buildPalette();
  resizeCanvasPreserve();
  renderStatus();

  // Небольшой вывод в консоль для демонстрации window, navigator и document.
  console.log("[lab2]", {
    title: document.title,
    userAgent: navigator.userAgent,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
  });
}

init();
