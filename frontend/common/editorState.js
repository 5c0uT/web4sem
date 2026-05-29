import { VoxelProjectionModel } from "../algorithm/voxelProjection.js";

/**
 * Разделитель строк внутри сериализованной бинарной проекции.
 *
 * @type {string}
 */
const PROJECTION_ROW_SEPARATOR = "\n";

/**
 * Возвращает true, если значение уже является обычной булевой матрицей.
 *
 * Эта проверка нужна для обратной совместимости: редактор умеет читать как
 * новый компактный формат, так и старые сохранения, где в db.json
 * лежали вложенные массивы true / false.
 *
 * @param {unknown} value Произвольное входное значение.
 * @returns {boolean} true, если значение похоже на булеву 2D-матрицу.
 */
function isBooleanMatrix(value) {
  return (
    Array.isArray(value) &&
    value.every((row) => Array.isArray(row) && row.every((cell) => typeof cell === "boolean"))
  );
}

/**
 * Возвращает true, если значение уже является массивом строк из 0 и 1.
 *
 * Такой вариант тоже поддерживается при чтении, потому что он почти такой же
 * компактный, как одна многострочная строка, и может встретиться при ручной
 * правке db.json.
 *
 * @param {unknown} value Произвольное входное значение.
 * @returns {boolean} true, если значение похоже на бинарные строки.
 */
function isBinaryRowArray(value) {
  return (
    Array.isArray(value) &&
    value.every((row) => typeof row === "string" && /^[01]+$/u.test(row))
  );
}

/**
 * Преобразует булеву матрицу в компактную многострочную строку из 0 и 1.
 *
 * @param {boolean[][]} matrix Двумерная матрица выбранной проекции.
 * @returns {string} Компактное бинарное представление проекции.
 */
function serializeBinaryMatrix(matrix) {
  return matrix
    .map((row) => row.map((cell) => (cell ? "1" : "0")).join(""))
    .join(PROJECTION_ROW_SEPARATOR);
}

/**
 * Нормализует строковый ряд проекции под ожидаемую ширину сетки.
 *
 * Если пользователь вручную изменил db.json и длина ряда не совпала с
 * размером сетки, функция аккуратно приводит данные к нужной длине:
 * недостающие клетки заполняются нулями, лишние обрезаются.
 *
 * @param {string} rowString Строка с символами 0 и 1.
 * @param {number} size Ожидаемая длина ряда.
 * @returns {string} Строка длины size, содержащая только 0 и 1.
 */
function normalizeBinaryRow(rowString, size) {
  const sanitizedRow = rowString.replace(/[^01]/gu, "");

  return sanitizedRow.padEnd(size, "0").slice(0, size);
}

/**
 * Преобразует строковое представление проекции обратно в булеву матрицу.
 *
 * Поддерживаются три входных формата:
 * - новая многострочная строка с 0/1;
 * - массив строк с 0/1;
 * - старая булева матрица true/false.
 *
 * Это позволяет не ломать уже сохраненные модели и постепенно мигрировать
 * базу на более компактный формат.
 *
 * @param {string | string[] | boolean[][]} serializedMatrix
 *   Сериализованная проекция.
 * @param {number} size Ожидаемый размер квадратной матрицы.
 * @returns {boolean[][]} Булева матрица для внутренней логики редактора.
 */
function deserializeBinaryMatrix(serializedMatrix, size) {
  if (isBooleanMatrix(serializedMatrix)) {return serializedMatrix.map((row) => row.map((cell) => Boolean(cell)));}

  const rows = typeof serializedMatrix === "string"
    ? serializedMatrix.split(/\r?\n/u)
    : isBinaryRowArray(serializedMatrix)
      ? serializedMatrix
      : [];

  return Array.from({ length: size }, (_, rowIndex) => {
    const normalizedRow = normalizeBinaryRow(rows[rowIndex] ?? "", size);

    return Array.from(normalizedRow, (cell) => cell === "1");
  });
}

/**
 * Преобразует объект с тремя проекциями в компактный JSON-вид.
 *
 * На выходе каждая проекция становится одной многострочной строкой.
 * Именно этот формат теперь попадает в db.json, поэтому файл с моделями
 * остается одновременно и компактным, и удобным для визуальной проверки.
 *
 * @param {{top: boolean[][], front: boolean[][], left: boolean[][]}} projections
 *   Набор булевых матриц проекций.
 * @returns {{top: string, front: string, left: string}} Объект компактных проекций.
 */
function serializeProjectionSet(projections) {
  return {
    top: serializeBinaryMatrix(projections.top),
    front: serializeBinaryMatrix(projections.front),
    left: serializeBinaryMatrix(projections.left),
  };
}

