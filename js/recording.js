// ─── Recording State ───
const RecordingState = {
  isRecording: false,
  startTime: null,
  timerInterval: null,
  transcriptInterval: null,
  transcriptLines: [],
  lineIndex: 0,
  currentDemoScript: [],
  detectionSeen: new Set(),

  reset() {
    this.isRecording = false;
    this.startTime = null;
    this.transcriptLines = [];
    this.lineIndex = 0;
    this.detectionSeen = new Set();
    clearInterval(this.timerInterval);
    clearInterval(this.transcriptInterval);
    this.timerInterval = null;
    this.transcriptInterval = null;
    document.getElementById('btn-start-rec').classList.remove('recording');
    document.getElementById('btn-start-label').textContent = 'Iniciar gravação';
    document.getElementById('btn-start-rec').disabled = false;
    document.getElementById('btn-stop-rec').disabled = true;
    document.getElementById('rec-status').classList.add('hidden');
    resetRecordingSidePanels();
  }
};

const SPEECH_DETECTION_RULES = [
  { re: /\b(alergia|alérgic|hipersensibilidade)\b/i, text: 'Possível menção a alergia ou hipersensibilidade.' },
  { re: /\b(medicamento|remédio|comprimido|mg\b|ml\b)\b/i, text: 'Uso de medicamento citado na consulta.' },
  { re: /\b(dor|latejando|queimação|náusea|vômito)\b/i, text: 'Sintoma referido (dor ou desconforto GI/neurológico).' },
  { re: /\b(pressão|hipertens|diabetes|glicemia)\b/i, text: 'Condição crônica ou sinal vital mencionado.' },
  { re: /\b(exame|ultrassom|raio-x|hemograma|sangue)\b/i, text: 'Pedido ou resultado de exame mencionado.' },
  { re: /\b(retorno|voltar|semanas?|dias?)\b/i, text: 'Janela de retorno ou seguimento citada na conversa.' }
];

function resetRecordingSidePanels() {
  const cidEl = document.getElementById('cid-suggested-panel');
  const detEl = document.getElementById('speech-detections');
  if (cidEl) {
    cidEl.innerHTML =
      '<li class="cid-panel-item" style="opacity:.75;font-size:13px">Inicie a gravação para ver sugestões contextuais.</li>';
  }
  if (detEl) {
    detEl.innerHTML =
      '<li style="color:var(--text-secondary);font-size:13px">Alergias, medicamentos e sintomas citados aparecerão aqui.</li>';
  }
}

function renderCidSuggestedPanel(type) {
  const cidEl = document.getElementById('cid-suggested-panel');
  if (!cidEl) return;
  const list = typeof getSuggestedCidsForSession === 'function' ? getSuggestedCidsForSession(type) : [];
  if (!list.length) {
    cidEl.innerHTML =
      '<li class="cid-panel-item" style="opacity:.75;font-size:13px">Nenhuma sugestão automática para este motivo.</li>';
    return;
  }
  cidEl.innerHTML = list
    .map(
      c => `<li class="cid-panel-item"><code>${escapeHtml(c.code)}</code> ${escapeHtml(c.desc)}</li>`
    )
    .join('');
}

function appendSpeechDetectionsFromLine(line) {
  const detEl = document.getElementById('speech-detections');
  if (!detEl || !line || !line.text) return;
  const hay = line.text;
  const speaker = (line.speaker || '').toLowerCase();
  for (const rule of SPEECH_DETECTION_RULES) {
    if (!rule.re.test(hay)) continue;
    const key = rule.text;
    if (RecordingState.detectionSeen.has(key)) continue;
    RecordingState.detectionSeen.add(key);
    if (detEl.querySelector('li[style*="text-secondary"]')) {
      detEl.innerHTML = '';
    }
    const li = document.createElement('li');
    li.textContent = `${rule.text} (${speaker === 'paciente' ? 'paciente' : 'equipe'})`;
    detEl.appendChild(li);
  }
}

