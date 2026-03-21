// ─── Navigation ───
let currentPatientName = '';
const sections = {
    'nova-consulta': 'section-nova-consulta',
    'dashboard':     'section-dashboard',
    'patients':      'section-patients',
  };
  
  function navTo(section) {
    // Update nav items
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.nav === section);
    });
  
    // Show/hide sections using .active class
    Object.entries(sections).forEach(([key, id]) => {
      const el = document.getElementById(id);
      if (el) {
        if (key === section) {
          el.classList.add('active');
          if (key === 'dashboard') renderDashboard();
          if (key === 'patients') renderPatients();
        } else {
          el.classList.remove('active');
        }
      }
    });
  }
  
  // ─── Login ───
  document.getElementById('btn-login').addEventListener('click', () => {
    const email = document.getElementById('login-email').value.trim();
    const pass  = document.getElementById('login-password').value.trim();
  
    if (!email || !pass) {
      showToast('Preencha e-mail e senha');
      return;
    }
  
    const btn = document.getElementById('btn-login');
    btn.innerHTML = '<div class="spinner"></div> Entrando...';
    btn.disabled = true;
  
    setTimeout(() => {
      document.getElementById('page-login').classList.remove('active');
      document.getElementById('page-app').classList.add('active');
  
      // Set doctor info
      const name = email.includes('larissa') ? 'Dra. Larissa Oliveira' : 'Dr. Médico';
      const initials = name.split(' ').filter(w => w.length > 2).slice(0,2).map(w => w[0]).join('');
      document.getElementById('sidebar-name').textContent = name;
      document.getElementById('sidebar-avatar').textContent = initials || 'MD';
      Store.doctor.name = name;
      Store.doctor.initials = initials;
    }, 900);
  });
  
  // Allow Enter key on login
  document.getElementById('login-password').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('btn-login').click();
  });
  
  // ─── Logout ───
  function logout() {
    document.getElementById('page-app').classList.remove('active');
    document.getElementById('page-login').classList.add('active');
    document.getElementById('btn-login').innerHTML = 'Entrar na plataforma';
    document.getElementById('btn-login').disabled = false;
    resetConsultation();
  }
  
  // ─── Start consultation (from setup form) ───
  document.getElementById('btn-go-record').addEventListener('click', () => {
    const name = document.getElementById('patient-name').value.trim();
    const type = document.getElementById('consult-type').value;
  
    if (!name) {
      showToast('Informe o nome do paciente');
      document.getElementById('patient-name').focus();
      return;
    }
    if (!type) {
      showToast('Selecione o tipo de consulta');
      document.getElementById('consult-type').focus();
      return;
    }
  
    // Guarda paciente atual para navegação de perfil
    currentPatientName = name;

    // Populate recording view
    document.getElementById('rec-patient-name').textContent = name;
    document.getElementById('rec-consult-type').textContent = type;
    const initials = name.trim().split(' ').filter(w => w.length > 0).slice(0,2).map(w => w[0].toUpperCase()).join('');
    document.getElementById('rec-patient-avatar').textContent = initials;
  
    // Show recording step
    document.getElementById('step-setup').classList.add('hidden');
    document.getElementById('step-recording').classList.remove('hidden');
    document.getElementById('step-summary').classList.add('hidden');
  });
  
  // ─── Reset consultation ───
  function resetConsultation() {
    document.getElementById('step-setup').classList.remove('hidden');
    document.getElementById('step-recording').classList.add('hidden');
    document.getElementById('step-summary').classList.add('hidden');
    document.getElementById('patient-name').value = '';
    document.getElementById('consult-type').value = '';
    document.getElementById('transcript-area').innerHTML = '<p class="transcript-placeholder" id="transcript-placeholder">Inicie a gravação para ver a transcrição em tempo real...</p>';
    document.getElementById('transcript-badge').textContent = '0 falas';
    document.getElementById('btn-gerar').disabled = true;
    RecordingState.reset();
  }

  // ─── Patient profile link (from "Consulta em andamento") ───
  function openPatientProfileFromHeader(event) {
    if (event) event.preventDefault();
    const nameField = document.getElementById('patient-name');
    const typedName = nameField ? nameField.value.trim() : '';
    const headerNameEl = document.getElementById('rec-patient-name');
    const headerName = headerNameEl ? headerNameEl.textContent.trim() : '';

    const name =
      currentPatientName ||
      (typedName || (headerName && headerName !== 'Paciente em atendimento' ? headerName : ''));

    if (!name) {
      showToast('Preencha os dados e inicie a consulta para acessar o perfil do paciente.');
      return;
    }
    openPatientProfile(name);
  }
  
  // ─── Dashboard rendering ───
  function renderDashboard() {
    const all = Store.getAll();
    const today = new Date().toDateString();
    const todayConsults = all.filter(c => new Date(c.date).toDateString() === today);
  
    document.getElementById('stat-today').textContent = todayConsults.length;
    document.getElementById('stat-done').textContent  = all.length;
  
    if (all.length > 0) {
      const avgMs = all.reduce((s, c) => s + (c.durationSec || 0), 0) / all.length;
      const mins = Math.floor(avgMs / 60);
      const secs = Math.round(avgMs % 60);
      document.getElementById('stat-avg').textContent = `${mins}:${String(secs).padStart(2,'0')}`;
    }
  
    // Date label
    const dateStr = new Date().toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
    document.getElementById('dash-date').textContent = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
  
    // Recent list
    const listEl = document.getElementById('recent-list');
    if (all.length === 0) {
      listEl.innerHTML = '<div style="padding:2.5rem;text-align:center;color:var(--muted-lt);font-size:.88rem">Nenhuma consulta realizada ainda</div>';
      return;
    }
  
    listEl.innerHTML = all.slice(0,8).map(c => `
      <div class="consult-item" onclick="openConsultation('${c.id}')">
        <div class="consult-avatar">${c.initials}</div>
        <div>
          <div class="consult-name">${c.patientName}</div>
          <div class="consult-reason">${c.type}</div>
        </div>
        <div class="consult-meta">
          <span class="badge badge-green">Concluída</span>
          <span class="consult-time">${formatRelTime(c.date)}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted-lt)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/></svg>
        </div>
      </div>
    `).join('');
  }
  
  function renderPatients() {
    const all = Store.getAll();
    renderPatientList(all);
  }
  
  function renderPatientList(list) {
    const el = document.getElementById('patient-list');
    if (list.length === 0) {
      el.innerHTML = '<div style="padding:2.5rem;text-align:center;color:var(--muted-lt);font-size:.88rem">Nenhum paciente encontrado</div>';
      return;
    }
  
    // Group by patient
    const byPatient = {};
    list.forEach(c => {
      if (!byPatient[c.patientName]) byPatient[c.patientName] = [];
      byPatient[c.patientName].push(c);
    });
  
    el.innerHTML = Object.entries(byPatient).map(([name, consults]) => {
      const last = consults[0];
      const statusInfo = getPatientStatus(consults);
      return `
        <div class="consult-item" onclick="openPatientProfile('${name.replace(/'/g, "\\'")}')">
          <div class="consult-avatar">${last.initials}</div>
          <div>
            <div class="consult-name">${name}</div>
            <div class="consult-reason">
              ${consults.length} consulta${consults.length > 1 ? 's' : ''} — última: ${last.type}
            </div>
          </div>
          <div class="consult-meta">
            <span class="patient-status-badge ${statusInfo.className}">
              ${statusInfo.label}
            </span>
            <span class="consult-time">${formatRelTime(last.date)}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted-lt)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/></svg>
          </div>
        </div>
      `;
    }).join('');
  }
  
  function filterPatients() {
    const q = document.getElementById('patient-search').value;
    renderPatientList(Store.getByPatient(q));
  }

  // ─── Patient profile dashboard ───
  function openPatientProfile(name) {
    const patientName = name && name.startsWith('Paciente: ')
      ? name.replace(/^Paciente:\s*/,'')
      : name;
    if (!patientName) {
      showToast('Nenhum paciente selecionado.');
      return;
    }

    const consults = Store.getByPatient(patientName);

    // Garante que estamos na aba de pacientes
    navTo('patients');

    const card = document.getElementById('patient-profile-card');
    const body = document.getElementById('patient-profile-body');
    if (!card || !body) return;

    const total = consults.length;
    const last = consults[0];
    const lastDate = last
      ? new Date(last.date).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        })
      : null;

    const uniqueTypes = [...new Set(consults.map(c => c.type))];
    const meta = typeof getPatientMeta === 'function' ? getPatientMeta(patientName) : null;
    const weightHistory = meta?.weightHistory || [];
    const latestWeight = weightHistory.length ? weightHistory[weightHistory.length - 1].weight : null;
    const heightCm = meta?.heightCm || null;
    const birthDate = meta?.birthDate || null;
    const ageYears = birthDate ? calcAgeYears(birthDate) : null;
    const mockPressure = [120, 118, 122, 125, 121, 119];
    const mockA1c = [5.4, 5.5, 5.6, 5.5, 5.4, 5.3];

    body.innerHTML = `
      <div class="patient-profile-header">
        <div class="avatar" style="background: var(--blue-mid); color: var(--blue);">
          ${(last && last.initials) || 'PT'}
        </div>
        <div>
          <div class="patient-profile-name">${patientName}</div>
          <div class="patient-profile-sub">
            ${total} consulta${total > 1 ? 's' : ''} registradas${
              lastDate ? ` &bull; último atendimento em ${lastDate}` : ''
            }
          </div>
          <div class="patient-profile-meta">
            <span class="pill">${uniqueTypes.length || 0} tipo(s) de consulta</span>
            <span class="pill">${total ? 'Documentadas pela IA' : 'Sem histórico ainda'}</span>
          </div>
        </div>
      </div>

      <div class="patient-profile-stats">
        <div>
          <div class="patient-profile-stat-label">Peso atual</div>
          <div class="patient-profile-stat-value">
            ${latestWeight ? `${latestWeight.toFixed(1)} kg` : '—'}
          </div>
          <div style="font-size:.75rem;color:var(--muted);margin-top:.15rem;">
            Clique para ver o histórico
          </div>
        </div>
        <div>
          <div class="patient-profile-stat-label">Altura</div>
          <div class="patient-profile-stat-value">
            ${heightCm ? `${(heightCm / 100).toFixed(2)} m` : '—'}
          </div>
          <div style="font-size:.75rem;color:var(--muted);margin-top:.15rem;">
            IMC aproximado: ${
              heightCm && latestWeight
                ? calcBmi(latestWeight, heightCm).toFixed(1)
                : '—'
            }
          </div>
        </div>
        <div>
          <div class="patient-profile-stat-label">Idade</div>
          <div class="patient-profile-stat-value">
            ${ageYears !== null ? `${ageYears} anos` : '—'}
          </div>
          <div style="font-size:.75rem;color:var(--muted);margin-top:.15rem;">
            ${birthDate ? `Nascimento: ${new Date(birthDate).toLocaleDateString('pt-BR')}` : ''}
          </div>
        </div>
      </div>

      <div class="patient-trends">
        <div class="patient-trend-card">
          <div class="patient-trend-label">Pressão arterial (12 meses)</div>
          <div class="patient-trend-value">Média 12x8</div>
          <svg class="patient-trend-chart" viewBox="0 0 100 36" preserveAspectRatio="none">
            <polyline fill="none" stroke="#2563EB" stroke-width="2"
              points="${buildSparklinePoints(mockPressure, 100, 30, 120, 130)}" />
          </svg>
        </div>
        <div class="patient-trend-card">
          <div class="patient-trend-label">Peso (últimos anos)</div>
          <div class="patient-trend-value">${
            latestWeight ? `${latestWeight.toFixed(1)} kg` : 'Sem histórico'
          }</div>
          <svg class="patient-trend-chart" viewBox="0 0 100 36" preserveAspectRatio="none">
            <polyline fill="none" stroke="#10B981" stroke-width="2"
              points="${
                weightHistory.length
                  ? buildSparklinePoints(
                      weightHistory.map(w => w.weight),
                      100,
                      30,
                      getMin(weightHistory.map(w => w.weight)) - 2,
                      getMax(weightHistory.map(w => w.weight)) + 2
                    )
                  : ''
              }" />
            ${
              weightHistory.length
                ? weightHistory
                    .map((w, idx, arr) => {
                      const x =
                        arr.length === 1 ? 50 : (idx / (arr.length - 1)) * 100;
                      const range =
                        (getMax(arr.map(v => v.weight)) -
                          getMin(arr.map(v => v.weight))) || 1;
                      const norm =
                        (w.weight - getMin(arr.map(v => v.weight))) / range;
                      const y = 30 - norm * 30;
                      return `<circle cx="${x.toFixed(
                        1
                      )}" cy="${y.toFixed(
                        1
                      )}" r="2.3" fill="#10B981" data-weight="${w.weight.toFixed(
                        1
                      )} kg" />`;
                    })
                    .join('')
                : ''
            }
          </svg>
        </div>
        <div class="patient-trend-card">
          <div class="patient-trend-label">Hemoglobina glicada (A1c)</div>
          <div class="patient-trend-value">Estável</div>
          <svg class="patient-trend-chart" viewBox="0 0 100 36" preserveAspectRatio="none">
            <polyline fill="none" stroke="#F59E0B" stroke-width="2"
              points="${buildSparklinePoints(mockA1c, 100, 30, 5.2, 5.8)}" />
          </svg>
        </div>
      </div>

      <div class="patient-files">
        <div>
          <div class="patient-profile-section-title">Exames e documentos recentes (simulação)</div>
          <div class="patient-files-list" id="patient-files-list">
            ${buildMockFilesHtml(patientName)}
          </div>
        </div>
        <div class="patient-files-upload">
          <div class="patient-profile-section-title">Upload de novos exames</div>
          <label class="patient-files-upload-label">
            <input type="file" id="patient-file-input" />
            <span>Arraste arquivos aqui ou clique para selecionar</span>
          </label>
          <p style="font-size:.75rem;color:var(--muted);margin-top:.3rem;">
            Upload simulado para demonstração. Nenhum dado é enviado a servidores reais.
          </p>
        </div>
      </div>

      <div style="margin-top:1rem;">
        <div class="patient-profile-section-title">Consultas deste paciente</div>
        <ul class="patient-profile-list" id="patient-consultations-list"></ul>
      </div>
    `;

    card.classList.remove('hidden');

    // Preenche lista de consultas clicáveis
    const consultListEl = document.getElementById('patient-consultations-list');
    if (consultListEl) {
      consultListEl.innerHTML = consults.map(c => {
        const dateStr = new Date(c.date).toLocaleString('pt-BR', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit'
        });
        return `
          <li>
            <button class="btn btn-ghost btn-sm"
              onclick="openConsultation('${c.id}')"
              style="width:100%;justify-content:space-between;">
              <span>${dateStr} — ${c.type}</span>
              <span style="font-size:.78rem;color:var(--muted-lt);">Ver resumo e transcrição</span>
            </button>
          </li>
        `;
      }).join('') || '<li style="color:var(--muted);font-size:.8rem;">Nenhuma consulta registrada ainda para este paciente.</li>';
    }

    // Upload fake de arquivos
    const fileInput = document.getElementById('patient-file-input');
    if (fileInput) {
      fileInput.onchange = () => {
        if (fileInput.files && fileInput.files.length > 0) {
          showToast('Upload de exame registrado (simulação).');
        }
      };
    }
  }
  
  function openConsultation(id) {
    const c = Store.getAll().find(x => x.id === id);
    if (!c) return;
    // Navigate to summary view for this consultation
    navTo('nova-consulta');
    showSummaryFromSaved(c);
  }

  function formatAverageDuration(consults) {
    if (!consults.length) return '—';
    const total = consults.reduce((sum, c) => sum + (c.durationSec || 0), 0);
    if (!total) return '—';
    const avg = Math.floor(total / consults.length);
    const mins = Math.floor(avg / 60);
    const secs = avg % 60;
    return `${mins}min ${String(secs).padStart(2,'0')}s`;
  }

  // Define um status simples por paciente com base em dados de consulta
  function getPatientStatus(consults) {
    if (!consults.length) {
      return { label: 'Sem histórico', className: 'patient-status-amber' };
    }

    const last = consults[0];
    const daysAgo = Math.floor(
      (Date.now() - new Date(last.date).getTime()) / (1000 * 60 * 60 * 24)
    );

    // Heurística simples:
    //  - verde: consulta recente (<= 7 dias)
    //  - amarelo: entre 8 e 30 dias
    //  - vermelho: > 30 dias (retorno pendente)
    if (daysAgo <= 7) {
      return {
        label: 'Acompanhamento concluído',
        className: 'patient-status-green'
      };
    }
    if (daysAgo <= 30) {
      return {
        label: 'Aguardando confirmação',
        className: 'patient-status-amber'
      };
    }
    return {
      label: 'Retorno pendente',
      className: 'patient-status-red'
    };
  }

  function calcAgeYears(birthDateStr) {
    const d = new Date(birthDateStr);
    if (Number.isNaN(d.getTime())) return null;
    const now = new Date();
    let age = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) {
      age--;
    }
    return age;
  }

  function calcBmi(weightKg, heightCm) {
    const h = heightCm / 100;
    if (!h) return 0;
    return weightKg / (h * h);
  }

  // Constrói uma polyline simples para sparkline (dados mockados)
  function buildSparklinePoints(values, width, height, min, max) {
    if (!values || !values.length) return '';
    const n = values.length;
    const dx = width / (n - 1 || 1);
    const range = (max - min) || 1;
    return values.map((v, i) => {
      const x = i * dx;
      const norm = Math.min(Math.max((v - min) / range, 0), 1);
      const y = height - norm * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }

  function getMin(arr) {
    return arr.reduce((m, v) => (v < m ? v : m), arr[0] ?? 0);
  }

  function getMax(arr) {
    return arr.reduce((m, v) => (v > m ? v : m), arr[0] ?? 0);
  }

  // Gera uma lista mock de arquivos de exames
  function buildMockFilesHtml(patientName) {
    const safeName = patientName || 'Paciente';
    const base = [
      `${safeName} - hemograma completo.pdf`,
      `${safeName} - ultrassom abdominal.png`,
      `${safeName} - receita atualizada.pdf`
    ];
    return base.map(file => `
      <div class="patient-files-list-item">
        <span>${file}</span>
        <div class="patient-files-actions">
          <button class="btn-icon-sm" title="Baixar (simulado)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          </button>
        </div>
      </div>
    `).join('');
  }
  
  // ─── Time formatting ───
  function formatRelTime(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)   return 'agora';
    if (mins < 60)  return `${mins}min atrás`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)   return `${hrs}h atrás`;
    const days = Math.floor(hrs / 24);
    return `${days}d atrás`;
  }
  
  // ─── Toast ───
  function showToast(msg, duration = 2800) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), duration);
  }
  
  // ─── Loading overlay ───
  function showLoading(text = 'Processando...') {
    document.getElementById('loading-text').textContent = text;
    document.getElementById('loading-overlay').classList.add('show');
  }
  function hideLoading() {
    document.getElementById('loading-overlay').classList.remove('show');
  }
