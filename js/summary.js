// ─── Display summary ───
function displaySummary(data, patientName, type) {
  const patientName_ = patientName || document.getElementById('patient-name').value.trim();
  const type_        = type        || document.getElementById('consult-type').value;

  document.getElementById('step-setup').classList.add('hidden');
  document.getElementById('step-recording').classList.add('hidden');
  document.getElementById('step-summary').classList.remove('hidden');

  document.getElementById('summary-patient-label').textContent =
    `${patientName_} — ${type_} — revise e edite antes de salvar`;

  // Build sections
  const sections = [
    { key: 'queixa',    label: 'Queixa principal',            value: data.queixa },
    { key: 'historia',  label: 'História da doença atual',    value: data.historia },
    { key: 'avaliacao', label: 'Avaliação',                   value: data.avaliacao },
    { key: 'plano',     label: 'Plano terapêutico',           value: data.plano },
  ];

  const body = document.getElementById('summary-body');
  body.innerHTML = sections.map(s => `
    <div class="summary-block">
      <div class="summary-label">${s.label}</div>
      <div class="summary-content" id="field-${s.key}" contenteditable="true">${escapeHtml(s.value)}</div>
    </div>
  `).join('') + `
    <div class="summary-actions">
      <button class="btn btn-green" onclick="approveSummary('${escapeAttr(patientName_)}', '${escapeAttr(type_)}')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20,6 9,17 4,12"/></svg>
        Aprovar e salvar
      </button>
      <button class="btn btn-ghost btn-sm" onclick="copySummary()">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        Copiar
      </button>
      <button class="btn btn-ghost btn-sm" onclick="exportPDF()">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
        Exportar PDF
      </button>
      <button class="btn btn-ghost btn-sm" onclick="generatePatientInstructions('${escapeAttr(patientName_)}', '${escapeAttr(type_)}')">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        Resumo p/ paciente
      </button>
    </div>
  `;

  // Store reference data for later
  body.dataset.patientName = patientName_;
  body.dataset.type        = type_;
  body.dataset.summaryData = JSON.stringify(data);

  window.scrollTo(0, 0);
}

// ─── Show saved consultation summary ───
function showSummaryFromSaved(c) {
  document.getElementById('step-setup').classList.add('hidden');
  document.getElementById('step-recording').classList.add('hidden');
  document.getElementById('step-summary').classList.remove('hidden');

  displaySummary(c.summaryData, c.patientName, c.type);

  // Show patient instructions if saved
  if (c.patientInstructions) {
    renderPatientInstructions(c.patientName, c.patientInstructions);
  }
}

// ─── Approve & save ───
function approveSummary(patientName, type) {
  const queixa    = document.getElementById('field-queixa')?.innerText    || '';
  const historia  = document.getElementById('field-historia')?.innerText  || '';
  const avaliacao = document.getElementById('field-avaliacao')?.innerText || '';
  const plano     = document.getElementById('field-plano')?.innerText     || '';

  const rawData = document.getElementById('summary-body').dataset.summaryData;
  let summaryData = {};
  try { summaryData = JSON.parse(rawData); } catch(e) {}

  const initials = patientName.trim().split(' ')
    .filter(w => w.length > 0).slice(0,2)
    .map(w => w[0].toUpperCase()).join('');

  const consultation = {
    id:          Date.now().toString(),
    date:        new Date().toISOString(),
    patientName: patientName,
    type:        type,
    initials:    initials,
    durationSec: RecordingState.durationSec || 0,
    transcript:  RecordingState.transcriptLines || [],
    summaryData: {
      ...summaryData,
      queixa,
      historia,
      avaliacao,
      plano
    }
  };

  Store.addConsultation(consultation);
  showToast('✓ Consulta salva com sucesso!');

  // Disable approve button
  const approveBtns = document.querySelectorAll('.btn-green');
  approveBtns.forEach(b => {
    b.textContent = '✓ Salvo';
    b.disabled = true;
  });
}

