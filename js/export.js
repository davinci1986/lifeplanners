/* ============================================
   Excel Export — SheetJS
   Exports Contacts, Cases, History, Reminders,
   AI Solution, and a Summary sheet
   ============================================ */

function exportToExcel() {
  if (typeof XLSX === 'undefined') {
    showToast('Excel library not loaded yet — please wait and try again.', 'error');
    return;
  }
  playClick();
  showToast('Preparing Excel export...', 'info', 4000);

  try {
    const wb = XLSX.utils.book_new();
    wb.Props = { Title: 'LifePlanner Pro Export', Author: 'LifePlanner Pro', CreatedDate: new Date() };

    _addSummarySheet(wb);
    _addContactsSheet(wb);
    _addCasesSheet(wb);
    _addHistorySheet(wb);
    _addRemindersSheet(wb);
    _addAISolutionSheet(wb);

    const date = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `LifePlanner_Export_${date}.xlsx`);

    showToast('✅ Excel exported successfully!', 'success');
    playSuccess();
  } catch (e) {
    console.warn('Export error:', e);
    showToast('Export failed: ' + e.message, 'error');
  }
}

/* ─── helpers ──────────────────────────────── */

function _ws(data, cols) {
  const ws = XLSX.utils.aoa_to_sheet(data);
  // Column widths
  ws['!cols'] = cols.map(w => ({ wch: w }));
  // Style header row (bold) — SheetJS Community doesn't support cell styles,
  // but we freeze the header row for readability
  ws['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft' };
  return ws;
}

function _fDate(iso) {
  if (!iso) return '';
  try { return new Date(iso).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return iso; }
}

