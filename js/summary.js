// ─── Display summary (SOAP + documentos + CID + retorno) ───
function displaySummary(data, patientName, type) {
  const patientName_ = patientName || document.getElementById('patient-name').value.trim();
  const type_ = type || document.getElementById('consult-type').value;

  const instrBox = document.getElementById('patient-instructions-box');
  if (instrBox) instrBox.classList.add('hidden');

  document.getElementById('step-setup').classList.add('hidden');
  document.getElementById('step-recording').classList.add('hidden');
  document.getElementById('step-summary').classList.remove('hidden');

  document.getElementById('summary-patient-label').textContent =
    `${patientName_} · ${type_} · revise, assine e exporte`;

  const cids = data.cids || [];
  const documentos = data.documentos || [];
  const retornoDias = data.retornoDias != null ? data.retornoDias : null;
  const retornoLabel = data.retornoLabel || (retornoDias != null ? `${retornoDias} dias` : 'A definir');

  const docHtml = documentos.length
    ? documentos
        .map(d => {
          const status = (d.status || 'pronto').toLowerCase() === 'pronto';
          return `
      <div class="doc-item">
        <div class="doc-item-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
        </div>
        <div class="doc-item-body">
          <div class="doc-item-title">${escapeHtml(d.tipo || 'Documento')}</div>
          <div class="doc-item-meta">${escapeHtml(d.nome || '')}</div>
        </div>
        ${status ? '<span class="badge badge-pronto">Pronto</span>' : ''}
      </div>`;
        })
        .join('')
    : '<p style="font-size:14px;color:var(--text-secondary)">Nenhum documento listado.</p>';

  const cidHtml = cids.length
    ? cids
        .map(
          c =>
            `<span class="cid-chip"><code>${escapeHtml(c.code)}</code> ${escapeHtml(c.desc || '')}</span>`
        )
        .join('')
    : '<span style="font-size:14px;color:var(--text-secondary)">Nenhum CID confirmado.</span>';

  const soapBlocks = [
    { key: 'queixa', overline: 'Subjetivo', label: 'Queixa principal' },
    { key: 'historia', overline: 'Subjetivo', label: 'História da doença atual' },
    { key: 'objetivo', overline: 'Objetivo', label: 'Exame físico e achados' },
    { key: 'avaliacao', overline: 'Avaliação', label: 'Hipóteses e diagnóstico' },
    { key: 'plano', overline: 'Plano', label: 'Conduta e prescrição' }
  ];

  const soapHtml = soapBlocks
    .map(
      s => `
    <div class="summary-block">
      <div class="summary-label">${s.overline} — ${s.label}</div>
      <div class="summary-content" id="field-${s.key}" contenteditable="true">${escapeHtml(
        data[s.key] || ''
      )}</div>
    </div>`
    )
    .join('');

  const retornoHtml =
    retornoDias != null
      ? `<p class="retorno-line">Retorno sugerido: <strong>${escapeHtml(retornoLabel)}</strong> <span class="badge badge-prazo">Prazo: ${retornoDias}d</span></p>`
      : `<p class="retorno-line">Retorno sugerido: <strong>${escapeHtml(retornoLabel)}</strong></p>`;

  const body = document.getElementById('summary-body');
  body.innerHTML = `
    <div class="summary-soaps">
      ${soapHtml}
    </div>

    <div class="summary-block" style="margin-top:1.5rem">
      <div class="overline-label">Documentos gerados</div>
      <div class="documents-grid">${docHtml}</div>
    </div>

    <div class="summary-block" style="margin-top:1.35rem">
      <div class="overline-label">CID-10 confirmados</div>
      <div class="cid-chips">${cidHtml}</div>
    </div>

    <div class="summary-block" style="margin-top:1.35rem">
      <div class="overline-label">Retorno</div>
      ${retornoHtml}
    </div>

    <div class="summary-actions">
      <button type="button" class="btn btn-primary btn-sign-save" onclick="approveSummary('${escapeAttr(
        patientName_
      )}', '${escapeAttr(type_)}')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
        Assinar e salvar
      </button>
      <button type="button" class="btn btn-secondary" onclick="exportPDF()">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
        Exportar PDF
      </button>
      <button type="button" class="btn btn-secondary" onclick="copySummary()">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        Copiar
      </button>
      <button type="button" class="btn btn-outline-brand" onclick="generatePatientInstructions('${escapeAttr(
        patientName_
      )}', '${escapeAttr(type_)}')">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        Resumo p/ paciente
      </button>
    </div>
  `;

  body.dataset.patientName = patientName_;
  body.dataset.type = type_;
  body.dataset.summaryData = JSON.stringify(data);

  window.scrollTo(0, 0);
}

