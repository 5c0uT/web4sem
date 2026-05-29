import * as THREE from "../vendor/three.module.js";
import { OrbitControls } from "../vendor/OrbitControls.js";
import { readProjectionTheme, readSceneTheme } from "../algorithm/uiTheme.js";
import {buildCulledGeometry, resolveVoxelFromIntersection,} from "../algorithm/voxelMesh.js";

/**
 * Верхняя граница плотности пикселей для canvas и WebGL.
 *
 * Слишком высокий `devicePixelRatio` резко увеличивает нагрузку на 2D и 3D
 * рендеринг, поэтому значение ограничено общим безопасным порогом.
 *
 * @type {number}
 */
const MAX_PIXEL_RATIO = 2;

/**
 * Универсальный класс для работы с одной 2D-проекцией модели.
 *
 * Экземпляр не хранит бизнес-логику редактора: он получает состояние и все
 * действия через колбэки, поэтому одинаково подходит для lab4, lab5 и
 * следующих лабораторных работ.
 */
export class ProjectionCanvas {
  /**
   * @param {{
   *   canvas: HTMLCanvasElement,
   *   key: 'top' | 'front' | 'left',
   *   getState: () => {
   *     size: number,
   *     mode: 'shape' | 'paint',
   *     projections: {top: boolean[][], front: boolean[][], left: boolean[][]}
   *   },
   *   drawAll: () => void,
   *   redrawAll: () => void,
   *   onCellAction: (key: 'top' | 'front' | 'left', row: number, col: number, button: number) => void,
   *   onHover: (key: 'top' | 'front' | 'left', row: number, col: number) => void,
   *   onLeave: (key: 'top' | 'front' | 'left') => void,
   *   getCrosshair: (key: 'top' | 'front' | 'left') => {row: number | null, col: number | null},
   *   getOverlayColor: (key: 'top' | 'front' | 'left', row: number, col: number) => string | null
   * }} options Параметры экземпляра проекции.
   */
  constructor(options) {
    this.canvas = options.canvas;
    this.key = options.key;
    this.ctx = this.canvas.getContext("2d");
    this.getState = options.getState;
    this.drawAll = options.drawAll;
    this.redrawAll = options.redrawAll;
    this.onCellAction = options.onCellAction;
    this.onHover = options.onHover;
    this.onLeave = options.onLeave;
    this.getCrosshair = options.getCrosshair;
    this.getOverlayColor = options.getOverlayColor;
    this.theme = readProjectionTheme();
    this.isPointerDown = false;
    this.pointerButton = 0;
    this.side = 300;
    this.cellSize = 10;

    this.canvas.addEventListener("contextmenu", (event) => event.preventDefault());
    this.canvas.addEventListener("pointerdown", (event) => this.onPointerDown(event));
    this.canvas.addEventListener("pointermove", (event) => this.onPointerMove(event));
    this.canvas.addEventListener("pointerleave", () => this.onPointerLeave());
    window.addEventListener("pointerup", () => {this.isPointerDown = false;});
  }

  /**
   * Подгоняет реальный размер `canvas` под доступный размер DOM-элемента.
   *
   * @returns {void}
   */
  resize() {
    const state = this.getState();
    const side = Math.floor(Math.min(this.canvas.clientWidth || 300, this.canvas.clientHeight || 300));
    const ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);

