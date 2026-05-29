import * as THREE from "../vendor/three.module.js";
import { OrbitControls } from "../vendor/OrbitControls.js";

/*
  Основная инициализация приложения.
  Вся логика собрана внутри одной функции, чтобы не разносить
  состояние по глобальной области видимости.
*/
init();

function init() {
  // Собираем ссылки на элементы интерфейса.
  const elements = getRequiredElements();

  // Создаем сцену и ее базовое окружение.
  const scene = createScene();

  // Добавляем вспомогательные объекты:
  // оси, сетки и плоскость, на которой размещаются модели.
  addSceneHelpers(scene);

  // Создаем фигуры по заданию:
  // 1) куб из готовой геометрии
  // 2) сфера из готовой геометрии
  // 3) треугольная пирамида через BufferGeometry
  const objects = createSceneObjects(scene);

  // Создаем 4 камеры:
  // 3 ортографические для проекций и 1 перспективную для 3D.
  const cameras = createCameras();

  // Создаем 4 отдельных renderer'а, по одному на каждый canvas.
  const renderers = createRenderers(elements);

  // OrbitControls нужны только для 3D-камеры.
  const controls = createOrbitControls(cameras.perspective, elements.view3d);

  // Текущее выбранное состояние интерфейса.
  const state = {
    selectedId: elements.objectSelect.value,
  };

  // Сразу синхронизируем поля формы с выбранным объектом.
  syncControlsWithSelectedObject();
  renderFrame();

  // ---- Обработчики интерфейса ----

  elements.objectSelect.addEventListener("change", () => {
    state.selectedId = elements.objectSelect.value;
    syncControlsWithSelectedObject();
  });

  elements.objectColor.addEventListener("input", () => {
    const selectedObject = getSelectedObject();
    setObjectColor(selectedObject.mesh, elements.objectColor.value);
  });

  [elements.posX, elements.posY, elements.posZ].forEach((input) => {
    input.addEventListener("input", applyPositionFromInputs);
  });

  window.addEventListener("keydown", (event) => {
    // Если курсор находится в поле ввода, клавиши должны работать для поля,
    // а не для перемещения объекта.
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLSelectElement
    ) {
      return;
    }

    if (moveSelectedObjectByKeyboard(event.key)) {
      event.preventDefault();
      syncControlsWithSelectedObject();
    }
  });

  window.addEventListener("resize", resizeAllRenderers);

  // ---- Вложенные функции ----

  function getRequiredElements() {
    const objectSelect = document.getElementById("objectSelect");
    const objectColor = document.getElementById("objectColor");
    const posX = document.getElementById("posX");
    const posY = document.getElementById("posY");
    const posZ = document.getElementById("posZ");

    const viewTop = document.getElementById("viewTop");
    const viewFront = document.getElementById("viewFront");
    const viewSide = document.getElementById("viewSide");
    const view3d = document.getElementById("view3d");

    const requiredElements = {
      objectSelect,
      objectColor,
      posX,
      posY,
      posZ,
      viewTop,
      viewFront,
      viewSide,
      view3d,
    };

    if (Object.values(requiredElements).some((element) => !element)) {
      throw new Error("Не удалось найти обязательные элементы интерфейса.");
    }

    return requiredElements;
  }

  function createScene() {
    const createdScene = new THREE.Scene();
    createdScene.background = new THREE.Color(0xdce7f5);

    // По заданию источник света должен быть HemisphereLight.
    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x3d4a66, 1.2);
    hemisphereLight.position.set(0, 20, 0);
    createdScene.add(hemisphereLight);

    return createdScene;
  }

  function addSceneHelpers(targetScene) {
    // Оси координат помогают понять направление X, Y, Z.
    targetScene.add(new THREE.AxesHelper(8));

    // Горизонтальная сетка на "полу".
    targetScene.add(new THREE.GridHelper(30, 30, 0x49658d, 0x96a9c4));

    // Дополнительная вертикальная сетка, чтобы в боковых проекциях
    // было проще ориентироваться по высоте.
    const verticalGrid = new THREE.GridHelper(20, 20, 0x6b7c97, 0xb3c0d3);
    verticalGrid.rotation.x = Math.PI / 2;
    verticalGrid.position.z = -10;
    targetScene.add(verticalGrid);

    // Горизонтальная плоскость, на которой располагаются объекты.
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 24),
      new THREE.MeshLambertMaterial({
        color: 0xeaf0fb,
        side: THREE.DoubleSide,
      }),
    );
    ground.rotation.x = -Math.PI / 2;
    targetScene.add(ground);
  }

  function createSceneObjects(targetScene) {
    const createLambertMaterial = (color) =>
      new THREE.MeshLambertMaterial({ color });

    const cube = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 2.4, 2.4),
      createLambertMaterial(0x4d9fff),
    );
    cube.position.set(-5.2, 1.2, -1.8);
    targetScene.add(cube);

    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.5, 32, 20),
      createLambertMaterial(0xff8f54),
    );
    sphere.position.set(0.8, 1.5, 4.2);
    targetScene.add(sphere);

    const pyramid = new THREE.Mesh(
      createPyramidGeometry(),
      new THREE.MeshLambertMaterial({ color: 0xf2c14e }),
    );
    pyramid.position.set(5.5, 1.5, -3.3);
    targetScene.add(pyramid);

    return {
      cube: { id: "cube", title: "Куб", mesh: cube },
      sphere: { id: "sphere", title: "Сфера", mesh: sphere },
      pyramid: { id: "pyramid", title: "Пирамида", mesh: pyramid },
    };
  }

  function createPyramidGeometry() {
    /*
      Треугольная пирамида состоит из 4 граней:
      - основание
      - 3 боковые треугольные грани

      Для BufferGeometry мы задаем массив позиций вершин.
      Каждые 3 вершины образуют один треугольник.
    */
    const positions = new Float32Array([
      // Основание
      0, 0, 1.7, -1.6, 0, -0.9, 1.6, 0, -0.9,

      // Боковая грань 1
      0, 3, 0, -1.6, 0, -0.9, 0, 0, 1.7,

      // Боковая грань 2
      0, 3, 0, 1.6, 0, -0.9, -1.6, 0, -0.9,

      // Боковая грань 3
      0, 3, 0, 0, 0, 1.7, 1.6, 0, -0.9,
    ]);

    /*
      UV здесь добавлены не потому что они критически нужны для цвета,
      а чтобы геометрия соответствовала заданию и содержала пример
      атрибута uv.
    */
    const uvs = new Float32Array([
      0.5, 1.0, 0.0, 0.0, 1.0, 0.0,

      0.5, 1.0, 0.0, 0.0, 1.0, 0.0,

      0.5, 1.0, 0.0, 0.0, 1.0, 0.0,

      0.5, 1.0, 0.0, 0.0, 1.0, 0.0,
    ]);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));

    // Нормали рассчитываются автоматически.
    // Они нужны для корректной работы освещения Lambert.
    geometry.computeVertexNormals();

    return geometry;
  }

  function createCameras() {
    const orthoSize = 18;
    const orthographicViewTarget = new THREE.Vector3(0, 1.5, 0);

    const perspective = new THREE.PerspectiveCamera(58, 1, 0.1, 200);
    perspective.position.set(16, 12, 16);
    perspective.lookAt(0, 0, 0);

    const top = new THREE.OrthographicCamera(
      -orthoSize,
      orthoSize,
      orthoSize,
      -orthoSize,
      0.1,
      200,
    );
    top.position.set(0, 35, 0);
    top.up.set(0, 0, -1);
    top.lookAt(0, 0, 0);

    const front = new THREE.OrthographicCamera(
      -orthoSize,
      orthoSize,
      orthoSize,
      -orthoSize,
      0.1,
      200,
    );
    front.position.set(0, orthographicViewTarget.y, 35);
    front.lookAt(orthographicViewTarget);

    const side = new THREE.OrthographicCamera(
      -orthoSize,
      orthoSize,
      orthoSize,
      -orthoSize,
      0.1,
      200,
    );
    side.position.set(35, orthographicViewTarget.y, 0);
    side.lookAt(orthographicViewTarget);

    return { perspective, top, front, side };
  }

  function createRenderers(domElements) {
    const createRenderer = (canvas) => {
      const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
      });

      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      return renderer;
    };

    return {
      top: createRenderer(domElements.viewTop),
      front: createRenderer(domElements.viewFront),
      side: createRenderer(domElements.viewSide),
      perspective: createRenderer(domElements.view3d),
    };
  }

  function createOrbitControls(camera, canvas) {
    const orbitControls = new OrbitControls(camera, canvas);

    // Плавное затухание движения камеры.
    orbitControls.enableDamping = true;
    orbitControls.target.set(0, 1.5, 0);
    orbitControls.update();

    return orbitControls;
  }

  function getSelectedObject() {
    return objects[state.selectedId];
  }

  function syncControlsWithSelectedObject() {
    const selectedObject = getSelectedObject();
    const { x, y, z } = selectedObject.mesh.position;

    elements.posX.value = x.toFixed(2);
    elements.posY.value = y.toFixed(2);
    elements.posZ.value = z.toFixed(2);
    elements.objectColor.value = `#${selectedObject.mesh.material.color.getHexString()}`;
  }

  function applyPositionFromInputs() {
    const selectedObject = getSelectedObject();

    const x = Number.parseFloat(elements.posX.value);
    const y = Number.parseFloat(elements.posY.value);
    const z = Number.parseFloat(elements.posZ.value);

    // Если хотя бы одно значение введено некорректно,
    // просто не применяем позицию.
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
      return;
    }

    selectedObject.mesh.position.set(x, y, z);
  }

  function setObjectColor(mesh, colorValue) {
    if (mesh.material && "color" in mesh.material) {
      mesh.material.color.set(colorValue);
    }
  }

  function moveSelectedObjectByKeyboard(key) {
    const selectedObject = getSelectedObject();

    // Шаг перемещения используется только здесь,
    // поэтому он объявлен прямо внутри функции.
    const moveStep = 0.3;

    switch (key) {
      case "ArrowLeft":
        selectedObject.mesh.position.x -= moveStep;
        return true;

      case "ArrowRight":
        selectedObject.mesh.position.x += moveStep;
        return true;

      case "ArrowUp":
        selectedObject.mesh.position.z -= moveStep;
        return true;

      case "ArrowDown":
        selectedObject.mesh.position.z += moveStep;
        return true;

      case "PageUp":
        selectedObject.mesh.position.y += moveStep;
        return true;

      case "PageDown":
        selectedObject.mesh.position.y -= moveStep;
        return true;

      default:
        return false;
    }
  }

  function resizeAllRenderers() {
    resizeRenderer(renderers.top, cameras.top);
    resizeRenderer(renderers.front, cameras.front);
    resizeRenderer(renderers.side, cameras.side);
    resizeRenderer(renderers.perspective, cameras.perspective, true);
  }

  function resizeRenderer(renderer, camera, isPerspective = false) {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    if (width < 2 || height < 2) {
      return;
    }

    if (canvas.width !== width || canvas.height !== height) {
      renderer.setSize(width, height, false);
    }

    const aspect = width / height;

    if (isPerspective) {
      if (camera.aspect !== aspect) {
        camera.aspect = aspect;
        camera.updateProjectionMatrix();
      }
      return;
    }

    /*
      Для ортографической камеры меняем только левую/правую границы,
      чтобы сцена не растягивалась при изменении размеров панели.
    */
    const orthoSize = 18;
    camera.left = -orthoSize * aspect;
    camera.right = orthoSize * aspect;
    camera.top = orthoSize;
    camera.bottom = -orthoSize;
    camera.updateProjectionMatrix();
  }

  function renderFrame() {
    resizeAllRenderers();

    // OrbitControls требуют update() каждый кадр,
    // если включено плавное затухание.
    controls.update();

    renderers.top.render(scene, cameras.top);
    renderers.front.render(scene, cameras.front);
    renderers.side.render(scene, cameras.side);
    renderers.perspective.render(scene, cameras.perspective);

    requestAnimationFrame(renderFrame);
  }
}
