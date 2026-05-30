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
