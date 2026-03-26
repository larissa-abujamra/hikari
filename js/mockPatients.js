/**
 * Pacientes fictícios com histórico — MVP autocomplete / contexto carregado
 * (nome, idade, última consulta, medicamentos, métricas, CIDs)
 */
const MOCK_EXISTING_PATIENTS = [
  {
    id: 'mock-pat-001',
    nome: 'Bruno Ferreira',
    birthDate: '1967-02-14',
    lastConsultDate: '2026-03-19T14:30:00',
    lastConsultReason: 'Hipertensão — ajuste de dose',
    medicamentos: ['Losartana 50 mg', 'Sinvastatina 20 mg', 'AAS 100 mg'],
    metricas: { pa: '122×78 mmHg', peso: 78.2, glicemia: 102 },
    cidsAnteriores: ['I10', 'E78.5']
  },
  {
    id: 'mock-pat-002',
    nome: 'Maria Silva',
    birthDate: '1988-04-12',
    lastConsultDate: '2026-03-10T09:15:00',
    lastConsultReason: 'Dor abdominal — investigação',
    medicamentos: ['Omeprazol 20 mg', 'Dimeticona'],
    metricas: { pa: '118×74 mmHg', peso: 69.5, glicemia: 92 },
    cidsAnteriores: ['K30', 'Z00.0']
  },
  {
    id: 'mock-pat-003',
    nome: 'Carlos Eduardo Nunes',
    birthDate: '1955-11-03',
    lastConsultDate: '2026-02-28T16:00:00',
    lastConsultReason: 'Diabetes tipo 2 — revisão',
    medicamentos: ['Metformina 850 mg', 'Gliclazida', 'Insulina NPH'],
    metricas: { pa: '128×82 mmHg', peso: 84.0, glicemia: 156 },
    cidsAnteriores: ['E11.9', 'I10']
  },
  {
    id: 'mock-pat-004',
    nome: 'Ana Paula Ribeiro',
    birthDate: '1992-07-22',
    lastConsultDate: '2026-03-15T11:45:00',
    lastConsultReason: 'Consulta dermatológica de rotina',
    medicamentos: ['Hidratante tópico', 'Antihistamínico SOS'],
    metricas: { pa: '112×70 mmHg', peso: 61.3, glicemia: 88 },
    cidsAnteriores: ['L20.9']
  },
  {
    id: 'mock-pat-005',
    nome: 'Roberto Lima',
    birthDate: '1971-09-08',
    lastConsultDate: '2026-01-20T08:30:00',
    lastConsultReason: 'Check-up cardiológico',
    medicamentos: ['Carvedilol 12,5 mg', 'Atorvastatina 40 mg'],
    metricas: { pa: '118×76 mmHg', peso: 82.1, glicemia: 99 },
    cidsAnteriores: ['I25.9', 'I49.9']
  }
];

function mockPatientAgeYears(birthDateStr) {
  const d = new Date(birthDateStr);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

function mockDaysSince(dateStr) {
  const t = new Date(dateStr).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / (86400000));
}

function mockFormatLastConsultLabel(p) {
  const days = mockDaysSince(p.lastConsultDate);
  if (days == null) return 'data não informada';
  if (days === 0) return 'hoje';
  if (days === 1) return 'há 1 dia';
  return `há ${days} dias`;
}

function mockSearchPatients(query) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return MOCK_EXISTING_PATIENTS.slice();
  return MOCK_EXISTING_PATIENTS.filter(p => p.nome.toLowerCase().includes(q));
}

function mockGetPatientById(id) {
  return MOCK_EXISTING_PATIENTS.find(p => p.id === id) || null;
}
