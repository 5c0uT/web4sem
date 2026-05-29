export const PROJECTION_RULES = {
  top: 
  {
    rowAxis: "z",
    columnAxis: "x",
    depthAxis: "y",
    depthStart: 0,
    depthEnd: (size) => size,
    depthStep: 1,
  },
  front: 
  {
    rowAxis: "y",
    columnAxis: "x",
    depthAxis: "z",
    depthStart: (size) => size - 1,
    depthEnd: -1,
    depthStep: -1,
  },
  left: 
  {
    rowAxis: "y",
    columnAxis: "z",
    depthAxis: "x",
    depthStart: 0,
    depthEnd: (size) => size,
    depthStep: 1,
  },
};

export const PROJECTION_KEYS = Object.keys(PROJECTION_RULES);

export function createBooleanMatrix(size, fill = false) {return Array.from({ length: size }, () => 
Array(size).fill(fill));}

export function cloneBooleanMatrix(matrix) {return matrix.map((row) => [...row]);}

export function createProjectionMatrices(size) {return Object.fromEntries(PROJECTION_KEYS.map((projectionKey) => 
  [projectionKey, createBooleanMatrix(size),]),);}

export function cloneProjectionMatrices(projections) {return Object.fromEntries(PROJECTION_KEYS.map((projectionKey) => 
  [projectionKey, cloneBooleanMatrix(projections[projectionKey]),]),);}

export function createVoxelGrid(size, defaultColor) {
return Array.from({ length: size }, () =>
    Array.from({ length: size }, () =>Array.from({ length: size }, () => ({solid: false, color: defaultColor,})),),
  );
}

export function createEmptyHover() {return { x: null, y: null, z: null, source: null };}

export function getProjectionRule(projectionKey) {
  const rule = PROJECTION_RULES[projectionKey];

  if (!rule) {throw new Error(`Неизвестная проекция: ${projectionKey}`);}

  return rule;
}

export function getProjectionCell(projectionKey, coordinates) {
  const rule = getProjectionRule(projectionKey);

  return {
    row: coordinates[rule.rowAxis],
    column: coordinates[rule.columnAxis],
    col: coordinates[rule.columnAxis],
  };
}

export function getVoxelCoordinatesFromProjection(projectionKey, row, column, depth,) {
  const rule = getProjectionRule(projectionKey);
  const coordinates = { x: 0, y: 0, z: 0 };

  coordinates[rule.rowAxis] = row;
  coordinates[rule.columnAxis] = column;
  coordinates[rule.depthAxis] = depth;

  return coordinates;
}

export function forEachProjectionCellRay(size, projectionKey, row, column, callback,) {
  const rule = getProjectionRule(projectionKey);
  const depthStart = typeof rule.depthStart === "function" ? rule.depthStart(size) : rule.depthStart;
  const depthEnd = typeof rule.depthEnd === "function" ? rule.depthEnd(size) : rule.depthEnd;

  for (let depth = depthStart; depth !== depthEnd; depth += rule.depthStep) {
    const result = callback(getVoxelCoordinatesFromProjection(projectionKey, row, column, depth),);

    if (result !== undefined) {return result;}
  }

  return null;
}

export function findVisibleVoxelOnProjectionRay(voxels, size, projectionKey, row, column,) {
  return forEachProjectionCellRay(size, projectionKey, row, column, (coordinates) => {
      if (voxels[coordinates.x][coordinates.y][coordinates.z].solid) {return coordinates;}

      return undefined;
    },
  );
}

export function getVisibleColorFromProjection(voxels, size, projectionKey, row, column,) {
  const coordinates = findVisibleVoxelOnProjectionRay(
    voxels,
    size,
    projectionKey,
    row,
    column,
  );

  return coordinates ? voxels[coordinates.x][coordinates.y][coordinates.z].color : null;
}

export function paintFirstVisibleVoxelOnProjectionRay(voxels, size, projectionKey, row, column, color,) {
  const coordinates = findVisibleVoxelOnProjectionRay(
    voxels,
    size,
    projectionKey,
    row,
    column,
  );

  if (!coordinates) {return false;}

  voxels[coordinates.x][coordinates.y][coordinates.z].color = color;
  return true;
}

export function isSolidVoxel(voxels, size, x, y, z) {
  return (
    x >= 0 &&
    x < size &&
    y >= 0 &&
    y < size &&
    z >= 0 &&
    z < size &&
    voxels[x][y][z].solid
  );
}

function isInsideProjection(size, row, column) {return row >= 0 && row < size && column >= 0 && column < size;}

function getProjectionCellValue(matrix, row, column) {
  if (!isInsideProjection(matrix.length, row, column)) {return false;}

  return matrix[row][column];
}

function hasOuterCornerGap(matrix, row, column) {
  if (getProjectionCellValue(matrix, row, column)) {return false;}

  const lastIndex = matrix.length - 1;
  const top = getProjectionCellValue(matrix, row - 1, column);
  const bottom = getProjectionCellValue(matrix, row + 1, column);
  const left = getProjectionCellValue(matrix, row, column - 1);
  const right = getProjectionCellValue(matrix, row, column + 1);

  return (
    (row === 0 && column === 0 && right && bottom) ||
    (row === 0 && column === lastIndex && left && bottom) ||
    (row === lastIndex && column === 0 && right && top) ||
    (row === lastIndex && column === lastIndex && left && top)
  );
}

export function closeProjectionCornerGaps(matrix) {return matrix.map((line, row) => line.map((cell, column) => 
  cell || hasOuterCornerGap(matrix, row, column)),);}

