// ─── Recording State ───
const RecordingState = {
  isRecording: false,
  startTime: null,
  timerInterval: null,
  transcriptInterval: null,
  transcriptLines: [],
  lineIndex: 0,
  currentDemoScript: [],

  reset() {
    this.isRecording = false;
    this.startTime = null;
    this.transcriptLines = [];
    this.lineIndex = 0;
    clearInterval(this.timerInterval);
    clearInterval(this.transcriptInterval);
    this.timerInterval = null;
    this.transcriptInterval = null;
    // Reset UI
    document.getElementById('btn-start-rec').classList.remove('recording');
    document.getElementById('btn-start-label').textContent = 'Iniciar Gravação';
    document.getElementById('btn-start-rec').disabled = false;
    document.getElementById('btn-stop-rec').disabled = true;
    document.getElementById('rec-status').classList.add('hidden');
  }
};

// ─── Start recording ───
document.getElementById('btn-start-rec').addEventListener('click', () => {
  if (RecordingState.isRecording) return;

  RecordingState.isRecording = true;
  RecordingState.startTime = Date.now();
  RecordingState.lineIndex = 0;
  RecordingState.transcriptLines = [];

  // Get demo script for current consultation type
  const type = document.getElementById('consult-type').value || 'default';
  RecordingState.currentDemoScript = getDemoTranscript(type);

  // UI
  const btnStart = document.getElementById('btn-start-rec');
  const btnStop  = document.getElementById('btn-stop-rec');
  btnStart.classList.add('recording');
  document.getElementById('btn-start-label').textContent = 'Gravando...';
  btnStart.disabled = true;
  btnStop.disabled = false;
  document.getElementById('rec-status').classList.remove('hidden');

  // Clear placeholder
  const area = document.getElementById('transcript-area');
  area.innerHTML = '';

  // Start timer
  RecordingState.timerInterval = setInterval(updateTimer, 1000);

  // Simulate live transcription — one line every ~3.5s
  appendTranscriptLine(); // first line immediately
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

  // UI
  document.getElementById('btn-start-rec').classList.remove('recording');
  document.getElementById('btn-start-label').textContent = 'Iniciar Gravação';
  document.getElementById('btn-start-rec').disabled = false;
  document.getElementById('btn-stop-rec').disabled = true;
  document.getElementById('rec-status').classList.add('hidden');

  // Calculate duration
  const durationSec = Math.floor((Date.now() - RecordingState.startTime) / 1000);
  RecordingState.durationSec = durationSec;

  // Enable generate button if there's transcript
  if (RecordingState.transcriptLines.length > 0) {
    document.getElementById('btn-gerar').disabled = false;
  }

  showToast('Gravação concluída! Gere o resumo clínico.');
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

  const area = document.getElementById('transcript-area');

  // Remove any existing cursor
  const existing = area.querySelector('.transcript-cursor');
  if (existing) existing.remove();

  // Build line element
  const div = document.createElement('div');
  div.className = 'transcript-line anim-fade';

  const isPatient = line.speaker === 'Paciente';
  const speakerSpan = `<span class="transcript-speaker${isPatient ? ' patient' : ''}">${line.speaker}: </span>`;

  // Typing effect
  div.innerHTML = speakerSpan + '<span class="transcript-text"></span><span class="transcript-cursor"></span>';
  area.appendChild(div);
  area.scrollTop = area.scrollHeight;

  const textEl = div.querySelector('.transcript-text');
  const cursor = div.querySelector('.transcript-cursor');
  let i = 0;

  const speed = 28; // ms per character
  const typing = setInterval(() => {
    textEl.textContent = line.text.slice(0, i);
    i++;
    if (i > line.text.length) {
      clearInterval(typing);
      cursor.remove();
    }
    area.scrollTop = area.scrollHeight;
  }, speed);

  // Update badge
  const total = RecordingState.transcriptLines.length;
  document.getElementById('transcript-badge').textContent = `${total} fala${total > 1 ? 's' : ''}`;
}

// ─── Generate summary button ───
document.getElementById('btn-gerar').addEventListener('click', async () => {
  const patientName = document.getElementById('patient-name').value.trim();
  const type        = document.getElementById('consult-type').value;

  showLoading('Gerando resumo clínico com IA...');

  try {
    // Call Claude API via Anthropic
    const transcriptText = RecordingState.transcriptLines
      .map(l => `${l.speaker}: ${l.text}`)
      .join('\n');

    const summary = await generateSummaryWithAI(patientName, type, transcriptText);
    hideLoading();
    displaySummary(summary, patientName, type);
  } catch (err) {
    console.error('AI error, falling back to template:', err);
    hideLoading();
    // Fallback to template
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
      max_tokens: 1000,
      system: `Você é um assistente médico especializado em documentação clínica. 
Gere resumos clínicos estruturados em português (Brasil) a partir de transcrições de consultas médicas.
Responda APENAS com um objeto JSON válido, sem markdown, sem explicações adicionais.
Estrutura exigida:
{
  "queixa": "string",
  "historia": "string",
  "avaliacao": "string",
  "plano": "string com itens separados por \\n",
  "patient_summary": "string curta explicando ao paciente o diagnóstico",
  "recommendations": ["array de strings com recomendações ao paciente"]
}`,
      messages: [{
        role: 'user',
        content: `Paciente: ${patientName}\nTipo de consulta: ${consultType}\n\nTranscrição:\n${transcript}\n\nGere o resumo clínico estruturado.`
      }]
    })
  });

  if (!response.ok) throw new Error('API error: ' + response.status);

  const data = await response.json();
  const raw = data.content.find(b => b.type === 'text')?.text || '';
  const clean = raw.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}