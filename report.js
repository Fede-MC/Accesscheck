/**
 * report.js — Renderizado del informe en el DOM
 */

// Store current audit data globally for PDF generation
let currentAuditData = null;

function renderReport(data) {
  currentAuditData = data;

  const url = data.url;
  const ts = new Date(data.timestamp).toLocaleString('es-ES');
  const standards = data.standards.map(s => `WCAG ${s}`).join(' + ');
  const levels = data.levels.join(', ');
  const counts = getImpactCounts(data.violations);

  // Header
  document.getElementById('resultsUrl').textContent = url;
  document.getElementById('resultsMeta').textContent =
    `Analizado el ${ts} · ${standards} · Nivel${data.levels.length > 1 ? 'es' : ''} ${levels}`;

  // Score dial
  const score = data.score;
  document.getElementById('scoreNumber').textContent = score;
  const arc = document.getElementById('dialArc');
  const circumference = 502;
  const offset = circumference - (score / 100) * circumference;
  arc.style.strokeDashoffset = offset;

  // Color the dial by score
  if (score >= 80) arc.style.stroke = '#4af0b0';
  else if (score >= 60) arc.style.stroke = '#ffd166';
  else if (score >= 40) arc.style.stroke = '#ff8c42';
  else arc.style.stroke = '#ff4d6d';

  // Stat cards
  document.getElementById('statCritical').textContent = counts.critical || 0;
  document.getElementById('statSerious').textContent = counts.serious || 0;
  document.getElementById('statModerate').textContent = counts.moderate || 0;
  document.getElementById('statMinor').textContent = counts.minor || 0;
  document.getElementById('statPass').textContent = data.passes.length;

  // Conformity badges
  renderConformity(data.conformity, data.standards, data.levels);

  // Issues list
  renderIssues(data.violations);

  // Passed
  renderPassed(data.passes);

  // Inapplicable
  renderInapplicable(data.inapplicable);

  // Filter buttons
  setupFilters();
}

function renderConformity(conformity, standards, levels) {
  const container = document.getElementById('conformityRow');
  container.innerHTML = '';

  const levelLabels = { A: 'Nivel A', AA: 'Nivel AA', AAA: 'Nivel AAA' };
  const statusLabels = {
    pass: '✓ Conforme',
    partial: '⚠ Parcialmente conforme',
    fail: '✗ No conforme',
    na: '— No evaluado',
  };

  for (const std of standards) {
    for (const level of levels) {
      const key = `WCAG ${std} ${level}`;
      const status = conformity[key] || 'na';

      const badge = document.createElement('div');
      badge.className = `conf-badge ${status}`;
      badge.innerHTML = `
        <div class="conf-level">${level}</div>
        <div class="conf-info">
          <div class="conf-standard">WCAG ${std}</div>
          <div class="conf-status">${statusLabels[status]}</div>
        </div>
      `;
      container.appendChild(badge);
    }
  }
}

function renderIssues(violations) {
  const list = document.getElementById('issuesList');
  list.innerHTML = '';

  if (violations.length === 0) {
    list.innerHTML = '<div class="no-issues">🎉 ¡No se detectaron problemas de accesibilidad!</div>';
    return;
  }

  // Sort by severity
  const order = { critical: 0, serious: 1, moderate: 2, minor: 3 };
  const sorted = [...violations].sort((a, b) => (order[a.impact] || 4) - (order[b.impact] || 4));

  for (const v of sorted) {
    const item = createIssueItem(v);
    list.appendChild(item);
  }
}

function createIssueItem(v) {
  const item = document.createElement('div');
  item.className = 'issue-item';
  item.dataset.impact = v.impact;

  const criteria = getWcagCriteria(v.id);
  const level = getRuleLevel(v.id);
  const is22 = isWcag22Only(v.id);

  const impactLabels = { critical: 'Crítico', serious: 'Serio', moderate: 'Moderado', minor: 'Menor' };
  const impactIcons = { critical: '🔴', serious: '🟠', moderate: '🟡', minor: '🔵' };

  // Limit nodes shown
  const nodesToShow = v.nodes.slice(0, 5);
  const moreNodes = v.nodes.length - 5;

  const nodesHtml = nodesToShow.map(node => {
    const html = node.html || '';
    const snippet = html.length > 200 ? html.substring(0, 200) + '…' : html;
    return `<div class="node-snippet">${escapeHtml(snippet)}</div>`;
  }).join('');

  const moreHtml = moreNodes > 0
    ? `<div class="node-snippet" style="color:var(--text-3);font-style:italic">… y ${moreNodes} elemento${moreNodes > 1 ? 's' : ''} más</div>`
    : '';

  item.innerHTML = `
    <div class="issue-header" onclick="toggleIssue(this.parentElement)">
      <span class="issue-badge badge-${v.impact}">
        ${impactIcons[v.impact]} ${impactLabels[v.impact] || v.impact}
      </span>
      <span class="issue-title">${escapeHtml(v.description || v.help)}</span>
      <span class="issue-wcag">${criteria ? `SC ${criteria}` : ''}${criteria ? ' · ' : ''}${level}${is22 ? ' · WCAG 2.2' : ''}</span>
      <span class="issue-chevron">›</span>
    </div>
    <div class="issue-body">
      <p class="issue-desc">${escapeHtml(v.help)}</p>
      ${v.helpUrl ? `<a href="${v.helpUrl}" target="_blank" rel="noopener" style="color:var(--accent);font-size:12px;">Ver guía de corrección →</a>` : ''}
      ${generateFixAdvice(v)}
      ${v.nodes.length > 0 ? `
        <div>
          <div class="issue-nodes-label">Elementos afectados (${v.nodes.length})</div>
          ${nodesHtml}${moreHtml}
        </div>
      ` : ''}
    </div>
  `;

  return item;
}

