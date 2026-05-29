window.addEventListener("DOMContentLoaded", async () => {
  const { initEditor } = await import("../controller/editorController.js");

  await initEditor();
});
