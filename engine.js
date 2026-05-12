/**
 * engine.js — Motor de análisis de accesibilidad
 * Usa axe-core inyectado en iframe + análisis propio para WCAG 2.1/2.2
 */

const PROXY_LIST = [
  url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  url => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  url => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
];

const AXE_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.9.1/axe.min.js';

// WCAG 2.2 new criteria (not in 2.1)
const WCAG22_NEW = [
  '2.4.11', '2.4.12', '2.4.13', '2.5.3', '2.5.7', '2.5.8', '3.2.6', '3.3.7', '3.3.8', '3.3.9'
];

// Maps axe rule IDs → WCAG criteria + levels
const RULE_WCAG_MAP = {
  'area-alt': { criteria: ['1.1.1'], level: 'A' },
  'aria-allowed-attr': { criteria: ['4.1.2'], level: 'A' },
  'aria-command-name': { criteria: ['4.1.2'], level: 'A' },
  'aria-hidden-body': { criteria: ['4.1.2'], level: 'A' },
  'aria-hidden-focus': { criteria: ['1.3.1', '4.1.2'], level: 'A' },
  'aria-input-field-name': { criteria: ['4.1.2'], level: 'A' },
  'aria-meter-name': { criteria: ['1.1.1'], level: 'A' },
  'aria-progressbar-name': { criteria: ['1.1.1'], level: 'A' },
  'aria-required-attr': { criteria: ['4.1.2'], level: 'A' },
  'aria-required-children': { criteria: ['1.3.1'], level: 'A' },
  'aria-required-parent': { criteria: ['1.3.1'], level: 'A' },
  'aria-roledescription': { criteria: ['4.1.2'], level: 'A' },
  'aria-roles': { criteria: ['4.1.2'], level: 'A' },
  'aria-toggle-field-name': { criteria: ['4.1.2'], level: 'A' },
  'aria-tooltip-name': { criteria: ['4.1.2'], level: 'A' },
  'aria-valid-attr': { criteria: ['4.1.2'], level: 'A' },
  'aria-valid-attr-value': { criteria: ['4.1.2'], level: 'A' },
  'autocomplete-valid': { criteria: ['1.3.5'], level: 'AA' },
  'avoid-inline-spacing': { criteria: ['1.4.12'], level: 'AA' },
  'button-name': { criteria: ['4.1.2'], level: 'A' },
  'bypass': { criteria: ['2.4.1'], level: 'A' },
  'color-contrast': { criteria: ['1.4.3'], level: 'AA' },
  'color-contrast-enhanced': { criteria: ['1.4.6'], level: 'AAA' },
  'definition-list': { criteria: ['1.3.1'], level: 'A' },
  'dlitem': { criteria: ['1.3.1'], level: 'A' },
  'document-title': { criteria: ['2.4.2'], level: 'A' },
  'duplicate-id': { criteria: ['4.1.1'], level: 'A' },
  'duplicate-id-active': { criteria: ['4.1.1'], level: 'A' },
  'duplicate-id-aria': { criteria: ['4.1.1'], level: 'A' },
  'empty-heading': { criteria: ['1.3.1', '2.4.6'], level: 'A' },
  'focus-order-semantics': { criteria: ['1.3.1'], level: 'A' },
  'form-field-multiple-labels': { criteria: ['1.3.1'], level: 'A' },
  'frame-focusable-content': { criteria: ['4.1.2'], level: 'A' },
  'frame-title': { criteria: ['4.1.2'], level: 'A' },
  'heading-order': { criteria: ['1.3.1'], level: 'A' },
  'html-has-lang': { criteria: ['3.1.1'], level: 'A' },
  'html-lang-valid': { criteria: ['3.1.1'], level: 'A' },
  'html-xml-lang-mismatch': { criteria: ['3.1.1'], level: 'A' },
  'image-alt': { criteria: ['1.1.1'], level: 'A' },
  'image-redundant-alt': { criteria: ['1.1.1'], level: 'A' },
  'input-button-name': { criteria: ['4.1.2'], level: 'A' },
  'input-image-alt': { criteria: ['1.1.1'], level: 'A' },
  'label': { criteria: ['1.3.1', '4.1.2'], level: 'A' },
  'label-content-name-mismatch': { criteria: ['2.5.3'], level: 'A' },
  'landmark-banner-is-top-level': { criteria: ['1.3.6'], level: 'AAA' },
  'landmark-complementary-is-top-level': { criteria: ['1.3.6'], level: 'AAA' },
  'landmark-contentinfo-is-top-level': { criteria: ['1.3.6'], level: 'AAA' },
  'landmark-main-is-top-level': { criteria: ['1.3.6'], level: 'AAA' },
  'landmark-no-duplicate-banner': { criteria: ['1.3.6'], level: 'AAA' },
  'landmark-no-duplicate-contentinfo': { criteria: ['1.3.6'], level: 'AAA' },
  'landmark-one-main': { criteria: ['1.3.6'], level: 'AAA' },
  'landmark-unique': { criteria: ['1.3.6'], level: 'AAA' },
  'link-in-text-block': { criteria: ['1.4.1'], level: 'A' },
  'link-name': { criteria: ['4.1.2', '2.4.4'], level: 'A' },
  'list': { criteria: ['1.3.1'], level: 'A' },
  'listitem': { criteria: ['1.3.1'], level: 'A' },
  'marquee': { criteria: ['2.2.2'], level: 'A' },
  'meta-refresh': { criteria: ['2.2.1', '3.2.5'], level: 'A' },
  'meta-viewport': { criteria: ['1.4.4'], level: 'AA' },
  'nested-interactive': { criteria: ['4.1.2'], level: 'A' },
  'no-autoplay-audio': { criteria: ['1.4.2'], level: 'A' },
  'object-alt': { criteria: ['1.1.1'], level: 'A' },
  'p-as-heading': { criteria: ['1.3.1'], level: 'A' },
  'page-has-heading-one': { criteria: ['2.4.6'], level: 'AA' },
  'presentation-role-conflict': { criteria: ['1.3.1', '4.1.2'], level: 'A' },
  'region': { criteria: ['1.3.6'], level: 'AAA' },
  'role-img-alt': { criteria: ['1.1.1'], level: 'A' },
  'scope-attr-valid': { criteria: ['1.3.1'], level: 'A' },
  'scrollable-region-focusable': { criteria: ['2.1.1'], level: 'A' },
  'select-name': { criteria: ['4.1.2'], level: 'A' },
  'server-side-image-map': { criteria: ['2.1.1'], level: 'A' },
  'skip-link': { criteria: ['2.4.1'], level: 'A' },
  'svg-img-alt': { criteria: ['1.1.1'], level: 'A' },
  'tabindex': { criteria: ['2.4.3'], level: 'A' },
  'table-duplicate-name': { criteria: ['1.3.1'], level: 'A' },
  'table-fake-caption': { criteria: ['1.3.1'], level: 'A' },
  'td-headers-attr': { criteria: ['1.3.1'], level: 'A' },
  'th-has-data-cells': { criteria: ['1.3.1'], level: 'A' },
  'valid-lang': { criteria: ['3.1.2'], level: 'AA' },
  'video-caption': { criteria: ['1.2.2'], level: 'A' },
  'target-size': { criteria: ['2.5.8'], level: 'AA' },
  'focus-visible': { criteria: ['2.4.11'], level: 'AA' },
};