function _fDateTime(iso) {
  if (!iso) return '';
  try { return new Date(iso).toLocaleString('en-MY', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return iso; }
}

function _age(dob) {
  if (!dob) return '';
  const a = ageFromDOB(dob);
  return a !== null ? a : '';
}

function _ins(val) {
  if (!val) return '';
  if (Array.isArray(val)) return val.filter(Boolean).join(', ');
  return val;
}

/* ─── Sheet 1: Summary ──────────────────────── */
function _addSummarySheet(wb) {
  const contacts = getContacts();
  const cases = getCases();
  const reminders = getReminders().filter(r => !r.done);
  const dueRem = getDueReminders();

  const rows = [
    ['LifePlanner Pro — Data Export'],
    ['Generated', _fDateTime(new Date().toISOString())],
    [],
    ['── CONTACTS ──'],
    ['Total Contacts', contacts.length],
    ['With Phone', contacts.filter(c => c.phone).length],
    ['With DOB / Age tracked', contacts.filter(c => c.dob).length],
    [],
    ['── CASES ──'],
    ['Total Cases', cases.length],
    ['Sales', cases.filter(c => c.category === 'sales').length],
    ['Claims', cases.filter(c => c.category === 'claims').length],
    ['Servicing', cases.filter(c => c.category === 'servicing').length],
    ['Recruitment', cases.filter(c => c.category === 'recruitment').length],
    ['Onboarding', cases.filter(c => c.category === 'onboarding').length],
    ['Snapwill', cases.filter(c => c.category === 'snapwill').length],
    ['AI Solution', cases.filter(c => c.category === 'aisolution').length],
    ['Others', cases.filter(c => c.category === 'others').length],
    ['Priority Cases', cases.filter(c => c.priority).length],
    ['KIV Cases', cases.filter(c => c.kiv).length],
    [],
    ['── REMINDERS ──'],
    ['Pending Reminders', reminders.length],
    ['Overdue / Due Today', dueRem.length],
    [],
    ['── NOTES ──'],
    ['Sheets included:', ''],
    ['1. Summary (this sheet)'],
    ['2. Contacts — all contact info + extended CRM fields'],
    ['3. Cases — all cases with current status + progress'],
    ['4. Activity History — full status history timeline'],
    ['5. Reminders — all pending reminders'],
    ['6. AI Solution — custom step checklist cases'],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 30 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, ws, '📊 Summary');
}

/* ─── Sheet 2: Contacts ─────────────────────── */
function _addContactsSheet(wb) {
  const header = [
    'Name', 'Phone', 'Email', 'NRIC', 'Date of Birth', 'Age',
    'Gender', 'Race', 'Religion', 'Language Preference',
    'Stay Area', 'State',
    'Marital Status', 'Dependants',
    'Occupation', 'Job Type', 'Monthly Income',
    'Existing Insurance', 'Referral Source', 'Social Media',
    'Tags', 'Notes',
    'Total Cases', 'Categories Active',
    'Added Date'
  ];
  const cols = [22,15,26,16,14,5, 8,10,14,18, 16,14, 14,10, 20,20,16, 28,20,18, 24,28, 12,22, 14];

  const rows = [header];
  getContacts().forEach(c => {
    const cases = getCasesForContact(c.id);
    const cats = [...new Set(cases.map(x => catMeta(x.category).label))].join(', ');
    rows.push([
      c.name || '',
      c.phone || '',
      c.email || '',
      c.nric || '',
      _fDate(c.dob),
      _age(c.dob),
      c.gender || '',
      c.race || '',
      c.religion || '',
      c.langPref || '',
      c.stayArea || '',
      c.state || '',
      c.maritalStatus || '',
      c.dependants || '',
      c.occupation || '',
      c.jobType || '',
      c.income || '',
      _ins(c.existingInsurance),
      c.referralSource || '',
      c.socialMedia || '',
      (c.tags || []).join(', '),
      c.notes || '',
      cases.length,
      cats,
      _fDate(c.createdAt)
    ]);
  });

  XLSX.utils.book_append_sheet(wb, _ws(rows, cols), '👥 Contacts');
}

/* ─── Sheet 3: Cases ────────────────────────── */
function _addCasesSheet(wb) {
  const header = [
    'Contact Name', 'Phone',
    'Category', 'Label', 'Sub-Label',
    'Current Status No.', 'Current Status Label',
    'Steps Completed', 'Total Steps',
    'Progress %',
    'Priority', 'KIV',
    'Snapwill Types',
    'Remarks',
    'Created Date', 'Last Updated'
  ];
  const cols = [22,14, 14,14,10, 16,26, 14,10, 10, 8,6, 30, 32, 14,14];

  const rows = [header];
  getCases().forEach(c => {
    const contact = getContact(c.contactId);
    const phone = contact?.phone || '';
    const defs = getStatusDef(c.category);
    const totalSteps = c.category === 'aisolution' ? (c.aiSteps||[]).length : defs.length;
    const completedCount = c.category === 'aisolution'
      ? (c.aiSteps||[]).filter(s => s.done).length
      : (c.completedSteps||[]).length;
    const pct = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) + '%' : '—';
    const statusLabel = c.category === 'aisolution' ? 'Custom Steps' : getStatusLabel(c.category, c.currentStatus, c);
    const swTypes = Array.isArray(c.snapwillTypes) ? c.snapwillTypes.join(', ') : '';

    rows.push([
      c.contactName || '',
      phone,
      catMeta(c.category).label,
      c.label || '',
      c.subLabel || '',
      c.category === 'aisolution' ? '' : (c.currentStatus || ''),
      statusLabel,
      completedCount,
      totalSteps,
      pct,
      c.priority ? 'Yes' : '',
      c.kiv ? 'Yes' : '',
      swTypes,
      c.remarks || '',
      _fDate(c.createdAt),
      _fDate(c.updatedAt)
    ]);
  });

  XLSX.utils.book_append_sheet(wb, _ws(rows, cols), '📁 Cases');
}

