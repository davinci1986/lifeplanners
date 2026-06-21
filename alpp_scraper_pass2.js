/**
 * ALPP Policy Scraper — PASS 2 (93 traditional/non-ILP policies)
 * ==============================================================
 * Run this in Chrome DevTools Console while logged into ALPP
 * and viewing ANY policy detail page.
 *
 * Steps:
 *   1. Login to https://www.alpp.aia.com.my
 *   2. MY SERVICING → Policy Status Enquiry → A3719 → Submit → click any policy
 *   3. F12 → Console → paste this whole script → Enter
 *   4. File auto-downloads as alpp_enriched_pass2_YYYY-MM-DD.json when done
 *   5. Import into CRM via 🔄 ALPP Enrich
 */

(async function ALPP_SCRAPER_PASS2() {

  const POLICIES = [
  {policyNo:"7005332A04",owner:"AHMED MARZUQI BIN MOHAMED ALI",insured:"AHMED MARZUQI BIN MOHAMED ALI"},
  {policyNo:"7535986A10",owner:"ANGALLAMAY A/P R N RUTHNAM",insured:"ANGALLAMAY A/P R N RUTHNAM"},
  {policyNo:"5523205A06",owner:"CHEAH AI LING",insured:"CHEAH AI LING"},
  {policyNo:"4200336A05",owner:"CHIONG YU LIAN",insured:"TESA TEW XING LIN"},
  {policyNo:"1087608A10",owner:"CHUA LAY SEE",insured:"ELVIN TAN KAI LUN"},
  {policyNo:"5351468A02",owner:"CHUM YING",insured:"CHUM YING"},
  {policyNo:"0740117J09",owner:"CHUNG CHIEW WHA",insured:"CHUNG CHIEW WHA"},
  {policyNo:"7763082A10",owner:"CHIRAVONG A/L NE CHIN",insured:"CHIRAVONG A/L NE CHIN"},
  {policyNo:"4113349A02",owner:"CYNTHIA A/P ALBART",insured:"CYNTHIA A/P ALBART"},
  {policyNo:"7164156A00",owner:"DARSHAN A/L GANESAN",insured:"DARSHAN A/L GANESAN"},
  {policyNo:"7211229A05",owner:"DENNIS A/L MATTHEWS",insured:"DENNIS A/L MATTHEWS"},
  {policyNo:"7260012A00",owner:"DIVAGARAN A/L LINGGAM",insured:"DIVAGARAN A/L LINGGAM"},
  {policyNo:"0040108J02",owner:"DIVYA A/P SUCHU",insured:"DIVYA A/P SUCHU"},
  {policyNo:"5224270A04",owner:"ENG LAY BENG",insured:"ENG LAY BENG"},
  {policyNo:"0825306J10",owner:"FARIDAH MARSHALL",insured:"FARIDAH MARSHALL"},
  {policyNo:"7157497A10",owner:"FOO YING TONG",insured:"FOO YING TONG"},
  {policyNo:"5159628A08",owner:"GOH KOON WEI",insured:"GOH KOON WEI"},
  {policyNo:"5975603A03",owner:"HANG KOK CHUAN",insured:"HANG KOK CHUAN"},
  {policyNo:"7660069A06",owner:"HANG KOK PING",insured:"HANG KOK PING"},
  {policyNo:"0777546J05",owner:"HOR GAIK LAN",insured:"TANG SZE MUN"},
  {policyNo:"0447763J01",owner:"HARVINDER SINGH A/L SARJIT SINGH",insured:"HARVINDER SINGH A/L SARJIT SINGH"},
  {policyNo:"7666795A01",owner:"IK CHU YAU",insured:"IK CHU YAU"},
  {policyNo:"5963789A00",owner:"JIMMIE POH LEET SIN",insured:"JIMMIE POH LEET SIN"},
  {policyNo:"7467043A05",owner:"JASON SELVARAJ A/L ERONIMOS",insured:"SIIDDATH SELVARAJ A/L JASON SELVARAJ"},
  {policyNo:"7309902A00",owner:"JASON SELVARAJ A/L ERONIMOS",insured:"YAVEENA HANNAH A/P JASON SELVARAJ"},
  {policyNo:"0830405J09",owner:"JAYASEELAN S/O NARAYANASAMY",insured:"JAYASEELAN S/O NARAYANASAMY"},
  {policyNo:"7040393A01",owner:"KHOO SHIH TING",insured:"KHOO SHIH TING"},
  {policyNo:"5439373A04",owner:"KHOR WEI SENG",insured:"KHOR WEI SENG"},
  {policyNo:"5584083A08",owner:"KHOW YEN MEI",insured:"CHEAH YANZEN"},
  {policyNo:"0830297J10",owner:"KOH WOON SER",insured:"KOH WOON SER"},
  {policyNo:"5548394A01",owner:"KOOY BOON KEAT",insured:"KOOY BOON KEAT"},
  {policyNo:"4601511A04",owner:"KARAMJEET SINGH A/L BALDEV SINGH",insured:"KARAMJEET SINGH A/L BALDEV SINGH"},
  {policyNo:"4601677A01",owner:"KARAMJEET SINGH A/L BALDEV SINGH",insured:"GURDAS SINGH A/L KARAMJEET SINGH"},
  {policyNo:"7130837A04",owner:"KARAMJEET SINGH A/L BALDEV SINGH",insured:"GURDAS SINGH A/L KARAMJEET SINGH"},
  {policyNo:"4281236A03",owner:"KARBAGAM A/P MUNIANDY",insured:"KARBAGAM A/P MUNIANDY"},
  {policyNo:"7177732A09",owner:"KOMALDEEP KAUR A/P UDHAM SINGH",insured:"KOMALDEEP KAUR A/P UDHAM SINGH"},
  {policyNo:"7786102A05",owner:"KOMALDEEP KAUR A/P UDHAM SINGH",insured:"HARSIMMAR KAUR"},
  {policyNo:"0858145J01",owner:"LAU KAH CHUN",insured:"LAU KAH CHUN"},
  {policyNo:"0858183J02",owner:"LAU KAH CHUN",insured:"LAU WAN YEE"},
  {policyNo:"0858174J03",owner:"LAU KAH CHUN",insured:"LAU KAH CHUN"},
  {policyNo:"5238666A05",owner:"LAW KAI BIN",insured:"LAW KAI BIN"},
  {policyNo:"5238669A07",owner:"LAW NIAN QI",insured:"LAW NIAN QI"},
  {policyNo:"0311022J04",owner:"LAW NIAN QI",insured:"LAW NIAN QI"},
  {policyNo:"7869871A05",owner:"LAW PEY KIAT",insured:"LAW PEY KIAT"},
  {policyNo:"5707446A07",owner:"LEE BEE YONG",insured:"LEE BEE YONG"},
  {policyNo:"7017293A07",owner:"LEE KOK CHOON",insured:"LEE KOK CHOON"},
  {policyNo:"0856819A07",owner:"LEM CHAI KUAN",insured:"LEM CHAI KUAN"},
  {policyNo:"5349205A04",owner:"LEONG QIAN XIN",insured:"LEONG QIAN XIN"},
  {policyNo:"7815056A09",owner:"LEONG QIAN XIN",insured:"LEONG QIAN XIN"},
  {policyNo:"0204925J07",owner:"LEONG QIAN XIN",insured:"LEONG QIAN XIN"},
  {policyNo:"5223991A08",owner:"LEONG QIAN YING",insured:"LEONG QIAN YING"},
  {policyNo:"5910083A07",owner:"LEONG QIAN YING",insured:"LEONG QIAN YING"},
  {policyNo:"7035116A00",owner:"LEOW BOON PING",insured:"LEOW BOON PING"},
  {policyNo:"5976947A09",owner:"LI BOON HOU",insured:"LI BOON HOU"},
  {policyNo:"5614439A04",owner:"LIM CHIEU PHEAK",insured:"LIM CHIEU PHEAK"},
  {policyNo:"0091646A10",owner:"LIM ENG HOCK",insured:"LIM ENG HOCK"},
  {policyNo:"0091645A02",owner:"LIM ENG HOCK",insured:"LIM ENG HOCK"},
  {policyNo:"0091648A04",owner:"LIM ENG HOCK",insured:"LIM ENG HOCK"},
  {policyNo:"5386503A07",owner:"LIM HONG KANE",insured:"LIM HONG KANE"},
  {policyNo:"0712949A00",owner:"LIM MEI CHUIN",insured:"LIM MEI CHUIN"},
  {policyNo:"0942686A05",owner:"LIM SOO CHING",insured:"LIM SOO CHING"},
  {policyNo:"5617194A03",owner:"LIM WOEY HEONG",insured:"LIM WOEY HEONG"},
  {policyNo:"5610769A01",owner:"LOH SHENG WEI",insured:"LOH SHENG WEI"},
  {policyNo:"5610770A02",owner:"LOH SHENG WEI",insured:"LOH SHENG WEI"},
  {policyNo:"0766344J01",owner:"LEHWIKS RAJ A/L GUNASELAN THANGARAJ",insured:"LEHWIKS RAJ A/L GUNASELAN THANGARAJ"},
  {policyNo:"5610771A10",owner:"NG HUI SHEN",insured:"NG HUI SHEN"},
  {policyNo:"0382979J06",owner:"NG HUI SHEN",insured:"NG HUI SHEN"},
  {policyNo:"0382901J03",owner:"NG HUI SHEN",insured:"NG HUI SHEN"},
  {policyNo:"0383375J09",owner:"NG HUI SHEN",insured:"NG HUI SHEN"},
  {policyNo:"7533688A09",owner:"NG HUI SHEN",insured:"NG HUI SHEN"},
  {policyNo:"7510093A05",owner:"NG WENG SOON",insured:"NG WENG SOON"},
  {policyNo:"0152720J00",owner:"NGAN JUN HAO",insured:"NGAN JUN HAO"},
  {policyNo:"0351215A01",owner:"NGO CHING OOI",insured:"NGO CHING OOI"},
  {policyNo:"0527277A07",owner:"NGO KIAH NEE",insured:"NGO KIAH NEE"},
  {policyNo:"0739914J08",owner:"NOR AZWANI BINTI HUSIN",insured:"NOR AZWANI BINTI HUSIN"},
  {policyNo:"7037614A02",owner:"NORHAZLINDA BINTI CHIK MAT",insured:"NORHAZLINDA BINTI CHIK MAT"},
  {policyNo:"7580111A00",owner:"NUR FATIN ATIQAH BINTI MOHAMAD NASIR",insured:"NUR FATIN ATIQAH BINTI MOHAMAD NASIR"},
  {policyNo:"0652295J05",owner:"NUR ILLIANI BINTI MOHD HAZAM",insured:"NUR ILLIANI BINTI MOHD HAZAM"},
  {policyNo:"5389443A00",owner:"NURLIZA BINTI ZAINUL ABIDIN",insured:"NURLIZA BINTI ZAINUL ABIDIN"},
  {policyNo:"0668157A06",owner:"NYO MOOY CHIANG",insured:"NYO MOOY CHIANG"},
  {policyNo:"7207345A08",owner:"NARESH GIRI A/L PARAMA GIRI",insured:"NARESH GIRI A/L PARAMA GIRI"},
  {policyNo:"7763370A05",owner:"NAREUMOL A/P CHIRAVONG",insured:"NAREUMOL A/P CHIRAVONG"},
  {policyNo:"7763385A08",owner:"NITCHKAMON A/P CHIRAVONG",insured:"NITCHKAMON A/P CHIRAVONG"},
  {policyNo:"5460399A00",owner:"OOI AI LEE",insured:"OOI AI LEE"},
  {policyNo:"0904825A05",owner:"OOI AI NEE",insured:"OOI AI NEE"},
  {policyNo:"5975265A04",owner:"OOI HAU SENG",insured:"OOI HAU SENG"},
  {policyNo:"0203492J08",owner:"OOI JOO LOONG",insured:"OOI JOO LOONG"},
  {policyNo:"5600003A08",owner:"PANG CHEW YEN",insured:"PANG CHEW YEN"},
  {policyNo:"5691179A09",owner:"PANG CHEW YEN",insured:"PANG CHEW YEN"},
  {policyNo:"0694844J02",owner:"PATRICIA TAN GAIK LYNN",insured:"PATRICIA TAN GAIK LYNN"},
  {policyNo:"0090497J07",owner:"PATRICIA TAN GAIK LYNN",insured:"PATRICIA TAN GAIK LYNN"},
  {policyNo:"7102070A03",owner:"PAVITRA AP MADIALAGAN",insured:"PAVITRA AP MADIALAGAN"},
  {policyNo:"7101886A02",owner:"PHILOMENA A/P SINNAPPAN",insured:"PHILOMENA A/P SINNAPPAN"}
];

  const STORAGE_KEY = 'alpp_scrape_pass2';
  const TIMEOUT_MS  = 30000;  // 30s — longer for slow traditional pages
  const SETTLE_MS   = 1500;   // settle after page loads

  let state = (() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch(e) { return null; }
  })();

  if (!state) {
    state = { results: [], doneSet: [] };
    console.log('%c[ALPP Pass2] Fresh start — 93 policies', 'color:cyan;font-weight:bold');
  } else {
    console.log(`%c[ALPP Pass2] Resuming — ${state.results.length} already done`, 'color:orange;font-weight:bold');
  }

  const doneSet = new Set(state.doneSet);
  const delay = ms => new Promise(r => setTimeout(r, ms));

  function getFormInput() {
    return document.querySelector('#ContentPlaceHolder1_txtPolNo')
        || document.querySelector('input[id*="txtPolNo"]')
        || document.querySelector('input[name*="PolNo"]');
  }
  function getSearchBtn() {
    return document.querySelector('input[value="Search"]')
        || document.querySelector('button[id*="btnSearch"]')
        || document.querySelector('input[id*="btnSearch"]');
  }
  function contentSnapshot() {
    const area = document.querySelector('#ContentPlaceHolder1_UpdatePanel1')
               || document.querySelector('[id*="UpdatePanel"]')
               || document.body;
    return area.textContent.substring(0, 800);
  }
  async function waitForUpdate(oldSnap) {
    const start = Date.now();
    while (Date.now() - start < TIMEOUT_MS) {
      await delay(700);
      if (contentSnapshot() !== oldSnap) return true;
    }
    return false;
  }

  function extractFields() {
    const txt = document.body.innerText;
    function grab(patterns) {
      for (const p of patterns) {
        const m = txt.match(p);
        if (m && m[1] && m[1].trim()) return m[1].trim();
      }
      return '';
    }
    function elText(sel) {
      const el = document.querySelector(sel);
      return el ? el.textContent.replace(/\s+/g,' ').trim() : '';
    }

    // Raw label→value from tables
    const raw = {};
    document.querySelectorAll('table tr').forEach(row => {
      const cells = [...row.querySelectorAll('td')];
      if (cells.length >= 2) {
        const lbl = cells[0].textContent.replace(/\s+/g,' ').trim().replace(/:$/,'');
        const val = cells.slice(1).map(c=>c.textContent.replace(/\s+/g,' ').trim()).join(' ').trim();
        if (lbl && val && lbl.length < 80) raw[lbl] = val;
      }
    });

    const phone = grab([
      /Mobile\s*(?:Phone|No\.?)?\s*[:\-]?\s*([\d\s\-+]{7,20})/i,
      /Tel\.?\s*(?:\(H\))?\s*[:\-]?\s*([\d\s\-+]{7,20})/i,
      /Telephone\s*[:\-]?\s*([\d\s\-+]{7,20})/i,
      /Contact\s*No\.?\s*[:\-]?\s*([\d\s\-+]{7,20})/i,
    ]).replace(/\s+/g,'').trim();

    const email = grab([
      /E[-\s]?mail\s*[:\-]?\s*([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/i,
    ]).toLowerCase();

    const nric = grab([
      /(?:New\s+)?NRIC\s*No\.?\s*[:\-]?\s*([\dA-Z\-]{9,16})/i,
      /(?:I\/C|IC)\s*No\.?\s*[:\-]?\s*([\dA-Z\-]{9,16})/i,
      /Identity\s*(?:Card\s*)?No\.?\s*[:\-]?\s*([\dA-Z\-]{9,16})/i,
      /Passport\s*No\.?\s*[:\-]?\s*([\dA-Z\-]{6,16})/i,
    ]).replace(/\s/g,'');

    const dob = grab([
      /(?:Date\s+of\s+Birth|D\.O\.B\.?|DOB)\s*[:\-]?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i,
      /(?:Date\s+of\s+Birth|D\.O\.B\.?|DOB)\s*[:\-]?\s*(\d{1,2}\s+\w+\s+\d{4})/i,
    ]);

    const gender = grab([
      /\bGender\s*[:\-]?\s*(Male|Female)/i,
      /\bSex\s*[:\-]?\s*(Male|Female)/i,
    ]);

    const nationality = grab([
      /Nationality\s*[:\-]?\s*([^\n\r:]{2,40}?)(?:\s*\n|\s{2,}|$)/i,
    ]);

    const occupation = grab([
      /Occupation\s*[:\-]?\s*([^\n\r]{2,60}?)(?:\s*\n|\s{2,}|$)/i,
    ]);

    const employer = grab([
      /Name\s+[Oo]f\s+Employer\s*[:\-]?\s*([^\n\r]{2,80}?)(?:\s*\n|\s{2,}|$)/i,
      /Employer(?:'s)?\s*(?:Name)?\s*[:\-]?\s*([^\n\r]{2,80}?)(?:\s*\n|\s{2,}|$)/i,
    ]);

    // Also try named elements
    const nameFromPage =
      elText('[id*="lblPOName"],[id*="OwnerName"],[id*="PolicyOwner"],[id*="ClientName"],[id*="PolicyHolderName"]')
      || grab([/Policy\s*(?:Owner|Holder)\s*[:\-]?\s*([A-Z][A-Z\s\/\.\'\-]{3,60})/]);

    return { nameFromPage, phone, email, nric, dob, gender, nationality, occupation, employer, raw };
  }

  function normDOB(s) {
    if (!s) return '';
    const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    return s;
  }
  function normNRIC(s) {
    if (!s) return '';
    const d = s.replace(/[^0-9]/g,'');
    if (d.length === 12) return `${d.slice(0,6)}-${d.slice(6,8)}-${d.slice(8)}`;
    return s;
  }
  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ results: state.results, doneSet: [...doneSet] })); } catch(e) {}
  }
  function download() {
    const date = new Date().toISOString().slice(0,10);
    const blob = new Blob([JSON.stringify(state.results, null, 2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `alpp_enriched_pass2_${date}.json`;
    a.click();
  }

  const remaining = POLICIES.filter(p => !doneSet.has(p.policyNo));
  console.log(`[ALPP Pass2] ${remaining.length} policies to process`);
  if (remaining.length === 0) { download(); return; }

  let processed = 0;
  for (const pol of remaining) {
    const input = getFormInput();
    const btn   = getSearchBtn();
    if (!input || !btn) {
      console.warn('[ALPP Pass2] ⚠️ Search form not found! Navigate to a policy detail page first.');
      break;
    }

    console.log(`[Pass2] [${processed+1}/${remaining.length}] ${pol.policyNo} — ${pol.owner}`);
    const snap = contentSnapshot();

    // Fill & submit
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
    if (nativeSetter?.set) {
      nativeSetter.set.call(input, pol.policyNo);
      input.dispatchEvent(new Event('input', {bubbles:true}));
      input.dispatchEvent(new Event('change', {bubbles:true}));
    } else {
      input.value = pol.policyNo;
    }
    btn.click();

    const updated = await waitForUpdate(snap);
    await delay(updated ? SETTLE_MS : 2000);

    const f = extractFields();
    const hasData = f.phone || f.email || f.nric || f.dob;
    const result = {
      policyNo:    pol.policyNo,
      owner:       pol.owner,
      insured:     pol.insured,
      nameFromPage: f.nameFromPage,
      phone:       f.phone,
      email:       f.email,
      nric:        normNRIC(f.nric),
      dob:         normDOB(f.dob),
      gender:      f.gender,
      nationality: f.nationality,
      occupation:  f.occupation,
      employer:    f.employer,
      scrapedAt:   new Date().toISOString(),
    };

    console.log(`  → ${hasData ? '✅' : '⚠️ no data'} | phone:${result.phone||'-'} | nric:${result.nric||'-'}`);

    state.results.push(result);
    doneSet.add(pol.policyNo);
    saveState();
    processed++;

    // Checkpoint every 20
    if (processed % 20 === 0) {
      console.log('%c[Pass2] Checkpoint download...', 'color:yellow');
      download();
    }
  }

  console.log('%c[ALPP Pass2] ✅ DONE!', 'color:lime;font-size:16px;font-weight:bold');
  download();
  localStorage.removeItem(STORAGE_KEY);

})();