// ─── Show saved consultation summary ───
function showSummaryFromSaved(c) {
  document.getElementById('step-setup').classList.add('hidden');
  document.getElementById('step-recording').classList.add('hidden');
  document.getElementById('step-summary').classList.remove('hidden');

  const merged = {
    ...getSummaryTemplate(c.type),
    ...(c.summaryData || {})
  };
  displaySummary(merged, c.patientName, c.type);

  if (c.patientInstructions) {
    renderPatientInstructions(c.patientName, c.patientInstructions);
  } else {
    document.getElementById('patient-instructions-box')?.classList.add('hidden');
  }

  const signBtns = document.querySelectorAll('.btn-sign-save');
  signBtns.forEach(b => {
    b.textContent = 'Consulta salva';
    b.disabled = true;
  });
}

// ─── Approve & save ───
function approveSummary(patientName, type) {
  const queixa = document.getElementById('field-queixa')?.innerText || '';
  const historia = document.getElementById('field-historia')?.innerText || '';
  const objetivo = document.getElementById('field-objetivo')?.innerText || '';
  const avaliacao = document.getElementById('field-avaliacao')?.innerText || '';
  const plano = document.getElementById('field-plano')?.innerText || '';

  const rawData = document.getElementById('summary-body').dataset.summaryData;
  let summaryData = {};
  try {
    summaryData = JSON.parse(rawData);
  } catch (e) {}

  const initials = patientName
    .trim()
    .split(' ')
    .filter(w => w.length > 0)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');

  const anamEl = document.getElementById('anamnesis-context');
  const anamnesisContext = anamEl ? anamEl.value.trim() : '';

  const consultation = {
    id: Date.now().toString(),
    date: new Date().toISOString(),
    patientName: patientName,
    type: type,
    initials: initials,
    durationSec: RecordingState.durationSec || 0,
    transcript: RecordingState.transcriptLines || [],
    anamnesisContext: anamnesisContext || undefined,
    summaryData: {
      ...summaryData,
      queixa,
      historia,
      objetivo,
      avaliacao,
      plano
    }
  };

  Store.addConsultation(consultation);
  showToast('Assinado e salvo com sucesso.');

  document.querySelectorAll('.btn-sign-save').forEach(b => {
    b.innerHTML =
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20,6 9,17 4,12"/></svg> Salvo';
    b.disabled = true;
  });
}

// ─── Copy to clipboard ───
function copySummary() {
  const queixa = document.getElementById('field-queixa')?.innerText || '';
  const historia = document.getElementById('field-historia')?.innerText || '';
  const objetivo = document.getElementById('field-objetivo')?.innerText || '';
  const avaliacao = document.getElementById('field-avaliacao')?.innerText || '';
  const plano = document.getElementById('field-plano')?.innerText || '';
  const name = document.getElementById('summary-body')?.dataset.patientName || '';

  const text = [
    `PRONTUÁRIO — ${name}`,
    `Data: ${new Date().toLocaleDateString('pt-BR')}`,
    '',
    'SUBJETIVO — QUEIXA',
    queixa,
    '',
    'SUBJETIVO — HISTÓRIA',
    historia,
    '',
    'OBJETIVO',
    objetivo,
    '',
    'AVALIAÇÃO',
    avaliacao,
    '',
    'PLANO',
    plano
  ].join('\n');

  navigator.clipboard.writeText(text).then(() => {
    showToast('Copiado para a área de transferência');
  }).catch(() => {
    showToast('Erro ao copiar. Selecione o texto manualmente.');
  });
}

