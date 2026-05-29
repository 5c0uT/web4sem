import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { getContentType } from "./httpResponses.js";

export function loadStaticFiles(rootPath) {
  const files = new Map();

  addDirectory(files, rootPath, rootPath);

  const indexFile = files.get("/index.html");

  if (indexFile !== undefined) {
    files.set("/", indexFile);
  }

  return files;
}

function addDirectory(files, rootPath, directoryPath) {
  for (const directoryEntry of readdirSync(directoryPath)) {
    const absolutePath = path.join(directoryPath, directoryEntry);
    const stats = statSync(absolutePath);

    if (stats.isDirectory()) {
      addDirectory(files, rootPath, absolutePath);
      continue;
    }

    if (!stats.isFile()) {
      continue;
    }

    const urlPath = `/${path.relative(rootPath, absolutePath).split(path.sep).join("/")}`;
    const content = readFileSync(absolutePath);

    files.set(urlPath, {
      content,
      contentLength: content.byteLength,
      contentType: getContentType(absolutePath),
    });
  }
}
