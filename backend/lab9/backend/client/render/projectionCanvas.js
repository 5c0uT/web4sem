import { readProjectionTheme } from "../algorithm/uiTheme.js";

const MAX_PIXEL_RATIO = 2;

export class ProjectionCanvas {
  
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

  
  resize() {
    const state = this.getState();

    this.canvas.style.width = "";
    this.canvas.style.height = "";

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

  
  onPointerLeave() {
    this.onLeave(this.key);
    this.drawAll();
  }

  
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

  
  drawLine(startX, startY, endX, endY) {
    this.ctx.beginPath();
    this.ctx.moveTo(startX, startY);
    this.ctx.lineTo(endX, endY);
    this.ctx.stroke();
  }

  
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
