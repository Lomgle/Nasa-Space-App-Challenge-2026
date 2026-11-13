import { DEFAULT_METRICS } from './data/metricRegistry.js';
import { DEMO_CREW } from './data/crewRegistry.js';
import { STORAGE_KEY, loadState, saveState, evaluateMetric, formatMetricValue, createLogEntry, formatTimestamp } from './lib/health.js';
import { escapeHTML, icon } from './lib/ui.js';
import { metricCard } from './components/metricCard.js';
import { assistantRoom } from './components/assistantRoom.js';
import { metricDialog } from './components/metricDialog.js';
import { metricDetailsDialog } from './components/metricDetails.js';

export class App {
  constructor(root) {
    this.root = root;
    this.state = loadState(DEFAULT_METRICS);
    this.expression = 'neutral';
    this.view = 'overview';
    this.sidebarCollapsed = true;
    this.chatMessages = this.state.chatMessages || [];
    this.chatExpanded = false;
    this.debugSession = false;
    this.terminalLines = [];
    this.crewSummaryIndex = 0;
    this.draggedMetricId = null;
    this.toastTimer = null;
    this.root.addEventListener('click', event => this.handleClick(event));
    this.root.addEventListener('submit', event => this.handleSubmit(event));
    this.root.addEventListener('change', event => this.handleChange(event));
    this.root.addEventListener('input', event => this.handleInput(event));
    this.root.addEventListener('dragstart', event => this.handleMetricDragStart(event));
    this.root.addEventListener('dragover', event => this.handleMetricDragOver(event));
    this.root.addEventListener('drop', event => this.handleMetricDrop(event));
    this.root.addEventListener('dragend', () => this.clearMetricDragState());
    this.root.addEventListener('keydown', event => {
      if (event.key === 'Escape' && this.chatExpanded) this.toggleAssistantExpand();
      if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('.metric-card[role="button"]')) {
        event.preventDefault();
        this.openMetricDetails(event.target.dataset.id);
      }
    });
  }

  persist() {
    const saved = saveState(this.state);
    this.root.dataset.saved = saved ? 'true' : 'false';
    return saved;
  }


  getAlerts() {
    return this.state.metrics.flatMap(metric => {
      const result = evaluateMetric(metric);
      return result.severity === 'normal' ? [] : [{ metric, ...result }];
    });
  }

  getMetricsInDisplayOrder() {
    const priority = {
        critical: 0,
        warning: 1,
        normal: 2
    };

    return this.state.metrics
        .map((metric, index) => ({
            metric,
            index,
            severity: evaluateMetric(metric).severity
        }))
        .sort((a, b) =>
            priority[a.severity] - priority[b.severity]
            || a.index - b.index
        )
        .map(item => item.metric);
  }

  renderAvatarContent(avatar, fallback = '') {
    const value = avatar || fallback || '👩🏻‍🚀';
    if (typeof value === 'string' && value.startsWith('data:image/')) return `<img src="${escapeHTML(value)}" alt="" />`;
    return `<span>${escapeHTML(value)}</span>`;
  }

  renderProfileAvatar() {
    return this.renderAvatarContent(this.state.profileAvatar || '👩🏻‍🚀');
  }

  updateProfileAvatarView() {
    const content = this.renderProfileAvatar();
    this.root.querySelectorAll('[data-profile-avatar-content]').forEach(node => { node.innerHTML = content; });
  }

  render() {
    this.state.theme = 'dark';
    document.documentElement.dataset.theme = 'dark';
    document.body.dataset.theme = 'dark';
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) themeMeta.content = '#050805';
    const date = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date());
    const activityCount = this.state.log.length;
    if (this.view === 'crew') { const selectedIndex = this.getCrewSnapshot().findIndex(member => member.id === this.state.selectedCrewId); if (selectedIndex >= 0 && !this.crewSummaryIndexTouched) this.crewSummaryIndex = selectedIndex; }
    const viewTitle = ({ overview: 'Crew overview', crew: 'Crew summary', activity: 'Activity log', debug: 'Debug' })[this.view] || 'Crew overview';

    this.root.innerHTML = `
      <div class="app-shell ${this.sidebarCollapsed ? 'sidebar-collapsed' : ''}" data-theme="dark">
        <aside class="sidebar">
          <div class="sidebar-brand-row">
            <a class="brand" href="#overview" aria-label="Orbit Health home"><span class="brand-mark"><span></span><span></span><span></span></span><span class="brand-wordmark">orbit<span>health</span></span></a>
            <button class="sidebar-toggle" data-action="toggle-sidebar" aria-label="${this.sidebarCollapsed ? 'Expand' : 'Collapse'} sidebar" aria-expanded="${!this.sidebarCollapsed}" title="${this.sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}">${icon(this.sidebarCollapsed ? 'panelLeftOpen' : 'panelLeftClose', 17)}</button>
          </div>
          <div class="mission-label">MISSION CONSOLE</div>
          <nav class="primary-nav" aria-label="Main navigation">
            <button class="nav-item ${this.view === 'overview' ? 'is-active' : ''}" data-action="navigate" data-view="overview" title="Overview">${icon('activity', 18)}<span>Overview</span></button>
            <button class="nav-item ${this.view === 'crew' ? 'is-active' : ''}" data-action="navigate" data-view="crew" title="Crew summary">${icon('users', 18)}<span>Crew summary</span><span class="nav-count">04</span></button>
            <button class="nav-item ${this.view === 'activity' ? 'is-active' : ''}" data-action="navigate" data-view="activity" title="Activity log">${icon('clock', 18)}<span>Activity log</span><span class="nav-count">${activityCount}</span></button>
            <button class="nav-item ${this.view === 'debug' ? 'is-active' : ''}" data-action="open-debug" title="Debug">${icon('terminal', 18)}<span>Debug</span></button>
          </nav>
          <div class="sidebar-divider"></div>
          <div class="mission-label">CREW MONITORING</div>
          <div class="crew-card"><div class="crew-avatar sidebar-profile-avatar"><span class="avatar-content" data-profile-avatar-content>${this.renderProfileAvatar()}</span><span class="crew-online"></span></div><div><b>Elena Voss</b><span>Expedition specialist</span></div><span class="crew-more">···</span></div>
          <div class="sidebar-bottom">
            <div class="offline-card"><span class="offline-icon">${icon('shield', 17)}</span><div><b>Offline-ready</b><span>Data stays on this device</span></div><span class="offline-dot"></span></div>
            <div class="sidebar-footer"><span>ORBITAL SYSTEMS</span><span>BUILD 1.5.0</span></div>
          </div>
        </aside>

        <main class="main-content">
          <header class="topbar">
            <div class="breadcrumb"><span>Mission control</span>${icon('chevron', 13)}<b>${viewTitle}</b></div>
            <div class="topbar-actions">
              <span class="local-indicator"><span></span> LOCAL MODE</span>
              <div class="profile-menu">
                <button type="button" class="topbar-profile profile-trigger" data-action="toggle-profile-menu" aria-expanded="false" aria-haspopup="true">
                  <span class="profile-avatar"><span class="avatar-content" data-profile-avatar-content>${this.renderProfileAvatar()}</span></span><span class="profile-identity"><b>Elena Voss</b><span>Crew member 01</span></span>${icon('chevron', 13)}
                </button>
                <div class="profile-popover" hidden>
                  <div class="profile-popover__heading"><b>Personal avatar</b><span>Stored on this device</span></div>
                  <div class="profile-emoji-grid">${['👩🏻‍🚀','👨🏻‍🚀','🧑‍🚀','🌙','🛰️','🚀','🪐','🟢'].map(emoji => `<button type="button" data-action="set-profile-avatar" data-avatar="${emoji}" aria-label="Use ${emoji} avatar">${emoji}</button>`).join('')}</div>
                  <label class="profile-upload-button" for="avatar-upload">${icon('image', 14)} Upload image</label>
                  <input id="avatar-upload" type="file" accept="image/*" hidden />
                </div>
              </div>
            </div>
          </header>

          ${this.view === 'overview' ? this.renderOverview({ date }) : this.view === 'crew' ? this.renderCrew({ date }) : this.view === 'debug' ? this.renderDebug({ date }) : this.renderActivity({ date })}
          <footer class="page-footer"><span>ORBIT HEALTH <i>•</i> CREW MONITORING INTERFACE</span><span>Demo data · Local device storage</span></footer>
        </main>
        <div id="modal-root"></div>
      </div>
      <div class="toast" id="toast" role="status" aria-live="polite"></div>`;

    if (this.view === 'overview') {
      const messageBox = this.root.querySelector('#assistant-chat-messages');
      if (messageBox) messageBox.scrollTop = messageBox.scrollHeight;
    }
  }

  renderOverview({ date }) {
    const orderedMetrics = this.getMetricsInDisplayOrder();
    const cards = orderedMetrics.map(metricCard).join('');
    const crew = this.getCrewSnapshot();
    const emergencies = crew.filter(member => member.emergency || member.status === 'critical');
    const heartbeatCards = crew.map(member => this.renderHeartbeatCard(member)).join('');
    const focusedCrew = this.getFocusedCrew();

    return `
      <div class="overview-layout">
        <div class="overview-content-column">
          <section class="page-header overview-page-header">
            <div><div class="eyebrow">EXPEDITION 07 <span>·</span> ORBITAL HEALTH</div><h1>Your health overview</h1></div>
            <div class="header-date"><span>${icon('clock', 15)}</span><div><b>${date}</b><small>Updated locally at ${formatTimestamp()}</small></div></div>
          </section>

          <section class="live-metrics-column panel">
            <div class="section-heading metric-section-heading"><div><div class="eyebrow">PERSONAL HEALTH</div><h2>Elena’s health readings <span class="heading-count">${this.state.metrics.length}</span></h2></div><button class="button button--primary add-metric-button" data-action="add-metric" aria-label="Add metric" title="Add metric">${icon('plus', 17)}</button></div>
            <section class="metrics-grid" aria-label="Your health metrics">${cards}</section>
          </section>

          <section class="crew-pulse-section">
            <div class="section-heading crew-pulse-heading"><div><div class="eyebrow">CREW TELEMETRY</div><h2>Crew heartbeat & connectivity</h2></div><span class="subtle-chip">${crew.length} CREW MEMBERS</span></div>
            ${emergencies.length ? `<div class="crew-emergency-strip"><div class="crew-emergency-strip__title">${icon('warning', 16)} <b>${emergencies.length} CREW IN EMERGENCY REVIEW</b></div><div class="crew-emergency-strip__items">${emergencies.map(member => `<button type="button" data-action="focus-crew" data-id="${escapeHTML(member.id)}"><span class="crew-emergency-avatar"><span class="avatar-content" ${member.id === 'elena-voss' ? 'data-profile-avatar-content' : ''}>${this.renderAvatarContent(member.avatar, member.initials)}</span></span><span>${escapeHTML(member.name)}</span> <em>${escapeHTML(member.statusLabel)}</em></button>`).join('')}</div></div>` : `<div class="crew-emergency-strip crew-emergency-strip--clear">${icon('shield', 16)} <b>No crew health emergencies in the current demo snapshot.</b></div>`}
            <div class="crew-heartbeat-list">${heartbeatCards}</div>
          </section>
          <div class="demo-note"><span>${icon('shield', 14)}</span><p><b>Prototype notice:</b> Readings and thresholds are synthetic examples. AURA is a local rule-based preview, not a connected AI model or medical device. Do not use this prototype for diagnosis, treatment, fitness-for-duty, or flight-safety decisions.</p></div>
        </div>
        <aside class="assistant-column assistant-column--sticky">${assistantRoom(this.expression, this.state.metrics, this.chatMessages, this.chatExpanded, focusedCrew)}</aside>
      </div>`;
  }

  getCrewSnapshot() {
    const find = id => this.state.metrics.find(metric => metric.id === id);
    const alerts = this.getAlerts();
    const hr = find('heart-rate');
    const heartRate = hr ? Number(hr.value) : null;
    const severity = alerts.some(item => item.severity === 'critical') ? 'critical' : alerts.length ? 'warning' : 'normal';
    const current = {
      id: 'elena-voss', name: 'Elena Voss', initials: 'EV', avatar: this.state.profileAvatar || '👩🏻‍🚀', role: 'Expedition specialist',
      status: severity, statusLabel: severity === 'critical' ? 'Emergency review' : severity === 'warning' ? 'Needs review' : 'Within demo ranges',
      emergency: severity === 'critical', heartRate, signal: 96, connectivity: 'connected',
      waveform: [82,84,80,78,80,82,84,80,112,65,78,82,84,80,78,82,84,80,112,65,78,82,80,79,84,82,112,65,80,82],
      metricReadings: this.state.metrics.map(metric => ({ id: metric.id, name: metric.name, value: `${formatMetricValue(metric)}${metric.unit ? ` ${metric.unit}` : ''}`, severity: evaluateMetric(metric).severity, label: evaluateMetric(metric).label })),
      readings: [...this.state.metrics.map(metric => [metric.name, `${formatMetricValue(metric)}${metric.unit ? ` ${metric.unit}` : ''}`]), ['Connectivity', 'Connected · 96%']]
    };
    return [current, ...DEMO_CREW];
  }

  renderHeartbeatCard(member) {
    const signalValue = Number(member.signal) || 0;
    const offline = member.connectivity === 'offline' || member.signal == null || signalValue <= 0;
    const weak = !offline && (member.connectivity === 'weak' || signalValue < 35);
    const values = Array.isArray(member.waveform) ? member.waveform : [];
    const width = 520, height = 94, left = 7, right = 7, top = 11, bottom = 8;
    const min = 45, max = 115;
    const y = value => top + ((max - value) / (max - min)) * (height - top - bottom);
    const points = values.map((value, index) => ({ x: left + (index * (width-left-right))/Math.max(1, values.length-1), y: y(value) }));
    const pointList = points.map(point => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
    const upper = y(110), lower = y(60);
    const graph = offline ? `<div class="heartbeat-no-signal">${icon('warning', 18)} NO SIGNAL · TRACE UNAVAILABLE</div>` : `<svg class="heartbeat-graph" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img" aria-label="Static heartbeat waveform for ${escapeHTML(member.name)}">
      ${[.25,.5,.75].map(frac => `<line x1="${left}" x2="${width-right}" y1="${top+frac*(height-top-bottom)}" y2="${top+frac*(height-top-bottom)}" class="heartbeat-gridline"/>`).join('')}
      <line x1="${left}" x2="${width-right}" y1="${upper}" y2="${upper}" class="heartbeat-limit heartbeat-limit--upper"/><line x1="${left}" x2="${width-right}" y1="${lower}" y2="${lower}" class="heartbeat-limit heartbeat-limit--lower"/>
      <text x="${width-right}" y="${Math.max(8,upper-3)}" text-anchor="end" class="heartbeat-limit-label">HIGH 110</text><text x="${width-right}" y="${Math.max(8,lower-3)}" text-anchor="end" class="heartbeat-limit-label">LOW 60</text>
      <polyline points="${pointList}" class="heartbeat-line"/>
    </svg>`;
    const signalText = offline ? 'UNAVAILABLE' : weak ? 'LOW SIGNAL' : 'CONNECTED';
    const signalClass = offline ? 'offline' : weak ? 'weak' : 'connected';
    const statusClass = signalClass;
    const heartRate = member.heartRate == null ? '—' : `${member.heartRate} BPM`;
    const stateClass = member.status === 'critical' ? 'heartbeat-card--critical' : member.status === 'warning' ? 'heartbeat-card--warning' : '';
    return `<article class="heartbeat-card ${stateClass} heartbeat-card--${statusClass}">
      <div class="heartbeat-person"><span class="heartbeat-avatar" ${member.id === 'elena-voss' ? 'data-member-id="elena-voss"' : ''}><span class="avatar-content" ${member.id === 'elena-voss' ? 'data-profile-avatar-content' : ''}>${this.renderAvatarContent(member.avatar, member.initials)}</span></span><div class="heartbeat-person__copy"><b>${escapeHTML(member.name)}</b><span>${escapeHTML(member.role)}</span><span class="heartbeat-connectivity heartbeat-connectivity--${statusClass}"><i></i>${signalText}${!offline ? ` · ${member.signal}%` : ''}</span></div></div>
      <div class="heartbeat-value"><span>♥</span><b>${escapeHTML(heartRate)}</b></div>
      <div class="heartbeat-chart-wrap">${graph}<div class="heartbeat-chart-foot"><span>LOW 60 / HIGH 110 BPM</span></div></div>
      <div class="heartbeat-actions"><div class="heartbeat-signal-meter"><span>LINK</span><div><i style="width:${Math.max(0, Math.min(100, Number(member.signal)||0))}%"></i></div><b>${offline ? '—' : `${member.signal}%`}</b></div><button class="button ${member.id === this.state.selectedCrewId ? 'button--quiet' : 'button--primary'} heartbeat-focus-button" data-action="focus-crew" data-id="${escapeHTML(member.id)}" aria-pressed="${member.id === this.state.selectedCrewId}">${member.id === this.state.selectedCrewId ? 'FOCUSED' : 'FOCUS SUPPORT'}</button></div>
    </article>`;
  }

  getFocusedCrew() {
    const crew = this.getCrewSnapshot();
    return crew.find(member => member.id === this.state.selectedCrewId) || crew[0];
  }

  getCrewMetricRows(member) {
    if (member.id === 'elena-voss') {
      return this.state.metrics.map(metric => {
        const result = evaluateMetric(metric);
        return { id: metric.id, name: metric.name, value: `${formatMetricValue(metric)}${metric.unit ? ` ${metric.unit}` : ''}`, severity: result.severity, label: result.label };
      });
    }
    return Array.isArray(member.metricReadings) ? member.metricReadings : [];
  }

  renderCrewGraph(member) {
    const values = Array.isArray(member.waveform) ? member.waveform : [];
    if (!values.length || member.connectivity === 'offline') {
      return `<div class="crew-detail-no-signal">${icon('warning', 20)} <b>HEARTBEAT TRACE UNAVAILABLE</b><span>Connection unavailable for this profile</span></div>`;
    }
    const width = 900, height = 180, left = 12, right = 12, top = 15, bottom = 14;
    const min = 45, max = 115;
    const y = value => top + ((max - value) / (max - min)) * (height - top - bottom);
    const points = values.map((value, index) => ({ x: left + (index * (width - left - right)) / Math.max(1, values.length - 1), y: y(value) }));
    const line = points.map(point => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
    return `<svg class="crew-detail-heartbeat-graph" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img" aria-label="Static heartbeat waveform for ${escapeHTML(member.name)}">
      ${[.25,.5,.75].map(frac => `<line x1="${left}" x2="${width-right}" y1="${top+frac*(height-top-bottom)}" y2="${top+frac*(height-top-bottom)}" class="heartbeat-gridline"/>`).join('')}
      <line x1="${left}" x2="${width-right}" y1="${y(110)}" y2="${y(110)}" class="heartbeat-limit"/><line x1="${left}" x2="${width-right}" y1="${y(60)}" y2="${y(60)}" class="heartbeat-limit heartbeat-limit--lower"/>
      <text x="${width-right}" y="${Math.max(10,y(110)-4)}" text-anchor="end" class="heartbeat-limit-label">HIGH 110</text><text x="${width-right}" y="${Math.max(10,y(60)-4)}" text-anchor="end" class="heartbeat-limit-label">LOW 60</text>
      <polyline points="${line}" class="heartbeat-line"/></svg>`;
  }

  renderCrew({ date }) {
    const crew = this.getCrewSnapshot();
    const emergencyCrew = crew.filter(member => member.emergency || member.status === 'critical');
    const index = Math.min(Math.max(0, this.crewSummaryIndex), crew.length - 1);
    const member = crew[index];
    const metricRows = this.getCrewMetricRows(member);
    const readings = metricRows.map(row => `<div class="crew-detail-reading crew-detail-reading--${escapeHTML(row.severity || 'normal')}" data-metric-id="${escapeHTML(row.id)}"><span>${escapeHTML(row.name)}</span><b>${escapeHTML(row.value)}</b>${row.severity && row.severity !== 'normal' ? `<em>${escapeHTML(row.severity === 'critical' ? 'CRITICAL' : 'REVIEW')} · ${escapeHTML(row.label || 'Configured threshold crossed')}</em>` : '<small>WITHIN CONFIGURED RANGE</small>'}</div>`).join('');
    const emergency = emergencyCrew.length ? emergencyCrew.map(person => `<button type="button" class="emergency-crew-item" data-action="select-crew-page" data-id="${escapeHTML(person.id)}"><span class="emergency-crew-avatar"><span class="avatar-content" ${person.id === 'elena-voss' ? 'data-profile-avatar-content' : ''}>${this.renderAvatarContent(person.avatar, person.initials)}</span></span><span><b>${escapeHTML(person.name)}</b><small>${escapeHTML(person.statusLabel)}</small></span><em>VIEW</em></button>`).join('') : '<div class="emergency-empty">No crew health emergencies in the current demo snapshot.</div>';
    const avatarMarkup = this.renderAvatarContent(member.avatar, member.initials);
    const statusClass = member.status === 'critical' ? 'critical' : member.status === 'warning' ? 'warning' : 'normal';
    return `
      <section class="page-header"><div><div class="eyebrow">EXPEDITION 07 <span>·</span> CREW MONITORING</div><h1>Crew summary</h1></div><div class="header-date"><span>${icon('users', 15)}</span><div><b>${crew.length} crew members</b><small>${date}</small></div></div></section>
      <section class="crew-emergency-panel crew-emergency-panel--compact panel"><div class="crew-emergency-panel__heading"><div><div class="eyebrow">PRIORITY MONITORING</div><h2>Emergency crew overview</h2></div><span class="crew-emergency-count">${emergencyCrew.length} ACTIVE</span></div><div class="emergency-crew-list">${emergency}</div></section>
      <section class="crew-detail-section">
        <div class="crew-detail-nav"><div><div class="eyebrow">CREW PROFILE</div><h2>Health details</h2></div><div class="crew-nav-controls"><button type="button" data-action="crew-nav" data-step="-1" aria-label="Previous crew member">${icon('chevron', 17)}</button><span>${index + 1} <i>/</i> ${crew.length}</span><button type="button" data-action="crew-nav" data-step="1" aria-label="Next crew member">${icon('chevron', 17)}</button></div></div>
        <div class="crew-profile-layout">
          <aside class="crew-profile-identity panel">
            <div class="crew-profile-avatar-wrap"><div class="crew-profile-avatar ${member.id === 'elena-voss' ? 'is-personal-avatar' : ''}" ${member.id === 'elena-voss' ? 'data-member-id="elena-voss"' : ''}><span class="avatar-content" ${member.id === 'elena-voss' ? 'data-profile-avatar-content' : ''}>${avatarMarkup}</span></div></div>
            <div class="crew-profile-name"><h3>${escapeHTML(member.name)}</h3><p>${escapeHTML(member.role)}</p><span class="crew-health-status crew-health-status--${statusClass}"><i></i>${escapeHTML(member.statusLabel)}</span></div>
          </aside>
          <div class="crew-profile-main">
            <section class="crew-detail-heartbeat panel"><div class="crew-detail-heartbeat-heading"><div><div class="eyebrow">HEARTBEAT GRAPH</div><h3>${escapeHTML(member.name)} · ${member.heartRate == null ? '—' : `${member.heartRate} BPM`}</h3></div><span class="heartbeat-connectivity heartbeat-connectivity--${member.connectivity === 'offline' ? 'offline' : member.connectivity === 'weak' ? 'weak' : 'connected'}"><i></i>${member.connectivity === 'offline' ? 'UNAVAILABLE' : member.connectivity === 'weak' ? `LOW SIGNAL · ${member.signal}%` : `CONNECTED · ${member.signal}%`}</span></div>${this.renderCrewGraph(member)}</section>
            <section class="crew-detail-readings" aria-label="Eight crew health metrics">${readings}</section>
            <div class="crew-detail-footer"><span class="crew-detail-data-note">${member.id === 'elena-voss' ? 'Values from your local dashboard' : 'Synthetic teammate preview data'}</span><button type="button" class="button button--primary" data-action="focus-crew" data-id="${escapeHTML(member.id)}">Focus in Crew Support ${icon('arrow', 14)}</button></div>
          </div>
        </div>
      </section>
      <div class="demo-note"><span>${icon('shield', 14)}</span><p><b>Prototype notice:</b> Elena’s values come from this browser’s local dashboard. Other teammate profiles are synthetic placeholders. Replace them with authenticated, mission-approved data before any real operational use.</p></div>`;
  }

  renderActivity({ date }) {
    const rows = [...this.state.log].reverse();
    return `
      <section class="page-header"><div><div class="eyebrow">EXPEDITION 07 <span>·</span> RECORD HISTORY</div><h1>Activity log</h1><p class="page-subtitle">A local record of measurement updates made in this browser.</p></div><div class="header-date"><span>${icon('clock', 15)}</span><div><b>${date}</b><small>${rows.length} recorded update${rows.length === 1 ? '' : 's'}</small></div></div></section>
      <section class="panel activity-panel"><div class="section-heading section-heading--compact"><div><div class="eyebrow">MEASUREMENT HISTORY</div><h2>Recent changes</h2></div><span class="subtle-chip">Stored locally</span></div>
        ${rows.length ? `<div class="activity-table-wrap"><table class="activity-table"><thead><tr><th>Metric</th><th>Previous</th><th>New reading</th><th>Event</th><th>Time</th></tr></thead><tbody>${rows.map(entry => `<tr><td><b>${escapeHTML(entry.metricName)}</b></td><td>${escapeHTML(entry.previousValue)}</td><td><b>${escapeHTML(entry.nextValue)}</b></td><td><span class="activity-event">${escapeHTML(entry.note)}</span></td><td>${escapeHTML(entry.time)}</td></tr>`).join('')}</tbody></table></div>` : `<div class="empty-activity"><div class="empty-activity-icon">${icon('clock', 22)}</div><h3>No activity recorded yet</h3><p>Update a metric from the overview to add the first entry to this local history.</p><button class="button button--primary" data-action="navigate" data-view="overview">Return to overview ${icon('arrow', 15)}</button></div>`}
      </section>
      <div class="local-storage-note">${icon('shield', 16)} <span>History is stored in this browser's local storage. Clearing browser data will remove these records.</span></div>`;
  }

  renderDebug({ date }) {
    if (!this.debugSession) return '<section class="page-header"><div><div class="eyebrow">MISSION CONSOLE</div><h1>Debug access required</h1></div></section>';
    const output = this.terminalLines.length ? this.terminalLines : [
      'ORBIT HEALTH / LOCAL DIAGNOSTICS',
      'Debug session opened. Type "help" to list available commands.'
    ];
    return `
      <section class="page-header debug-page-header"><div><div class="eyebrow">MISSION CONSOLE <span>·</span> SYSTEM TOOLS</div><h1>Debug</h1><p class="page-subtitle">Local diagnostics and demo-state maintenance.</p></div><div class="header-date"><span>${icon('clock', 15)}</span><div><b>${date}</b><small>Local debug session</small></div></div></section>
      <section class="debug-layout">
        <div class="debug-terminal panel">
          <div class="debug-terminal__top"><div><span class="terminal-status-dot"></span><b>ORBIT TERMINAL</b><small>LOCAL / MOCK ENVIRONMENT</small></div><button type="button" class="button button--quiet" data-action="terminal-clear">Clear output</button></div>
          <div class="debug-terminal__output" id="terminal-output" role="log" aria-live="polite">${output.map(line => `<div class="terminal-line">${escapeHTML(line)}</div>`).join('')}</div>
          <form class="debug-terminal__form" id="terminal-form"><label for="terminal-command">operator@orbit:~$</label><input id="terminal-command" name="command" autocomplete="off" spellcheck="false" placeholder="type help" maxlength="120" /><button type="submit" aria-label="Run command">${icon('arrow', 16)}</button></form>
        </div>
        <aside class="debug-tools panel">
          <div class="eyebrow">MAINTENANCE</div><h2>Factory reset</h2>
          <p>Restore the original demo readings and clear all locally stored app information, including custom metrics, activity history, selected crew member, saved preferences, and AURA conversation.</p>
          <div class="debug-reset-warning">${icon('warning', 16)} This action cannot be undone.</div>
          <button type="button" class="button button--danger" data-action="factory-reset">${icon('refresh', 15)} Factory reset app</button>
          <div class="debug-tools__meta"><span>App version</span><b>1.5.0</b><span>Storage</span><b>Browser localStorage</b><span>Access gate</span><b>Decorative password prompt</b></div>
        </aside>
      </section>
      <p class="debug-disclaimer">Debug is a local prototype utility. Its password prompt is a navigation gate only and does not protect data from someone inspecting the browser or source files.</p>`;
  }

  openModal(metric = null) {
    const modalRoot = this.root.querySelector('#modal-root');
    modalRoot.innerHTML = metricDialog(metric);
    const firstInput = modalRoot.querySelector('input:not([disabled]), select');
    firstInput?.focus();
    document.body.classList.add('modal-open');
  }

  openMetricDetails(id) {
    const metric = this.state.metrics.find(item => item.id === id);
    if (!metric) return;
    const modalRoot = this.root.querySelector('#modal-root');
    modalRoot.innerHTML = metricDetailsDialog(metric);
    document.body.classList.add('modal-open');
  }

  openDebugGate() {
    const modalRoot = this.root.querySelector('#modal-root');
    modalRoot.innerHTML = `
      <div class="modal-backdrop debug-gate-backdrop">
        <section class="modal debug-gate-modal" role="dialog" aria-modal="true" aria-labelledby="debug-gate-title">
          <div class="modal-heading"><div><div class="eyebrow">RESTRICTED MODULE</div><h2 id="debug-gate-title">Debug access</h2></div><button class="icon-button modal-close-button" data-action="close-debug-gate" aria-label="Close">${icon('close', 17)}</button></div>
          <p class="debug-gate-copy">Enter the local operator password to open the debug console.</p>
          <form id="debug-password-form"><label class="field"><span>Access password</span><input type="password" name="password" autocomplete="off" placeholder="Enter password" required /></label><p class="debug-gate-error" id="debug-gate-error" aria-live="polite"></p><div class="modal-actions"><span class="modal-note">Local prototype access gate</span><button type="submit" class="button button--primary">Unlock debug</button></div></form>
        </section>
      </div>`;
    document.body.classList.add('modal-open');
    modalRoot.querySelector('input[name="password"]')?.focus();
  }

  closeModal() {
    this.root.querySelector('#modal-root').innerHTML = '';
    document.body.classList.remove('modal-open');
  }

  showToast(message) {
    const toast = this.root.querySelector('#toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2500);
  }

  
  




  



  async askModel(question, focused) {
    const readings = this.getCrewMetricRows(focused)
      .map(r => `${r.name}: ${r.value} (${r.severity})`).join('; ');
    const system = `You are AURA, a friendly health assistant in a space crew demo app.
Crew member in focus: ${focused.name} (${focused.role}). Readings: ${readings}.
Answer in 1-3 short sentences using only these readings. You are not a doctor and must not diagnose.`;
    const history = this.chatMessages.slice(-6).map(m => ({ role: m.role, content: m.text }));
    const res = await fetch('/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'system', content: system }, ...history, { role: 'user', content: question }],
        max_tokens: 200
      })
    });
    if (!res.ok) throw new Error('AI server error');
    return (await res.json()).choices[0].message.content.trim();
  }









  


    async askAssistant(prompt) {
    const question = String(prompt || '').trim();
    if (!question || this.aiBusy) return;
    const q = question.toLowerCase();
    const focused = this.getFocusedCrew();
    const alerts = this.getAlerts();
    let answer;

    // Rule-based answer (used as fallback if the AI server is off)
    if (/summar|health|how am i|overall|status/.test(q)) {
      if (focused.id !== 'elena-voss') {
        const readings = focused.readings.map(([label, value]) => `${label}: ${value}`).join('; ');
        answer = `${focused.name} is the selected crew member. ${focused.status === 'normal' ? 'This synthetic profile has no demo review flags.' : 'This synthetic profile is marked for review by its example rules.'} Latest snapshot: ${readings}. This is not a medical assessment.`;
      } else {
        const okay = this.state.metrics.length - alerts.length;
        answer = alerts.length
          ? `${okay} of ${this.state.metrics.length} tracked metrics are within their configured demo ranges. Items marked for review: ${alerts.map(item => `${item.metric.name} (${formatMetricValue(item.metric)} ${item.metric.unit || ''}; ${item.label})`.trim()).join('; ')}. This is a rule-based summary, not a medical assessment.`
          : `All ${this.state.metrics.length} tracked metrics are currently within their configured demo ranges. This is a rule-based summary, not a medical assessment.`;
      }
    } else if (/alert|review|flag|critical|warning/.test(q)) {
      if (focused.id !== 'elena-voss') {
        answer = focused.status === 'normal'
          ? `${focused.name}'s synthetic profile has no current demo review flags.`
          : `${focused.name}'s synthetic profile is marked for review. The sample snapshot is: ${focused.readings.map(([label, value]) => `${label}: ${value}`).join('; ')}.`;
      } else {
        answer = alerts.length
          ? `The current demo rules flag ${alerts.length} item${alerts.length === 1 ? '' : 's'}: ${alerts.map(item => `${item.metric.name} — ${item.label}`).join('; ')}. Open the relevant metric card to review the recorded value and its configured example threshold.`
          : 'No metric currently crosses a configured demo threshold.';
      }
    } else {
      const match = this.state.metrics.find(metric => q.includes(metric.name.toLowerCase()) || (metric.id === 'heart-rate' && q.includes('pulse')) || (metric.id === 'blood-sugar' && q.includes('glucose')));
      if (focused.id !== 'elena-voss') {
        const reading = focused.readings.find(([label]) => match && (label.toLowerCase().includes(match.name.toLowerCase()) || (match.id === 'heart-rate' && label.toLowerCase().includes('heart rate')) || (match.id === 'blood-sugar' && label.toLowerCase().includes('glucose'))));
        answer = reading
          ? `${focused.name}'s ${reading[0].toLowerCase()} sample is ${reading[1]}. This is synthetic demo data, not a clinical interpretation.`
          : `${focused.name} is selected in Crew Support. I can summarize this profile's displayed sample readings or list its demo review status.`;
      } else {
        answer = match
          ? `${match.name} is recorded at ${formatMetricValue(match)} ${match.unit || ''}. Its current demo status is ${evaluateMetric(match).severity === 'normal' ? 'within configured ranges' : 'marked for review'} (${evaluateMetric(match).label}). I can summarize saved readings, but I cannot interpret them clinically.`
           : `I’m focused on ${focused.name}. I can summarize the readings stored in this browser and list demo-threshold flags. Try asking for a health summary, current alerts, heart rate, blood pressure, sleep, or mood.`;
      }
    }

    // Show the user's message right away and clear the input
    this.appendChatMessage('user', question);
    const input = this.root.querySelector('#assistant-chat-input');
    if (input) input.value = '';

    // Placeholder while the model is thinking
    this.aiBusy = true;
    this.appendChatMessage('assistant', 'Thinking…');
    const bubbles = this.root.querySelectorAll('#assistant-chat-messages .chat-message--assistant p');
    const thinking = bubbles[bubbles.length - 1];

    // Ask the local AI model, fall back to the rule-based answer on error
    try {
      answer = await this.askModel(question, focused);
    } catch (err) {
      console.warn('AI server unavailable, using rule-based answer.', err);
    }
    this.aiBusy = false;

    if (thinking) thinking.textContent = answer;

    // Save the conversation and update AURA's expression
    this.chatMessages.push({ role: 'user', text: question }, { role: 'assistant', text: answer });
    this.chatMessages = this.chatMessages.slice(-100);
    this.state.chatMessages = this.chatMessages;
    this.expression = focused.id !== 'elena-voss'
      ? (focused.status === 'normal' ? 'neutral' : 'frown')
      : alerts.some(item => item.severity === 'critical') ? 'alert' : alerts.length ? 'frown' : 'neutral';
    this.persist();
    this.updateAssistantExpression();

    const messages = this.root.querySelector('#assistant-chat-messages');
    if (messages) messages.scrollTo({ top: messages.scrollHeight, behavior: 'smooth' });
    this.root.querySelector('#assistant-chat-input')?.focus();
  }



  
  appendChatMessage(role, text) {
    const messages = this.root.querySelector('#assistant-chat-messages');
    if (!messages) return;
    const item = document.createElement('div');
    item.className = `chat-message chat-message--${role} chat-message--enter`;
    const label = document.createElement('span');
    label.textContent = role === 'user' ? 'YOU' : 'AURA';
    const paragraph = document.createElement('p');
    paragraph.textContent = text;
    item.append(label, paragraph);
    messages.append(item);
    messages.scrollTo({ top: messages.scrollHeight, behavior: 'smooth' });
  }

  updateAssistantExpression() {
      const stage = this.root.querySelector('.assistant-stage');
      const preview = this.root.querySelector('.assistant-custom-preview');

      const expressionImages = {
          neutral: './assets/ai_neutral.png',
          smile: './assets/ai_smile.png',
          frown: './assets/ai_frown.png',
          alert: './assets/ai_alert.png'
      };

      if (stage) {
          stage.className =
              `assistant-stage assistant-stage--${this.expression}`;
      }

      if (preview) {
          preview.src =
              expressionImages[this.expression] || expressionImages.neutral;

          preview.alt = `AURA ${this.expression} expression`;
      }
  }

  runTerminalCommand(rawCommand) {
    const command = String(rawCommand || '').trim();
    if (!command) return;
    const lower = command.toLowerCase();
    const lines = [`operator@orbit:~$ ${command}`];
    if (lower === 'help') {
      lines.push('Available commands:', '  help     show this command list', '  status   show local app diagnostics', '  metrics  list tracked metric names and values', '  alerts   list configured demo-threshold flags', '  clear    clear terminal output', '  whoami   show the current local operator');
    } else if (lower === 'status') {
      lines.push(`App: Orbit Health 1.5.0`, `View: ${this.view}`, `Theme: dark`, `Metrics: ${this.state.metrics.length}`, `Activity entries: ${this.state.log.length}`, `AURA messages: ${this.chatMessages.length}`, `Focused crew member: ${this.getFocusedCrew().name}`, 'Storage: browser localStorage');
    } else if (lower === 'metrics') {
      this.state.metrics.forEach(metric => lines.push(`- ${metric.name}: ${formatMetricValue(metric)} ${metric.unit || ''}`.trim()));
    } else if (lower === 'alerts') {
      const alerts = this.getAlerts();
      if (!alerts.length) lines.push('No metric currently crosses a configured demo threshold.');
      alerts.forEach(alert => lines.push(`- ${alert.metric.name}: ${alert.severity.toUpperCase()} / ${alert.label}`));
    } else if (lower === 'whoami') {
      lines.push('local operator / debug access gate passed');
    } else if (lower === 'clear') {
      this.terminalLines = [];
      this.updateTerminalOutput();
      return;
    } else if (lower === 'factory reset') {
      lines.push('Factory reset is available through the maintenance button at the right.');
    } else {
      lines.push(`Command not found: ${command}. Type "help" for available commands.`);
    }
    this.terminalLines.push(...lines);
    this.terminalLines = this.terminalLines.slice(-150);
    this.updateTerminalOutput();
  }

  updateTerminalOutput() {
    const output = this.root.querySelector('#terminal-output');
    if (!output) return;
    output.innerHTML = this.terminalLines.map(line => `<div class="terminal-line">${escapeHTML(line)}</div>`).join('');
    output.scrollTop = output.scrollHeight;
  }

  factoryReset() {
    if (!window.confirm('Factory reset Orbit Health? This clears local readings, custom metrics, history, chat, and preferences.')) return;
    localStorage.removeItem(STORAGE_KEY);
    this.state = loadState(DEFAULT_METRICS);
    this.chatMessages = [];
    this.expression = 'neutral';
    this.chatExpanded = false;
    document.body.classList.remove('assistant-open');
    this.sidebarCollapsed = true;
    this.debugSession = false;
    this.terminalLines = [];
    this.crewSummaryIndex = 0;
    this.crewSummaryIndexTouched = false;
    this.view = 'overview';
    this.render();
    this.showToast('Factory reset complete. Demo data restored.');
  }

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
    const shell = this.root.querySelector('.app-shell');
    const button = this.root.querySelector('[data-action="toggle-sidebar"]');
    if (!shell || !button) return;
    shell.classList.toggle('sidebar-collapsed', this.sidebarCollapsed);
    const label = this.sidebarCollapsed ? 'Expand' : 'Collapse';
    button.setAttribute('aria-label', `${label} sidebar`);
    button.setAttribute('aria-expanded', String(!this.sidebarCollapsed));
    button.title = `${label} sidebar`;
    button.innerHTML = icon(this.sidebarCollapsed ? 'panelLeftOpen' : 'panelLeftClose', 17);
  }

  toggleAssistantExpand() {
    this.chatExpanded = !this.chatExpanded;
    document.body.classList.toggle('assistant-open', this.chatExpanded);
    const panel = this.root.querySelector('.assistant-panel');
    const backdrop = this.root.querySelector('.assistant-expand-backdrop');
    const button = this.root.querySelector('[data-action="toggle-assistant-expand"]');
    if (!panel || !button) {
      this.render();
      return;
    }
    panel.classList.toggle('assistant-panel--expanded', this.chatExpanded);
    if (backdrop) backdrop.hidden = !this.chatExpanded;
    panel.setAttribute('role', this.chatExpanded ? 'dialog' : 'region');
    panel.setAttribute('aria-modal', String(this.chatExpanded));
    const label = this.chatExpanded ? 'Collapse assistant chat' : 'Expand assistant chat';
    button.setAttribute('aria-label', label);
    button.setAttribute('aria-expanded', String(this.chatExpanded));
    button.title = label;
    button.innerHTML = icon(this.chatExpanded ? 'shrink' : 'expand', 16);
    if (this.chatExpanded) {
      const messages = this.root.querySelector('#assistant-chat-messages');
      if (messages) messages.scrollTop = messages.scrollHeight;
      this.root.querySelector('#assistant-chat-input')?.focus();
    } else {
      button.focus();
    }
  }

  stepNumber(button) {
    const wrapper = button.closest('.number-control');
    const input = wrapper?.querySelector('input[type="number"]');
    if (!input || input.disabled) return;
    const step = input.step && input.step !== 'any' ? Number(input.step) : 1;
    const current = input.value === '' ? 0 : Number(input.value);
    let next = current + (Number(button.dataset.step) || 1) * step;
    if (input.min !== '') next = Math.max(Number(input.min), next);
    if (input.max !== '') next = Math.min(Number(input.max), next);
    const decimals = String(step).includes('.') ? String(step).split('.')[1].length : 0;
    input.value = Number(next.toFixed(decimals));
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  handleMetricDragStart(event) {
    const card = event.target.closest('.metric-card[draggable="true"]');
    if (!card || event.target.closest('button')) { event.preventDefault(); return; }
    this.draggedMetricId = card.dataset.metricId;
    card.classList.add('is-dragging');
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', this.draggedMetricId);
    }
  }

  handleMetricDragOver(event) {
    const target = event.target.closest('.metric-card[draggable="true"]');
    if (!target || !this.draggedMetricId || target.dataset.metricId === this.draggedMetricId) return;
    event.preventDefault();
    this.root.querySelectorAll('.metric-card.is-drop-target').forEach(card => card.classList.remove('is-drop-target'));
    target.classList.add('is-drop-target');
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  }

  handleMetricDrop(event) {
    const target = event.target.closest('.metric-card[draggable="true"]');

    if (!target || !this.draggedMetricId) return;

    event.preventDefault();

    const orderedMetrics = this.getMetricsInDisplayOrder();

    const from = orderedMetrics.findIndex(
        metric => metric.id === this.draggedMetricId
    );

    const to = orderedMetrics.findIndex(
        metric => metric.id === target.dataset.metricId
    );

    if (from >= 0 && to >= 0 && from !== to) {
        const [moved] = orderedMetrics.splice(from, 1);
        orderedMetrics.splice(to, 0, moved);

        this.state.metrics = orderedMetrics;

        const grid = this.root.querySelector('.metrics-grid');

        if (grid) {
            const cards = new Map(
                [...grid.querySelectorAll('.metric-card')]
                    .map(card => [card.dataset.metricId, card])
            );

            this.getMetricsInDisplayOrder().forEach(metric => {
                const card = cards.get(metric.id);
                if (card) grid.appendChild(card);
            });
        }

        this.persist();
        this.showToast('Metric order saved.');
    }

    this.clearMetricDragState();
  }

  clearMetricDragState() {
    this.draggedMetricId = null;
    this.root.querySelectorAll('.metric-card.is-dragging, .metric-card.is-drop-target').forEach(card => card.classList.remove('is-dragging', 'is-drop-target'));
  }

  handleClick(event) {
    const profileMenu = this.root.querySelector('.profile-menu');
    if (profileMenu && !event.target.closest('.profile-menu')) profileMenu.querySelector('.profile-popover').hidden = true;
    if (event.target.closest('.metric-drag-handle')) return;
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const action = button.dataset.action;
    if (action === 'toggle-sidebar') this.toggleSidebar();
    if (action === 'toggle-profile-menu') { const menu = this.root.querySelector('.profile-popover'); if (menu) { menu.hidden = !menu.hidden; button.setAttribute('aria-expanded', String(!menu.hidden)); } }
    if (action === 'set-profile-avatar') { this.state.profileAvatar = button.dataset.avatar || '👩🏻‍🚀'; this.persist(); this.updateProfileAvatarView(); const menu = this.root.querySelector('.profile-popover'); if (menu) menu.hidden = true; }
    if (action === 'toggle-assistant-expand') this.toggleAssistantExpand();
    if (action === 'assistant-expand-backdrop') this.toggleAssistantExpand();
    if (action === 'step-number') this.stepNumber(button);
    if (action === 'navigate') {
      if (this.view === 'debug' && button.dataset.view !== 'debug') this.debugSession = false;
      this.view = button.dataset.view;
      if (this.view === 'crew') { const selectedIndex = this.getCrewSnapshot().findIndex(member => member.id === this.state.selectedCrewId); if (selectedIndex >= 0) this.crewSummaryIndex = selectedIndex; this.crewSummaryIndexTouched = false; }
      this.render();
    }
    if (action === 'open-debug') this.openDebugGate();
    if (action === 'close-debug-gate') this.closeModal();
    if (action === 'crew-nav') {
      const total = this.getCrewSnapshot().length;
      this.crewSummaryIndex = (this.crewSummaryIndex + Number(button.dataset.step) + total) % total;
      this.crewSummaryIndexTouched = true;
      this.render();
    }
    if (action === 'select-crew-page') {
      const index = this.getCrewSnapshot().findIndex(member => member.id === button.dataset.id);
      if (index >= 0) { this.crewSummaryIndex = index; this.crewSummaryIndexTouched = true; this.render(); }
    }
    if (action === 'focus-crew') {
      this.state.selectedCrewId = button.dataset.id;
      const focused = this.getFocusedCrew();
      this.expression = focused.id !== 'elena-voss'
        ? (focused.status === 'normal' ? 'neutral' : 'frown')
        : this.getAlerts().some(item => item.severity === 'critical') ? 'alert' : this.getAlerts().length ? 'frown' : 'neutral';
      this.persist();
      this.view = 'overview';
      this.debugSession = false;
      this.render();
      this.showToast(`${this.getFocusedCrew().name} is now the Crew Support focus.`);
    }
    if (action === 'view-metric') this.openMetricDetails(button.dataset.id);
    if (action === 'add-metric') this.openModal();
    if (action === 'edit') {
      const metric = this.state.metrics.find(m => m.id === button.dataset.id);
      if (metric) this.openModal(metric);
    }
    if (action === 'close-modal') this.closeModal();
    if (action === 'backdrop-close' && event.target === button) this.closeModal();
    if (action === 'delete-metric') this.deleteMetric(button.dataset.id);
    if (action === 'ask-assistant') this.askAssistant(button.dataset.prompt);
    if (action === 'terminal-clear') {
      this.terminalLines = [];
      this.updateTerminalOutput();
    }
    if (action === 'factory-reset') this.factoryReset();
  }

  handleChange(event) {
    if (event.target.id === 'avatar-upload') { this.handleAvatarUpload(event.target.files?.[0]); return; }
    if (event.target.name === 'direction') {
      const threshold = this.root.querySelector('[name="threshold"]');
      if (threshold) {
        threshold.disabled = event.target.value === 'none';
        threshold.required = event.target.value !== 'none';
        threshold.closest('.number-control')?.querySelectorAll('button').forEach(button => { button.disabled = threshold.disabled; });
      }
    }
  }

  handleAvatarUpload(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) return this.showToast('Choose an image file for your avatar.');
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const size = 256;
        const scale = Math.min(1, size / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext('2d');
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        this.state.profileAvatar = canvas.toDataURL('image/jpeg', .82);
        this.persist();
        this.updateProfileAvatarView();
        const popover = this.root.querySelector('.profile-popover');
        if (popover) popover.hidden = true;
        this.showToast('Avatar updated and saved locally.');
      };
      image.onerror = () => this.showToast('That image could not be loaded.');
      image.src = String(reader.result);
    };
    reader.onerror = () => this.showToast('The avatar image could not be read.');
    reader.readAsDataURL(file);
  }

  handleInput(event) {
    if (event.target.name === 'direction') this.handleChange(event);
  }

  handleSubmit(event) {
    const chatForm = event.target.closest('#assistant-chat-form');
    if (chatForm) {
      event.preventDefault();
      const input = chatForm.elements.message;
      this.askAssistant(input.value);
      return;
    }
    const passwordForm = event.target.closest('#debug-password-form');
    if (passwordForm) {
      event.preventDefault();
      const password = String(new FormData(passwordForm).get('password') || '');
      const error = passwordForm.querySelector('#debug-gate-error');
      if (password === 'obunga') {
        this.debugSession = true;
        this.view = 'debug';
        this.closeModal();
        this.terminalLines = ['ORBIT HEALTH / LOCAL DIAGNOSTICS', 'Debug session opened. Type "help" to list available commands.'];
        this.render();
      } else if (error) {
        error.textContent = 'Incorrect password. Try again.';
        passwordForm.elements.password.value = '';
        passwordForm.elements.password.focus();
      }
      return;
    }
    const terminalForm = event.target.closest('#terminal-form');
    if (terminalForm) {
      event.preventDefault();
      const input = terminalForm.elements.command;
      this.runTerminalCommand(input.value);
      input.value = '';
      input.focus();
      return;
    }
    const form = event.target.closest('#metric-form');
    if (!form) return;
    event.preventDefault();
    const data = new FormData(form);
    if (form.dataset.mode === 'add') this.addMetric(data);
    else this.updateMetric(form.dataset.id, data);
  }

  addMetric(data) {
    const name = String(data.get('name') || '').trim();
    const unit = String(data.get('unit') || '').trim();
    const value = Number(data.get('value'));
    const lowerRaw = String(data.get('lowerLimit') || '').trim();
    const upperRaw = String(data.get('upperLimit') || '').trim();
    const lowerLimit = lowerRaw === '' ? null : Number(lowerRaw);
    const upperLimit = upperRaw === '' ? null : Number(upperRaw);
    if (!name || !Number.isFinite(value) || (lowerRaw && !Number.isFinite(lowerLimit)) || (upperRaw && !Number.isFinite(upperLimit)) || (lowerLimit !== null && upperLimit !== null && lowerLimit >= upperLimit)) {
      this.showToast('Enter a name, a valid reading, and limits where the lower limit is below the upper limit.');
      return;
    }
    const id = `custom-${Date.now()}`;
    const thresholds = [];
    if (lowerLimit !== null) thresholds.push({ field: 'value', operator: 'lt', value: lowerLimit, severity: 'warning', label: 'Below lower demo limit' });
    if (upperLimit !== null) thresholds.push({ field: 'value', operator: 'gt', value: upperLimit, severity: 'warning', label: 'Above upper demo limit' });
    const metric = {
      id, name, unit, value, kind: 'number', category: String(data.get('category') || 'Other'),
      icon: 'activity', color: 'blue', subtitle: 'Custom metric', updated: 'Just now', trend: [value],
      thresholds, isCustom: true
    };
    this.state.metrics.push(metric);
    this.state.chatMessages = this.chatMessages;
    this.state.log.push(createLogEntry(metric, '—', `${value}${unit ? ` ${unit}` : ''}`, 'Metric added'));
    this.persist();
    this.closeModal();
    this.view = 'overview';
    this.render();
    this.showToast(`${name} added to the dashboard.`);
  }

  updateMetric(id, data) {
    const metric = this.state.metrics.find(m => m.id === id);
    if (!metric) return;
    const previous = formatMetricValue(metric);
    let nextValue;
    if (metric.kind === 'blood-pressure') {
      const systolic = Number(data.get('systolic'));
      const diastolic = Number(data.get('diastolic'));
      if (!Number.isFinite(systolic) || !Number.isFinite(diastolic)) return this.showToast('Enter valid blood pressure values.');
      nextValue = { systolic, diastolic };
    } else if (metric.kind === 'mood') {
      nextValue = String(data.get('value') || 'Steady');
    } else {
      nextValue = Number(data.get('value'));
      if (!Number.isFinite(nextValue)) return this.showToast('Enter a valid numeric reading.');
    }
    metric.value = nextValue;
    metric.trend = [...(metric.trend || []).slice(-6), metric.kind === 'blood-pressure' ? nextValue.systolic : metric.kind === 'mood' ? ({ Great: 4, Steady: 3, Low: 2, Strained: 1 }[nextValue] || 3) : Number(nextValue)];
    metric.updated = 'Just now';
    this.state.chatMessages = this.chatMessages;
    this.state.log.push(createLogEntry(metric, previous, formatMetricValue(metric)));
    this.persist();
    this.closeModal();
    this.render();
    this.showToast(`${metric.name} updated.`);
  }

  deleteMetric(id) {
    const index = this.state.metrics.findIndex(m => m.id === id && m.isCustom);
    if (index < 0) return;
    const [removed] = this.state.metrics.splice(index, 1);
    this.state.log.push(createLogEntry(removed, formatMetricValue(removed), '—', 'Metric removed'));
    this.persist();
    this.closeModal();
    this.render();
    this.showToast(`${removed.name} removed.`);
  }
}
