export const VOXEL_FACE_DEFINITIONS = [
  {
    delta: [1, 0, 0],
    corners: 
    [
      [0.5, -0.5, -0.5],
      [0.5, 0.5, -0.5],
      [0.5, 0.5, 0.5],
      [0.5, -0.5, 0.5],
    ],
  },
  {
    delta: [-1, 0, 0],
    corners: 
    [
      [-0.5, -0.5, 0.5],
      [-0.5, 0.5, 0.5],
      [-0.5, 0.5, -0.5],
      [-0.5, -0.5, -0.5],
    ],
  },
  {
    delta: [0, -1, 0],
    corners: 
    [
      [-0.5, 0.5, 0.5],
      [0.5, 0.5, 0.5],
      [0.5, 0.5, -0.5],
      [-0.5, 0.5, -0.5],
    ],
  },
  {
    delta: [0, 1, 0],
    corners: 
    [
      [-0.5, -0.5, -0.5],
      [0.5, -0.5, -0.5],
      [0.5, -0.5, 0.5],
      [-0.5, -0.5, 0.5],
    ],
  },
  {
    delta: [0, 0, 1],
    corners: 
    [
      [0.5, -0.5, 0.5],
      [0.5, 0.5, 0.5],
      [-0.5, 0.5, 0.5],
      [-0.5, -0.5, 0.5],
    ],
  },
  {
    delta: [0, 0, -1],
    corners: 
    [
      [-0.5, -0.5, -0.5],
      [-0.5, 0.5, -0.5],
      [0.5, 0.5, -0.5],
      [0.5, -0.5, -0.5],
    ],
  },
];

export function hexToRgbNormalized(hex) {
  const normalized = hex.replace("#", "");
  const value = normalized.length === 3 ? normalized.split("").map((symbol) => `${symbol}${symbol}`).join("") : normalized;
  
  const color = Number.parseInt(value, 16);

  return [((color >> 16) & 255) / 255, ((color >> 8) & 255) / 255, (color & 255) / 255,];
}

export function hasSolidVoxel(voxels, size, x, y, z) {
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

export function buildCulledGeometry(meshState) {
  const positions = [];
  const colors = [];
  const indices = [];
  let vertexOffset = 0;
  let faceCount = 0;
  let voxelCount = 0;

  for (let x = 0; x < meshState.size; x += 1) {
    for (let y = 0; y < meshState.size; y += 1) {
      for (let z = 0; z < meshState.size; z += 1) {
        const voxel = meshState.voxels[x][y][z];

        if (!voxel.solid) {continue;}

        voxelCount += 1;

        const centerX = x - meshState.size / 2 + 0.5;
        const centerY = meshState.size / 2 - y - 0.5;
        const centerZ = z - meshState.size / 2 + 0.5;
        const [red, green, blue] = hexToRgbNormalized(voxel.color);

        VOXEL_FACE_DEFINITIONS.forEach((face) => {const [deltaX, deltaY, deltaZ] = face.delta;

          if (hasSolidVoxel(
              meshState.voxels,
              meshState.size,
              x + deltaX,
              y + deltaY,
              z + deltaZ,)) {return;}

          face.corners.forEach(([cornerX, cornerY, cornerZ]) => {
            positions.push(
              centerX + cornerX,
              centerY + cornerY,
              centerZ + cornerZ,
            );
            colors.push(red, green, blue);
          });

          indices.push(
            vertexOffset,
            vertexOffset + 1,
            vertexOffset + 2,
            vertexOffset,
            vertexOffset + 2,
            vertexOffset + 3,
          );

          vertexOffset += 4;
          faceCount += 1;
        });
      }
    }
  }

  return { positions, colors, indices, voxelCount, faceCount };
}

export function resolveVoxelFromIntersection(intersection, size) {
  if (!intersection.face) {return null;}

  const hitPoint = intersection.point.clone();
  const inwardNormal = intersection.face.normal.clone().multiplyScalar(-0.01);
  const voxelPoint = hitPoint.add(inwardNormal);

  const x = Math.floor(voxelPoint.x + size / 2);
  const y = Math.floor(size / 2 - voxelPoint.y);
  const z = Math.floor(voxelPoint.z + size / 2);

  if (x < 0 || x >= size || y < 0 || y >= size || z < 0 || z >= size) {return null;}

  return { x, y, z };
}
