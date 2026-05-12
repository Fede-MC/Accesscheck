/**
 * pdf.js — Generación del informe PDF
 * Usa jsPDF + autotable para un PDF bien estructurado
 */

async function downloadPDF() {
  if (!currentAuditData) return;

  const btn = document.getElementById('btnPdf');
  const orig = btn.innerHTML;
  btn.innerHTML = '<span>⏳</span> Generando PDF…';
  btn.disabled = true;

  try {
    await generatePDF(currentAuditData);
  } catch (e) {
    showError('Error al generar el PDF: ' + e.message);
  } finally {
    btn.innerHTML = orig;
    btn.disabled = false;
  }
}

async function generatePDF(data) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const PAGE_W = 210;
  const PAGE_H = 297;
  const MARGIN = 20;
  const CONTENT_W = PAGE_W - MARGIN * 2;

  // Color palette
  const COLOR = {
    dark: [10, 12, 15],
    bg2: [24, 29, 36],
    accent: [74, 240, 176],
    accentText: [0, 80, 40],
    critical: [255, 77, 109],
    serious: [255, 140, 66],
    moderate: [255, 209, 102],
    minor: [116, 185, 224],
    pass: [74, 240, 176],
    text: [232, 237, 244],
    text2: [138, 151, 170],
    text3: [90, 100, 120],
    white: [255, 255, 255],
    border: [37, 44, 56],
  };

  let y = 0;

  // ── PAGE 1: COVER ──
  // Full dark background
  doc.setFillColor(...COLOR.dark);
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F');

  // Accent stripe at top
  doc.setFillColor(...COLOR.accent);
  doc.rect(0, 0, PAGE_W, 4, 'F');

  // Logo area
  y = 28;
  doc.setFontSize(10);
  doc.setTextColor(...COLOR.accent);
  doc.setFont('helvetica', 'bold');
  doc.text('◈ AccessCheck', MARGIN, y);

  // Title
  y = 55;
  doc.setFontSize(32);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR.white);
  doc.text('Informe de', MARGIN, y);
  y += 14;
  doc.setTextColor(...COLOR.accent);
  doc.text('Accesibilidad Web', MARGIN, y);

  // Subtitle
  y += 12;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLOR.text2);
  const standards = data.standards.map(s => `WCAG ${s}`).join(' + ');
  const levels = data.levels.join(', ');
  doc.text(`${standards} · Nivel${data.levels.length > 1 ? 'es' : ''} ${levels}`, MARGIN, y);

  // URL box
  y = 100;
  doc.setFillColor(...COLOR.bg2);
  doc.roundedRect(MARGIN, y - 5, CONTENT_W, 22, 3, 3, 'F');
  doc.setFontSize(8);
  doc.setTextColor(...COLOR.accent);
  doc.setFont('helvetica', 'bold');
  doc.text('URL ANALIZADA', MARGIN + 6, y + 4);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLOR.white);
  const urlText = data.url.length > 80 ? data.url.substring(0, 80) + '…' : data.url;
  doc.text(urlText, MARGIN + 6, y + 13);

  // Score box
  y = 135;
  drawScoreBox(doc, data, MARGIN, y, CONTENT_W, COLOR);

  // Conformity table on cover
  y = 200;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR.white);
  doc.text('Estado de Conformidad', MARGIN, y);

  y += 8;
  const confRows = Object.entries(data.conformity).map(([key, status]) => {
    const statusMap = {
      pass: '✓ Conforme',
      partial: '⚠ Parcialmente conforme',
      fail: '✗ No conforme',
      na: '— No evaluado',
    };
    const colorMap = {
      pass: COLOR.pass,
      partial: COLOR.moderate,
      fail: COLOR.critical,
      na: COLOR.text3,
    };
    return { key, status, label: statusMap[status], color: colorMap[status] };
  });

  doc.autoTable({
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [['Estándar / Nivel', 'Estado']],
    body: confRows.map(r => [r.key, r.label]),
    styles: {
      fillColor: COLOR.bg2,
      textColor: COLOR.text,
      fontSize: 10,
      cellPadding: 5,
      lineColor: COLOR.border,
      lineWidth: 0.3,
    },
    headStyles: {
      fillColor: [26, 31, 40],
      textColor: COLOR.accent,
      fontStyle: 'bold',
      fontSize: 9,
    },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { fontStyle: 'bold' },
    },
    didDrawCell: (d) => {
      if (d.section === 'body' && d.column.index === 1) {
        const row = confRows[d.row.index];
        if (row) {
          doc.setTextColor(...(row.color || COLOR.text));
          doc.setFont('helvetica', 'bold');
          doc.text(row.label, d.cell.x + d.cell.padding('left'), d.cell.y + d.cell.height / 2 + 1.5, { baseline: 'middle' });
          doc.setTextColor(...COLOR.text);
        }
      }
    },
  });

  // Date footer on cover
  const ts = new Date(data.timestamp).toLocaleString('es-ES');
  doc.setFontSize(8);
  doc.setTextColor(...COLOR.text3);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generado el ${ts}`, MARGIN, PAGE_H - 12);
  doc.text('AccessCheck · Basado en axe-core · wcag-checker', PAGE_W - MARGIN, PAGE_H - 12, { align: 'right' });

  // ── PAGE 2+: ISSUES ──
  const counts = getImpactCounts(data.violations);

  if (data.violations.length > 0) {
    doc.addPage();
    doc.setFillColor(...COLOR.dark);
    doc.rect(0, 0, PAGE_W, PAGE_H, 'F');

    y = MARGIN;

    // Section header
    drawSectionHeader(doc, 'Problemas Detectados', y, PAGE_W, MARGIN, COLOR);
    y += 20;

    // Impact summary row
    const impactSummary = [
      { label: 'Críticos', count: counts.critical || 0, color: COLOR.critical },
      { label: 'Serios', count: counts.serious || 0, color: COLOR.serious },
      { label: 'Moderados', count: counts.moderate || 0, color: COLOR.moderate },
      { label: 'Menores', count: counts.minor || 0, color: COLOR.minor },
    ];

    const cellW = CONTENT_W / 4;
    for (let i = 0; i < impactSummary.length; i++) {
      const s = impactSummary[i];
      const x = MARGIN + i * cellW;
      doc.setFillColor(...COLOR.bg2);
      doc.roundedRect(x, y, cellW - 3, 20, 2, 2, 'F');
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...s.color);
      doc.text(String(s.count), x + cellW / 2 - 1.5, y + 10, { align: 'center' });
      doc.setFontSize(7.5);
      doc.setTextColor(...COLOR.text2);
      doc.setFont('helvetica', 'normal');
      doc.text(s.label, x + cellW / 2 - 1.5, y + 16, { align: 'center' });
    }

    y += 26;

    // Violations table
    const order = { critical: 0, serious: 1, moderate: 2, minor: 3 };
    const sorted = [...data.violations].sort((a, b) => (order[a.impact] || 4) - (order[b.impact] || 4));

    const impactColorMap = {
      critical: COLOR.critical,
      serious: COLOR.serious,
      moderate: COLOR.moderate,
      minor: COLOR.minor,
    };

    const impactLabelMap = {
      critical: 'Crítico',
      serious: 'Serio',
      moderate: 'Moderado',
      minor: 'Menor',
    };

    const tableRows = sorted.map(v => {
      const criteria = getWcagCriteria(v.id);
      const level = getRuleLevel(v.id);
      const desc = v.help || v.description || v.id;
      return [
        impactLabelMap[v.impact] || v.impact,
        desc.length > 80 ? desc.substring(0, 80) + '…' : desc,
        criteria || '—',
        level,
        String(v.nodes.length),
      ];
    });

    doc.autoTable({
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      head: [['Gravedad', 'Descripción del problema', 'Criterio SC', 'Nivel', 'Ocurr.']],
      body: tableRows,
      styles: {
        fillColor: COLOR.bg2,
        textColor: COLOR.text,
        fontSize: 8.5,
        cellPadding: 4,
        lineColor: COLOR.border,
        lineWidth: 0.3,
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: [26, 31, 40],
        textColor: COLOR.accent,
        fontStyle: 'bold',
        fontSize: 8,
      },
      columnStyles: {
        0: { cellWidth: 22, fontStyle: 'bold' },
        1: { cellWidth: 85 },
        2: { cellWidth: 28 },
        3: { cellWidth: 16 },
        4: { cellWidth: 14, halign: 'center' },
      },
      didParseCell: (d) => {
        if (d.section === 'body' && d.column.index === 0) {
          const v = sorted[d.row.index];
          if (v) {
            const c = impactColorMap[v.impact] || COLOR.text;
            d.cell.styles.textColor = c;
          }
        }
      },
      didDrawPage: (d) => {
        // Dark background for new pages
        doc.setFillColor(...COLOR.dark);
        doc.rect(0, 0, PAGE_W, PAGE_H, 'F');
        // Redraw header on new page
        drawPageFooter(doc, PAGE_W, PAGE_H, MARGIN, COLOR);
      },
    });
  }

  // ── PAGE: DETAILED ISSUES ──
  const topViolations = [...data.violations]
    .sort((a, b) => (getImpactCounts([b]).critical || 0) - (getImpactCounts([a]).critical || 0))
    .slice(0, 15);

  if (topViolations.length > 0) {
    doc.addPage();
    doc.setFillColor(...COLOR.dark);
    doc.rect(0, 0, PAGE_W, PAGE_H, 'F');

    y = MARGIN;
    drawSectionHeader(doc, 'Detalle de Problemas y Correcciones', y, PAGE_W, MARGIN, COLOR);
    y += 22;

    const order = { critical: 0, serious: 1, moderate: 2, minor: 3 };
    const allSorted = [...data.violations].sort((a, b) => (order[a.impact] || 4) - (order[b.impact] || 4));

    for (const v of allSorted) {
      if (y > PAGE_H - 60) {
        doc.addPage();
        doc.setFillColor(...COLOR.dark);
        doc.rect(0, 0, PAGE_W, PAGE_H, 'F');
        y = MARGIN;
      }

      const impactColor = {
        critical: COLOR.critical,
        serious: COLOR.serious,
        moderate: COLOR.moderate,
        minor: COLOR.minor,
      }[v.impact] || COLOR.text;

      // Issue block header
      doc.setFillColor(...COLOR.bg2);
      doc.roundedRect(MARGIN, y, CONTENT_W, 10, 1.5, 1.5, 'F');
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...impactColor);
      const impactLabelPDF = { critical: 'CRÍTICO', serious: 'SERIO', moderate: 'MODERADO', minor: 'MENOR' };
      doc.text(impactLabelPDF[v.impact] || v.impact.toUpperCase(), MARGIN + 4, y + 6.5);

      doc.setTextColor(...COLOR.white);
      doc.setFontSize(8.5);
      const title = (v.help || v.description).substring(0, 90);
      doc.text(title, MARGIN + 26, y + 6.5);

      const criteria = getWcagCriteria(v.id);
      const level = getRuleLevel(v.id);
      if (criteria) {
        doc.setTextColor(...COLOR.text3);
        doc.setFontSize(7);
        doc.text(`SC ${criteria} · ${level}`, PAGE_W - MARGIN - 2, y + 6.5, { align: 'right' });
      }

      y += 12;

      // Nodes (up to 3)
      if (v.nodes.length > 0) {
        doc.setFontSize(7.5);
        doc.setFont('courier', 'normal');
        doc.setTextColor(...COLOR.text2);

        const nodesToShow = v.nodes.slice(0, 3);
        for (const node of nodesToShow) {
          if (y > PAGE_H - 40) break;
          const html = (node.html || '').replace(/\s+/g, ' ').substring(0, 100);
          doc.setFillColor(24, 29, 36);
          doc.roundedRect(MARGIN + 4, y - 1, CONTENT_W - 8, 7, 1, 1, 'F');
          doc.text(html, MARGIN + 7, y + 4.5);
          y += 9;
        }

        if (v.nodes.length > 3) {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(7);
          doc.setTextColor(...COLOR.text3);
          doc.text(`… y ${v.nodes.length - 3} elemento(s) más`, MARGIN + 7, y + 2);
          y += 6;
        }
      }

      y += 6;
    }
  }

  // ── PAGE: PASSED + SUMMARY ──
  doc.addPage();
  doc.setFillColor(...COLOR.dark);
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F');

  y = MARGIN;
  drawSectionHeader(doc, 'Criterios Superados', y, PAGE_W, MARGIN, COLOR);
  y += 22;

  if (data.passes.length > 0) {
    const passChips = data.passes.map(p => p.help || p.id);
    const chipsPerRow = 3;
    const chipW = CONTENT_W / chipsPerRow;

    for (let i = 0; i < Math.min(passChips.length, 60); i += chipsPerRow) {
      if (y > PAGE_H - 40) break;
      for (let j = 0; j < chipsPerRow && (i + j) < passChips.length; j++) {
        const chip = passChips[i + j];
        const x = MARGIN + j * chipW;
        doc.setFillColor(10, 40, 25);
        doc.roundedRect(x, y, chipW - 4, 7, 1, 1, 'F');
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLOR.pass);
        const chipText = chip.length > 35 ? chip.substring(0, 35) + '…' : chip;
        doc.text(chipText, x + 3, y + 5);
      }
      y += 10;
    }

    if (data.passes.length > 60) {
      doc.setFontSize(8);
      doc.setTextColor(...COLOR.text3);
      doc.text(`… y ${data.passes.length - 60} criterios más superados`, MARGIN, y + 4);
      y += 10;
    }
  } else {
    doc.setFontSize(9);
    doc.setTextColor(...COLOR.text3);
    doc.text('No se encontraron criterios confirmados como superados.', MARGIN, y);
    y += 10;
  }

  // Final recommendations
  y += 14;
  if (y < PAGE_H - 80) {
    drawSectionHeader(doc, 'Recomendaciones Prioritarias', y, PAGE_W, MARGIN, COLOR);
    y += 22;

    const recommendations = generateRecommendations(data);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');

    for (const rec of recommendations) {
      if (y > PAGE_H - 30) break;
      doc.setTextColor(...COLOR.accent);
      doc.setFont('helvetica', 'bold');
      doc.text(`${rec.priority}.`, MARGIN, y);
      doc.setTextColor(...COLOR.text);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(rec.text, CONTENT_W - 10);
      doc.text(lines, MARGIN + 8, y);
      y += lines.length * 5 + 4;
    }
  }

  // Footer on last page
  drawPageFooter(doc, PAGE_W, PAGE_H, MARGIN, COLOR);

  // Add page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR.text3);
    doc.setFont('helvetica', 'normal');
    doc.text(`Página ${i} de ${pageCount}`, PAGE_W - MARGIN, PAGE_H - 6, { align: 'right' });
  }

  // Save
  const filename = `accesibilidad-${new URL(data.url).hostname}-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}

