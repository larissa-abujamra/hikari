// ─── In-memory data store ───
const Store = {
  doctor: {
    name: 'Dra. Larissa Oliveira',
    initials: 'LO',
    specialty: 'Clínico Geral'
  },

  consultations: JSON.parse(localStorage.getItem('mediscribe_consultations') || '[]'),
  patientProfiles: JSON.parse(localStorage.getItem('mediscribe_patient_profiles') || '{}'),

  save() {
    localStorage.setItem('mediscribe_consultations', JSON.stringify(this.consultations));
  },

  saveProfiles() {
    localStorage.setItem('mediscribe_patient_profiles', JSON.stringify(this.patientProfiles));
  },

  addConsultation(c) {
    this.consultations.unshift(c);
    this.save();
  },

  getAll() {
    return this.consultations;
  },

  getByPatient(name) {
    return this.consultations.filter(c =>
      c.patientName.toLowerCase().includes(name.toLowerCase())
    );
  },

  getPatientProfile(name) {
    return this.patientProfiles[name] || null;
  },

  upsertPatientProfile(name, data) {
    this.patientProfiles[name] = {
      ...(this.patientProfiles[name] || {}),
      ...data
    };
    this.saveProfiles();
  }
};

// ─── Demo patient metadata (altura, peso, idade, histórico de peso) ───
const PATIENT_META = {
  'Maria Silva': {
    heightCm: 165,
    birthDate: '1988-04-12',
    weightHistory: [
      { date: '2021-02-10', weight: 72.5 },
      { date: '2021-11-05', weight: 71.8 },
      { date: '2022-06-20', weight: 71.2 },
      { date: '2023-03-18', weight: 70.4 },
      { date: '2024-01-09', weight: 70.1 },
      { date: '2025-09-27', weight: 69.8 },
      { date: '2026-03-10', weight: 69.5 }
    ]
  },
  'Bruno Campos': {
    heightCm: 178,
    birthDate: '1990-09-03',
    weightHistory: [
      { date: '2021-05-02', weight: 80.2 },
      { date: '2022-02-14', weight: 81.0 },
      { date: '2022-11-30', weight: 82.3 },
      { date: '2023-08-18', weight: 81.7 },
      { date: '2024-04-01', weight: 80.9 },
      { date: '2025-12-05', weight: 79.6 },
      { date: '2026-03-11', weight: 79.1 }
    ]
  }
};

function getPatientMeta(name) {
  return Store.getPatientProfile(name) || PATIENT_META[name] || null;
}

function upsertPatientMeta(name, payload) {
  const current = getPatientMeta(name) || {};
  const next = {
    ...current,
    ...payload
  };
  Store.upsertPatientProfile(name, next);
  return next;
}

