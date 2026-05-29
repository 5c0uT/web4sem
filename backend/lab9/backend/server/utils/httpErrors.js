export class Lab9HttpError extends Error {
  
  constructor(statusCode, message) {
    super(message);
    this.name = "Lab9HttpError";
    this.statusCode = statusCode;
  }
}

export class Lab9BadRequestError extends Lab9HttpError {
  
  constructor(message) {
    super(400, message);
    this.name = "Lab9BadRequestError";
  }
}

export class Lab9NotFoundError extends Lab9HttpError {
  
  constructor(message) {
    super(404, message);
    this.name = "Lab9NotFoundError";
  }
}