export function normalizeProjectionMatrices(projections) {return Object.fromEntries(PROJECTION_KEYS.map((projectionKey) => 
  [projectionKey, closeProjectionCornerGaps(projections[projectionKey]),]),);}

export function rebuildVoxelsFromProjections({size, projections, previousVoxels, defaultColor, closeCornerGaps = false,}) 
{
  const effectiveProjections = closeCornerGaps ? normalizeProjectionMatrices(projections) : projections;
  const nextVoxels = createVoxelGrid(size, defaultColor);

  for (let x = 0; x < size; x += 1) {
    for (let y = 0; y < size; y += 1) {
      for (let z = 0; z < size; z += 1) {
        const coordinates = { x, y, z };
        nextVoxels[x][y][z].solid = PROJECTION_KEYS.every((projectionKey) => {
          const cell = getProjectionCell(projectionKey, coordinates);
          return effectiveProjections[projectionKey][cell.row][cell.column];});

        nextVoxels[x][y][z].color = previousVoxels?.[x]?.[y]?.[z]?.color ?? defaultColor;
      }
    }
  }

  return nextVoxels;
}

export function updateHoverFromProjection(hover, projectionKey, row, column) {
  const rule = getProjectionRule(projectionKey);

  hover.source = projectionKey;
  hover[rule.rowAxis] = row;
  hover[rule.columnAxis] = column;
}

export function clearHoverForProjection(hover, projectionKey) {
  if (hover.source !== projectionKey) {return false;}

  hover.source = null;
  hover.x = null;
  hover.y = null;
  hover.z = null;

  return true;
}

export class VoxelProjectionModel {
  constructor(size, defaultColor) {
    this.defaultColor = defaultColor;
    this.closeCornerGaps = false;
    this.reset(size);
  }

  reset(size = this.size) {
    this.size = size;
    this.projections = createProjectionMatrices(size);
    this.voxels = createVoxelGrid(size, this.defaultColor);
    this.hover = createEmptyHover();

    return this;
  }

  loadProjections(size, projections) {
    this.size = size;
    this.projections = cloneProjectionMatrices(projections);
    this.voxels = createVoxelGrid(size, this.defaultColor);
    this.hover = createEmptyHover();
    this.rebuildFromProjections();

    return this;
  }

  rebuildFromProjections() {
    this.voxels = rebuildVoxelsFromProjections({
      size: this.size,
      projections: this.projections,
      previousVoxels: this.voxels,
      defaultColor: this.defaultColor,
      closeCornerGaps: this.closeCornerGaps,});

    return this.voxels;
  }

  setProjectionCell(projectionKey, row, column, isFilled) {
    this.projections[projectionKey][row][column] = isFilled;
    this.rebuildFromProjections();

    return this.voxels;
  }

  getNormalizedProjections() {return normalizeProjectionMatrices(this.projections);}

  getCrosshair(projectionKey) {return getProjectionCell(projectionKey, this.hover);}

  updateHover(projectionKey, row, column) {
    updateHoverFromProjection(this.hover, projectionKey, row, column);
    return this.hover;
  }

  clearHover(projectionKey) {return clearHoverForProjection(this.hover, projectionKey);}

  getOverlayColor(projectionKey, row, column) {return getVisibleColorFromProjection(this.voxels, this.size, projectionKey, row, column,);}

  paintRay(projectionKey, row, column, color) {return paintFirstVisibleVoxelOnProjectionRay(this.voxels, this.size, projectionKey, row, column, color,);}

  paintVoxel(x, y, z, color) {
    if (!this.isSolid(x, y, z)) {return false;}

    this.voxels[x][y][z].color = color;

    return true;
  }

  isSolid(x, y, z) {return isSolidVoxel(this.voxels, this.size, x, y, z);}

  serializeColoredVoxels() {
    const coloredVoxels = {};

    for (let x = 0; x < this.size; x += 1) {
      for (let y = 0; y < this.size; y += 1) {
        for (let z = 0; z < this.size; z += 1) {
          const voxel = this.voxels[x][y][z];

          if (!voxel.solid || voxel.color === this.defaultColor) {continue;}

          if (!coloredVoxels[voxel.color]) {coloredVoxels[voxel.color] = [];}

          coloredVoxels[voxel.color].push(`${x};${y};${z}`);
        }
      }
    }

    return Object.fromEntries(Object.entries(coloredVoxels).map(([color, coordinates]) => [color, coordinates.join("\n")]),);
  }

  applySerializedColors(coloredVoxels) {
    if (Array.isArray(coloredVoxels)) {
      coloredVoxels.forEach((entry) => {
        const [xText, yText, zText, color] = entry.split(";");
        const x = Number.parseInt(xText, 10);
        const y = Number.parseInt(yText, 10);
        const z = Number.parseInt(zText, 10);

        if (this.isSolid(x, y, z)) {this.voxels[x][y][z].color = color;}
      });

      return this;
    }

    if (!coloredVoxels || typeof coloredVoxels !== "object") {return this;}

    Object.entries(coloredVoxels).forEach(([color, serializedCoordinates]) => {
      String(serializedCoordinates)
        .split(/\r?\n/u)
        .filter(Boolean)
        .forEach((entry) => {
          const [xText, yText, zText] = entry.split(";");
          const x = Number.parseInt(xText, 10);
          const y = Number.parseInt(yText, 10);
          const z = Number.parseInt(zText, 10);

          if (this.isSolid(x, y, z)) {this.voxels[x][y][z].color = color;}
        });
    });

    return this;
  }
}