function drawScoreBox(doc, data, x, y, w, COLOR) {
  const counts = getImpactCounts(data.violations);
  const score = data.score;

  doc.setFillColor(...COLOR.bg2);
  doc.roundedRect(x, y, w, 55, 3, 3, 'F');

  // Score
  const scoreColor = score >= 80 ? COLOR.pass : score >= 60 ? COLOR.moderate : score >= 40 ? COLOR.serious : COLOR.critical;
  doc.setFontSize(48);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...scoreColor);
  doc.text(String(score), x + 22, y + 37, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLOR.text2);
  doc.text('/ 100', x + 22, y + 48, { align: 'center' });

  doc.setFontSize(8);
  doc.setTextColor(...COLOR.text3);
  doc.text('PUNTUACIÓN', x + 22, y + 10, { align: 'center' });

  // Divider
  doc.setDrawColor(...COLOR.border);
  doc.setLineWidth(0.3);
  doc.line(x + 46, y + 6, x + 46, y + 50);

  // Stats
  const stats = [
    { label: 'Críticos', val: counts.critical || 0, color: COLOR.critical },
    { label: 'Serios', val: counts.serious || 0, color: COLOR.serious },
    { label: 'Moderados', val: counts.moderate || 0, color: COLOR.moderate },
    { label: 'Menores', val: counts.minor || 0, color: COLOR.minor },
    { label: 'Superados', val: data.passes.length, color: COLOR.pass },
  ];

  const statW = (w - 56) / stats.length;
  stats.forEach((s, i) => {
    const sx = x + 52 + i * statW;
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...s.color);
    doc.text(String(s.val), sx + statW / 2, y + 30, { align: 'center' });
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLOR.text3);
    doc.text(s.label, sx + statW / 2, y + 40, { align: 'center' });
  });
}

