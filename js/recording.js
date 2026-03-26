// ─── Recording State ───
const RecordingState = {
  isRecording: false,
  isPaused: false,
  startTime: null,
  elapsedBeforePause: 0,
  timerInterval: null,
  transcriptInterval: null,
  transcriptLines: [],
  interimLineId: null,
  lineIndex: 0,
  currentDemoScript: [],
  detectionSeen: new Set(),
  durationSec: 0,
  recognition: null,
  supportsSpeech: false,
  cidShown: false,
  cidShowTimeout: null,

  reset() {
    this.isRecording = false;
    this.isPaused = false;
    this.startTime = null;
    this.elapsedBeforePause = 0;
    this.transcriptLines = [];
    this.interimLineId = null;
    this.lineIndex = 0;
    this.currentDemoScript = [];
    this.detectionSeen = new Set();
    this.durationSec = 0;
    this.cidShown = false;
    clearInterval(this.timerInterval);
    clearInterval(this.transcriptInterval);
    clearTimeout(this.cidShowTimeout);
    this.timerInterval = null;
    this.transcriptInterval = null;
    this.cidShowTimeout = null;
    if (this.recognition) {
      try { this.recognition.stop(); } catch (e) {}
    }
    this.recognition = null;
    updateRecordingVisualState('idle');
    resetRecordingSidePanels();
    renderTranscript([]);
    updateWordCounter();
    toggleStopGenerateButton();
    const warn = document.getElementById('speech-banner-warning');
    if (warn) warn.classList.add('hidden');
    if (typeof ConsultLiveState !== 'undefined') {
      ConsultLiveState.transcriptionLines = [];
      ConsultLiveState.detectedItems = [];
      ConsultLiveState.confirmedCids = [];
      ConsultLiveState.recordingDuration = 0;
      ConsultLiveState.isSimulated = false;
    }
  }
};

const CID_MOCK_CATALOG = [
  { code: 'J06.9', name: 'Infecção aguda das vias aéreas superiores', confidence: 94, trecho: 'paciente refere coriza e dor de garganta há 3 dias...' },
  { code: 'I10', name: 'Hipertensão essencial (primária)', confidence: 91, trecho: 'pressão está alta nos últimos dias, em casa ficou 16 por 10...' },
  { code: 'R51', name: 'Cefaleia', confidence: 88, trecho: 'dor de cabeça no fim do dia, piora após longos períodos na tela...' },
  { code: 'E11.9', name: 'Diabetes mellitus tipo 2 sem complicações', confidence: 86, trecho: 'controle glicêmico oscilando nas últimas semanas...' },
  { code: 'K30', name: 'Dispepsia', confidence: 84, trecho: 'queimação epigástrica após refeições gordurosas...' },
  { code: 'M54.5', name: 'Lombalgia baixa', confidence: 82, trecho: 'dor lombar há uma semana com piora ao final do dia...' }
];

const SPEECH_DETECTION_RULES = [
  { re: /\b(receita|prescrever|medicamento|remédio|comprimido|dose|mg)\b/i, text: 'Rascunho de prescrição identificado', type: 'Receituário' },
  { re: /\b(exame|ultrassom|hemograma|raio-x|ressonância|laboratório)\b/i, text: 'Pedido de exames mencionado', type: 'Pedido de exames' },
  { re: /\b(retorno|reavaliar|voltar em|agendar)\b/i, text: 'Necessidade de retorno/agendamento detectada', type: 'Agendamento' },
  { re: /\b(atestado|afastamento|dispensa)\b/i, text: 'Possível emissão de atestado', type: 'Atestado' }
];

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getSpeechRecognitionFactory() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function isDevEnvironment() {
  return location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1' ||
    location.hostname === '';
}

