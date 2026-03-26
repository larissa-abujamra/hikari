/**
 * Tela /consulta/nova — seleção de paciente, validação e rota #/consulta/:id
 */
const ConsultSession = {
  activeId: null,
  patientMode: null,
  selectedExisting: null
};

function consultStartSetHash(path) {
  const next = path.startsWith('#') ? path : '#' + path;
  if (location.hash !== next) {
    location.hash = next;
  }
}

function consultStartParseHash() {
  const raw = (location.hash || '').replace(/^#\/?/, '');
  const parts = raw.split('/').filter(Boolean);
  if (parts[0] !== 'consulta') return null;
  return { base: parts[0], sub: parts[1] || null };
}

function consultStartApplyRoute() {
  const stepSum = document.getElementById('step-summary');
  if (stepSum && !stepSum.classList.contains('hidden')) return;

  const r = consultStartParseHash();
  const stepSetup = document.getElementById('step-setup');
  const stepRec = document.getElementById('step-recording');
  if (!stepSetup || !stepRec) return;

  if (!r || r.sub === 'nova' || r.sub === null) {
    stepSetup.classList.remove('hidden');
    stepRec.classList.add('hidden');
    return;
  }

  if (ConsultSession.activeId && r.sub === ConsultSession.activeId) {
    stepSetup.classList.add('hidden');
    stepRec.classList.remove('hidden');
  }
}

window.addEventListener('hashchange', () => {
  consultStartApplyRoute();
});

function initConsultationStart() {
  const cardExisting = document.getElementById('card-type-existing');
  const cardNew = document.getElementById('card-type-new');
  const panelExisting = document.getElementById('panel-existing');
  const panelNew = document.getElementById('panel-new');
  const blockMotivo = document.getElementById('block-motivo');
  const btnGo = document.getElementById('btn-go-record');
  const searchInput = document.getElementById('patient-search');
  const searchResults = document.getElementById('patient-search-results');
  const hiddenName = document.getElementById('patient-name');
  const consultType = document.getElementById('consult-type');
  const motivoDetalhe = document.getElementById('motivo-detalhe');
  const anamnesis = document.getElementById('anamnesis-context');
  const contextCard = document.getElementById('context-loaded-card');
  const contextBody = document.getElementById('context-loaded-body');
  const contextToggle = document.getElementById('context-toggle');
  const detailsToggle = document.getElementById('details-additional-toggle');
  const detailsPanel = document.getElementById('details-additional-panel');

  let searchOpen = false;
  let highlightedIdx = -1;

  function selectPatientMode(mode) {
    ConsultSession.patientMode = mode;
    cardExisting.classList.toggle('patient-type-card--selected', mode === 'existing');
    cardNew.classList.toggle('patient-type-card--selected', mode === 'new');
    if (cardExisting) cardExisting.setAttribute('aria-pressed', mode === 'existing' ? 'true' : 'false');
    if (cardNew) cardNew.setAttribute('aria-pressed', mode === 'new' ? 'true' : 'false');
    panelExisting.classList.toggle('hidden', mode !== 'existing');
    panelNew.classList.toggle('hidden', mode !== 'new');
    blockMotivo.classList.remove('hidden');
    if (mode === 'new') {
      ConsultSession.selectedExisting = null;
      hiddenName.value = '';
      if (contextCard) contextCard.classList.add('hidden');
    }
    updateStartButtonState();
  }

  cardExisting.addEventListener('click', () => selectPatientMode('existing'));
  cardNew.addEventListener('click', () => selectPatientMode('new'));

  function renderSearchResults(list) {
    if (!searchResults) return;
    searchResults.innerHTML = list
      .map((p, idx) => {
        const age = mockPatientAgeYears(p.birthDate);
        const last = mockFormatLastConsultLabel(p);
        const line = `${escapeHtml(p.nome)} · ${age != null ? age + ' anos' : '—'} · última consulta ${last}`;
        return `<button type="button" class="patient-search-item" data-id="${escapeHtml(p.id)}" data-idx="${idx}">${line}</button>`;
      })
      .join('');
    searchResults.classList.toggle('hidden', list.length === 0);
  }

  function openSearchDropdown() {
    if (!searchInput) return;
    const q = searchInput.value;
    const list = typeof mockSearchPatients === 'function' ? mockSearchPatients(q) : [];
    renderSearchResults(list);
    searchOpen = list.length > 0;
    highlightedIdx = -1;
  }

  function closeSearchDropdown() {
    if (searchResults) {
      searchResults.innerHTML = '';
      searchResults.classList.add('hidden');
    }
    searchOpen = false;
  }

  function selectExistingPatientById(id) {
    const p = typeof mockGetPatientById === 'function' ? mockGetPatientById(id) : null;
    if (!p) return;
    ConsultSession.selectedExisting = p;
    hiddenName.value = p.nome;
    if (searchInput) searchInput.value = p.nome;
    closeSearchDropdown();
    if (contextCard) {
      contextCard.classList.remove('hidden');
      fillContextCard(p);
    }
    if (anamnesis) {
      anamnesis.value = buildAnamnesisFromPatient(p);
    }
    updateStartButtonState();
  }

  function fillContextCard(p) {
    if (!contextBody) return;
    const d = new Date(p.lastConsultDate);
    const dataStr = Number.isNaN(d.getTime())
      ? '—'
      : d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
    const meds = (p.medicamentos || []).join(', ') || '—';
    const m = p.metricas || {};
    const metrics = [
      m.pa ? `PA: ${m.pa}` : null,
      m.peso != null ? `Peso: ${m.peso} kg` : null,
      m.glicemia != null ? `Glicemia: ${m.glicemia} mg/dL` : null
    ]
      .filter(Boolean)
      .join(' · ') || '—';
    const cids = (p.cidsAnteriores || []).join(', ') || '—';
    contextBody.innerHTML = `
      <p><strong>Última consulta:</strong> ${escapeHtml(dataStr)} — ${escapeHtml(p.lastConsultReason || '—')}</p>
      <p><strong>Medicamentos ativos:</strong> ${escapeHtml(meds)}</p>
      <p><strong>Últimas métricas:</strong> ${escapeHtml(metrics)}</p>
      <p><strong>CIDs anteriores:</strong> ${escapeHtml(cids)}</p>
    `;
  }

  function buildAnamnesisFromPatient(p) {
    const parts = [];
    if (p.medicamentos && p.medicamentos.length) {
      parts.push(`Em uso: ${p.medicamentos.join(', ')}.`);
    }
    if (p.cidsAnteriores && p.cidsAnteriores.length) {
      parts.push(`Histórico CID: ${p.cidsAnteriores.join(', ')}.`);
    }
    return parts.join(' ');
  }

  if (searchInput) {
    searchInput.addEventListener('focus', openSearchDropdown);
    searchInput.addEventListener('input', () => {
      openSearchDropdown();
      ConsultSession.selectedExisting = null;
      hiddenName.value = '';
      if (contextCard) contextCard.classList.add('hidden');
      updateStartButtonState();
    });
    searchInput.addEventListener('keydown', e => {
      const items = searchResults ? searchResults.querySelectorAll('.patient-search-item') : [];
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        highlightedIdx = Math.min(highlightedIdx + 1, items.length - 1);
        items.forEach((el, i) => el.classList.toggle('patient-search-item--active', i === highlightedIdx));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        highlightedIdx = Math.max(highlightedIdx - 1, 0);
        items.forEach((el, i) => el.classList.toggle('patient-search-item--active', i === highlightedIdx));
      } else if (e.key === 'Enter' && highlightedIdx >= 0 && items[highlightedIdx]) {
        e.preventDefault();
        items[highlightedIdx].click();
      } else if (e.key === 'Escape') {
        closeSearchDropdown();
      }
    });
  }

  if (searchResults) {
    searchResults.addEventListener('mousedown', e => {
      const btn = e.target.closest('.patient-search-item');
      if (!btn) return;
      e.preventDefault();
      selectExistingPatientById(btn.dataset.id);
    });
  }

  document.addEventListener('click', e => {
    if (!searchInput || !searchResults) return;
    if (!e.target.closest('.patient-search-wrap')) {
      closeSearchDropdown();
    }
  });

  let contextCollapsed = false;
  if (contextToggle && contextBody) {
    contextToggle.addEventListener('click', () => {
      contextCollapsed = !contextCollapsed;
      contextBody.classList.toggle('hidden', contextCollapsed);
      contextToggle.textContent = contextCollapsed ? 'Mostrar contexto' : 'Ocultar contexto';
    });
  }

  if (detailsToggle && detailsPanel) {
    detailsToggle.addEventListener('click', () => {
      const hidden = detailsPanel.classList.toggle('hidden');
      detailsToggle.setAttribute('aria-expanded', hidden ? 'false' : 'true');
      detailsToggle.textContent = hidden
        ? 'Dados adicionais (opcional) ▾'
        : 'Dados adicionais (opcional) ▴';
    });
  }

  [consultType, motivoDetalhe].forEach(el => {
    if (el) el.addEventListener('input', updateStartButtonState);
    if (el) el.addEventListener('change', updateStartButtonState);
  });

  const newFields = [
    'new-patient-name',
    'new-patient-birth',
    'new-patient-sex',
    'new-patient-height',
    'new-patient-weight',
    'new-patient-phone',
    'new-patient-condition'
  ];
  newFields.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', updateStartButtonState);
      el.addEventListener('change', updateStartButtonState);
    }
  });

  function updateStartButtonState() {
    if (!btnGo) return;
    const typeOk = consultType && consultType.value.trim();
    let patientOk = false;
    if (ConsultSession.patientMode === 'existing') {
      patientOk = !!(ConsultSession.selectedExisting && hiddenName.value.trim());
    } else if (ConsultSession.patientMode === 'new') {
      const n = document.getElementById('new-patient-name')?.value.trim();
      const b = document.getElementById('new-patient-birth')?.value;
      const s = document.getElementById('new-patient-sex')?.value;
      patientOk = !!(n && b && s);
    }
    const ok = ConsultSession.patientMode && patientOk && typeOk;
    btnGo.disabled = !ok;
    btnGo.style.opacity = ok ? '' : '0.4';
  }

  window.updateConsultStartButtonState = updateStartButtonState;

  if (btnGo) {
    btnGo.addEventListener('click', () => {
      if (btnGo.disabled) return;
      const type = consultType.value.trim();
      const detail = (motivoDetalhe && motivoDetalhe.value.trim()) || '';
      let displayReason = type;
      if (detail) displayReason = detail.length > 60 ? type + ' — ' + detail.slice(0, 57) + '…' : type + (detail ? ' — ' + detail : '');

      if (ConsultSession.patientMode === 'new') {
        const fullName = document.getElementById('new-patient-name').value.trim();
        hiddenName.value = fullName;
        const birth = document.getElementById('new-patient-birth').value;
        const sex = document.getElementById('new-patient-sex').value;
        const heightCm = document.getElementById('new-patient-height').value;
        const weightKg = document.getElementById('new-patient-weight').value;
        const phone = document.getElementById('new-patient-phone').value.trim();
        const cond = document.getElementById('new-patient-condition').value.trim();

        const profile = { birthDate: birth, sex };
        if (heightCm) {
          const h = parseFloat(heightCm);
          if (!Number.isNaN(h)) profile.heightCm = h;
        }
        if (weightKg) {
          const w = parseFloat(weightKg);
          if (!Number.isNaN(w)) {
            profile.weightHistory = [{ date: new Date().toISOString().slice(0, 10), weight: w }];
          }
        }
        if (phone) profile.phone = phone;
        if (cond) profile.mainCondition = cond;
        Store.upsertPatientProfile(fullName, profile);
      }

      if (anamnesis && ConsultSession.patientMode === 'existing' && ConsultSession.selectedExisting) {
        const base = buildAnamnesisFromPatient(ConsultSession.selectedExisting);
        const extra = anamnesis.value.trim();
        anamnesis.value = extra ? base + '\n\n' + extra : base;
      }

      const id = 'c-' + Date.now();
      ConsultSession.activeId = id;
      consultStartSetHash('/consulta/' + id);
      if (typeof ConsultLiveState !== 'undefined') {
        ConsultLiveState.consultId = id;
      }

      if (typeof setCurrentPatientName === 'function') {
        setCurrentPatientName(hiddenName.value.trim());
      }

      const fullName = hiddenName.value.trim();
      document.getElementById('rec-patient-name').textContent = fullName;
      document.getElementById('rec-consult-type').textContent = displayReason;
      const initials = fullName
        .trim()
        .split(' ')
        .filter(w => w.length > 0)
        .slice(0, 2)
        .map(w => w[0].toUpperCase())
        .join('');
      document.getElementById('rec-patient-avatar').textContent = initials || 'PT';
      const recAge = document.getElementById('rec-patient-age');
      const recPrevBadge = document.getElementById('rec-prev-badge');
      const liveContextCard = document.getElementById('live-context-card');
      const liveContextBody = document.getElementById('live-context-body');
      const profileLink = document.getElementById('patient-profile-link-live');

      let selectedProfile = null;
      let selectedId = 'new-' + Date.now();
      let ageYears = null;
      let previousConsults = 0;

      if (ConsultSession.patientMode === 'existing' && ConsultSession.selectedExisting) {
        selectedProfile = ConsultSession.selectedExisting;
        selectedId = selectedProfile.id;
        ageYears = mockPatientAgeYears(selectedProfile.birthDate);
        previousConsults = Math.max(1, Store.getByPatient(selectedProfile.nome).length || 0);
        if (liveContextCard && liveContextBody) {
          liveContextCard.classList.remove('hidden');
          const m = selectedProfile.metricas || {};
          liveContextBody.innerHTML = `
            <p><strong>Última consulta:</strong> ${escapeHtml(mockFormatLastConsultLabel(selectedProfile))} — ${escapeHtml(selectedProfile.lastConsultReason || '—')}</p>
            <p><strong>PA:</strong> ${escapeHtml(m.pa || '—')}</p>
            <p><strong>Peso:</strong> ${m.peso != null ? escapeHtml(String(m.peso) + ' kg') : '—'}</p>
            <p><strong>Medicamentos:</strong> ${escapeHtml((selectedProfile.medicamentos || []).join(' · ') || '—')}</p>
            <p><strong>CIDs anteriores:</strong> ${escapeHtml((selectedProfile.cidsAnteriores || []).join(' · ') || '—')}</p>
          `;
        }
      } else {
        const birth = document.getElementById('new-patient-birth')?.value;
        ageYears = birth ? mockPatientAgeYears(birth) : null;
        if (liveContextCard) liveContextCard.classList.add('hidden');
      }

      if (recAge) recAge.textContent = ageYears != null ? `${ageYears} anos` : '';
      if (recPrevBadge) {
        if (previousConsults > 0) {
          recPrevBadge.textContent = `${previousConsults} consultas anteriores`;
          recPrevBadge.classList.remove('hidden');
        } else {
          recPrevBadge.classList.add('hidden');
        }
      }
      if (profileLink) {
        profileLink.setAttribute('href', `#/pacientes/${selectedId}`);
      }

      if (typeof ConsultLiveState !== 'undefined') {
        ConsultLiveState.patientId = selectedId;
        ConsultLiveState.patientData = {
          id: selectedId,
          name: fullName,
          mode: ConsultSession.patientMode,
          reason: displayReason,
          ageYears: ageYears,
          profile: selectedProfile
        };
      }

      document.getElementById('step-setup').classList.add('hidden');
      document.getElementById('step-recording').classList.remove('hidden');
      document.getElementById('step-summary').classList.add('hidden');
    });
  }

  updateStartButtonState();
}