/* ─── Sheet 4: Activity History ─────────────── */
function _addHistorySheet(wb) {
  const header = [
    'Date & Time', 'Contact Name', 'Phone',
    'Category', 'Label',
    'From Step', 'From Step Label',
    'To Step', 'To Step Label',
    'Remark'
  ];
  const cols = [18,22,14, 14,14, 8,22, 8,22, 40];

  const rows = [header];
  // Collect all history entries across all cases, sorted by date descending
  const entries = [];
  getCases().forEach(c => {
    const contact = getContact(c.contactId);
    const phone = contact?.phone || '';
    (c.statusHistory || []).forEach(h => {
      entries.push({
        date: h.date,
        contactName: c.contactName || '',
        phone,
        category: catMeta(c.category).label,
        label: c.label || c.subLabel || '',
        fromStatus: h.fromStatus,
        fromLabel: h.fromStatus > 0 ? getStatusLabel(c.category, h.fromStatus, c) : '—',
        toStatus: h.toStatus,
        toLabel: h.toStatus > 0 ? getStatusLabel(c.category, h.toStatus, c) : 'Unchecked',
        remark: h.remark || ''
      });
    });
    // AI Solution steps
    if (c.category === 'aisolution') {
      (c.aiSteps || []).filter(s => s.done && s.date).forEach(s => {
        entries.push({
          date: s.date,
          contactName: c.contactName || '',
          phone,
          category: 'AI Solution',
          label: c.label || '',
          fromStatus: '',
          fromLabel: '',
          toStatus: s.n,
          toLabel: s.label,
          remark: s.remark || ''
        });
      });
    }
  });

  entries.sort((a, b) => new Date(b.date) - new Date(a.date));
  entries.forEach(e => {
    rows.push([
      _fDateTime(e.date),
      e.contactName,
      e.phone,
      e.category,
      e.label,
      e.fromStatus,
      e.fromLabel,
      e.toStatus,
      e.toLabel,
      e.remark
    ]);
  });

  XLSX.utils.book_append_sheet(wb, _ws(rows, cols), '📋 Activity History');
}

/* ─── Sheet 5: Reminders ────────────────────── */
function _addRemindersSheet(wb) {
  const header = [
    'Title', 'Contact Name', 'Category',
    'Date', 'Time', 'Status',
    'Overdue By', 'Created'
  ];
  const cols = [36,22,14, 14,8,10, 12,14];

  const rows = [header];
  const today = new Date().toISOString().split('T')[0];

  getReminders()
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    .forEach(r => {
      const overdue = !r.done && r.date < today ? Math.abs(Math.round((new Date(today) - new Date(r.date)) / 86400000)) + ' days' : '';
      rows.push([
        r.title || '',
        r.contactName || '',
        r.category ? catMeta(r.category).label : '',
        _fDate(r.date),
        r.time || '',
        r.done ? '✅ Done' : (r.date < today ? '⚠ Overdue' : '🔔 Pending'),
        overdue,
        _fDate(r.createdAt)
      ]);
    });

  XLSX.utils.book_append_sheet(wb, _ws(rows, cols), '🔔 Reminders');
}

/* ─── Sheet 6: AI Solution ──────────────────── */
function _addAISolutionSheet(wb) {
  const header = [
    'Contact Name', 'Phone', 'Label',
    'Step No.', 'Step Name',
    'Done', 'Date Completed', 'Remark',
    'Case Created'
  ];
  const cols = [22,14,16, 8,28, 6,14,32, 14];

  const rows = [header];
  getCases('aisolution').forEach(c => {
    const contact = getContact(c.contactId);
    const phone = contact?.phone || '';
    const steps = c.aiSteps || [];
    if (steps.length === 0) {
      rows.push([c.contactName||'', phone, c.label||'', '', '(No steps defined)', '', '', '', _fDate(c.createdAt)]);
    } else {
      steps.forEach(s => {
        rows.push([
          c.contactName || '',
          phone,
          c.label || '',
          s.n,
          s.label || '',
          s.done ? '✅' : '⬜',
          s.done ? _fDate(s.date) : '',
          s.remark || '',
          _fDate(c.createdAt)
        ]);
      });
    }
  });

  XLSX.utils.book_append_sheet(wb, _ws(rows, cols), '🤖 AI Solution');
}