function updateRecordingVisualState(mode) {
  const btn = document.getElementById('btn-start-rec');
  const label = document.getElementById('btn-start-label');
  const pauseBtn = document.getElementById('btn-pause-rec');
  const timer = document.getElementById('rec-timer');
  const waveform = document.getElementById('record-waveform');
  const icon = document.getElementById('record-circle-icon');
  if (!btn || !label || !pauseBtn || !timer || !waveform || !icon) return;

  btn.classList.remove('idle', 'recording', 'paused');
  if (mode === 'recording') {
    btn.classList.add('recording');
    label.textContent = 'Gravando — toque para pausar';
    pauseBtn.classList.remove('hidden');
    pauseBtn.textContent = 'Pausar';
    timer.classList.add('recording');
    waveform.classList.remove('hidden');
    icon.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="7" y="7" width="10" height="10" rx="1.5"/></svg>';
  } else if (mode === 'paused') {
    btn.classList.add('paused');
    label.textContent = 'Pausado — toque para continuar';
    pauseBtn.classList.remove('hidden');
    pauseBtn.textContent = 'Retomar';
    timer.classList.remove('recording');
    waveform.classList.add('hidden');
    icon.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="8,6 19,12 8,18"/></svg>';
  } else {
    btn.classList.add('idle');
    label.textContent = 'Toque para iniciar a gravação';
    pauseBtn.classList.add('hidden');
    timer.classList.remove('recording');
    timer.textContent = '00:00';
    waveform.classList.add('hidden');
    icon.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>';
  }
}

function resetRecordingSidePanels() {
  const cidCard = document.getElementById('cid-suggestions-card');
  const cidEl = document.getElementById('cid-suggested-panel');
  const cidSearch = document.getElementById('cid-search-results');
  const detEl = document.getElementById('speech-detections');
  if (cidCard) cidCard.classList.add('hidden');
  if (cidEl) cidEl.innerHTML = '';
  if (cidSearch) {
    cidSearch.innerHTML = '';
    cidSearch.classList.add('hidden');
  }
  if (detEl) {
    detEl.innerHTML = '<li class="speech-detection-empty">Nenhuma detecção ainda...</li>';
  }
}

function renderCidSuggestions(filterQuery) {
  const panel = document.getElementById('cid-suggested-panel');
  const results = document.getElementById('cid-search-results');
  if (!panel || !results) return;
  const confirmed = (typeof ConsultLiveState !== 'undefined' ? ConsultLiveState.confirmedCids : []) || [];
  const q = (filterQuery || '').trim().toLowerCase();
  const initial = CID_MOCK_CATALOG.slice(0, 3);
  const list = q
    ? CID_MOCK_CATALOG.filter(c => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q))
    : initial;

  const html = list.map(c => {
    const isConfirmed = confirmed.includes(c.code);
    return `
      <button type="button" class="cid-item ${isConfirmed ? 'cid-item--confirmed' : ''}" data-cid="${escapeHtml(c.code)}">
        <div class="cid-item-top">
          <span class="cid-code-badge">[${escapeHtml(c.code)}]</span>
          <span class="cid-item-name">${escapeHtml(c.name)}</span>
          <span class="cid-item-confidence">${c.confidence}%</span>
        </div>
        <p class="cid-item-snippet">Trecho: "${escapeHtml(c.trecho)}"</p>
        <span class="cid-see-more">ver mais</span>
      </button>
    `;
  }).join('');

  if (!q) {
    panel.innerHTML = html || '<p class="cid-empty">Sem sugestões no momento.</p>';
    results.classList.add('hidden');
    results.innerHTML = '';
  } else {
    results.innerHTML = html || '<p class="cid-empty">Nenhum CID encontrado.</p>';
    results.classList.remove('hidden');
  }
}

function confirmCid(code) {
  if (typeof ConsultLiveState === 'undefined') return;
  if (!ConsultLiveState.confirmedCids.includes(code)) {
    ConsultLiveState.confirmedCids.push(code);
  }
  renderCidSuggestions('');
}

