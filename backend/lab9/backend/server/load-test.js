import http from "node:http";
import { performance } from "node:perf_hooks";

const URL = process.env.URL ?? "http://127.0.0.1:3000/";
const CONCURRENCY = Number.parseInt(process.env.CONCURRENCY ?? "50", 10);
const TOTAL = Number.parseInt(process.env.TOTAL ?? "5000", 10);
let completed = 0;
let errors = 0;
const start = performance.now();

function writeLine(message) {
  process.stdout.write(`${message}
`);
}

function makeRequest() {
  return new Promise((resolve) => {
    const request = http.get(URL, (response) => {
      response.resume();
      response.on("end", resolve);
    });

    request.on("error", () => {
      errors += 1;
      resolve();
    });
  });
}

async function runBatch() {
  const batch = [];

  for (let index = 0; index < CONCURRENCY; index += 1) {
    batch.push(makeRequest());
  }

  await Promise.all(batch);
  completed += CONCURRENCY;
}

async function run() {
  const batches = Math.ceil(TOTAL / CONCURRENCY);

  for (let index = 0; index < batches; index += 1) {
    await runBatch();
  }

  const elapsed = (performance.now() - start) / 1000;
  const rps = Math.round(completed / elapsed);

  writeLine(`Completed : ${completed} requests`);
  writeLine(`Errors    : ${errors}`);
  writeLine(`Duration  : ${elapsed.toFixed(2)}s`);
  writeLine(`Req/sec   : ${rps}`);
}

await run();
