function readCssVar(name, fallback = "") {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();

  return value || fallback;
}

export function readProjectionTheme() {
  return {
    background: readCssVar("--projection-background", "#ffffff"),
    shapeFill: readCssVar("--projection-shape-fill", "#4b5563"),
    gridMinor: readCssVar("--projection-grid-minor", "#666666"),
    gridMajor: readCssVar("--projection-grid-major", "#000000"),
    crosshair: readCssVar("--projection-crosshair", "#ef4444"),
  };
}

export function readSceneTheme() {
  return {
    background: readCssVar("--scene-background", "#f5f5f5"),
    lightColor: readCssVar("--scene-light-color", "#ffffff"),
    gridMinor: readCssVar("--scene-grid-minor", "#d1d5db"),
    gridMajor: readCssVar("--scene-grid-major", "#9ca3af"),
    debugMinor: readCssVar("--scene-debug-minor", "#7c3aed"),
    debugMajor: readCssVar("--scene-debug-major", "#c4b5fd"),
  };
}