// ─── Export PDF (print) ───
function exportPDF() {
  const queixa = document.getElementById('field-queixa')?.innerText || '';
  const historia = document.getElementById('field-historia')?.innerText || '';
  const objetivo = document.getElementById('field-objetivo')?.innerText || '';
  const avaliacao = document.getElementById('field-avaliacao')?.innerText || '';
  const plano = document.getElementById('field-plano')?.innerText || '';
  const name = document.getElementById('summary-body')?.dataset.patientName || '';
  const type = document.getElementById('summary-body')?.dataset.type || '';
  const date = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  let cids = [];
  try {
    cids = JSON.parse(document.getElementById('summary-body').dataset.summaryData || '{}').cids || [];
  } catch (e) {}

  const cidLines = (cids || [])
    .map(c => `<li><strong>${escapeHtml(c.code)}</strong> — ${escapeHtml(c.desc || '')}</li>`)
    .join('');

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Prontuário — ${escapeHtml(name)}</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500&family=Playfair+Display:ital@0;1&display=swap" rel="stylesheet">
      <style>
        body { font-family: Inter, sans-serif; padding: 40px; max-width: 720px; margin: 0 auto; color: #1C2B1E; font-size: 15px; line-height: 1.6; }
        h1 { font-family: 'Playfair Display', Georgia, serif; font-weight: 400; font-size: 1.75rem; color: #1C2B1E; margin-bottom: 6px; }
        .brand { font-size: 14px; color: #6B7A6D; margin-bottom: 20px; }
        .meta { font-size: 14px; color: #6B7A6D; margin-bottom: 28px; border-bottom: 1px solid rgba(0,0,0,0.08); padding-bottom: 14px; }
        h3 { font-size: 11px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.08em; color: #6B7A6D; margin-bottom: 8px; margin-top: 22px; }
        p { margin: 0 0 8px; white-space: pre-wrap; }
        ul.cid { list-style: none; padding: 0; margin: 0; }
        ul.cid li { margin-bottom: 4px; font-size: 14px; }
        @media print { body { padding: 24px; } }
      </style>
    </head>
    <body>
      <div class="brand">Hiro · AI Medical Scribe</div>
      <h1>Prontuário clínico</h1>
      <div class="meta">Paciente: <strong>${escapeHtml(name)}</strong> · ${escapeHtml(type)} · ${escapeHtml(date)}</div>
      <h3>Subjetivo — Queixa</h3><p>${escapeHtml(queixa).replace(/\n/g, '<br>')}</p>
      <h3>Subjetivo — História</h3><p>${escapeHtml(historia).replace(/\n/g, '<br>')}</p>
      <h3>Objetivo</h3><p>${escapeHtml(objetivo).replace(/\n/g, '<br>')}</p>
      <h3>Avaliação</h3><p>${escapeHtml(avaliacao).replace(/\n/g, '<br>')}</p>
      <h3>Plano</h3><p>${escapeHtml(plano).replace(/\n/g, '<br>')}</p>
      <h3>CID-10</h3>
      <ul class="cid">${cidLines || '<li>—</li>'}</ul>
    </body>
    </html>
  `;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 500);
}

// ─── Generate patient instructions ───
async function generatePatientInstructions(patientName, type) {
  const body = document.getElementById('summary-body');
  let data = {};
  try {
    data = JSON.parse(body.dataset.summaryData);
  } catch (e) {}

  showLoading('Gerando instruções para o paciente…');

  let instructions;
  try {
    const queixa = document.getElementById('field-queixa')?.innerText || '';
    const plano = document.getElementById('field-plano')?.innerText || '';

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 600,
        system: `Você é um assistente médico. Gere instruções simples e claras para o paciente, em linguagem acessível (não técnica), em português (Brasil).
Responda APENAS com JSON válido sem markdown:
{
  "summary": "string curta explicando o problema em linguagem simples",
  "recommendations": ["item1", "item2", "item3", "item4", "item5"]
}`,
        messages: [
          {
            role: 'user',
            content: `Paciente: ${patientName}\nQueixa: ${queixa}\nPlano: ${plano}\n\nGere instruções acessíveis para o paciente.`
          }
        ]
      })
    });

    const result = await response.json();
    const raw = result.content.find(b => b.type === 'text')?.text || '';
    instructions = JSON.parse(raw.replace(/```json|```/g, '').trim());
  } catch (e) {
    const tmpl = getSummaryTemplate(type);
    instructions = {
      summary: tmpl.patient_summary,
      recommendations: tmpl.recommendations
    };
  }

  hideLoading();
  renderPatientInstructions(patientName, instructions);
}

function renderPatientInstructions(patientName, instructions) {
  const box = document.getElementById('patient-instructions-box');
  const content = document.getElementById('patient-instructions-content');

  const items = (instructions.recommendations || []).map(r => `<li>${escapeHtml(r)}</li>`).join('');

  content.innerHTML = `
    <strong>${escapeHtml(instructions.summary || '')}</strong>
    <ul class="patient-rec-list">${items}</ul>
  `;

  box.classList.remove('hidden');
  box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  showToast('Resumo para o paciente gerado.');
}

// ─── Helpers ───
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(str) {
  if (!str) return '';
  return String(str).replace(/'/g, "\\'").replace(/"/g, '&quot;');
}