function ensureCidSuggestionsVisible(immediate) {
  if (RecordingState.cidShown) return;
  if (immediate) {
    const card = document.getElementById('cid-suggestions-card');
    if (card) card.classList.remove('hidden');
    renderCidSuggestions('');
    RecordingState.cidShown = true;
    return;
  }
  clearTimeout(RecordingState.cidShowTimeout);
  RecordingState.cidShowTimeout = setTimeout(() => {
    const card = document.getElementById('cid-suggestions-card');
    if (card) card.classList.remove('hidden');
    renderCidSuggestions('');
    RecordingState.cidShown = true;
  }, 30000);
}

function renderDetectedItems() {
  const detEl = document.getElementById('speech-detections');
  if (!detEl) return;
  const list = (typeof ConsultLiveState !== 'undefined' ? ConsultLiveState.detectedItems : []) || [];
  if (!list.length) {
    detEl.innerHTML = '<li class="speech-detection-empty">Nenhuma detecção ainda...</li>';
    return;
  }
  detEl.innerHTML = list.map((d, idx) => `
    <li>
      <button type="button" class="speech-detection-item" data-det-idx="${idx}">
        <span class="det-dot"></span>
        <span class="det-text">${escapeHtml(d.text)}</span>
        <span class="det-tag det-tag-${slugType(d.type)}">${escapeHtml(d.type)}</span>
      </button>
    </li>
  `).join('');
}

function slugType(type) {
  return String(type || '').toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '');
}

function appendSpeechDetectionsFromLine(line) {
  if (!line || !line.text || typeof ConsultLiveState === 'undefined') return;
  const hay = line.text;
  for (const rule of SPEECH_DETECTION_RULES) {
    if (!rule.re.test(hay)) continue;
    if (RecordingState.detectionSeen.has(rule.text)) continue;
    RecordingState.detectionSeen.add(rule.text);
    ConsultLiveState.detectedItems.push({
      type: rule.type,
      text: rule.text,
      preview: line.text
    });
  }
  renderDetectedItems();
}