    this.canvas.width = Math.max(1, Math.floor(side * ratio));
    this.canvas.height = Math.max(1, Math.floor(side * ratio));
    this.canvas.style.width = `${side}px`;
    this.canvas.style.height = `${side}px`;
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    this.side = side;
    this.cellSize = side / state.size;
  }

  /**
   * Переводит координаты указателя мыши в координаты ячейки сетки.
   *
   * @param {PointerEvent} event Событие указателя.
   * @returns {{row: number, col: number} | null} Координаты клетки или `null`,
   *   если указатель вышел за пределы холста.
   */
  getCell(event) {
    const state = this.getState();
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) {return null;}

    return {
      row: Math.max(0, Math.min(state.size - 1, Math.floor(y / (rect.height / state.size)))),
      col: Math.max(0, Math.min(state.size - 1, Math.floor(x / (rect.width / state.size)))),
    };
  }

  /**
   * Обрабатывает нажатие указателя по проекции.
   *
   * @param {PointerEvent} event Событие `pointerdown`.
   * @returns {void}
   */
  onPointerDown(event) {
    const cell = this.getCell(event);

    if (!cell) {return;}

    this.isPointerDown = true;
    this.pointerButton = event.button;
    this.canvas.setPointerCapture(event.pointerId);
    this.onCellAction(this.key, cell.row, cell.col, event.button);
    this.onHover(this.key, cell.row, cell.col);
    this.redrawAll();
  }

  /**
   * Обрабатывает перемещение указателя по проекции.
   *
   * @param {PointerEvent} event Событие `pointermove`.
   * @returns {void}
   */
  onPointerMove(event) {
    const cell = this.getCell(event);

    if (!cell) {return;}

    this.onHover(this.key, cell.row, cell.col);

    if (this.isPointerDown) {
      this.onCellAction(this.key, cell.row, cell.col, this.pointerButton);
      this.redrawAll();
      return;
    }

    this.drawAll();
  }

  /**
   * Сбрасывает состояние наведения после ухода указателя.
   *
   * @returns {void}
   */
  onPointerLeave() {
    this.onLeave(this.key);
    this.drawAll();
  }

  /**
   * Полностью рисует холст проекции: фон, клетки, сетку и перекрестие.
   *
   * @returns {void}
   */
  render() {
    const state = this.getState();
    const crosshair = this.getCrosshair(this.key);

    this.ctx.clearRect(0, 0, this.side, this.side);
    this.ctx.fillStyle = this.theme.background;
    this.ctx.fillRect(0, 0, this.side, this.side);

    for (let row = 0; row < state.size; row += 1) {
      for (let col = 0; col < state.size; col += 1) {
        const x = col * this.cellSize;
        const y = row * this.cellSize;
        const checked = state.projections[this.key][row][col];

        if (state.mode === "shape" && checked) {
          this.ctx.fillStyle = this.theme.shapeFill;
          this.ctx.fillRect(x, y, this.cellSize, this.cellSize);
        }

        if (state.mode === "paint") {
          const overlayColor = this.getOverlayColor(this.key, row, col);

          if (overlayColor) {
            this.ctx.fillStyle = overlayColor;
            this.ctx.fillRect(x, y, this.cellSize, this.cellSize);
          }
        }
      }
    }

    this.drawGridLayer(state.size, this.theme.gridMinor, 1);
    this.drawGridLayer(4, this.theme.gridMajor, 1.5);
    this.drawCrosshair(crosshair);
  }

  /**
   * Рисует один слой сетки.
   *
   * @param {number} divisions Количество делений по стороне.
   * @param {string} strokeStyle Цвет линий.
   * @param {number} lineWidth Толщина линий.
   * @returns {void}
   */
  drawGridLayer(divisions, strokeStyle, lineWidth) {
    const step = this.side / divisions;

    this.ctx.strokeStyle = strokeStyle;
    this.ctx.lineWidth = lineWidth;

    for (let index = 0; index <= divisions; index += 1) {
      const point = Math.min(this.side, index * step);
      this.drawLine(point, 0, point, this.side);
      this.drawLine(0, point, this.side, point);
    }
  }

  /**
   * Рисует одиночную линию на холсте.
   *
   * @param {number} startX Начальная координата X.
   * @param {number} startY Начальная координата Y.
   * @param {number} endX Конечная координата X.
   * @param {number} endY Конечная координата Y.
   * @returns {void}
   */
  drawLine(startX, startY, endX, endY) {
    this.ctx.beginPath();
    this.ctx.moveTo(startX, startY);
    this.ctx.lineTo(endX, endY);
    this.ctx.stroke();
  }

  /**
   * Рисует перекрестие выбранной клетки.
   *
   * @param {{row: number | null, col: number | null}} crosshair Координаты перекрестия.
   * @returns {void}
   */
  drawCrosshair(crosshair) {
    this.ctx.strokeStyle = this.theme.crosshair;
    this.ctx.lineWidth = 1;

    if (crosshair.row !== null) {
      const y = crosshair.row * this.cellSize + this.cellSize / 2;
      this.drawLine(0, y, this.side, y);
    }

    if (crosshair.col !== null) {
      const x = crosshair.col * this.cellSize + this.cellSize / 2;
      this.drawLine(x, 0, x, this.side);
    }
  }
}