// ─── Demo transcripts per consultation type ───
const DEMO_TRANSCRIPTS = {
  'Dor abdominal': [
    { speaker: 'Médico',   text: 'Bom dia! Como você está se sentindo hoje?' },
    { speaker: 'Paciente', text: 'Bom dia, doutora. Estou com dor abdominal há dois dias.' },
    { speaker: 'Médico',   text: 'A dor piora depois de comer?' },
    { speaker: 'Paciente', text: 'Sim, especialmente após refeições gordurosas. Tenho também leve náusea.' },
    { speaker: 'Médico',   text: 'Está tomando algum medicamento atualmente?' },
    { speaker: 'Paciente', text: 'Só tomei buscopan ontem mas não ajudou muito.' },
    { speaker: 'Médico',   text: 'Entendido. Vamos fazer um exame físico e solicitar alguns exames.' },
  ],
  'Dor de cabeça': [
    { speaker: 'Médico',   text: 'Bom dia, Bruno. Bem-vindo! Como posso te ajudar hoje?' },
    { speaker: 'Paciente', text: 'Bom dia, doutora. Tenho sentido dor de cabeça frequente há cerca de três semanas.' },
    { speaker: 'Médico',   text: 'Você já está utilizando algum medicamento?' },
    { speaker: 'Paciente', text: 'Sim! Venho tomando Advil, mas nos últimos dias parece que nada faz efeito.' },
    { speaker: 'Médico',   text: 'A dor é mais forte de manhã ou à noite? Tem algum fator que piora?' },
    { speaker: 'Paciente', text: 'À noite é pior. Fico muito no computador, pode ser isso?' },
    { speaker: 'Médico',   text: 'Provavelmente sim. Vamos investigar possível enxaqueca tensional.' },
  ],
  'Dor lombar': [
    { speaker: 'Médico',   text: 'Olá! O que te trouxe hoje?' },
    { speaker: 'Paciente', text: 'Tenho sentido dor nas costas há cerca de uma semana, principalmente na parte baixa.' },
    { speaker: 'Médico',   text: 'Você pratica alguma atividade física? Tem algum histórico de hérnia?' },
    { speaker: 'Paciente', text: 'Não, sou sedentário. Trabalho sentado 8 horas por dia.' },
    { speaker: 'Médico',   text: 'A dor irradia para as pernas ou fica localizada?' },
    { speaker: 'Paciente', text: 'Fica só nas costas, mas é constante. Dificulta até dormir.' },
  ],
  'Consulta de rotina': [
    { speaker: 'Médico',   text: 'Olá! É sua consulta de rotina anual, correto?' },
    { speaker: 'Paciente', text: 'Isso, doutora. Não tenho queixas específicas, só quero verificar tudo.' },
    { speaker: 'Médico',   text: 'Ótimo. Vamos verificar pressão, glicemia e solicitar exames de rotina.' },
    { speaker: 'Paciente', text: 'Perfeito. Quero também checar o colesterol, faz tempo que não verifico.' },
    { speaker: 'Médico',   text: 'Com certeza. Vou incluir no pedido. Tem histórico familiar de doenças cardíacas?' },
    { speaker: 'Paciente', text: 'Meu pai tem pressão alta. Minha mãe é diabética.' },
  ],
  default: [
    { speaker: 'Médico',   text: 'Bom dia! Como posso ajudar você hoje?' },
    { speaker: 'Paciente', text: 'Bom dia, doutora. Vim para a consulta que agendei.' },
    { speaker: 'Médico',   text: 'Pode me descrever seus sintomas principais?' },
    { speaker: 'Paciente', text: 'Tenho me sentido cansado e com pouco apetite há alguns dias.' },
    { speaker: 'Médico',   text: 'Entendido. Vamos fazer uma avaliação completa.' },
  ]
};

