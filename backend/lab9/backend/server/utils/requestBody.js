import { Lab9BadRequestError } from "../utils/httpErrors.js";

const MAX_REQUEST_BODY_SIZE = 1024 * 1024;

export function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.setEncoding("utf8");

    request.on("data", (chunk) => {
      body += chunk;

      if (Buffer.byteLength(body, "utf8") > MAX_REQUEST_BODY_SIZE) {
        reject(new Lab9BadRequestError("Размер тела запроса превышает допустимый лимит."));
        request.destroy();
      }
    });

    request.on("end", () => {resolve(body);});
    request.on("error", (error) => {reject(error);});
  });
}

export async function readJsonBody(request) {
  const rawBody = await readRequestBody(request);

  if (rawBody.trim() === "") {throw new Lab9BadRequestError("Тело запроса не должно быть пустым.");}

  try {return JSON.parse(rawBody);} 
  catch {throw new Lab9BadRequestError("Тело запроса должно содержать корректный JSON.");}
}