function escapeHtml(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Start recording ───
document.getElementById('btn-start-rec').addEventListener('click', () => {
  if (RecordingState.isRecording) return;

  RecordingState.isRecording = true;
  RecordingState.startTime = Date.now();
  RecordingState.lineIndex = 0;
  RecordingState.transcriptLines = [];
  RecordingState.detectionSeen = new Set();

  const type = document.getElementById('consult-type').value || 'default';
  RecordingState.currentDemoScript = getDemoTranscript(type);

  renderCidSuggestedPanel(type);

  const btnStart = document.getElementById('btn-start-rec');
  const btnStop = document.getElementById('btn-stop-rec');
  btnStart.classList.add('recording');
  document.getElementById('btn-start-label').textContent = 'Gravando…';
  btnStart.disabled = true;
  btnStop.disabled = false;
  document.getElementById('rec-status').classList.remove('hidden');

  const area = document.getElementById('transcript-area');
  area.innerHTML = '';

  const detEl = document.getElementById('speech-detections');
  if (detEl) detEl.innerHTML = '';

  RecordingState.timerInterval = setInterval(updateTimer, 1000);

  appendTranscriptLine();
  RecordingState.transcriptInterval = setInterval(() => {
    if (RecordingState.lineIndex < RecordingState.currentDemoScript.length) {
      appendTranscriptLine();
    }
  }, 3500);
});

// ─── Stop recording ───
document.getElementById('btn-stop-rec').addEventListener('click', () => {
  if (!RecordingState.isRecording) return;

  clearInterval(RecordingState.timerInterval);
  clearInterval(RecordingState.transcriptInterval);
  RecordingState.isRecording = false;

  document.getElementById('btn-start-rec').classList.remove('recording');
  document.getElementById('btn-start-label').textContent = 'Iniciar gravação';
  document.getElementById('btn-start-rec').disabled = false;
  document.getElementById('btn-stop-rec').disabled = true;
  document.getElementById('rec-status').classList.add('hidden');

  RecordingState.durationSec = Math.floor((Date.now() - RecordingState.startTime) / 1000);

  if (RecordingState.transcriptLines.length > 0) {
    document.getElementById('btn-gerar').disabled = false;
  }

  showToast('Gravação concluída. Gere o prontuário quando estiver pronto.');
});

// ─── Timer ───
function updateTimer() {
  const elapsed = Math.floor((Date.now() - RecordingState.startTime) / 1000);
  const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const s = String(elapsed % 60).padStart(2, '0');
  document.getElementById('rec-timer').textContent = `${m}:${s}`;
}

// ─── Live transcript simulation ───
function appendTranscriptLine() {
  const script = RecordingState.currentDemoScript;
  if (RecordingState.lineIndex >= script.length) return;

  const line = script[RecordingState.lineIndex];
  RecordingState.lineIndex++;
  RecordingState.transcriptLines.push(line);

  appendSpeechDetectionsFromLine(line);

  const area = document.getElementById('transcript-area');

  const existing = area.querySelector('.transcript-cursor');
  if (existing) existing.remove();

  const div = document.createElement('div');
  div.className = 'transcript-line anim-fade';

  const isPatient = line.speaker === 'Paciente';
  const speakerSpan = `<span class="transcript-speaker${isPatient ? ' patient' : ''}">${line.speaker}: </span>`;

  div.innerHTML = speakerSpan + '<span class="transcript-text"></span><span class="transcript-cursor"></span>';
  area.appendChild(div);
  area.scrollTop = area.scrollHeight;

  const textEl = div.querySelector('.transcript-text');
  const cursor = div.querySelector('.transcript-cursor');
  let i = 0;

  const speed = 28;
  const typing = setInterval(() => {
    textEl.textContent = line.text.slice(0, i);
    i++;
    if (i > line.text.length) {
      clearInterval(typing);
      cursor.remove();
    }
    area.scrollTop = area.scrollHeight;
  }, speed);

  const total = RecordingState.transcriptLines.length;
  document.getElementById('transcript-badge').textContent = `${total} fala${total > 1 ? 's' : ''}`;
}

// ─── Generate summary button ───
document.getElementById('btn-gerar').addEventListener('click', async () => {
  const patientName = document.getElementById('patient-name').value.trim();
  const type = document.getElementById('consult-type').value;

  showLoading('Gerando prontuário com IA…');

  try {
    const transcriptText = RecordingState.transcriptLines
      .map(l => `${l.speaker}: ${l.text}`)
      .join('\n');

    const summary = await generateSummaryWithAI(patientName, type, transcriptText);
    hideLoading();
    displaySummary(summary, patientName, type);
  } catch (err) {
    console.error('AI error, falling back to template:', err);
    hideLoading();
    const tmpl = getSummaryTemplate(type);
    displaySummary(tmpl, patientName, type);
  }
});

// ─── Call Claude API ───
async function generateSummaryWithAI(patientName, consultType, transcript) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1400,
      system: `Você é um assistente médico especializado em documentação clínica no Brasil.
Gere prontuário em português (Brasil) a partir da transcrição.
Responda APENAS com JSON válido, sem markdown.
Estrutura:
{
  "queixa": "string",
  "historia": "string",
  "objetivo": "string (achados do exame físico / objetivo)",
  "avaliacao": "string (diagnósticos ou hipóteses)",
  "plano": "string com itens em linhas usando •",
  "cids": [ { "code": "X00.0", "desc": "descrição CID-10" } ],
  "documentos": [
    { "tipo": "Receituário|Pedido de exames|Guia TISS", "nome": "string", "status": "pronto" }
  ],
  "retornoDias": number,
  "retornoLabel": "ex: 7 dias",
  "patient_summary": "string para o paciente",
  "recommendations": ["string", "..."]
}
Use códigos CID-10 plausíveis. Inclua sempre receituário, pedido de exames quando aplicável, e guia TISS quando fizer sentido em consulta privada.`,
      messages: [
        {
          role: 'user',
          content: `Paciente: ${patientName}\nMotivo: ${consultType}\n\nTranscrição:\n${transcript}\n\nGere o prontuário completo.`
        }
      ]
    })
  });

  if (!response.ok) throw new Error('API error: ' + response.status);

  const data = await response.json();
  const raw = data.content.find(b => b.type === 'text')?.text || '';
  const clean = raw.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(clean);
  const fallback = getSummaryTemplate(consultType);
  const pick = k => {
    const v = parsed[k];
    return v != null && String(v).trim() !== '' ? v : fallback[k];
  };
  return {
    ...fallback,
    ...parsed,
    queixa: pick('queixa'),
    historia: pick('historia'),
    objetivo: pick('objetivo'),
    avaliacao: pick('avaliacao'),
    plano: pick('plano'),
    patient_summary: pick('patient_summary'),
    recommendations:
      Array.isArray(parsed.recommendations) && parsed.recommendations.length
        ? parsed.recommendations
        : fallback.recommendations,
    cids: Array.isArray(parsed.cids) && parsed.cids.length ? parsed.cids : fallback.cids,
    documentos:
      Array.isArray(parsed.documentos) && parsed.documentos.length
        ? parsed.documentos
        : fallback.documentos,
    retornoDias:
      typeof parsed.retornoDias === 'number' && !Number.isNaN(parsed.retornoDias)
        ? parsed.retornoDias
        : fallback.retornoDias,
    retornoLabel:
      parsed.retornoLabel && String(parsed.retornoLabel).trim()
        ? parsed.retornoLabel
        : fallback.retornoLabel
  };
}