// ─── Copy to clipboard ───
function copySummary() {
  const queixa    = document.getElementById('field-queixa')?.innerText    || '';
  const historia  = document.getElementById('field-historia')?.innerText  || '';
  const avaliacao = document.getElementById('field-avaliacao')?.innerText || '';
  const plano     = document.getElementById('field-plano')?.innerText     || '';
  const name      = document.getElementById('summary-body')?.dataset.patientName || '';

  const text = [
    `RESUMO CLÍNICO — ${name}`,
    `Data: ${new Date().toLocaleDateString('pt-BR')}`,
    '',
    'QUEIXA PRINCIPAL',
    queixa,
    '',
    'HISTÓRIA DA DOENÇA ATUAL',
    historia,
    '',
    'AVALIAÇÃO',
    avaliacao,
    '',
    'PLANO TERAPÊUTICO',
    plano,
  ].join('\n');

  navigator.clipboard.writeText(text).then(() => {
    showToast('✓ Copiado para a área de transferência');
  }).catch(() => {
    showToast('Erro ao copiar. Tente selecionar manualmente.');
  });
}

// ─── Export PDF (print) ───
function exportPDF() {
  const queixa    = document.getElementById('field-queixa')?.innerText    || '';
  const historia  = document.getElementById('field-historia')?.innerText  || '';
  const avaliacao = document.getElementById('field-avaliacao')?.innerText || '';
  const plano     = document.getElementById('field-plano')?.innerText     || '';
  const name      = document.getElementById('summary-body')?.dataset.patientName || '';
  const type      = document.getElementById('summary-body')?.dataset.type        || '';
  const date      = new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' });

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Resumo Clínico — ${name}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; max-width: 700px; margin: 0 auto; color: #111; }
        h1 { font-size: 1.4rem; color: #1B2A4A; margin-bottom: 4px; }
        .meta { font-size: .85rem; color: #666; margin-bottom: 28px; border-bottom: 1px solid #ddd; padding-bottom: 12px; }
        h3 { font-size: .75rem; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: #888; margin-bottom: 6px; margin-top: 20px; }
        p { font-size: .92rem; line-height: 1.7; color: #333; }
        @media print { body { padding: 20px; } }
      </style>
    </head>
    <body>
      <h1>Resumo Clínico</h1>
      <div class="meta">Paciente: <strong>${name}</strong> &nbsp;·&nbsp; ${type} &nbsp;·&nbsp; ${date}</div>
      <h3>Queixa Principal</h3><p>${queixa}</p>
      <h3>História da Doença Atual</h3><p>${historia}</p>
      <h3>Avaliação</h3><p>${avaliacao}</p>
      <h3>Plano Terapêutico</h3><p>${plano.replace(/\n/g,'<br>')}</p>
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
  try { data = JSON.parse(body.dataset.summaryData); } catch(e) {}

  showLoading('Gerando instruções para o paciente...');

  let instructions;
  try {
    const queixa = document.getElementById('field-queixa')?.innerText || '';
    const plano  = document.getElementById('field-plano')?.innerText  || '';

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
        messages: [{
          role: 'user',
          content: `Paciente: ${patientName}\nQueixa: ${queixa}\nPlano: ${plano}\n\nGere instruções acessíveis para o paciente.`
        }]
      })
    });

    const result = await response.json();
    const raw = result.content.find(b => b.type === 'text')?.text || '';
    instructions = JSON.parse(raw.replace(/```json|```/g,'').trim());
  } catch(e) {
    // Fallback
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

  const items = (instructions.recommendations || [])
    .map(r => `<li>${r}</li>`).join('');

  content.innerHTML = `
    <strong>${instructions.summary}</strong>
    <ul>${items}</ul>
  `;

  box.classList.remove('hidden');
  box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  showToast('Resumo para o paciente gerado!');
}

// ─── Helpers ───
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br>');
}

function escapeAttr(str) {
  if (!str) return '';
  return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}