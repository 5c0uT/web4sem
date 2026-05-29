import * as THREE from "../vendor/three.module.js";
import { OrbitControls } from "../vendor/OrbitControls.js";
import { readSceneTheme } from "../algorithm/uiTheme.js";
import { buildCulledGeometry, resolveVoxelFromIntersection } from "../algorithm/voxelMesh.js";

const MAX_PIXEL_RATIO = 2;

export class ThreeView {
  
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

  
  update() {
    if (this.mesh) {
      this.root.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
    }

    this.mesh = this.buildVoxelMesh();
    this.root.add(this.mesh);
  }

  
  rebuildMesh() {this.update();}

  
  resize() {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);

    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  
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

  
  animate() {
    requestAnimationFrame(() => this.animate());
    this.resize();
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