function openDetectionPreview(item) {
  let modal = document.getElementById('det-preview-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'det-preview-modal';
    modal.className = 'det-preview-modal hidden';
    modal.innerHTML = `
      <div class="det-preview-backdrop" data-close="1"></div>
      <div class="det-preview-content">
        <h4 class="font-display">Preview do documento</h4>
        <div id="det-preview-body"></div>
        <div style="margin-top:1rem;display:flex;justify-content:flex-end">
          <button type="button" class="btn btn-secondary" id="det-preview-close">Fechar</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => {
      if (e.target.dataset.close === '1' || e.target.id === 'det-preview-close') {
        modal.classList.add('hidden');
      }
    });
  }
  const body = document.getElementById('det-preview-body');
  if (body) {
    body.innerHTML = `
      <p><strong>Tipo:</strong> ${escapeHtml(item.type)}</p>
      <p><strong>Sinal detectado:</strong> ${escapeHtml(item.text)}</p>
      <p><strong>Trecho:</strong> "${escapeHtml(item.preview || '')}"</p>
    `;
  }
  modal.classList.remove('hidden');
}

function renderTranscript(lines, interimText) {
  const area = document.getElementById('transcript-area');
  if (!area) return;
  if (!lines.length && !interimText) {
    area.innerHTML = '<p class="transcript-placeholder" id="transcript-placeholder">Inicie a gravação para ver a transcrição...</p>';
    return;
  }
  const finalHtml = lines.map(l => {
    const roleClass = (l.speaker || '').toLowerCase() === 'paciente' ? 'patient' : 'doctor';
    return `<div class="transcript-line-live ${roleClass}"><span class="transcript-prefix">${escapeHtml(l.speaker)}:</span> <span>${escapeHtml(l.text)}</span></div>`;
  }).join('');
  const interimHtml = interimText
    ? `<div class="transcript-line-live interim"><span class="transcript-prefix">Processando:</span> <span>${escapeHtml(interimText)}</span></div>`
    : '';
  area.innerHTML = finalHtml + interimHtml;
  area.scrollTop = area.scrollHeight;
}

function wordCount(lines) {
  const txt = lines.map(l => l.text).join(' ').trim();
  if (!txt) return 0;
  return txt.split(/\s+/).filter(Boolean).length;
}

function updateWordCounter() {
  const el = document.getElementById('transcript-badge');
  if (!el) return;
  const count = wordCount(RecordingState.transcriptLines);
  el.textContent = `${count} palavras transcritas`;
}

function toggleStopGenerateButton() {
  const btn = document.getElementById('btn-stop-generate');
  if (!btn) return;
  const hasThirty = RecordingState.durationSec >= 30;
  const simulatedReady = (typeof ConsultLiveState !== 'undefined') &&
    ConsultLiveState.isSimulated &&
    RecordingState.transcriptLines.length > 0;
  btn.disabled = !(hasThirty || simulatedReady);
}

function updateTimer() {
  if (!RecordingState.isRecording || RecordingState.isPaused || !RecordingState.startTime) return;
  const elapsed = RecordingState.elapsedBeforePause + Math.floor((Date.now() - RecordingState.startTime) / 1000);
  RecordingState.durationSec = elapsed;
  const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const s = String(elapsed % 60).padStart(2, '0');
  const timer = document.getElementById('rec-timer');
  if (timer) timer.textContent = `${m}:${s}`;
  if (typeof ConsultLiveState !== 'undefined') {
    ConsultLiveState.recordingDuration = elapsed;
  }
  toggleStopGenerateButton();
}

function addFinalTranscriptLine(line) {
  RecordingState.transcriptLines.push(line);
  if (typeof ConsultLiveState !== 'undefined') {
    ConsultLiveState.transcriptionLines = RecordingState.transcriptLines.slice();
  }
  appendSpeechDetectionsFromLine(line);
  renderTranscript(RecordingState.transcriptLines);
  updateWordCounter();
}

function setupSpeechRecognition() {
  const SpeechCtor = getSpeechRecognitionFactory();
  RecordingState.supportsSpeech = !!SpeechCtor;
  if (!SpeechCtor) return false;
  const recognition = new SpeechCtor();
  recognition.lang = 'pt-BR';
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.onresult = event => {
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const text = event.results[i][0].transcript.trim();
      if (!text) continue;
      if (event.results[i].isFinal) {
        const speaker = RecordingState.transcriptLines.length % 2 === 0 ? 'Médico' : 'Paciente';
        addFinalTranscriptLine({ speaker, text });
      } else {
        interim = text;
      }
    }
    renderTranscript(RecordingState.transcriptLines, interim);
  };
  recognition.onerror = () => {};
  recognition.onend = () => {
    if (RecordingState.isRecording && !RecordingState.isPaused) {
      try { recognition.start(); } catch (e) {}
    }
  };
  RecordingState.recognition = recognition;
  return true;
}

function startSimulationTranscription() {
  RecordingState.currentDemoScript = getDemoTranscript(document.getElementById('consult-type').value || 'default');
  RecordingState.lineIndex = 0;
  if (typeof ConsultLiveState !== 'undefined') ConsultLiveState.isSimulated = true;
  appendSimulatedLine();
  RecordingState.transcriptInterval = setInterval(() => {
    appendSimulatedLine();
  }, 3600);
}

function appendSimulatedLine() {
  if (RecordingState.isPaused) return;
  if (!RecordingState.currentDemoScript.length) return;
  const line = RecordingState.currentDemoScript[RecordingState.lineIndex % RecordingState.currentDemoScript.length];
  RecordingState.lineIndex += 1;
  addFinalTranscriptLine(line);
}

function startRecording() {
  if (RecordingState.isRecording) return;
  RecordingState.isRecording = true;
  RecordingState.isPaused = false;
  RecordingState.startTime = Date.now();
  RecordingState.elapsedBeforePause = 0;
  RecordingState.durationSec = 0;
  RecordingState.transcriptLines = [];
  RecordingState.detectionSeen = new Set();
  if (typeof ConsultLiveState !== 'undefined') {
    ConsultLiveState.transcriptionLines = [];
    ConsultLiveState.detectedItems = [];
    ConsultLiveState.confirmedCids = [];
    ConsultLiveState.recordingDuration = 0;
    ConsultLiveState.isSimulated = false;
  }
  renderTranscript([]);
  updateWordCounter();
  renderDetectedItems();
  ensureCidSuggestionsVisible(false);
  updateRecordingVisualState('recording');
  toggleStopGenerateButton();
  RecordingState.timerInterval = setInterval(updateTimer, 1000);
  updateTimer();

  const hasSpeech = setupSpeechRecognition();
  const warn = document.getElementById('speech-banner-warning');
  if (warn) warn.classList.add('hidden');
  if (hasSpeech) {
    try { RecordingState.recognition.start(); } catch (e) {}
  } else {
    if (warn) warn.classList.remove('hidden');
    if (isDevEnvironment()) {
      startSimulationTranscription();
      ensureCidSuggestionsVisible(true);
    }
  }
}

function pauseRecording() {
  if (!RecordingState.isRecording || RecordingState.isPaused) return;
  RecordingState.isPaused = true;
  RecordingState.elapsedBeforePause += Math.floor((Date.now() - RecordingState.startTime) / 1000);
  clearInterval(RecordingState.timerInterval);
  RecordingState.timerInterval = null;
  if (RecordingState.recognition) {
    try { RecordingState.recognition.stop(); } catch (e) {}
  }
  updateRecordingVisualState('paused');
  updateTimer();
}

function resumeRecording() {
  if (!RecordingState.isRecording || !RecordingState.isPaused) return;
  RecordingState.isPaused = false;
  RecordingState.startTime = Date.now();
  RecordingState.timerInterval = setInterval(updateTimer, 1000);
  if (RecordingState.recognition) {
    try { RecordingState.recognition.start(); } catch (e) {}
  }
  updateRecordingVisualState('recording');
}

function stopRecording() {
  if (!RecordingState.isRecording) return;
  if (!RecordingState.isPaused && RecordingState.startTime) {
    RecordingState.elapsedBeforePause += Math.floor((Date.now() - RecordingState.startTime) / 1000);
  }
  RecordingState.durationSec = RecordingState.elapsedBeforePause;
  RecordingState.isRecording = false;
  RecordingState.isPaused = false;
  clearInterval(RecordingState.timerInterval);
  clearInterval(RecordingState.transcriptInterval);
  clearTimeout(RecordingState.cidShowTimeout);
  RecordingState.timerInterval = null;
  RecordingState.transcriptInterval = null;
  if (RecordingState.recognition) {
    try { RecordingState.recognition.stop(); } catch (e) {}
  }
  if (typeof ConsultLiveState !== 'undefined') {
    ConsultLiveState.recordingDuration = RecordingState.durationSec;
  }
  updateRecordingVisualState('paused');
  updateTimer();
  toggleStopGenerateButton();
}

async function stopAndGenerateSummary() {
  stopRecording();
  if (RecordingState.durationSec < 30 && !(ConsultLiveState && ConsultLiveState.isSimulated && RecordingState.transcriptLines.length > 0)) {
    showToast('Aguarde ao menos 30 segundos de gravação para gerar o prontuário.');
    return;
  }
  const patientName = document.getElementById('patient-name').value.trim();
  const type = document.getElementById('consult-type').value;
  showLoading('Gerando prontuário...');
  try {
    const transcriptText = RecordingState.transcriptLines.map(l => `${l.speaker}: ${l.text}`).join('\n');
    const summary = await generateSummaryWithAI(patientName, type, transcriptText);
    hideLoading();
    displaySummary(summary, patientName, type);
    if (typeof ConsultLiveState !== 'undefined' && ConsultLiveState.consultId) {
      location.hash = `#/consulta/${ConsultLiveState.consultId}/resumo`;
    }
  } catch (err) {
    console.error('AI error, falling back to template:', err);
    hideLoading();
    displaySummary(getSummaryTemplate(type), patientName, type);
    if (typeof ConsultLiveState !== 'undefined' && ConsultLiveState.consultId) {
      location.hash = `#/consulta/${ConsultLiveState.consultId}/resumo`;
    }
  }
}

