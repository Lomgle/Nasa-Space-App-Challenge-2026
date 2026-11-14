import { escapeHTML, icon } from '../lib/ui.js';

function avatarMarkup(value, fallback = '🚀') {
  const avatar = value || fallback;
  return typeof avatar === 'string' && avatar.startsWith('data:image/')
    ? `<img src="${escapeHTML(avatar)}" alt="" />`
    : `<span>${escapeHTML(avatar)}</span>`;
}

export function crewCommsPage({ messages, crew, profileAvatar }) {
  const sorted = [...messages];
  const members = crew.map(member => `<div class="comms-member"><span class="comms-member-avatar">${avatarMarkup(member.id === 'elena-voss' ? profileAvatar : member.avatar, member.initials)}</span><span><b>${escapeHTML(member.name)}</b><small>${member.connectivity === 'offline' ? 'OFFLINE' : member.connectivity === 'weak' ? 'WEAK SIGNAL' : 'CONNECTED'}</small></span><i class="comms-member-dot comms-member-dot--${member.connectivity === 'offline' ? 'offline' : member.connectivity === 'weak' ? 'weak' : 'online'}"></i></div>`).join('');
  const chat = sorted.length ? sorted.map(message => {
    const own = message.senderId === 'elena-voss';
    return `<article class="crew-comms-message ${own ? 'crew-comms-message--own' : ''}">
      <span class="crew-comms-message-avatar">${avatarMarkup(own ? profileAvatar : message.avatar, message.senderInitials)}</span>
      <div class="crew-comms-message-body"><div class="crew-comms-message-meta"><b>${escapeHTML(message.senderName || 'Crew member')}</b><time>${escapeHTML(message.time || '')}</time></div><p>${escapeHTML(message.text)}</p></div>
    </article>`;
  }).join('') : '<div class="comms-empty">No messages yet. Start the crew conversation.</div>';
  return `
    <section class="page-header comms-page-header"><div><div class="eyebrow">EXPEDITION 07 <span>·</span> INTERNAL CHANNEL</div><h1>Crew comms</h1><p class="page-subtitle">One shared channel for the crew · messages saved on this device</p></div><span class="comms-channel-tag">${icon('users', 15)} CREW / GENERAL</span></section>
    <section class="crew-comms-layout">
      <aside class="crew-comms-roster panel"><div class="comms-roster-heading"><div class="eyebrow">CHANNEL MEMBERS</div><b>${crew.length} CREW MEMBERS</b></div>${members}</aside>
      <section class="crew-comms-panel panel" aria-label="Shared crew group chat">
        <div class="crew-comms-panel-heading"><div><div class="eyebrow">SHARED GROUP CHAT</div><h2>Mission channel</h2></div><span class="comms-encryption-label">LOCAL / MOCK CHANNEL</span></div>
        <div class="crew-comms-messages" id="crew-comms-messages" aria-live="polite">${chat}</div>
        <form class="crew-comms-compose" id="crew-chat-form"><label class="sr-only" for="crew-chat-input">Message the crew</label><input id="crew-chat-input" name="message" maxlength="500" autocomplete="off" placeholder="Message the crew…" required/><button type="submit" aria-label="Send to crew">${icon('arrow', 17)}</button></form>
      </section>
    </section>`;
}
