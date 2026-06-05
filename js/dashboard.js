/* ============================================
   Dashboard Module
   ============================================ */

function renderDashboard() {
  document.getElementById('pageTitle').textContent = 'Dashboard';
  const content = document.getElementById('content');

  const allCases = getCases();
  const due = getDueReminders();
  const upcoming = getUpcomingReminders(7);
  const contacts = getContacts();

  // Category stats
  const cats = ['sales','claims','servicing','recruitment','onboarding','snapwill','others'];
  let totalActive = 0, totalKiv = 0, totalDone = 0;
  cats.forEach(cat => {
    const s = getCategoryStats(cat);
    totalActive += s.active;
    totalKiv += s.kivCount;
    totalDone += s.completed;
  });

  const priorityCases = allCases.filter(c => c.priority && !c.kiv).slice(0, 5);
  const followUpCases = allCases.filter(c => c.followUp && !c.kiv).slice(0, 5);

  content.innerHTML = `
    <!-- Top Stats -->
    <div class="stats-grid mb-24">
      <div class="stat-card" onclick="navigateTo('crm')">
        <div class="stat-icon" style="background:#E8F0FE">👥</div>
        <div class="stat-num" style="color:var(--blue)">${contacts.length}</div>
        <div class="stat-label">Total Contacts</div>
        <div class="stat-sub">In CRM</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:#FFF3E0">⚡</div>
        <div class="stat-num" style="color:var(--orange)">${totalActive}</div>
        <div class="stat-label">Active Cases</div>
        <div class="stat-sub">Across all categories</div>
      </div>
      <div class="stat-card" onclick="navigateTo('reminders')">
        <div class="stat-icon" style="background:${due.length > 0 ? 'var(--red-light)' : 'var(--green-light)'}">🔔</div>
        <div class="stat-num" style="color:${due.length > 0 ? 'var(--red)' : 'var(--green)'}">${due.length}</div>
        <div class="stat-label">Due Reminders</div>
        <div class="stat-sub">${upcoming.length} upcoming this week</div>
      </div>
      <div class="stat-card" onclick="navigateTo('kiv')">
        <div class="stat-icon" style="background:var(--yellow-light)">📌</div>
        <div class="stat-num" style="color:#B8860B">${totalKiv}</div>
        <div class="stat-label">KIV Listing</div>
        <div class="stat-sub">Keep in view</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:var(--green-light)">✅</div>
        <div class="stat-num" style="color:var(--green)">${totalDone}</div>
        <div class="stat-label">Completed</div>
        <div class="stat-sub">All time</div>
      </div>
    </div>

    <!-- Category Cards -->
    <div class="section-header">
      <div class="section-title">Categories Overview</div>
    </div>
    <div class="overview-grid mb-24">
      ${cats.map(cat => renderCategoryCard(cat)).join('')}
    </div>

    <!-- Two columns: Reminders + Priority -->
    <div class="grid-2 mb-24">
      <div>
        <div class="section-header">
          <div class="section-title">⏰ Due Reminders <small>${due.length}</small></div>
          <button class="btn btn-secondary btn-sm" onclick="navigateTo('reminders')">View All</button>
        </div>
        ${due.length === 0
          ? '<div class="card"><div class="card-body"><div class="empty-state" style="padding:30px 0"><div class="empty-state-icon">🎉</div><div class="empty-state-title">All clear!</div><div class="empty-state-sub">No due reminders</div></div></div></div>'
          : due.slice(0, 5).map(r => renderReminderItem(r)).join('')
        }
      </div>
      <div>
        <div class="section-header">
          <div class="section-title">⭐ Priority Cases <small>${priorityCases.length}</small></div>
          <button class="btn btn-secondary btn-sm" onclick="navigateTo('followup')">Follow-Up</button>
        </div>
        ${priorityCases.length === 0
          ? '<div class="card"><div class="card-body"><div class="empty-state" style="padding:30px 0"><div class="empty-state-icon">⭐</div><div class="empty-state-title">No priority cases</div></div></div></div>'
          : `<div class="case-list">${priorityCases.map(c => renderCaseRow(c, 'openCaseById')).join('')}</div>`
        }
      </div>
    </div>

    <!-- Recent Activity -->
    <div class="section-header">
      <div class="section-title">🕐 Recent Activity</div>
    </div>
    <div class="card">
      <div class="card-body" style="padding:0">
        ${allCases.length === 0
          ? '<div class="empty-state" style="padding:40px"><div class="empty-state-icon">📂</div><div class="empty-state-title">No cases yet</div><div class="empty-state-sub">Start by adding a case in any category</div></div>'
          : `<table class="compact-table">
              <thead><tr><th>Name</th><th>Category</th><th>Status</th><th>Updated</th></tr></thead>
              <tbody>
                ${[...allCases].sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0,10).map(c => `
                  <tr onclick="openCaseById('${c.id}')">
                    <td><div style="font-weight:600">${escHtml(c.contactName)}</div></td>
                    <td><span class="label-badge">${catMeta(c.category).label}</span></td>
                    <td><span class="status-badge ${statusClass(c.category, c.currentStatus)}">${escHtml(getStatusLabel(c.category, c.currentStatus))}</span></td>
                    <td class="text-muted text-sm">${formatDate(c.updatedAt)}</td>
                  </tr>`).join('')}
              </tbody>
            </table>`
        }
      </div>
    </div>
  `;
}

