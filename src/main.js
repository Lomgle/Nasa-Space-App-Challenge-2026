const root = document.querySelector('#app');
try {
  const { App } = await import('./app.js');
  new App(root).render();
} catch (error) {
  // Bad or missing data files land here; show why instead of a blank page.
  root.innerHTML = '<pre style="padding:16px;color:#ff8a8a;white-space:pre-wrap"></pre>';
  root.firstChild.textContent = `Could not start: ${error.message}`;
  console.error(error);
}