function drawSectionHeader(doc, title, y, PAGE_W, MARGIN, COLOR) {
  doc.setFillColor(...COLOR.accent);
  doc.rect(MARGIN, y, 3, 12, 'F');
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR.white);
  doc.text(title, MARGIN + 8, y + 9);
}

function drawPageFooter(doc, PAGE_W, PAGE_H, MARGIN, COLOR) {
  doc.setFillColor(...COLOR.accent);
  doc.rect(0, PAGE_H - 2, PAGE_W, 2, 'F');
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR.text3);
  doc.setFont('helvetica', 'normal');
  doc.text('AccessCheck · Informe de Accesibilidad WCAG', MARGIN, PAGE_H - 6);
}

function generateRecommendations(data) {
  const recs = [];
  const counts = getImpactCounts(data.violations);

  if (counts.critical > 0) {
    recs.push({ priority: 1, text: `Corrija los ${counts.critical} problema(s) crítico(s) de inmediato ya que bloquean completamente el acceso para usuarios con discapacidad.` });
  }
  if (counts.serious > 0) {
    recs.push({ priority: recs.length + 1, text: `Resuelva los ${counts.serious} problema(s) serio(s) que dificultan significativamente la experiencia de usuarios con tecnologías de asistencia.` });
  }

  const hasColorContrast = data.violations.some(v => v.id === 'color-contrast');
  if (hasColorContrast) {
    recs.push({ priority: recs.length + 1, text: 'Revise el contraste de color en toda la página. Use una herramienta como Colour Contrast Analyser para verificar el ratio mínimo de 4.5:1.' });
  }

  const hasNoLang = data.violations.some(v => v.id === 'html-has-lang');
  if (hasNoLang) {
    recs.push({ priority: recs.length + 1, text: 'Añada el atributo lang al elemento <html> para que los lectores de pantalla utilicen la pronunciación correcta.' });
  }

  const hasNoAlt = data.violations.some(v => v.id === 'image-alt');
  if (hasNoAlt) {
    recs.push({ priority: recs.length + 1, text: 'Añada texto alternativo descriptivo a todas las imágenes que transmiten información. Use alt="" para imágenes decorativas.' });
  }

  if (recs.length === 0) {
    recs.push({ priority: 1, text: '¡Excelente trabajo! La página muestra un buen nivel de accesibilidad. Continúe monitoreando con cada nueva versión del sitio.' });
  }

  return recs.slice(0, 6);
}
