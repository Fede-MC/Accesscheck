/**
 * app.js — Controlador principal de la aplicación
 */

const STEPS = [
  'Verificando URL…',
  'Conectando a través de proxy CORS…',
  'Descargando HTML de la página…',
  'Cargando en entorno de análisis…',
  'Inyectando motor de análisis axe-core…',
  'Ejecutando auditoría WCAG…',
  'Procesando resultados…',
  'Calculando puntuación y conformidad…',
  'Generando informe…',
];

let auditRunning = false;

async function startAudit() {
  if (auditRunning) return;

  const urlInput = document.getElementById('urlInput');
  const url = urlInput.value.trim();

  if (!url) {
    showError('Por favor ingresa una URL válida.');
    return;
  }

  // Validate URL
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('Solo se permiten URLs http:// y https://');
    }
  } catch (e) {
    showError('URL inválida. Asegúrate de incluir https:// o http://');
    return;
  }

  // Get selected options
  const standardChecks = document.querySelectorAll('input[name="standard"]:checked');
  const levelChecks = document.querySelectorAll('input[name="level"]:checked');

  const standards = Array.from(standardChecks).map(c => c.value);
  const levels = Array.from(levelChecks).map(c => c.value);

  if (standards.length === 0) {
    showError('Selecciona al menos un estándar WCAG.');
    return;
  }

  if (levels.length === 0) {
    showError('Selecciona al menos un nivel de conformidad.');
    return;
  }

  // UI setup
  auditRunning = true;
  const btn = document.getElementById('auditBtn');
  btn.disabled = true;
  btn.classList.add('loading');

  document.getElementById('resultsSection').hidden = true;
  document.getElementById('errorToast').hidden = true;

  showProgress();

  try {
    // Simulate step progress
    let stepIdx = 0;
    const stepTimer = setInterval(() => {
      if (stepIdx < STEPS.length - 2) {
        setProgressStep(stepIdx, STEPS[stepIdx]);
        stepIdx++;
      }
    }, 600);

    // Run actual audit
    const data = await runAccessibilityAudit(url, { standards, levels });

    clearInterval(stepTimer);

    // Final steps
    setProgressStep(STEPS.length - 2, STEPS[STEPS.length - 2], true);
    await sleep(400);
    setProgressStep(STEPS.length - 1, STEPS[STEPS.length - 1], true);
    setProgress(100);

    await sleep(600);

    // Show results
    hideProgress();
    renderReport(data);
    document.getElementById('resultsSection').hidden = false;
    document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth', block: 'start' });

  } catch (e) {
    hideProgress();
    showError(e.message || 'Error inesperado durante el análisis.');
    console.error(e);
  } finally {
    auditRunning = false;
    btn.disabled = false;
    btn.classList.remove('loading');
  }
}

function showProgress() {
  const section = document.getElementById('progressSection');
  section.hidden = false;
  section.scrollIntoView({ behavior: 'smooth', block: 'center' });

  const stepsEl = document.getElementById('progressSteps');
  stepsEl.innerHTML = '';

  for (let i = 0; i < STEPS.length; i++) {
    const item = document.createElement('div');
    item.className = 'step-item';
    item.id = `step-${i}`;
    item.innerHTML = `<div class="step-dot"></div><span>${STEPS[i]}</span>`;
    stepsEl.appendChild(item);
  }

  setProgress(5);
  document.getElementById('progressLabel').textContent = 'Iniciando análisis…';
}

function setProgressStep(idx, label, done = false) {
  const item = document.getElementById(`step-${idx}`);
  if (!item) return;

  // Mark previous as done
  if (idx > 0) {
    const prev = document.getElementById(`step-${idx - 1}`);
    if (prev) {
      prev.classList.remove('active');
      prev.classList.add('done');
      const dot = prev.querySelector('.step-dot');
      if (dot) dot.textContent = '';
    }
  }

  if (done) {
    item.classList.remove('active');
    item.classList.add('done');
  } else {
    item.classList.add('active');
  }

  const pct = Math.min(95, Math.round(((idx + 1) / STEPS.length) * 100));
  setProgress(pct);
  document.getElementById('progressLabel').textContent = label;
}

function setProgress(pct) {
  document.getElementById('progressFill').style.width = pct + '%';
}

function hideProgress() {
  document.getElementById('progressSection').hidden = true;
}

function showError(msg) {
  const toast = document.getElementById('errorToast');
  document.getElementById('errorMsg').textContent = msg;
  toast.hidden = false;
  toast.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// Allow pressing Enter in URL field
document.getElementById('urlInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') startAudit();
});

// Auto-fill https:// prefix
document.getElementById('urlInput').addEventListener('blur', (e) => {
  const val = e.target.value.trim();
  if (val && !val.startsWith('http://') && !val.startsWith('https://')) {
    e.target.value = 'https://' + val;
  }
});