// Severity weights for score
const SEVERITY_WEIGHTS = {
  critical: 25,
  serious: 15,
  moderate: 8,
  minor: 3,
};

/**
 * Main entry point
 */
async function runAccessibilityAudit(url, options) {
  const { standards = ['2.1', '2.2'], levels = ['A', 'AA'] } = options;

  // 1) Fetch HTML
  let html = await fetchHtml(url);

  // 2) Inject into iframe
  const frame = document.getElementById('auditFrame');
  await loadHtmlIntoFrame(frame, html, url);

  // 3) Inject axe-core into iframe
  await injectAxe(frame);

  // 4) Run axe analysis
  const axeResults = await runAxe(frame, levels);

  // 5) Filter results by selected standards and levels
  const filtered = filterResults(axeResults, standards, levels);

  // 6) Compute score and conformity
  const score = computeScore(filtered);
  const conformity = computeConformity(filtered, standards, levels);

  return {
    url,
    timestamp: new Date().toISOString(),
    standards,
    levels,
    score,
    conformity,
    violations: filtered.violations,
    passes: filtered.passes,
    incomplete: filtered.incomplete,
    inapplicable: filtered.inapplicable,
    raw: axeResults,
  };
}

/**
 * Fetch HTML through a CORS proxy
 */
async function fetchHtml(url) {
  let lastError;
  for (const proxyFn of PROXY_LIST) {
    try {
      const proxyUrl = proxyFn(url);
      const resp = await fetch(proxyUrl, { signal: AbortSignal.timeout(15000) });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const text = await resp.text();
      if (text.length < 100) throw new Error('Response too short');
      return text;
    } catch (e) {
      lastError = e;
    }
  }
  throw new Error(`No se pudo cargar la URL. Verifique que sea accesible y correcta. (${lastError?.message})`);
}

/**
 * Load HTML into a sandboxed iframe
 */
function loadHtmlIntoFrame(frame, html, originalUrl) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout cargando la página')), 20000);

    frame.onload = () => {
      clearTimeout(timeout);
      resolve();
    };

    // Fix relative URLs by injecting a base tag
    const baseTag = `<base href="${originalUrl}">`;
    const modifiedHtml = html.replace(/<head[^>]*>/i, match => match + baseTag);

    const blob = new Blob([modifiedHtml], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);
    frame.src = blobUrl;

    // Cleanup blob URL after load
    setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
  });
}