function renderCategoryCard(cat) {
  const meta = catMeta(cat);
  const stats = getCategoryStats(cat);
  const progress = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
  return `
    <div class="category-card" onclick="navigateTo('${cat}')">
      <div class="category-card-header">
        <div class="category-icon" style="background:${meta.bg}">${meta.icon}</div>
        <div>
          <div class="category-card-title">${meta.label}</div>
          <div class="category-card-sub">${stats.total} total cases</div>
        </div>
      </div>
      <div class="category-stats mb-12">
        <div class="cat-stat">
          <div class="cat-stat-num" style="color:var(--orange)">${stats.active}</div>
          <div class="cat-stat-label">Active</div>
        </div>
        <div class="cat-stat">
          <div class="cat-stat-num" style="color:var(--green)">${stats.completed}</div>
          <div class="cat-stat-label">Done</div>
        </div>
        <div class="cat-stat">
          <div class="cat-stat-num" style="color:#B8860B">${stats.kivCount}</div>
          <div class="cat-stat-label">KIV</div>
        </div>
        ${stats.dueReminders > 0 ? `<div class="cat-stat"><div class="cat-stat-num" style="color:var(--red)">${stats.dueReminders}</div><div class="cat-stat-label">⚠ Due</div></div>` : ''}
      </div>
      <div class="progress-bar-wrap">
        <div class="progress-bar-fill" style="width:${progress}%;background:${meta.color}"></div>
      </div>
      <div class="text-xs text-muted mt-8">${progress}% completion rate</div>
    </div>`;
}

/* ============================================
   Team Dashboard
   ============================================ */

