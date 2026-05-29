const API_BASE_URL = "";
const MODELS_PAGE_LIMIT = 5;

function buildUrl(path) {
  return `${API_BASE_URL}${path}`;
}

async function request(path, options = {}) {
  const response = await fetch(buildUrl(path), options);

  if (!response.ok) {
    throw new Error(`Ошибка HTTP ${response.status}`);
  }

  return response;
}

export async function fetchModels(page) {
  const searchParams = new URLSearchParams({
    _sort: "-updatedAt",
    page: String(page),
    limit: String(MODELS_PAGE_LIMIT),
  });
  const response = await request(`/models?${searchParams.toString()}`);

  return response.json();
}

export async function fetchModelById(modelId) {
  const response = await request(`/models/${modelId}`);

  return response.json();
}

export async function createModel(modelPayload) {
  const response = await request("/models", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(modelPayload),
  });

  return response.json();
}

export async function updateModel(modelId, modelPayload) {
  const response = await request(`/models/${modelId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(modelPayload),
  });

  return response.json();
}

export async function deleteModel(modelId) {
  await request(`/models/${modelId}`, { method: "DELETE" });
}
