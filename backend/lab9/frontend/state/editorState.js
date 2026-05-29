import { VoxelProjectionModel } from "../algorithm/voxelProjection.js";

const PROJECTION_ROW_SEPARATOR = "\n";

function isBooleanMatrix(value) {
  return (
    Array.isArray(value) &&
    value.every((row) => Array.isArray(row) && row.every((cell) => typeof cell === "boolean"))
  );
}

function isBinaryRowArray(value) {return (Array.isArray(value) && value.every((row) => typeof row === "string" && /^[01]+$/u.test(row)));}

function serializeBinaryMatrix(matrix) {return matrix.map((row) => row.map((cell) => (cell ? "1" : "0")).join("")).join(PROJECTION_ROW_SEPARATOR);}

function normalizeBinaryRow(rowString, size) {
  const sanitizedRow = rowString.replace(/[^01]/gu, "");

  return sanitizedRow.padEnd(size, "0").slice(0, size);
}

function deserializeBinaryMatrix(serializedMatrix, size) {
  if (isBooleanMatrix(serializedMatrix)) {return serializedMatrix.map((row) => row.map((cell) => Boolean(cell)));}

  let rows = [];

  if (typeof serializedMatrix === "string") {rows = serializedMatrix.split(/\r?\n/u);} 
  else if (isBinaryRowArray(serializedMatrix)) {rows = serializedMatrix;}

  return Array.from({ length: size }, (_, rowIndex) => {
    const normalizedRow = normalizeBinaryRow(rows[rowIndex] ?? "", size);

    return Array.from(normalizedRow, (cell) => cell === "1");
  });
}

function serializeProjectionSet(projections) {
  return {
    top: serializeBinaryMatrix(projections.top),
    front: serializeBinaryMatrix(projections.front),
    left: serializeBinaryMatrix(projections.left),
  };
}

function deserializeProjectionSet(serializedProjections, size) {
  return {
    top: deserializeBinaryMatrix(serializedProjections.top, size),
    front: deserializeBinaryMatrix(serializedProjections.front, size),
    left: deserializeBinaryMatrix(serializedProjections.left, size),
  };
}

export class VoxelEditorState {
  
  constructor(options) {
    this.defaultColor = options.defaultColor;
    this.emptyModelName = options.emptyModelName ?? "Новая модель";
    this.mode = "shape";
    this.color = this.defaultColor;
    this.currentModelId = null;
    this.currentModelName = this.emptyModelName;
    this.model = new VoxelProjectionModel(options.size, this.defaultColor);
  }

  
  get size() {return this.model.size;}

  
  get projections() {return this.model.projections;}

  
  get voxels() {return this.model.voxels;}

  
  get hover() {return this.model.hover;}

  
  reset(size = this.size) {
    this.mode = "shape";
    this.color = this.defaultColor;
    this.currentModelId = null;
    this.currentModelName = this.emptyModelName;
    this.model.reset(size);

    return this;
  }

  
  serializeSnapshot() {
    return {
      size: this.size,
      mode: this.mode,
      color: this.color,
      projections: serializeProjectionSet(this.projections),
      coloredVoxels: this.model.serializeColoredVoxels(),
    };
  }

  
  applySnapshot(snapshot) {
    this.mode = snapshot.mode ?? "shape";
    this.color = snapshot.color ?? this.defaultColor;
    this.model.loadProjections(snapshot.size, deserializeProjectionSet(snapshot.projections, snapshot.size),);
    this.model.applySerializedColors(snapshot.coloredVoxels);

    return this;
  }
}
