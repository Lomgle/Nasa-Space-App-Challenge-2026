export function expressionForAssistantText(text) {
  const content = String(text || '').toLowerCase();
  const activeContent = content
    .replace(/\b(?:no|not|without|zero)\s+(?:(?:current|active|any|a|the|critical|urgent|severe)\s+)*(?:alerts?|warnings?|flags?|concerns?|issues?|emergencies?)\b/g, '')
    .replace(/\bno\s+metrics?\b.{0,80}\b(?:cross(?:es)?|exceed(?:s)?|trigger(?:s)?)\b/g, '')
    .replace(/\bwithin\s+(?:the\s+)?(?:configured\s+)?(?:demo\s+)?ranges?\b/g, '')
    .replace(/\b(?:all|everything)\s+(?:is\s+)?(?:normal|stable|within range)\b/g, '');
  const reassuring = /\bno\s+(?:(?:current|active)\s+)?(?:alerts?|warnings?|flags?|concerns?|issues?|emergencies?)\b|\bwithin\s+(?:the\s+)?(?:configured\s+)?(?:demo\s+)?ranges?\b|\bno\s+metrics?\b.{0,80}\b(?:cross(?:es)?|exceed(?:s)?|trigger(?:s)?)\b|\b(?:all|everything)\s+(?:is\s+)?(?:normal|stable|within range)\b/;

  if (/\b(critical|emergency|urgent|dangerous?|severe|immediate|life-threatening)\b/.test(activeContent)) {
    return 'alert';
  }
  if (/\b(warnings?|flagged|flags?|needs review|concerns?|concerning|weak|low|strained|elevated|outside range|exceeds?)\b/.test(activeContent)) {
    return 'frown';
  }
  if (reassuring.test(content)) return 'smile';
  if (/\b(normal|stable|healthy|good|great|saved|completed|successfully|within range|no issue)\b/.test(content)) {
    return 'smile';
  }
  return 'neutral';
}
