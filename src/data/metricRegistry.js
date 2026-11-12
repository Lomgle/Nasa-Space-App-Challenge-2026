// Metric definitions are data-driven. Add a new object here to extend the standard dashboard.
// Threshold values below are DEMO CONFIGURATION ONLY, not medical guidance or mission limits.
export const DEFAULT_METRICS = [
  {
    id: 'blood-pressure', name: 'Blood pressure', category: 'Cardiovascular', kind: 'blood-pressure',
    value: { systolic: 118, diastolic: 76 }, unit: 'mmHg', icon: 'activity', color: 'blue',
    subtitle: 'Systolic / diastolic', updated: '2 min ago', trend: [116, 118, 117, 120, 119, 118, 118],
    thresholds: [
      { field: 'systolic', operator: 'gte', value: 140, severity: 'critical', label: 'Systolic above demo limit' },
      { field: 'diastolic', operator: 'gte', value: 90, severity: 'critical', label: 'Diastolic above demo limit' },
      { field: 'systolic', operator: 'lt', value: 90, severity: 'warning', label: 'Systolic below configured demo limit' },
      { field: 'diastolic', operator: 'lt', value: 60, severity: 'warning', label: 'Diastolic below configured demo limit' }
    ]
  },
  {
    id: 'heart-rate', name: 'Heart rate', category: 'Cardiovascular', kind: 'number',
    value: 112, unit: 'bpm', icon: 'heart', color: 'rose', subtitle: 'Resting pulse', updated: '1 min ago',
    trend: [78, 81, 84, 89, 96, 104, 112],
    thresholds: [
      { field: 'value', operator: 'gt', value: 110, severity: 'critical', label: 'Above configured demo limit' },
      { field: 'value', operator: 'lt', value: 60, severity: 'warning', label: 'Below configured demo limit' }
    ]
  },
  {
    id: 'blood-sugar', name: 'Blood glucose', category: 'Metabolic', kind: 'number',
    value: 106, unit: 'mg/dL', icon: 'droplet', color: 'violet', subtitle: 'Latest reading', updated: '18 min ago',
    trend: [98, 102, 99, 104, 101, 109, 106],
    thresholds: [
      { field: 'value', operator: 'lt', value: 70, severity: 'critical', label: 'Below configured demo range' },
      { field: 'value', operator: 'gt', value: 180, severity: 'critical', label: 'Above configured demo range' }
    ]
  },
  {
    id: 'temperature', name: 'Body temperature', category: 'Core vitals', kind: 'number',
    value: 36.8, unit: '°C', icon: 'thermometer', color: 'amber', subtitle: 'Core temperature', updated: '5 min ago',
    trend: [36.6, 36.7, 36.7, 36.8, 36.9, 36.8, 36.8],
    thresholds: [
      { field: 'value', operator: 'lt', value: 35.5, severity: 'critical', label: 'Below configured demo range' },
      { field: 'value', operator: 'gt', value: 38, severity: 'critical', label: 'Above configured demo range' }
    ]
  },
  {
    id: 'sleep', name: 'Daily sleep', category: 'Recovery', kind: 'number',
    value: 5.2, unit: 'h', icon: 'moon', color: 'indigo', subtitle: 'Last sleep period', updated: '42 min ago',
    trend: [7.1, 6.8, 7.4, 6.5, 6.2, 5.8, 5.2],
    thresholds: [
      { field: 'value', operator: 'lt', value: 6, severity: 'warning', label: 'Below configured sleep target' },
      { field: 'value', operator: 'gt', value: 10, severity: 'warning', label: 'Above configured demo range' }
    ]
  },
  {
    id: 'mood', name: 'Mood', category: 'Wellbeing', kind: 'mood',
    value: 'Steady', unit: '', icon: 'smile', color: 'teal', subtitle: 'Self-reported check-in', updated: '12 min ago',
    trend: [3, 3, 4, 3, 3, 3, 3],
    thresholds: [{ field: 'value', operator: 'in', value: ['Low', 'Strained'], severity: 'warning', label: 'Crew check-in requested' }],
    graphRange: { lower: 1, upper: 4 }
  },
  {
    id: 'muscle-mass', name: 'Muscle mass', category: 'Body composition', kind: 'number',
    value: 58.4, unit: 'kg', icon: 'dumbbell', color: 'green', subtitle: 'Estimated lean mass', updated: 'Yesterday',
    trend: [58.6, 58.5, 58.5, 58.4, 58.4, 58.3, 58.4], thresholds: [
      { field: 'value', operator: 'lt', value: 54, severity: 'warning', label: 'Below configured demo range' },
      { field: 'value', operator: 'gt', value: 64, severity: 'warning', label: 'Above configured demo range' }
    ]
  },
  {
    id: 'hydration', name: 'Hydration', category: 'Recovery', kind: 'number',
    value: 2.1, unit: 'L', icon: 'glass', color: 'cyan', subtitle: 'Daily fluid intake', updated: '25 min ago',
    trend: [1.6, 1.8, 1.7, 2.0, 1.9, 2.2, 2.1],
    thresholds: [
      { field: 'value', operator: 'lt', value: 1.5, severity: 'warning', label: 'Below configured daily target' },
      { field: 'value', operator: 'gt', value: 4, severity: 'warning', label: 'Above configured demo range' }
    ],
    isExtra: true
  }
];

export const METRIC_CATEGORIES = ['Cardiovascular', 'Metabolic', 'Core vitals', 'Recovery', 'Wellbeing', 'Body composition', 'Other'];