function initRecordingInteractions() {
  const toggleBtn = document.getElementById('btn-start-rec');
  const pauseBtn = document.getElementById('btn-pause-rec');
  const stopGenerate = document.getElementById('btn-stop-generate');
  const cancelBtn = document.getElementById('btn-cancel-consult');
  const cidPanel = document.getElementById('cid-suggested-panel');
  const cidSearchInput = document.getElementById('cid-search-input');
  const cidSearchResults = document.getElementById('cid-search-results');
  const detList = document.getElementById('speech-detections');
  const ctxToggle = document.getElementById('live-context-toggle');
  const ctxBody = document.getElementById('live-context-body');

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      if (!RecordingState.isRecording) startRecording();
      else if (!RecordingState.isPaused) pauseRecording();
      else resumeRecording();
    });
  }
  if (pauseBtn) {
    pauseBtn.addEventListener('click', () => {
      if (!RecordingState.isRecording) return;
      if (RecordingState.isPaused) resumeRecording();
      else pauseRecording();
    });
  }
  if (stopGenerate) {
    stopGenerate.addEventListener('click', stopAndGenerateSummary);
  }
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      if (typeof navTo === 'function') navTo('nova-consulta');
    });
  }
  if (cidPanel) {
    cidPanel.addEventListener('click', e => {
      const seeMore = e.target.closest('.cid-see-more');
      if (seeMore) {
        const itemEl = seeMore.closest('.cid-item');
        if (itemEl) itemEl.classList.toggle('cid-item--expanded');
        return;
      }
      const item = e.target.closest('.cid-item');
      if (!item) return;
      confirmCid(item.dataset.cid);
    });
  }
  if (cidSearchResults) {
    cidSearchResults.addEventListener('click', e => {
      const seeMore = e.target.closest('.cid-see-more');
      if (seeMore) {
        const itemEl = seeMore.closest('.cid-item');
        if (itemEl) itemEl.classList.toggle('cid-item--expanded');
        return;
      }
      const item = e.target.closest('.cid-item');
      if (!item) return;
      confirmCid(item.dataset.cid);
      if (cidSearchInput) cidSearchInput.value = '';
      renderCidSuggestions('');
    });
  }
  if (cidSearchInput) {
    cidSearchInput.addEventListener('input', () => renderCidSuggestions(cidSearchInput.value));
  }
  if (detList) {
    detList.addEventListener('click', e => {
      const btn = e.target.closest('.speech-detection-item');
      if (!btn) return;
      const idx = Number(btn.dataset.detIdx);
      const item = ConsultLiveState?.detectedItems?.[idx];
      if (item) openDetectionPreview(item);
    });
  }
  if (ctxToggle && ctxBody) {
    let hidden = false;
    ctxToggle.addEventListener('click', () => {
      hidden = !hidden;
      ctxBody.classList.toggle('hidden', hidden);
      ctxToggle.textContent = hidden ? 'Mostrar contexto' : 'Ocultar contexto';
    });
  }

  updateRecordingVisualState('idle');
  resetRecordingSidePanels();
  renderTranscript([]);
  updateWordCounter();
}

document.addEventListener('DOMContentLoaded', initRecordingInteractions);

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
