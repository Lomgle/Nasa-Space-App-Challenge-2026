import { escapeHTML, icon } from '../lib/ui.js';
import { evaluateMetric, formatMetricValue } from '../lib/health.js';

function buildHealthSummary(metrics, focusedCrew) {
  if (focusedCrew && focusedCrew.id !== 'elena-voss') {
    const flag = focusedCrew.status === 'normal' ? 'No demo flags are currently recorded for this profile.' : 'This synthetic profile is marked for review by its example rules.';
    const readings = (focusedCrew.readings || []).map(([label, value]) => `${label}: ${value}`).join(' · ');
    return `${focusedCrew.name} is the selected crew member. ${flag} Latest demo snapshot: ${readings}. These sample values are not medical guidance.`;
  }

  const checked = metrics.map(metric => ({ metric, result: evaluateMetric(metric) }));
  const alerts = checked.filter(item => item.result.severity !== 'normal');
  const normalCount = checked.length - alerts.length;
  if (!metrics.length) return 'There are no health metrics to summarize yet. Add a metric or enter a reading to begin.';
  const overview = alerts.length
    ? `${normalCount} of ${metrics.length} tracked metrics are within their configured demo ranges. ${alerts.length} ${alerts.length === 1 ? 'item is' : 'items are'} marked for review: ${alerts.map(item => item.metric.name).join(', ')}.`
    : `All ${metrics.length} tracked metrics are within their configured demo ranges.`;
  const heartRate = metrics.find(metric => metric.id === 'heart-rate');
  const sleep = metrics.find(metric => metric.id === 'sleep');
  const context = [];
  if (heartRate) context.push(`heart rate ${formatMetricValue(heartRate)} ${heartRate.unit || ''}`.trim());
  if (sleep) context.push(`sleep ${formatMetricValue(sleep)} ${sleep.unit || ''}`.trim());
  return `${focusedCrew?.name || 'Elena Voss'}: ${overview}${context.length ? ` Latest entries: ${context.join('; ')}.` : ''} These are demo-rule summaries, not a medical assessment.`;
}

function crewAvatar(crew) {
  const content = crew?.avatar || crew?.initials || 'EV';
  const inner = typeof content === 'string' && content.startsWith('data:image/')
    ? `<img src="${escapeHTML(content)}" alt="" />`
    : `<span>${escapeHTML(content)}</span>`;
  const personal = crew?.id === 'elena-voss' ? 'data-profile-avatar-content' : '';
  return `<span class="focused-crew-avatar" aria-hidden="true"><span class="avatar-content" ${personal}>${inner}</span></span>`;
}

export function assistantRoom(expression = 'neutral', metrics = [], messages = [], expanded = false, focusedCrew = null) {
  const summary = buildHealthSummary(metrics, focusedCrew);
  const history = messages.length ? messages : [{ role: 'assistant', text: 'Hello. I can summarize the selected crew member’s readings and list demo-threshold flags. What would you like to review?' }];
  const selectedName = focusedCrew?.name || 'Elena Voss';
  const signalLabel = focusedCrew?.connectivity === 'offline' ? 'NO SIGNAL' : focusedCrew?.connectivity === 'weak' ? 'WEAK LINK' : 'CONNECTED';

  return `
    <button class="assistant-expand-backdrop" data-action="assistant-expand-backdrop" aria-label="Close expanded assistant" ${expanded ? '' : 'hidden'}></button>
    <section class="assistant-panel panel ${expanded ? 'assistant-panel--expanded' : ''}" aria-label="Crew Support" aria-modal="${expanded ? 'true' : 'false'}" role="${expanded ? 'dialog' : 'region'}">
      <div class="assistant-heading-row">
        <div><div class="eyebrow">MISSION CONSOLE</div><h2>CREW SUPPORT <span>AURA assistant</span></h2></div>
        <div class="assistant-heading-actions"><span class="prototype-tag">OFFLINE PREVIEW</span><button type="button" class="assistant-expand-button" data-action="toggle-assistant-expand" aria-label="${expanded ? 'Collapse assistant chat' : 'Expand assistant chat'}" aria-expanded="${expanded}" title="${expanded ? 'Collapse assistant chat' : 'Expand assistant chat'}">${icon(expanded ? 'shrink' : 'expand', 16)}</button></div>
      </div>

      <div class="focused-crew-chip">
        ${crewAvatar(focusedCrew)}
        <div><span>FOCUSED CREW MEMBER</span><b>${escapeHTML(selectedName)}</b></div>
        <em class="focused-crew-signal focused-crew-signal--${escapeHTML(focusedCrew?.connectivity || 'connected')}">${signalLabel}</em>
      </div>

      <div class="assistant-stage assistant-stage--${expression}" aria-label="AURA model preview">
        <div class="crt-screen-top"><span>AURA / NODE 01</span></div>
        <div class="crt-scanlines"></div><div class="crt-vignette"></div><div class="crt-flicker"></div>
        <div class="assistant-model-frame">
          <img src="./assets/ai_${expression}.png" class="assistant-custom-preview" alt="AURA ${expression} expression" onerror="this.hidden=true; this.nextElementSibling.hidden=false" />
        </div>
      </div>

      <div class="assistant-summary">
        <div class="assistant-summary__top"><span>${icon('activity', 15)} HEALTH SUMMARY</span><span>FOCUS: ${escapeHTML(selectedName)}</span></div>
        <p>${escapeHTML(summary)}</p>
      </div>

      <button type="button" class="assistant-chat-launch" data-action="toggle-assistant-expand">${icon('messageCircle', 16)} Open AURA conversation <span>${messages.length ? `${messages.length} messages` : 'Start chat'}</span>${icon('arrow', 15)}</button>

      <div class="assistant-chat" aria-label="AURA conversation">
        <div class="assistant-chat__header"><b>Conversation</b><span>Stored on this device</span></div>
        <div class="assistant-chat__messages" id="assistant-chat-messages" aria-live="polite" aria-relevant="additions">
          ${history.map(message => `<div class="chat-message chat-message--${message.role === 'user' ? 'user' : 'assistant'}"><span>${message.role === 'user' ? 'YOU' : 'AURA'}</span><p>${escapeHTML(message.text)}</p></div>`).join('')}
        </div>
        <div class="assistant-prompts">
          <button type="button" data-action="ask-assistant" data-prompt="Summarize my health">Summarize selected crew</button>
          <button type="button" data-action="ask-assistant" data-prompt="Which readings need review?">What needs review?</button>
        </div>
        <form class="assistant-chat__form" id="assistant-chat-form">
          <label class="sr-only" for="assistant-chat-input">Message AURA</label>
          <input id="assistant-chat-input" name="message" maxlength="300" autocomplete="off" placeholder="Ask about ${escapeHTML(selectedName)}…" required />
          <button type="submit" aria-label="Send message">${icon('arrow', 17)}</button>
        </form>
        <p class="assistant-disclaimer">Local rule-based preview only. No connected AI model or medical decision support.</p>
      </div>
    </section>`;
}