function generateFixAdvice(v) {
  const fixes = {
    'image-alt': 'Añade el atributo <code>alt</code> con una descripción significativa a todas las imágenes. Para imágenes decorativas, usa <code>alt=""</code>.',
    'color-contrast': 'Aumenta el contraste entre el texto y el fondo. Para texto normal usa ratio mínimo 4.5:1; para texto grande (18pt+ o 14pt bold) usa 3:1.',
    'label': 'Asocia cada campo de formulario con una etiqueta <code>&lt;label&gt;</code> usando el atributo <code>for</code> que coincida con el <code>id</code> del campo.',
    'document-title': 'Añade un <code>&lt;title&gt;</code> descriptivo en el <code>&lt;head&gt;</code> del documento.',
    'html-has-lang': 'Añade el atributo <code>lang</code> al elemento <code>&lt;html&gt;</code>, por ejemplo <code>lang="es"</code>.',
    'link-name': 'Asegúrate que todos los enlaces tengan texto descriptivo o atributo <code>aria-label</code>.',
    'button-name': 'Añade texto visible o <code>aria-label</code> a todos los botones.',
    'heading-order': 'Usa los encabezados en orden jerárquico (h1 → h2 → h3) sin saltarte niveles.',
    'bypass': 'Añade un enlace de "Saltar al contenido principal" al inicio de la página.',
    'meta-viewport': 'No uses <code>user-scalable=no</code> o <code>maximum-scale=1</code> en el meta viewport.',
    'frame-title': 'Añade el atributo <code>title</code> a todos los iframes describiendo su contenido.',
    'aria-required-attr': 'Añade todos los atributos ARIA requeridos para el rol usado.',
    'aria-roles': 'Usa únicamente roles ARIA válidos según la especificación WAI-ARIA.',
    'color-contrast-enhanced': 'Para conformidad AAA, el contraste debe ser al menos 7:1 para texto normal y 4.5:1 para texto grande.',
    'target-size': 'Los elementos interactivos deben tener un área de toque mínima de 24×24 píxeles (WCAG 2.2).',
    'focus-visible': 'Asegúrate de que todos los elementos interactivos muestren un indicador de foco visible al navegar con teclado.',
  };

  const fix = fixes[v.id];
  if (!fix) return '';

  return `
    <div>
      <div class="issue-fix-label">Cómo corregirlo</div>
      <div class="issue-fix">${fix}</div>
    </div>
  `;
}

function renderPassed(passes) {
  const list = document.getElementById('passedList');
  list.innerHTML = '';

  if (passes.length === 0) {
    list.innerHTML = '<div class="empty-state">No hay criterios confirmados como superados.</div>';
    return;
  }

  for (const p of passes) {
    const chip = document.createElement('span');
    chip.className = 'passed-chip';
    chip.title = p.description || p.help;
    chip.textContent = p.help || p.id;
    list.appendChild(chip);
  }
}

function renderInapplicable(inapplicable) {
  const section = document.getElementById('inapplicableSection');
  const list = document.getElementById('inapplicableList');
  list.innerHTML = '';

  if (inapplicable.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = '';

  for (const item of inapplicable) {
    const chip = document.createElement('span');
    chip.className = 'inapplicable-chip';
    chip.title = item.description || item.help;
    chip.textContent = item.help || item.id;
    list.appendChild(chip);
  }
}

function toggleIssue(item) {
  item.classList.toggle('expanded');
}

function setupFilters() {
  const buttons = document.querySelectorAll('.filter-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.dataset.filter;
      const items = document.querySelectorAll('.issue-item');

      items.forEach(item => {
        if (filter === 'all' || item.dataset.impact === filter) {
          item.classList.remove('hidden');
        } else {
          item.classList.add('hidden');
        }
      });
    });
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