function renderTeamDashboard() {
  document.getElementById('pageTitle').textContent = 'Team Dashboard';
  const content = document.getElementById('content');

  const users    = getLocalUsers();
  const allCases = getCases();
  const allCont  = getContacts();
  const allDue   = getDueReminders();

  // Role hierarchy for display
  const roleOrder = ['admin', 'dm', 'um', 'agent'];
  const roleLabel = { admin: 'Admin', dm: 'District Manager', um: 'Unit Manager', agent: 'Agent' };
  const roleColor = { admin: 'var(--red)', dm: 'var(--purple)', um: 'var(--blue)', agent: 'var(--green)' };

  // Helper: stats for a specific user email
  function agentStats(email) {
    const cases    = allCases.filter(c => c.ownerEmail === email);
    const contacts = allCont.filter(c => c.ownerEmail === email);
    const due      = allDue.filter(r => r.ownerEmail === email);
    const cats = ['sales','claims','servicing','recruitment','onboarding'];
    const active    = cases.filter(c => !c.kiv && c.currentStatus < 99).length;
    const completed = cases.filter(c => {
      const def = getStatusDef(c.category);
      return c.currentStatus === (def ? def.length : 8);
    }).length;
    const kiv = cases.filter(c => c.kiv).length;
    const catBreakdown = cats.map(cat => {
      const cc = cases.filter(c => c.category === cat);
      return { cat, count: cc.length };
    });
    return { cases, contacts, due, active, completed, kiv, catBreakdown, total: cases.length };
  }

  // Pipeline chart data (all agents combined, sales funnel)
  const salesDef = getStatusDef('sales');
  const salesCases = allCases.filter(c => c.category === 'sales' && !c.kiv);
  const pipelineData = salesDef ? salesDef.map((step, i) => ({
    label: step.label,
    count: salesCases.filter(c => c.completedSteps && c.completedSteps.includes(step.n)).length
  })) : [];
  const maxPipeline = Math.max(...pipelineData.map(d => d.count), 1);

  // Category distribution bar chart (all users)
  const catMetas = ['sales','claims','servicing','recruitment','onboarding'].map(cat => {
    const m = catMeta(cat);
    const count = allCases.filter(c => c.category === cat).length;
    return { cat, label: m.label, icon: m.icon, color: m.color, count };
  });
  const maxCat = Math.max(...catMetas.map(d => d.count), 1);

  // Conversion rate
  const totalSales = allCases.filter(c => c.category === 'sales').length;
  const closedSales = allCases.filter(c => {
    if (c.category !== 'sales') return false;
    const def = getStatusDef('sales');
    return def && c.completedSteps && c.completedSteps.includes(def.find(s => s.label.toLowerCase().includes('clos'))?.n);
  }).length;
  const convRate = totalSales > 0 ? Math.round((closedSales / totalSales) * 100) : 0;

  content.innerHTML = `
    <!-- Team Summary Stats -->
    <div class="stats-grid mb-24">
      <div class="stat-card">
        <div class="stat-icon" style="background:#EDE7F6">👥</div>
        <div class="stat-num" style="color:var(--purple)">${users.length}</div>
        <div class="stat-label">Team Members</div>
        <div class="stat-sub">${users.filter(u => u.role === 'agent').length} agents</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:#FFF3E0">📁</div>
        <div class="stat-num" style="color:var(--orange)">${allCases.filter(c=>!c.kiv).length}</div>
        <div class="stat-label">Active Cases</div>
        <div class="stat-sub">Team-wide</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:var(--green-light)">🏆</div>
        <div class="stat-num" style="color:var(--green)">${allCases.filter(c=>{const d=getStatusDef(c.category);return d&&c.currentStatus===(d.length||8);}).length}</div>
        <div class="stat-label">Completed</div>
        <div class="stat-sub">All categories</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:#E8F0FE">📞</div>
        <div class="stat-num" style="color:var(--blue)">${allCont.length}</div>
        <div class="stat-label">Total Contacts</div>
        <div class="stat-sub">Team CRM</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:${allDue.length>0?'var(--red-light)':'var(--green-light)'}">⚠️</div>
        <div class="stat-num" style="color:${allDue.length>0?'var(--red)':'var(--green)'}">${allDue.length}</div>
        <div class="stat-label">Due Reminders</div>
        <div class="stat-sub">Team-wide</div>
      </div>
    </div>

    <!-- Charts Row -->
    <div class="grid-2 mb-24">
      <!-- Pipeline Chart -->
      <div class="card">
        <div class="card-body">
          <div class="section-title mb-16">📊 Sales Pipeline</div>
          ${pipelineData.length === 0
            ? `<div class="empty-state" style="padding:30px 0"><div class="empty-state-icon">📊</div><div class="empty-state-title">No sales cases yet</div></div>`
            : `<div class="team-chart-bars">
                ${pipelineData.map(d => `
                  <div class="team-chart-row">
                    <div class="team-chart-label">${escHtml(d.label)}</div>
                    <div class="team-chart-bar-wrap">
                      <div class="team-chart-bar" style="width:${Math.round((d.count/maxPipeline)*100)}%;background:var(--blue)"></div>
                    </div>
                    <div class="team-chart-val">${d.count}</div>
                  </div>`).join('')}
              </div>`
          }
        </div>
      </div>

      <!-- Category Distribution -->
      <div class="card">
        <div class="card-body">
          <div class="section-title mb-16">📂 Cases by Category</div>
          <div class="team-chart-bars">
            ${catMetas.map(d => `
              <div class="team-chart-row">
                <div class="team-chart-label">${d.icon} ${d.label}</div>
                <div class="team-chart-bar-wrap">
                  <div class="team-chart-bar" style="width:${Math.round((d.count/maxCat)*100)}%;background:${d.color}"></div>
                </div>
                <div class="team-chart-val">${d.count}</div>
              </div>`).join('')}
          </div>
          <div style="margin-top:16px;padding-top:12px;border-top:1px solid var(--border);display:flex;gap:24px">
            <div>
              <div style="font-size:11px;color:var(--text-secondary)">Sales Conversion</div>
              <div style="font-size:22px;font-weight:700;color:${convRate>=50?'var(--green)':'var(--orange)'}">
                ${convRate}%
              </div>
            </div>
            <div>
              <div style="font-size:11px;color:var(--text-secondary)">Closed / Total Sales</div>
              <div style="font-size:22px;font-weight:700;color:var(--blue)">${closedSales} / ${totalSales}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Hierarchy Tree + Per-Agent Stats -->
    <div class="section-header mb-16">
      <div class="section-title">🏢 Team Hierarchy</div>
    </div>
    ${roleOrder.map(role => {
      const roleUsers = users.filter(u => u.role === role);
      if (roleUsers.length === 0) return '';
      return `
        <div class="team-role-group mb-24">
          <div class="team-role-header" style="border-left:4px solid ${roleColor[role]}">
            <span style="color:${roleColor[role]};font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:1px">${roleLabel[role]}</span>
            <span class="text-muted text-sm">${roleUsers.length} member${roleUsers.length>1?'s':''}</span>
          </div>
          <div class="team-agent-grid">
            ${roleUsers.map(u => {
              const s = agentStats(u.email || '');
              const initials = (u.name || u.username).split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
              return `
                <div class="team-agent-card">
                  <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
                    <div class="team-avatar" style="background:${roleColor[role]}">${escHtml(initials)}</div>
                    <div>
                      <div style="font-weight:700;font-size:14px">${escHtml(u.name || u.username)}</div>
                      <div style="font-size:11px;color:var(--text-secondary)">${escHtml(u.email || '—')}</div>
                    </div>
                    ${s.due.length > 0 ? `<span style="margin-left:auto;background:var(--red);color:#fff;border-radius:10px;padding:2px 8px;font-size:11px;font-weight:700">⚠ ${s.due.length} due</span>` : ''}
                  </div>
                  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:14px">
                    <div class="team-mini-stat"><div style="font-size:18px;font-weight:700;color:var(--orange)">${s.active}</div><div style="font-size:10px;color:var(--text-secondary)">Active</div></div>
                    <div class="team-mini-stat"><div style="font-size:18px;font-weight:700;color:var(--green)">${s.completed}</div><div style="font-size:10px;color:var(--text-secondary)">Done</div></div>
                    <div class="team-mini-stat"><div style="font-size:18px;font-weight:700;color:#B8860B">${s.kiv}</div><div style="font-size:10px;color:var(--text-secondary)">KIV</div></div>
                    <div class="team-mini-stat"><div style="font-size:18px;font-weight:700;color:var(--blue)">${s.contacts.length}</div><div style="font-size:10px;color:var(--text-secondary)">Contacts</div></div>
                  </div>
                  <div style="display:flex;flex-wrap:wrap;gap:4px">
                    ${s.catBreakdown.filter(cb=>cb.count>0).map(cb => {
                      const m = catMeta(cb.cat);
                      return `<span style="background:${m.bg||'#eee'};color:${m.color||'#333'};border-radius:10px;padding:2px 8px;font-size:11px">${m.icon} ${m.label} ${cb.count}</span>`;
                    }).join('') || '<span style="font-size:12px;color:var(--text-secondary)">No cases yet</span>'}
                  </div>
                </div>`;
            }).join('')}
          </div>
        </div>`;
    }).join('')}
  `;
}

function renderReminderItem(r) {
  const days = daysUntil(r.date);
  let cls = 'upcoming', dotCls = 'upcoming';
  if (days < 0) { cls = 'overdue'; dotCls = 'overdue'; }
  else if (days === 0) { cls = 'today'; dotCls = 'today'; }
  const meta = r.category ? catMeta(r.category) : { icon: '🔔' };
  return `
    <div class="reminder-item ${cls}" onclick="${r.caseId ? `openCaseById('${r.caseId}')` : ''}">
      <div class="reminder-dot ${dotCls}"></div>
      <div class="reminder-body">
        <div class="reminder-title">${escHtml(r.title)}</div>
        <div class="reminder-meta">${escHtml(r.contactName || '')} ${r.category ? `• ${catMeta(r.category).label}` : ''}</div>
      </div>
      <div>
        <div class="reminder-date" style="color:${days < 0 ? 'var(--red)' : days === 0 ? 'var(--orange)' : 'var(--blue)'}">${relativeDate(r.date)}</div>
        <button class="btn btn-secondary btn-sm" style="margin-top:4px" onclick="event.stopPropagation();dismissReminder('${r.id}');renderCurrentPage()">Done</button>
      </div>
    </div>`;
}