/**
 * Восстанавливает набор из трех ортогональных проекций из сериализованного вида.
 *
 * @param {{
 *   top: string | string[] | boolean[][],
 *   front: string | string[] | boolean[][],
 *   left: string | string[] | boolean[][]
 * }} serializedProjections Сериализованные проекции.
 * @param {number} size Размер квадратной сетки.
 * @returns {{top: boolean[][], front: boolean[][], left: boolean[][]}} Нормализованные матрицы.
 */
function deserializeProjectionSet(serializedProjections, size) {
  return {
    top: deserializeBinaryMatrix(serializedProjections.top, size),
    front: deserializeBinaryMatrix(serializedProjections.front, size),
    left: deserializeBinaryMatrix(serializedProjections.left, size),
  };
}

/**
 * Универсальное состояние редактора воксельной модели.
 *
 * Класс хранит только общие данные, которые одинаково нужны лабораторным
 * работам с проекциями и 3D-представлением:
 * - текущий размер сетки;
 * - активный режим работы;
 * - выбранный цвет;
 * - текущее имя модели и ее идентификатор;
 * - экземпляр {@link VoxelProjectionModel} со всей геометрической логикой.
 *
 * Такой класс удобно переиспользовать в lab4, lab5 и следующих работах,
 * а уже лабораторно-специфичную логику оставлять рядом с конкретным UI.
 */
export class VoxelEditorState {
  /**
   * @param {{
   *   size: number,
   *   defaultColor: string,
   *   emptyModelName?: string
   * }} options Параметры начального состояния.
   */
  constructor(options) {
    this.defaultColor = options.defaultColor;
    this.emptyModelName = options.emptyModelName ?? "Новая модель";
    this.mode = "shape";
    this.color = this.defaultColor;
    this.currentModelId = null;
    this.currentModelName = this.emptyModelName;
    this.model = new VoxelProjectionModel(options.size, this.defaultColor);
  }

  /**
   * Возвращает текущий размер сетки.
   *
   * @returns {number} Размер кубической сетки.
   */
  get size() {return this.model.size;}

  /**
   * Возвращает матрицы трех проекций.
   *
   * @returns {{top: boolean[][], front: boolean[][], left: boolean[][]}} Набор проекций.
   */
  get projections() {return this.model.projections;}

  /**
   * Возвращает трехмерную сетку вокселей.
   *
   * @returns {{solid: boolean, color: string}[][][]} Состояние объема.
   */
  get voxels() {return this.model.voxels;}

  /**
   * Возвращает состояние синхронизированного перекрестия.
   *
   * @returns {{x: number | null, y: number | null, z: number | null, source: 'top' | 'front' | 'left' | null}}
   *   Координаты наведения.
   */
  get hover() {return this.model.hover;}

  /**
   * Полностью сбрасывает редактор до начального состояния.
   *
   * @param {number} [size=this.size] Новый размер сетки.
   * @returns {VoxelEditorState} Текущее состояние для цепочки вызовов.
   */
  reset(size = this.size) {
    this.mode = "shape";
    this.color = this.defaultColor;
    this.currentModelId = null;
    this.currentModelName = this.emptyModelName;
    this.model.reset(size);

    return this;
  }

  /**
   * Формирует компактный снимок текущей модели.
   *
   * Теперь проекции кодируются не через массивы true / false, а через
   * многострочные битовые строки из 0 и 1. Это уменьшает размер JSON и
   * при этом сохраняет наглядность: данные по-прежнему можно глазами читать
   * как сетку.
   *
   * @returns {{
   *   size: number,
   *   mode: 'shape' | 'paint',
   *   color: string,
   *   projections: {top: string, front: string, left: string},
   *   coloredVoxels: Record<string, string>
   * }} Сериализованное состояние редактора.
   */
  serializeSnapshot() {
    return {
      size: this.size,
      mode: this.mode,
      color: this.color,
      projections: serializeProjectionSet(this.projections),
      coloredVoxels: this.model.serializeColoredVoxels(),
    };
  }

  /**
   * Восстанавливает состояние редактора из сериализованного снимка.
   *
   * Метод специально поддерживает и новый компактный формат хранения,
   * и старый формат на булевых матрицах. Благодаря этому уже сохраненные
   * модели не становятся битыми после рефакторинга структуры данных.
   *
   * @param {{
   *   size: number,
   *   mode?: 'shape' | 'paint',
   *   color?: string,
   *   projections: {
   *     top: string | string[] | boolean[][],
   *     front: string | string[] | boolean[][],
   *     left: string | string[] | boolean[][]
   *   },
   *   coloredVoxels?: Record<string, string> | string[]
   * }} snapshot Сохраненное состояние модели.
   * @returns {VoxelEditorState} Текущее состояние для цепочки вызовов.
   */
  applySnapshot(snapshot) {
    this.mode = snapshot.mode ?? "shape";
    this.color = snapshot.color ?? this.defaultColor;
    this.model.loadProjections(snapshot.size,
      deserializeProjectionSet(snapshot.projections, snapshot.size),
    );
    this.model.applySerializedColors(snapshot.coloredVoxels);

    return this;
  }
}
