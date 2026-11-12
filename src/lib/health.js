export const STORAGE_KEY = 'orbit-health-state-v1';

export function loadState(fallbackMetrics) {
  const defaults = structuredClone(fallbackMetrics);
  const fresh = () => ({
    metrics: defaults,
    theme: 'dark',
    themeVersion: 4,
    log: [],
    chatMessages: [],
    selectedCrewId: 'elena-voss',
    profileAvatar: '👩🏻‍🚀'
  });
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fresh();
    const parsed = JSON.parse(raw);
    const storedMetrics = Array.isArray(parsed.metrics) ? parsed.metrics : defaults;
    const metrics = storedMetrics.map(metric => {
      const base = defaults.find(item => item.id === metric.id);
      if (!base) return metric;
      const currentRules = Array.isArray(metric.thresholds) ? metric.thresholds : [];
      const addedDemoBounds = (base.thresholds || []).filter(rule =>
        !currentRules.some(existing => existing.field === rule.field && existing.operator === rule.operator)
      );
      return { ...base, ...metric, thresholds: [...currentRules, ...addedDemoBounds] };
    });
    return {
      metrics,
      theme: 'dark',
      themeVersion: 4,
      log: Array.isArray(parsed.log) ? parsed.log : [],
      chatMessages: Array.isArray(parsed.chatMessages)
        ? parsed.chatMessages.filter(message => message && ['user', 'assistant'].includes(message.role) && typeof message.text === 'string').slice(-100)
        : [],
      selectedCrewId: typeof parsed.selectedCrewId === 'string' ? parsed.selectedCrewId : 'elena-voss',
      profileAvatar: typeof parsed.profileAvatar === 'string' ? parsed.profileAvatar : '👩🏻‍🚀'
    };
  } catch {
    return fresh();
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

function compare(actual, operator, expected) {
  switch (operator) {
    case 'gt': return Number(actual) > Number(expected);
    case 'gte': return Number(actual) >= Number(expected);
    case 'lt': return Number(actual) < Number(expected);
    case 'lte': return Number(actual) <= Number(expected);
    case 'eq': return actual === expected;
    case 'in': return Array.isArray(expected) && expected.includes(actual);
    default: return false;
  }
}

export function evaluateMetric(metric) {
  const matches = (metric.thresholds || []).filter(rule => {
    const actual = rule.field === 'value' ? metric.value : metric.value?.[rule.field];
    return compare(actual, rule.operator, rule.value);
  });
  const severity = matches.some(rule => rule.severity === 'critical')
    ? 'critical'
    : matches.length ? 'warning' : 'normal';
  return { severity, matches, label: matches[0]?.label || 'Within configured range' };
}

export function formatMetricValue(metric) {
  if (metric.kind === 'blood-pressure') return `${metric.value.systolic}/${metric.value.diastolic}`;
  if (metric.kind === 'mood') return metric.value;
  const n = Number(metric.value);
  return Number.isFinite(n) ? (Number.isInteger(n) ? String(n) : n.toFixed(1)) : String(metric.value);
}

export function formatTimestamp(date = new Date()) {
  return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(date);
}

export function createLogEntry(metric, previousValue, nextValue, note = 'Measurement updated') {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    metricId: metric.id,
    metricName: metric.name,
    previousValue,
    nextValue,
    note,
    time: formatTimestamp()
  };
}