function resetConsultationStartForm() {
  ConsultSession.activeId = null;
  ConsultSession.patientMode = null;
  ConsultSession.selectedExisting = null;

  const hiddenName = document.getElementById('patient-name');
  if (hiddenName) hiddenName.value = '';

  const searchInput = document.getElementById('patient-search');
  if (searchInput) searchInput.value = '';

  const cardExisting = document.getElementById('card-type-existing');
  const cardNew = document.getElementById('card-type-new');
  if (cardExisting) cardExisting.classList.remove('patient-type-card--selected');
  if (cardNew) cardNew.classList.remove('patient-type-card--selected');
  if (cardExisting) cardExisting.setAttribute('aria-pressed', 'false');
  if (cardNew) cardNew.setAttribute('aria-pressed', 'false');

  const panelExisting = document.getElementById('panel-existing');
  const panelNew = document.getElementById('panel-new');
  const blockMotivo = document.getElementById('block-motivo');
  if (panelExisting) {
    panelExisting.classList.add('hidden');
  }
  if (panelNew) panelNew.classList.add('hidden');
  if (blockMotivo) blockMotivo.classList.add('hidden');

  const contextCard = document.getElementById('context-loaded-card');
  if (contextCard) contextCard.classList.add('hidden');

  const sr = document.getElementById('patient-search-results');
  if (sr) {
    sr.innerHTML = '';
    sr.classList.add('hidden');
  }

  [
    'new-patient-name',
    'new-patient-birth',
    'new-patient-sex',
    'new-patient-height',
    'new-patient-weight',
    'new-patient-phone',
    'new-patient-condition',
    'motivo-detalhe',
    'anamnesis-context'
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const consultType = document.getElementById('consult-type');
  if (consultType) consultType.value = '';

  const detailsPanel = document.getElementById('details-additional-panel');
  const detailsToggle = document.getElementById('details-additional-toggle');
  if (detailsPanel) detailsPanel.classList.add('hidden');
  if (detailsToggle) {
    detailsToggle.textContent = 'Dados adicionais (opcional) ▾';
    detailsToggle.setAttribute('aria-expanded', 'false');
  }

  const btnGo = document.getElementById('btn-go-record');
  if (btnGo) {
    btnGo.disabled = true;
    btnGo.style.opacity = '0.4';
  }

  consultStartSetHash('/consulta/nova');
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

document.addEventListener('DOMContentLoaded', () => {
  initConsultationStart();
});