/**
 * Inject axe-core into iframe
 */
function injectAxe(frame) {
  return new Promise((resolve, reject) => {
    const doc = frame.contentDocument || frame.contentWindow?.document;
    if (!doc) return reject(new Error('No se pudo acceder al documento del iframe'));

    const script = doc.createElement('script');
    script.src = AXE_CDN;
    script.onload = () => setTimeout(resolve, 300); // Wait for axe to init
    script.onerror = () => reject(new Error('No se pudo cargar axe-core'));
    (doc.head || doc.body || doc.documentElement).appendChild(script);
  });
}

/**
 * Run axe-core in the iframe context
 */
function runAxe(frame, levels) {
  return new Promise((resolve, reject) => {
    const win = frame.contentWindow;
    if (!win || !win.axe) return reject(new Error('axe-core no está disponible'));

    const tags = [];
    if (levels.includes('A')) tags.push('wcag2a', 'wcag21a', 'wcag22a');
    if (levels.includes('AA')) tags.push('wcag2aa', 'wcag21aa', 'wcag22aa');
    if (levels.includes('AAA')) tags.push('wcag2aaa', 'wcag21aaa');

    win.axe.run(
      win.document,
      {
        runOnly: { type: 'tag', values: tags.length ? tags : ['wcag2a', 'wcag2aa'] },
        resultTypes: ['violations', 'passes', 'incomplete', 'inapplicable'],
      },
      (err, results) => {
        if (err) return reject(err);
        resolve(results);
      }
    );
  });
}

/**
 * Filter results by selected standards and levels
 */
function filterResults(results, standards, levels) {
  const filterViolation = (v) => {
    const mapping = RULE_WCAG_MAP[v.id];
    if (!mapping) return true; // keep if unknown

    // Check level
    if (!levels.includes(mapping.level)) return false;

    // Check if standard applies
    const criteriaList = mapping.criteria || [];
    const is22Only = criteriaList.some(c => WCAG22_NEW.includes(c));
    if (is22Only && !standards.includes('2.2')) return false;
    if (!is22Only && !standards.includes('2.1') && !standards.includes('2.2')) return false;

    return true;
  };

  return {
    violations: results.violations.filter(filterViolation),
    passes: results.passes.filter(filterViolation),
    incomplete: results.incomplete.filter(filterViolation),
    inapplicable: results.inapplicable.filter(filterViolation),
  };
}

/**
 * Compute accessibility score 0–100
 */
function computeScore(results) {
  const totalViolations = results.violations.reduce((acc, v) => {
    const nodes = v.nodes.length;
    const w = SEVERITY_WEIGHTS[v.impact] || 5;
    return acc + (nodes * w);
  }, 0);

  const totalPasses = results.passes.length;
  const maxPossible = totalPasses * 5 + totalViolations;

  if (maxPossible === 0) return 100;

  const raw = Math.max(0, 100 - (totalViolations / maxPossible) * 100);
  return Math.round(raw);
}

/**
 * Compute conformity status per level
 */
function computeConformity(results, standards, levels) {
  const out = {};

  for (const std of standards) {
    for (const level of levels) {
      const key = `WCAG ${std} ${level}`;

      // Get violations that apply to this level
      const applicable = results.violations.filter(v => {
        const mapping = RULE_WCAG_MAP[v.id];
        if (!mapping) return false;

        const is22Only = (mapping.criteria || []).some(c => WCAG22_NEW.includes(c));
        if (std === '2.1' && is22Only) return false;

        return mapping.level === level;
      });

      // For AAA, check specifically
      if (applicable.length === 0) {
        out[key] = 'pass';
      } else if (applicable.length <= 2) {
        out[key] = 'partial';
      } else {
        out[key] = 'fail';
      }
    }
  }

  return out;
}

/**
 * Get impact counts
 */
function getImpactCounts(violations) {
  const counts = { critical: 0, serious: 0, moderate: 0, minor: 0 };
  for (const v of violations) {
    counts[v.impact] = (counts[v.impact] || 0) + v.nodes.length;
  }
  return counts;
}

/**
 * Get WCAG criteria string for a rule
 */
function getWcagCriteria(ruleId) {
  const mapping = RULE_WCAG_MAP[ruleId];
  if (!mapping) return '';
  return mapping.criteria.join(', ');
}

/**
 * Get level for a rule
 */
function getRuleLevel(ruleId) {
  return RULE_WCAG_MAP[ruleId]?.level || '?';
}

/**
 * Check if criteria is WCAG 2.2 only
 */
function isWcag22Only(ruleId) {
  const mapping = RULE_WCAG_MAP[ruleId];
  if (!mapping) return false;
  return (mapping.criteria || []).some(c => WCAG22_NEW.includes(c));
}
