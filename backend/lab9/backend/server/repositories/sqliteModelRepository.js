import sqlite3 from "sqlite3";

const SORT_COLUMNS = {
  id: "id",
  name: "name",
  createdAt: "created_at",
  updatedAt: "updated_at",
};

export class SqliteModelRepository {
  #databaseFilePath;

  #database = null;

  
  constructor(databaseFilePath) {
    this.#databaseFilePath = databaseFilePath;
  }

  
  async load() {
    this.#database = await this.#openDatabase();
    await this.#run(`
      CREATE TABLE IF NOT EXISTS models (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        snapshot TEXT NOT NULL
      )
    `);
  }

  
  async findAll(options) {
    const sortColumn = SORT_COLUMNS[options.sortField];

    if (sortColumn === undefined) {
      throw new Error(`Недопустимое поле сортировки: ${options.sortField}`);
    }

    const rows = await this.#all(
      `SELECT id, name, created_at, updated_at, snapshot
       FROM models
       ORDER BY ${sortColumn} ${options.sortDirection}
       LIMIT ? OFFSET ?`,
      [options.limit, options.offset],
    );

    return rows.map((row) => this.#mapRowToModel(row));
  }

  
  async countAll() {
    const row = await this.#get("SELECT COUNT(*) AS total FROM models");

    return Number(row.total);
  }

  
  async findById(modelId) {
    const row = await this.#get(
      `SELECT id, name, created_at, updated_at, snapshot
       FROM models
       WHERE id = ?`,
      [modelId],
    );

    return row === undefined ? null : this.#mapRowToModel(row);
  }

  
  async create(model) {
    await this.#run(
      `INSERT INTO models (id, name, created_at, updated_at, snapshot)
       VALUES (?, ?, ?, ?, ?)`,
      [model.id, model.name, model.createdAt, model.updatedAt, JSON.stringify(model.snapshot)],
    );

    return model;
  }

  
  async update(modelId, model) {
    const statement = await this.#run(
      `UPDATE models
       SET name = ?, updated_at = ?, snapshot = ?
       WHERE id = ?`,
      [model.name, model.updatedAt, JSON.stringify(model.snapshot), modelId],
    );

    if (statement.changes === 0) {return null;}

    return this.findById(modelId);
  }

  
  async delete(modelId) {
    const statement = await this.#run("DELETE FROM models WHERE id = ?", [modelId]);

    return statement.changes > 0;
  }

  
  #openDatabase() {
    return new Promise((resolve, reject) => {
      const database = new sqlite3.Database(this.#databaseFilePath, (error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(database);
      });
    });
  }

  
  #run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.#getDatabase().run(sql, params, function runCallback(error) {
        if (error) {
          reject(error);
          return;
        }

        resolve(this);
      });
    });
  }

  
  #get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.#getDatabase().get(sql, params, (error, row) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(row);
      });
    });
  }

  
  #all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.#getDatabase().all(sql, params, (error, rows) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(rows);
      });
    });
  }

  
  #getDatabase() {
    if (this.#database === null) {throw new Error("SQLite-репозиторий lab9 не был загружен.");}

    return this.#database;
  }

  
  #mapRowToModel(row) {
    return {
      id: row.id,
      name: row.name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      snapshot: JSON.parse(row.snapshot),
    };
  }
}