/**
 * Универсальный 3D-вид редактора на базе Three.js.
 *
 * Класс отвечает только за визуализацию и необязательный raycasting по готовому
 * мешу. Бизнес-решение о том, что делать после выбора вокселя, остается за
 * лабораторной работой через колбэк `onVoxelPick`.
 */
export class ThreeView {
  /**
   * @param {{
   *   container: HTMLElement,
   *   getMeshState: () => {
   *     size: number,
   *     voxels: {solid: boolean, color: string}[][][]
   *   },
   *   onVoxelPick?: (coordinates: {x: number, y: number, z: number}) => void
   * }} options Параметры 3D-представления.
   */
  constructor(options) {
    this.container = options.container;
    this.getMeshState = options.getMeshState;
    this.onVoxelPick = options.onVoxelPick ?? null;
    this.theme = readSceneTheme();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.theme.background);

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    this.camera.position.set(18, 18, 18);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;

    this.root = new THREE.Group();
    this.scene.add(this.root);
    this.mesh = null;

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    this.scene.add(new THREE.AmbientLight(this.theme.lightColor, 0.8));
    const light = new THREE.DirectionalLight(this.theme.lightColor, 1);
    light.position.set(10, 15, 10);
    this.scene.add(light);
    this.scene.add(new THREE.GridHelper(32, 32, this.theme.gridMinor, this.theme.gridMajor));

    const debugGrid = new THREE.GridHelper(32, 4, this.theme.debugMinor, this.theme.debugMajor);
    debugGrid.position.y = 0.01;
    this.scene.add(debugGrid);
    this.scene.add(new THREE.AxesHelper(5));

    if (this.onVoxelPick) {this.renderer.domElement.addEventListener("pointerdown", (event) => this.handlePointerDown(event));}

    this.animate();
  }

  /**
   * Собирает оптимизированный меш модели только по внешним граням.
   *
   * @returns {THREE.Mesh} Новый меш для текущего состояния модели.
   */
  buildVoxelMesh() {
    const geometryData = buildCulledGeometry(this.getMeshState());
    const geometry = new THREE.BufferGeometry();

    geometry.setAttribute("position", new THREE.Float32BufferAttribute(geometryData.positions, 3));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(geometryData.colors, 3));
    geometry.setIndex(geometryData.indices);
    geometry.computeVertexNormals();

    return new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 1,
        metalness: 0,
      }),
    );
  }

  /**
   * Перестраивает 3D-меш после изменения модели.
   *
   * @returns {void}
   */
  update() {
    if (this.mesh) {
      this.root.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
    }

    this.mesh = this.buildVoxelMesh();
    this.root.add(this.mesh);
  }

  /**
   * Совместимое имя метода для старого кода lab4.
   *
   * @returns {void}
   */
  rebuildMesh() {this.update();}

  /**
   * Подгоняет размер WebGL-рендера под контейнер.
   *
   * @returns {void}
   */
  resize() {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);

    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  /**
   * Обрабатывает выбор вокселя кликом по 3D-модели.
   *
   * @param {PointerEvent} event Событие `pointerdown` на canvas WebGL.
   * @returns {void}
   */
  handlePointerDown(event) {
    if (!this.mesh || event.button !== 0) {return;}

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersections = this.raycaster.intersectObject(this.mesh, false);

    if (intersections.length === 0) {return;}

    const coordinates = resolveVoxelFromIntersection(intersections[0], this.getMeshState().size);

    if (coordinates) {this.onVoxelPick(coordinates);}
  }

  /**
   * Поддерживает постоянный цикл рендера сцены.
   *
   * @returns {void}
   */
  animate() {
    requestAnimationFrame(() => this.animate());
    this.resize();
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