// ─── Summary templates per type ───
const SUMMARY_TEMPLATES = {
  'Dor abdominal': {
    queixa: 'Dor abdominal há dois dias, com piora após alimentação.',
    historia: 'Paciente relata dor em região epigástrica, piorando após refeições gordurosas, associada a leve náusea. Uso de buscopan sem melhora significativa. Sem febre, sem alteração do hábito intestinal.',
    avaliacao: 'Quadro compatível com gastrite aguda ou úlcera péptica. Necessário afastar outras causas.',
    plano: '• Prescrever omeprazol 20mg 1x/dia por 30 dias\n• Solicitar ultrassom abdominal\n• Orientar dieta sem gorduras e sem alimentos ácidos\n• Reavaliar em 7 dias',
    patient_summary: 'Você apresentou dor abdominal possivelmente associada a gastrite ou irritação do estômago.',
    recommendations: [
      'Tomar omeprazol diariamente, conforme prescrito',
      'Evitar alimentos gordurosos, picantes e ácidos',
      'Fazer refeições menores e mais frequentes',
      'Evitar álcool e café',
      'Retornar se a dor piorar ou houver vômitos'
    ]
  },
  'Dor de cabeça': {
    queixa: 'Cefaleia frequente há três semanas, sem melhora com anti-inflamatórios.',
    historia: 'Paciente refere cefaleia holocraniana de intensidade moderada, pior à noite, associada ao uso prolongado de computador. Sem fotofobia, fonofobia ou náusea. Uso de ibuprofeno sem alívio adequado nos últimos dias.',
    avaliacao: 'Quadro sugestivo de cefaleia tensional crônica. Hipótese de enxaqueca a investigar. Descartadas causas secundárias urgentes.',
    plano: '• Suspender uso excessivo de analgésicos\n• Prescrever amitriptilina 10mg à noite\n• Orientar pausas a cada 1h de trabalho no computador\n• Solicitar avaliação oftalmológica\n• Retorno em 21 dias',
    patient_summary: 'Sua dor de cabeça provavelmente está relacionada à tensão muscular e ao uso excessivo de tela.',
    recommendations: [
      'Tomar amitriptilina à noite, conforme prescrito',
      'Fazer pausas de 10 minutos a cada hora de computador',
      'Praticar exercícios de alongamento cervical',
      'Manter hidratação adequada (2L de água/dia)',
      'Consultar oftalmologista para avaliar necessidade de óculos'
    ]
  },
  'Dor lombar': {
    queixa: 'Lombalgia há uma semana com piora progressiva e dificuldade para dormir.',
    historia: 'Paciente sedentário, trabalha sentado por longos períodos. Dor localizada em região lombar baixa, sem irradiação para membros inferiores. Sem déficit neurológico. Sem trauma prévio.',
    avaliacao: 'Lombalgia mecânica inespecífica. Sem sinais de alarme. Provável relacionada à postura inadequada e sedentarismo.',
    plano: '• Prescrever anti-inflamatório por 5 dias\n• Indicar fisioterapia (mínimo 10 sessões)\n• Orientar correção postural\n• Recomendar início de atividade física leve\n• Retorno em 30 dias ou antes se piorar',
    patient_summary: 'Sua dor nas costas é de origem postural e muscular, sem comprometimento de nervos.',
    recommendations: [
      'Tomar o anti-inflamatório conforme prescrito durante as refeições',
      'Iniciar fisioterapia o mais breve possível',
      'Evitar ficar sentado por mais de 1 hora sem levantar',
      'Aplicar calor local por 15 minutos, 2x ao dia',
      'Começar caminhadas leves de 20 minutos diários'
    ]
  },
  'Consulta de rotina': {
    queixa: 'Consulta de check-up anual, sem queixas ativas.',
    historia: 'Paciente assintomático. Histórico familiar de hipertensão arterial (pai) e diabetes mellitus tipo 2 (mãe). Não realiza atividade física regular. Nega tabagismo e etilismo.',
    avaliacao: 'Paciente sem queixas, com fatores de risco cardiovascular familiar. Necessário monitoramento preventivo.',
    plano: '• Solicitar hemograma completo, glicemia, perfil lipídico, TSH, creatinina\n• Solicitar ECG de repouso\n• Aferir pressão arterial e IMC\n• Orientar mudança de estilo de vida\n• Retorno com exames em 30 dias',
    patient_summary: 'Sua consulta de rotina foi realizada com sucesso. Foram solicitados exames preventivos.',
    recommendations: [
      'Realizar os exames laboratoriais em jejum de 12 horas',
      'Iniciar atividade física regular: caminhada de 30 min, 5x/semana',
      'Manter dieta equilibrada, reduzir açúcar e gordura saturada',
      'Monitorar pressão arterial mensalmente',
      'Retornar com os resultados dos exames'
    ]
  },
  default: {
    queixa: 'Paciente compareceu para avaliação médica.',
    historia: 'Paciente relata sintomas há alguns dias. Sem uso de medicamentos. Sem alergias conhecidas.',
    avaliacao: 'Avaliação clínica realizada. Necessário acompanhamento e exames complementares.',
    plano: '• Solicitar exames complementares\n• Prescrever tratamento conforme avaliação\n• Retornar em 7 a 14 dias',
    patient_summary: 'Sua consulta foi realizada e um plano de tratamento foi elaborado.',
    recommendations: [
      'Seguir as orientações médicas prescritas',
      'Tomar os medicamentos nos horários indicados',
      'Manter repouso e hidratação adequados',
      'Retornar se os sintomas piorarem'
    ]
  }
};

