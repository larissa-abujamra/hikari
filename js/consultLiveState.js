const ConsultLiveState = {
  patientId: null,
  patientData: null,
  transcriptionLines: [],
  detectedItems: [],
  confirmedCids: [],
  recordingDuration: 0,
  consultId: null,
  isSimulated: false
};

function resetConsultLiveState() {
  ConsultLiveState.patientId = null;
  ConsultLiveState.patientData = null;
  ConsultLiveState.transcriptionLines = [];
  ConsultLiveState.detectedItems = [];
  ConsultLiveState.confirmedCids = [];
  ConsultLiveState.recordingDuration = 0;
  ConsultLiveState.consultId = null;
  ConsultLiveState.isSimulated = false;
}
