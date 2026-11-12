// Synthetic crew fixtures for the offline prototype. Replace with mission-approved data feeds later.
export const DEMO_CREW = [
  {
    id: 'jun-park', name: 'Jun Park', initials: 'JP', avatar: '👨🏻‍🚀', role: 'Flight engineer',
    status: 'normal', statusLabel: 'Within demo ranges', heartRate: 68, signal: 92, connectivity: 'connected',
    waveform: [68,68,69,70,68,67,68,68,84,68,66,68,69,68,67,68,68,86,69,68,67,68],
    metricReadings: [
      { id: 'blood-pressure', name: 'Blood pressure', value: '116/74 mmHg', severity: 'normal' },
      { id: 'heart-rate', name: 'Heart rate', value: '68 bpm', severity: 'normal' },
      { id: 'blood-sugar', name: 'Blood glucose', value: '98 mg/dL', severity: 'normal' },
      { id: 'temperature', name: 'Body temperature', value: '36.7 °C', severity: 'normal' },
      { id: 'sleep', name: 'Daily sleep', value: '7.3 h', severity: 'normal' },
      { id: 'mood', name: 'Mood', value: 'Steady', severity: 'normal' },
      { id: 'muscle-mass', name: 'Muscle mass', value: '61.2 kg', severity: 'normal' },
      { id: 'hydration', name: 'Hydration', value: '2.1 L', severity: 'normal' }
    ],
    readings: [['Blood pressure','116/74 mmHg'],['Heart rate','68 bpm'],['Blood glucose','98 mg/dL'],['Body temperature','36.7 °C'],['Daily sleep','7.3 h'],['Mood','Steady'],['Muscle mass','61.2 kg'],['Hydration','2.1 L']]
  },
  {
    id: 'amara-okafor', name: 'Amara Okafor', initials: 'AO', avatar: '👩🏾‍🚀', role: 'Mission scientist',
    status: 'normal', statusLabel: 'Low connection signal', heartRate: 76, signal: 28, connectivity: 'weak',
    waveform: [75,76,77,75,74,76,76,78,92,76,73,76,77,75,76,78,76,91,77,75,76,76],
    metricReadings: [
      { id: 'blood-pressure', name: 'Blood pressure', value: '122/78 mmHg', severity: 'normal' },
      { id: 'heart-rate', name: 'Heart rate', value: '76 bpm', severity: 'normal' },
      { id: 'blood-sugar', name: 'Blood glucose', value: '101 mg/dL', severity: 'normal' },
      { id: 'temperature', name: 'Body temperature', value: '36.8 °C', severity: 'normal' },
      { id: 'sleep', name: 'Daily sleep', value: '7.0 h', severity: 'normal' },
      { id: 'mood', name: 'Mood', value: 'Positive', severity: 'normal' },
      { id: 'muscle-mass', name: 'Muscle mass', value: '57.8 kg', severity: 'normal' },
      { id: 'hydration', name: 'Hydration', value: '2.2 L', severity: 'normal' }
    ],
    readings: [['Blood pressure','122/78 mmHg'],['Heart rate','76 bpm'],['Blood glucose','101 mg/dL'],['Body temperature','36.8 °C'],['Daily sleep','7.0 h'],['Mood','Positive'],['Muscle mass','57.8 kg'],['Hydration','2.2 L']]
  },
  {
    id: 'mateo-ruiz', name: 'Mateo Ruiz', initials: 'MR', avatar: '👨🏽‍🚀', role: 'Pilot',
    status: 'critical', statusLabel: 'Emergency review', heartRate: 58, signal: 0, connectivity: 'offline', emergency: true,
    waveform: [],
    metricReadings: [
      { id: 'blood-pressure', name: 'Blood pressure', value: '136/88 mmHg', severity: 'normal' },
      { id: 'heart-rate', name: 'Heart rate', value: '58 bpm', severity: 'critical', label: 'Below configured demo threshold' },
      { id: 'blood-sugar', name: 'Blood glucose', value: '118 mg/dL', severity: 'normal' },
      { id: 'temperature', name: 'Body temperature', value: '36.6 °C', severity: 'normal' },
      { id: 'sleep', name: 'Daily sleep', value: '5.4 h', severity: 'warning', label: 'Below configured demo target' },
      { id: 'mood', name: 'Mood', value: 'Strained', severity: 'warning', label: 'Crew check-in requested' },
      { id: 'muscle-mass', name: 'Muscle mass', value: '59.1 kg', severity: 'normal' },
      { id: 'hydration', name: 'Hydration', value: '1.7 L', severity: 'normal' }
    ],
    readings: [['Blood pressure','136/88 mmHg'],['Heart rate','58 bpm'],['Blood glucose','118 mg/dL'],['Body temperature','36.6 °C'],['Daily sleep','5.4 h'],['Mood','Strained'],['Muscle mass','59.1 kg'],['Hydration','1.7 L']]
  }
];