/** SOAP objetivo, CIDs, documentos e retorno (alinhado ao prontuário Hiro) */
const SOAP_METADATA = {
  'Dor abdominal': {
    objetivo:
      'PA: 118×76 mmHg. FC: 72 bpm. Abdome plano, dor leve à palpação epigástrica, sem descompressão brusca. BHF normoativos.',
    cids: [
      { code: 'K29.0', desc: 'Gastrite aguda' },
      { code: 'K30', desc: 'Dispepsia' }
    ],
    documentos: [
      { tipo: 'Receituário', nome: 'Omeprazol 20 mg + orientações dietéticas', status: 'pronto' },
      { tipo: 'Pedido de exames', nome: 'Ultrassom abdominal total', status: 'pronto' },
      { tipo: 'Guia TISS', nome: 'SP/SADT — consulta eletiva', status: 'pronto' }
    ],
    retornoDias: 7,
    retornoLabel: '7 dias'
  },
  'Dor de cabeça': {
    objetivo:
      'PA: 122×78 mmHg. FC: 68 bpm. Nervos cranianos preservados. Pescoço com leve tensão paravertebral, sem rigidez de nuca.',
    cids: [
      { code: 'G44.2', desc: 'Cefaleia tensional' },
      { code: 'G43.9', desc: 'Enxaqueca, não especificada' }
    ],
    documentos: [
      { tipo: 'Receituário', nome: 'Amitriptilina 10 mg (noturno)', status: 'pronto' },
      { tipo: 'Pedido de exames', nome: 'Avaliação oftalmológica (encaminhamento)', status: 'pronto' },
      { tipo: 'Guia TISS', nome: 'SP/SADT — consulta', status: 'pronto' }
    ],
    retornoDias: 21,
    retornoLabel: '21 dias'
  },
  'Dor lombar': {
    objetivo:
      'PA: 116×74 mmHg. Marcha preservada. Lombar com dor à palpação de paraspinais L4-L5, sem déficit motor. Lasègue negativo bilateral.',
    cids: [
      { code: 'M54.5', desc: 'Lombalgia baixa' },
      { code: 'M54.9', desc: 'Dorsalgia, não especificada' }
    ],
    documentos: [
      { tipo: 'Receituário', nome: 'Anti-inflamatório + relaxante muscular', status: 'pronto' },
      { tipo: 'Pedido de exames', nome: 'Ressonância lombossacra (se refratário)', status: 'pronto' },
      { tipo: 'Guia TISS', nome: 'SP/SADT — consulta + sessões fisioterapia', status: 'pronto' }
    ],
    retornoDias: 30,
    retornoLabel: '30 dias'
  },
  'Consulta de rotina': {
    objetivo:
      'PA: 124×82 mmHg. IMC dentro do esperado. ACV: bulhas rítmicas. AR: MVUD sem RA. Abdome plano, indolor.',
    cids: [
      { code: 'Z00.0', desc: 'Exame médico geral' },
      { code: 'Z13.1', desc: 'Rastreamento de diabetes' }
    ],
    documentos: [
      { tipo: 'Pedido de exames', nome: 'Hemograma, lipídios, glicemia, TSH, creatinina, ECG', status: 'pronto' },
      { tipo: 'Guia TISS', nome: 'SP/SADT — check-up', status: 'pronto' }
    ],
    retornoDias: 30,
    retornoLabel: '30 dias (com exames)'
  },
  default: {
    objetivo:
      'Exame físico geral sem achados de alarme. Estado geral preservado. Orientações registradas.',
    cids: [{ code: 'Z00.8', desc: 'Outros exames gerais' }],
    documentos: [
      { tipo: 'Receituário', nome: 'Prescrição da consulta', status: 'pronto' },
      { tipo: 'Pedido de exames', nome: 'Exames conforme avaliação clínica', status: 'pronto' },
      { tipo: 'Guia TISS', nome: 'Guia de consulta ambulatorial', status: 'pronto' }
    ],
    retornoDias: 14,
    retornoLabel: '14 dias'
  }
};

function getSummaryTemplate(type) {
  const base = SUMMARY_TEMPLATES[type] || SUMMARY_TEMPLATES.default;
  const meta = SOAP_METADATA[type] || SOAP_METADATA.default;
  return { ...base, ...meta };
}

/** CID-10 sugeridos na lateral durante a gravação */
function getSuggestedCidsForSession(type) {
  const meta = SOAP_METADATA[type] || SOAP_METADATA.default;
  return meta.cids || [];
}

function getDemoTranscript(type) {
  return DEMO_TRANSCRIPTS[type] || DEMO_TRANSCRIPTS.default;
}