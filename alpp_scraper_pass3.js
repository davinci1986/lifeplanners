/**
 * ALPP Policy Scraper — PASS 3 (Plan Details: name, premium, sum assured, status)
 * =================================================================================
 * Captures AIA plan details for all policies — to populate contact's aiaPolicies[] in CRM.
 *
 * Steps:
 *   1. Login to https://www.alpp.aia.com.my
 *   2. MY SERVICING → Policy Status Enquiry → A3719 → Submit → click any policy
 *   3. F12 → Console → paste this whole script → Enter
 *   4. File auto-downloads as alpp_pass3_plans_YYYY-MM-DD.json when done
 *   5. Import into CRM via 🔄 ALPP Enrich (auto-detected as Pass 3 data)
 *
 * Resumable: if tab reloads mid-run, paste again — picks up from where it left off.
 *
 * Output format per policy:
 *   { policyNo, owner, insured, planName, sumAssured, annualPremium,
 *     policyStatus, commencedDate, nextDueDate, scrapedAt }
 */

(async function ALPP_PASS3() {

  /* ── 1. COMBINED POLICY LIST (Pass 1 ILP + Pass 2 Traditional, deduplicated) ── */
  const POLICIES_RAW = [
  // ─── Pass 1: ILP (200 policies) ───
  {policyNo:"5477282A03",owner:"ABDUL UBAIDILLAH BIN AB RAHMAN",insured:"ABDUL UBAIDILLAH BIN AB RAHMAN"},
  {policyNo:"7831450A06",owner:"ADRIAN LIM WEI LOON",insured:"ADRIAN LIM WEI LOON"},
  {policyNo:"7005332A04",owner:"AHMED MARZUQI BIN MOHAMED ALI",insured:"AHMED MARZUQI BIN MOHAMED ALI"},
  {policyNo:"0652370J01",owner:"AHMED MARZUQI BIN MOHAMED ALI",insured:"AHMAD MIFZAL BIN AHMED MARZUQI"},
  {policyNo:"0652350J09",owner:"AHMED MARZUQI BIN MOHAMED ALI",insured:"AHMAD MIRZA BIN AHMED MARZUQI"},
  {policyNo:"5720996A01",owner:"ARRON OOI TEONG GHEE",insured:"ARRON OOI TEONG GHEE"},
  {policyNo:"0634338J06",owner:"A JAYANDARAN A/L ARUMUGAM",insured:"PAVITHIRAAN A/L A JAYANDARAN"},
  {policyNo:"0634321J09",owner:"A JAYANDARAN A/L ARUMUGAM",insured:"DHARMINI A/P A JAYANDARAN"},
  {policyNo:"7535986A10",owner:"ANGALLAMAY A/P R N RUTHNAM",insured:"ANGALLAMAY A/P R N RUTHNAM"},
  {policyNo:"7292722A05",owner:"BAHARINSHAH BIN HUSSAIN",insured:"BAHARINSHAH BIN HUSSAIN"},
  {policyNo:"7535962A08",owner:"BARANI A/L KARUNA KARAN",insured:"BARANI A/L KARUNA KARAN"},
  {policyNo:"0379033J06",owner:"BARANI A/L KARUNA KARAN",insured:"BARANI A/L KARUNA KARAN"},
  {policyNo:"4601616A06",owner:"BHAJNEET KAUR A/P KARAMJEET SINGH",insured:"BHAJNEET KAUR A/P KARAMJEET SINGH"},
  {policyNo:"7164325A05",owner:"CHAO WEI JIE",insured:"CHAO WEI JIE"},
  {policyNo:"7164324A08",owner:"CHAO WEI JIE",insured:"OONG LEO"},
  {policyNo:"5523205A06",owner:"CHEAH AI LING",insured:"CHEAH AI LING"},
  {policyNo:"0652097J09",owner:"CHEAH AI LING",insured:"LU HAO YUAN"},
  {policyNo:"0652091J05",owner:"CHEAH AI LING",insured:"LU HAO TIAN"},
  {policyNo:"0652325J06",owner:"CHEAH LI CHEE",insured:"JEENA YEAP JIA YI"},
  {policyNo:"0830654J04",owner:"CHEE WING KIT",insured:"CHEE WING KIT"},
  {policyNo:"7783102A01",owner:"CHEW XIN KEAT",insured:"CHEW XIN KEAT"},
  {policyNo:"4413580A08",owner:"CHIN CHEE HAU",insured:"CHIN CAYENNE"},
  {policyNo:"4421743A10",owner:"CHIN TSUEY NI",insured:"ONG YU TORNG"},
  {policyNo:"0146118J04",owner:"CHIONG YU LIAN",insured:"REX TEW XING ZE"},
  {policyNo:"4200336A05",owner:"CHIONG YU LIAN",insured:"TESA TEW XING LIN"},
  {policyNo:"0652291J06",owner:"CHIONG ZHIN TSEN",insured:"CHIONG ZHIN TSEN"},
  {policyNo:"7274732A03",owner:"CHONG KAR HENG",insured:"CHONG KAR HENG"},
  {policyNo:"7245354A02",owner:"CHONG KAR HENG",insured:"CHONG KAR HENG"},
  {policyNo:"4413977A04",owner:"CHUA LAY HAR",insured:"LIM HOOI ERN"},
  {policyNo:"1087608A10",owner:"CHUA LAY SEE",insured:"ELVIN TAN KAI LUN"},
  {policyNo:"0193046A04",owner:"CHUAH HOOI LIAN",insured:"SUN YAN KHAI"},
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
  {policyNo:"4416543A08",owner:"FOO YING TONG",insured:"JOVENE WONG SHEN ROU"},
  {policyNo:"0189270A04",owner:"GEH AI TENG",insured:"GEH AI TENG"},
  {policyNo:"5712162A05",owner:"GOAY KENG CHEW",insured:"GOAY KENG CHEW"},
  {policyNo:"0738517J03",owner:"GOAY KENG CHEW",insured:"GOAY KENG CHEW"},
  {policyNo:"5159628A08",owner:"GOH KOON WEI",insured:"GOH KOON WEI"},
  {policyNo:"0627206J07",owner:"GOH VEE HON",insured:"SAI CHIN WEN"},
  {policyNo:"0627211J07",owner:"GOH VEE HON",insured:"GOH VEE HON"},
  {policyNo:"0228127A10",owner:"GOH YI SIM",insured:"GOH YI SIM"},
  {policyNo:"4400642A05",owner:"GERALD PESKI A/L CONSTENDPESKI",insured:"GERALD PESKI A/L CONSTENDPESKI"},
  {policyNo:"7120116A02",owner:"HANG CHENG KHOEY",insured:"HANG CHENG KHOEY"},
  {policyNo:"5975603A03",owner:"HANG KOK CHUAN",insured:"HANG KOK CHUAN"},
  {policyNo:"7660069A06",owner:"HANG KOK PING",insured:"HANG KOK PING"},
  {policyNo:"4302586A05",owner:"HANG KOK PING",insured:"HANG KHAI KEAN"},
  {policyNo:"7763356A06",owner:"HENG KHA CHENG",insured:"HENG KHA CHENG"},
  {policyNo:"0564419J09",owner:"HENG KHIM YONG",insured:"HENG KHIM YONG"},
  {policyNo:"4414110A06",owner:"HENG KHIM YONG",insured:"GEORGE HENG KAI ZHE"},
  {policyNo:"0564328J02",owner:"HENG MUN WEI",insured:"HENG MUN WEI"},
  {policyNo:"4418944A06",owner:"HENG MUN WEI",insured:"CHOONG JIN HUE"},
  {policyNo:"7132878A06",owner:"HENRY TAN ANG HWE",insured:"HENRY TAN ANG HWE"},
  {policyNo:"0732818J10",owner:"HENRY TAN ANG HWE",insured:"JADENZ TAN HAO XUAN"},
  {policyNo:"0656261J05",owner:"HENRY TAN ANG HWE",insured:"JADENZ TAN HAO XUAN"},
  {policyNo:"0656252J06",owner:"HENRY TAN ANG HWE",insured:"CHLOE TAN JIA TUNG"},
  {policyNo:"0731258J08",owner:"HENRY TAN ANG HWE",insured:"CHLOE TAN JIA TUNG"},
  {policyNo:"7789653A05",owner:"HOR GAIK LAN",insured:"HOR GAIK LAN"},
  {policyNo:"7718361A00",owner:"HOR GAIK LAN",insured:"HOR GAIK LAN"},
  {policyNo:"0777546J05",owner:"HOR GAIK LAN",insured:"TANG SZE MUN"},
  {policyNo:"0447763J01",owner:"HARVINDER SINGH A/L SARJIT SINGH",insured:"HARVINDER SINGH A/L SARJIT SINGH"},
  {policyNo:"7666795A01",owner:"IK CHU YAU",insured:"IK CHU YAU"},
  {policyNo:"5963789A00",owner:"JIMMIE POH LEET SIN",insured:"JIMMIE POH LEET SIN"},
  {policyNo:"7467043A05",owner:"JASON SELVARAJ A/L ERONIMOS",insured:"SIIDDATH SELVARAJ A/L JASON SELVARAJ"},
  {policyNo:"7309902A00",owner:"JASON SELVARAJ A/L ERONIMOS",insured:"YAVEENA HANNAH A/P JASON SELVARAJ"},
  {policyNo:"0830405J09",owner:"JAYASEELAN S/O NARAYANASAMY",insured:"JAYASEELAN S/O NARAYANASAMY"},
  {policyNo:"5696188A00",owner:"KHAW CHOON LENG",insured:"KHAW CHOON LENG"},
  {policyNo:"7040393A01",owner:"KHOO SHIH TING",insured:"KHOO SHIH TING"},
  {policyNo:"0742114J06",owner:"KHOO SHIH TING",insured:"KHOO SHIH TING"},
  {policyNo:"4419134A00",owner:"KHOR CHAU MING",insured:"SOPHIA KHOR RUO YA"},
  {policyNo:"5439373A04",owner:"KHOR WEI SENG",insured:"KHOR WEI SENG"},
  {policyNo:"0589005J01",owner:"KHOW YEN MEI",insured:"CHEAH ZAYVEN"},
  {policyNo:"5584083A08",owner:"KHOW YEN MEI",insured:"CHEAH YANZEN"},
  {policyNo:"0830297J10",owner:"KOH WOON SER",insured:"KOH WOON SER"},
  {policyNo:"5548394A01",owner:"KOOY BOON KEAT",insured:"KOOY BOON KEAT"},
  {policyNo:"0790857J00",owner:"KOOY BOON KEAT",insured:"KOOY BOON KEAT"},
  {policyNo:"4273658A08",owner:"KAMELESWERY A/P JAGADASON",insured:"KAMELESWERY A/P JAGADASON"},
  {policyNo:"7956007A01",owner:"KAMELESWERY A/P JAGADASON",insured:"DAAVINESH SUHANRAJ"},
  {policyNo:"7299637A04",owner:"KAMELESWERY A/P JAGADASON",insured:"SHIVAANI SUHANRAJ"},
  {policyNo:"0652392J09",owner:"KAMELESWERY A/P JAGADASON",insured:"SHIVAANI SUHANRAJ"},
  {policyNo:"4417461A05",owner:"KAMELESWERY A/P JAGADASON",insured:"SHIVAANI SUHANRAJ"},
  {policyNo:"7130839A09",owner:"KARAMJEET SINGH A/L BALDEV SINGH",insured:"BHAJNEET KAUR A/P KARAMJEET SINGH"},
  {policyNo:"7130835A10",owner:"KARAMJEET SINGH A/L BALDEV SINGH",insured:"KARAMJEET SINGH A/L BALDEV SINGH"},
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
  {policyNo:"0707963A09",owner:"LEE BEE PING",insured:"LEE BEE PING"},
  {policyNo:"7423084A05",owner:"LEE BEE YONG",insured:"LEE BEE YONG"},
  {policyNo:"5707446A07",owner:"LEE BEE YONG",insured:"LEE BEE YONG"},
  {policyNo:"7017293A07",owner:"LEE KOK CHOON",insured:"LEE KOK CHOON"},
  {policyNo:"0160441A05",owner:"LEE KOK CHOON",insured:"LEE KOK CHOON"},
  {policyNo:"0524854J05",owner:"LEE KUO YONG",insured:"LEE KUO YONG"},
  {policyNo:"0524880J05",owner:"LEE KUO YONG",insured:"LEE KUO YONG"},
  {policyNo:"7984172A07",owner:"LEE KWANG CHAT",insured:"LEE KWANG CHAT"},
  {policyNo:"1085218A05",owner:"LEE SUE YEE",insured:"LEE SUE YEE"},
  {policyNo:"0694836J00",owner:"LEE TEONG HOE",insured:"LEE TEONG HOE"},
  {policyNo:"0652017J08",owner:"LEE TEONG HOE",insured:"LEE TEONG HOE"},
  {policyNo:"0552497J02",owner:"LEE YIN FUN",insured:"LEE YIN FUN"},
  {policyNo:"0909288A05",owner:"LEM CHAI KUAN",insured:"LEM CHAI KUAN"},
  {policyNo:"0856819A07",owner:"LEM CHAI KUAN",insured:"LEM CHAI KUAN"},
  {policyNo:"5349205A04",owner:"LEONG QIAN XIN",insured:"LEONG QIAN XIN"},
  {policyNo:"7815056A09",owner:"LEONG QIAN XIN",insured:"LEONG QIAN XIN"},
  {policyNo:"0204925J07",owner:"LEONG QIAN XIN",insured:"LEONG QIAN XIN"},
  {policyNo:"5223991A08",owner:"LEONG QIAN YING",insured:"LEONG QIAN YING"},
  {policyNo:"4296152A08",owner:"LEONG QIAN YING",insured:"LEONG QIAN YING"},
  {policyNo:"5910083A07",owner:"LEONG QIAN YING",insured:"LEONG QIAN YING"},
  {policyNo:"7035116A00",owner:"LEOW BOON PING",insured:"LEOW BOON PING"},
  {policyNo:"5976947A09",owner:"LI BOON HOU",insured:"LI BOON HOU"},
  {policyNo:"0770257J00",owner:"LIM BENG TIONG",insured:"LIM BENG TIONG"},
  {policyNo:"5614439A04",owner:"LIM CHIEU PHEAK",insured:"LIM CHIEU PHEAK"},
  {policyNo:"7168750A08",owner:"LIM CHONG HAI",insured:"LIM CHONG HAI"},
  {policyNo:"0091646A10",owner:"LIM ENG HOCK",insured:"LIM ENG HOCK"},
  {policyNo:"0091645A02",owner:"LIM ENG HOCK",insured:"LIM ENG HOCK"},
  {policyNo:"0158246J07",owner:"LIM ENG HOCK",insured:"LIM ENG HOCK"},
  {policyNo:"0091648A04",owner:"LIM ENG HOCK",insured:"LIM ENG HOCK"},
  {policyNo:"7897738A07",owner:"LIM ENG HOCK",insured:"LIM ENG HOCK"},
  {policyNo:"4413968A05",owner:"LIM ENG HOCK",insured:"LIM ENG HOCK"},
  {policyNo:"5386503A07",owner:"LIM HONG KANE",insured:"LIM HONG KANE"},
  {policyNo:"0742264J03",owner:"LIM KHENG HOE",insured:"LIM KHENG HOE"},
  {policyNo:"0712949A00",owner:"LIM MEI CHUIN",insured:"LIM MEI CHUIN"},
  {policyNo:"7831445A06",owner:"LIM PENG CHEANG",insured:"LIM PENG CHEANG"},
  {policyNo:"0564446J06",owner:"LIM PHAIK SEE",insured:"LIM PHAIK SEE"},
  {policyNo:"4414116A10",owner:"LIM PHAIK SEE",insured:"LIM PHAIK SEE"},
  {policyNo:"7665774A07",owner:"LIM RUI QI",insured:"LIM RUI QI"},
  {policyNo:"7665860A07",owner:"LIM RUI QI",insured:"LIM RUI QI"},
  {policyNo:"0942686A05",owner:"LIM SOO CHING",insured:"LIM SOO CHING"},
  {policyNo:"0266334J04",owner:"LIM WOEY HEONG",insured:"LIM WOEY HEONG"},
  {policyNo:"5617194A03",owner:"LIM WOEY HEONG",insured:"LIM WOEY HEONG"},
  {policyNo:"5610769A01",owner:"LOH SHENG WEI",insured:"LOH SHENG WEI"},
  {policyNo:"0382761J00",owner:"LOH SHENG WEI",insured:"LOH SHENG WEI"},
  {policyNo:"0382690J07",owner:"LOH SHENG WEI",insured:"LOH SHENG WEI"},
  {policyNo:"5610770A02",owner:"LOH SHENG WEI",insured:"LOH SHENG WEI"},
  {policyNo:"0382815J03",owner:"LOH SHENG WEI",insured:"LOH SHENG WEI"},
  {policyNo:"7120115A05",owner:"LOH SIOK CHOO",insured:"LOH SIOK CHOO"},
  {policyNo:"4413621A02",owner:"LOK LI YONG",insured:"LOK LI YONG"},
  {policyNo:"7660068A09",owner:"LOO BENG SEE",insured:"LOO BENG SEE"},
  {policyNo:"7472118A09",owner:"LOUIS CHONG",insured:"LOUIS CHONG"},
  {policyNo:"4692315A10",owner:"LOW WEE LI",insured:"LOW WEE LI"},
  {policyNo:"4692316A07",owner:"LOW WEE LI",insured:"LOW WEE LI"},
  {policyNo:"4692317A04",owner:"LOW WEE LI",insured:"LOW WEE LI"},
  {policyNo:"0740135J07",owner:"LYE KIM EAM",insured:"LYE KIM EAM"},
  {policyNo:"7956191A00",owner:"LAKSYITHA A/P SUKUMARAN",insured:"LAKSYITHA A/P SUKUMARAN"},
  {policyNo:"0766344J01",owner:"LEHWIKS RAJ A/L GUNASELAN THANGARAJ",insured:"LEHWIKS RAJ A/L GUNASELAN THANGARAJ"},
  {policyNo:"7120117A10",owner:"LEHWINNS RAJ A/L GUNASELAN THANGARAJ",insured:"LEHWINNS RAJ A/L GUNASELAN THANGARAJ"},
  {policyNo:"7120118A07",owner:"LEHWINNS RAJ A/L GUNASELAN THANGARAJ",insured:"LEHWINNS RAJ A/L GUNASELAN THANGARAJ"},
  {policyNo:"7745043A03",owner:"LEONG LOK FEI @ PHAKORN SADAKHORN",insured:"LEONG LOK FEI @ PHAKORN SADAKHORN"},
  {policyNo:"7017290A05",owner:"MOHAMMAD FAIZAL BIN JAMALUDIN",insured:"MOHAMMAD FAIZAL BIN JAMALUDIN"},
  {policyNo:"7411822A03",owner:"MELISA ANNE A/P PAUL",insured:"MELISA ANNE A/P PAUL"},
  {policyNo:"7279733A03",owner:"MOAHAN A/L SHARIMUTHOO",insured:"MOAHAN A/L SHARIMUTHOO"},
  {policyNo:"4606418A02",owner:"MONICA A/P DANIAL",insured:"MONICA A/P DANIAL"},
  {policyNo:"0300708J05",owner:"MONICA A/P DANIAL",insured:"MONICA A/P DANIAL"},
  {policyNo:"0300759J04",owner:"MONICA A/P DANIAL",insured:"MONICA A/P DANIAL"},
  {policyNo:"0300684J01",owner:"MONICA A/P DANIAL",insured:"MONICA A/P DANIAL"},
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
  {policyNo:"7101886A02",owner:"PHILOMENA A/P SINNAPPAN",insured:"PHILOMENA A/P SINNAPPAN"},
  // ─── Pass 2: Traditional (unique policies not in Pass 1) ───
  {policyNo:"5238666A05",owner:"LAW KAI BIN",insured:"LAW KAI BIN"},
  {policyNo:"4601511A04",owner:"KARAMJEET SINGH A/L BALDEV SINGH",insured:"KARAMJEET SINGH A/L BALDEV SINGH"},
  {policyNo:"4601677A01",owner:"KARAMJEET SINGH A/L BALDEV SINGH",insured:"GURDAS SINGH A/L KARAMJEET SINGH"},
  {policyNo:"7130837A04",owner:"KARAMJEET SINGH A/L BALDEV SINGH",insured:"GURDAS SINGH A/L KARAMJEET SINGH"},
  {policyNo:"0740117J09",owner:"CHUNG CHIEW WHA",insured:"CHUNG CHIEW WHA"},
  {policyNo:"0777546J05",owner:"HOR GAIK LAN",insured:"TANG SZE MUN"},
  {policyNo:"0447763J01",owner:"HARVINDER SINGH A/L SARJIT SINGH",insured:"HARVINDER SINGH A/L SARJIT SINGH"},
  {policyNo:"0830405J09",owner:"JAYASEELAN S/O NARAYANASAMY",insured:"JAYASEELAN S/O NARAYANASAMY"},
  {policyNo:"0830297J10",owner:"KOH WOON SER",insured:"KOH WOON SER"},
  {policyNo:"7040393A01",owner:"KHOO SHIH TING",insured:"KHOO SHIH TING"},
  {policyNo:"7260012A00",owner:"DIVAGARAN A/L LINGGAM",insured:"DIVAGARAN A/L LINGGAM"},
  {policyNo:"0040108J02",owner:"DIVYA A/P SUCHU",insured:"DIVYA A/P SUCHU"},
  {policyNo:"0825306J10",owner:"FARIDAH MARSHALL",insured:"FARIDAH MARSHALL"},
  {policyNo:"5159628A08",owner:"GOH KOON WEI",insured:"GOH KOON WEI"},
  {policyNo:"5975603A03",owner:"HANG KOK CHUAN",insured:"HANG KOK CHUAN"},
  {policyNo:"7660069A06",owner:"HANG KOK PING",insured:"HANG KOK PING"},
  {policyNo:"7666795A01",owner:"IK CHU YAU",insured:"IK CHU YAU"},
  {policyNo:"5963789A00",owner:"JIMMIE POH LEET SIN",insured:"JIMMIE POH LEET SIN"},
  {policyNo:"7467043A05",owner:"JASON SELVARAJ A/L ERONIMOS",insured:"SIIDDATH SELVARAJ A/L JASON SELVARAJ"},
  {policyNo:"7309902A00",owner:"JASON SELVARAJ A/L ERONIMOS",insured:"YAVEENA HANNAH A/P JASON SELVARAJ"},
  {policyNo:"5439373A04",owner:"KHOR WEI SENG",insured:"KHOR WEI SENG"},
  {policyNo:"5584083A08",owner:"KHOW YEN MEI",insured:"CHEAH YANZEN"},
  {policyNo:"5548394A01",owner:"KOOY BOON KEAT",insured:"KOOY BOON KEAT"},
  {policyNo:"4281236A03",owner:"KARBAGAM A/P MUNIANDY",insured:"KARBAGAM A/P MUNIANDY"},
  {policyNo:"7177732A09",owner:"KOMALDEEP KAUR A/P UDHAM SINGH",insured:"KOMALDEEP KAUR A/P UDHAM SINGH"},
  {policyNo:"7786102A05",owner:"KOMALDEEP KAUR A/P UDHAM SINGH",insured:"HARSIMMAR KAUR"},
  {policyNo:"0858145J01",owner:"LAU KAH CHUN",insured:"LAU KAH CHUN"},
  {policyNo:"0858183J02",owner:"LAU KAH CHUN",insured:"LAU WAN YEE"},
  {policyNo:"0858174J03",owner:"LAU KAH CHUN",insured:"LAU KAH CHUN"},
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
  {policyNo:"7101886A02",owner:"PHILOMENA A/P SINNAPPAN",insured:"PHILOMENA A/P SINNAPPAN"},
  ];

  // Deduplicate by policyNo
  const seen = new Set();
  const POLICIES = POLICIES_RAW.filter(p => {
    if (seen.has(p.policyNo)) return false;
    seen.add(p.policyNo);
    return true;
  });

  /* ── 2. SETTINGS ── */
  const STORAGE_KEY = 'alpp_pass3_plans';
  const WAIT_MS     = 5000;   // wait after submit
  const TIMEOUT_MS  = 25000;  // max wait per policy
  const PAUSE_AFTER = 50;     // partial download every N

  /* ── 3. LOAD SAVED PROGRESS ── */
  let state = (() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch(e) { return null; }
  })();
  if (!state) {
    state = { results: [], doneSet: [] };
    console.log(`%c[ALPP Pass3] Fresh start — ${POLICIES.length} unique policies`, 'color:cyan;font-weight:bold');
  } else {
    console.log(`%c[ALPP Pass3] Resuming — ${state.results.length} already done`, 'color:orange;font-weight:bold');
  }
  const doneSet = new Set(state.doneSet);

  /* ── 4. HELPERS ── */
  const delay = ms => new Promise(r => setTimeout(r, ms));

  function getFormInput() {
    return document.querySelector('#ContentPlaceHolder1_txtPolNo')
        || document.querySelector('input[id*="txtPolNo"]')
        || document.querySelector('input[name*="PolNo"]');
  }
  function getSearchBtn() {
    // NOTE: NOT input[type=submit] — that hits PRINT. Use the Search button specifically.
    return document.querySelector('#ContentPlaceHolder1_btnEditSearch')
        || document.querySelector('input[value="Search"]')
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

  /** Extract PLAN-SPECIFIC fields from current policy detail page */
  function extractPlanFields() {
    const txt = document.body.innerText;

    // Helper: grab first regex match from body text
    function grab(patterns) {
      for (const p of patterns) {
        const m = txt.match(p);
        if (m && m[1] && m[1].trim()) return m[1].trim();
      }
      return '';
    }

    // Helper: get text from specific DOM element
    function elText(sel) {
      const el = document.querySelector(sel);
      return el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
    }

    // Scan all table label→value pairs
    const raw = {};
    document.querySelectorAll('table tr').forEach(row => {
      const cells = [...row.querySelectorAll('td')];
      if (cells.length >= 2) {
        const lbl = cells[0].textContent.replace(/\s+/g, ' ').trim().replace(/:$/, '');
        const val = cells.slice(1).map(c => c.textContent.replace(/\s+/g, ' ').trim()).join(' ').trim();
        if (lbl && val && lbl.length < 80) raw[lbl] = val;
      }
    });

    // --- Plan Name ---
    const planName =
      elText('[id*="lblPlanName"],[id*="PlanName"],[id*="ProductName"],[id*="lblPlan"],[id*="PlanDesc"]')
      || raw['Plan Name'] || raw['Product Name'] || raw['Plan Description'] || raw['Plan']
      || grab([
        /Plan\s*(?:Name|Description)\s*[:\-]?\s*([A-Za-z][\w\s\-\/\(\)\.]{2,60}?)(?:\n|\s{3,})/i,
        /Product\s*(?:Name|Description)\s*[:\-]?\s*([A-Za-z][\w\s\-\/\(\)\.]{2,60}?)(?:\n|\s{3,})/i,
        /Plan\s*[:\-]\s*([A-Za-z][\w\s\-\/\(\)\.]{2,60}?)(?:\n|\s{3,})/i,
      ]);

    // --- Sum Assured ---
    const sumAssured =
      elText('[id*="lblBasicSA"],[id*="SumAssured"],[id*="BasicSA"],[id*="lblSA"]')
      || raw['Basic Sum Assured'] || raw['Sum Assured'] || raw['Coverage Amount'] || raw['Basic SA']
      || grab([
        /Basic\s+Sum\s+Assured\s*[:\-]?\s*(RM\s*[\d,]+(?:\.\d{2})?)/i,
        /Sum\s+Assured\s*[:\-]?\s*(RM\s*[\d,]+(?:\.\d{2})?)/i,
        /Coverage\s+Amount\s*[:\-]?\s*(RM\s*[\d,]+(?:\.\d{2})?)/i,
        /Sum\s+Assured\s*[:\-]?\s*([\d,]+(?:\.\d{2})?)/i,
      ]);

    // --- Annual Premium ---
    const annualPremium =
      elText('[id*="lblAnnualPremium"],[id*="AnnualPrem"],[id*="TotalPremium"],[id*="lblPremium"]')
      || raw['Annual Premium'] || raw['Regular Premium'] || raw['Total Annual Premium'] || raw['Total Premium']
      || grab([
        /Annual\s+Premium\s*[:\-]?\s*(RM\s*[\d,]+(?:\.\d{2})?)/i,
        /Regular\s+Premium\s*[:\-]?\s*(RM\s*[\d,]+(?:\.\d{2})?)/i,
        /Total\s+(?:Annual\s+)?Premium\s*[:\-]?\s*(RM\s*[\d,]+(?:\.\d{2})?)/i,
        /Premium\s+Amount\s*[:\-]?\s*(RM\s*[\d,]+(?:\.\d{2})?)/i,
        /Annual\s+Premium\s*[:\-]?\s*([\d,]+(?:\.\d{2})?)/i,
      ]);

    // --- Policy Status ---
    const policyStatus =
      elText('[id*="lblPolicyStatus"],[id*="PolicyStatus"],[id*="lblStatus"],[id*="Status"]')
      || raw['Policy Status'] || raw['Status']
      || grab([
        /Policy\s+Status\s*[:\-]?\s*(In\s*Force|Lapsed|Paid[\s\-]?Up|Surrendered|Matured|Cancelled|Suspended)/i,
        /Status\s*[:\-]?\s*(In\s*Force|Lapsed|Paid[\s\-]?Up|Surrendered|Matured|Cancelled|Suspended)/i,
      ]);

    // --- Commencement Date ---
    const commencedDate =
      elText('[id*="lblCommence"],[id*="CommencementDate"],[id*="PolicyDate"],[id*="EffectiveDate"]')
      || raw['Commencement Date'] || raw['Policy Date'] || raw['Effective Date'] || raw['Policy Commencement Date']
      || grab([
        /Commencement\s+Date\s*[:\-]?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i,
        /Policy\s+(?:Commencement\s+)?Date\s*[:\-]?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i,
        /Effective\s+Date\s*[:\-]?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i,
      ]);

    // --- Next Premium Due Date ---
    const nextDueDate =
      raw['Next Premium Due Date'] || raw['Next Due Date'] || raw['Premium Due Date']
      || grab([
        /Next\s+(?:Premium\s+)?Due\s+Date\s*[:\-]?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i,
      ]);

    return { planName, sumAssured, annualPremium, policyStatus, commencedDate, nextDueDate, raw };
  }

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ results: state.results, doneSet: [...doneSet] })); } catch(e) {}
  }
  function download(suffix = '') {
    const date = new Date().toISOString().slice(0, 10);
    const blob = new Blob([JSON.stringify(state.results, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `alpp_pass3_plans_${date}${suffix}.json`;
    a.click();
  }

  /* ── 5. MAIN LOOP ── */
  const remaining = POLICIES.filter(p => !doneSet.has(p.policyNo));
  console.log(`[ALPP Pass3] ${remaining.length} policies to process (${doneSet.size} already done)`);

  if (remaining.length === 0) {
    console.log('%c[ALPP Pass3] All done! Downloading...', 'color:lime;font-weight:bold');
    download();
    localStorage.removeItem(STORAGE_KEY);
    return;
  }

  let processed = 0;
  for (const pol of remaining) {
    const input = getFormInput();
    const btn   = getSearchBtn();
    if (!input || !btn) {
      console.warn('[ALPP Pass3] ⚠️ Search form not found! Navigate to a policy DETAIL page first.');
      console.warn('MY SERVICING → Policy Status Enquiry → A3719 → Submit → click any policy → paste script again.');
      break;
    }

    console.log(`[Pass3] [${processed+1}/${remaining.length}] ${pol.policyNo} — ${pol.owner}`);
    const snap = contentSnapshot();

    // Fill policy number & trigger Angular change detection
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
    if (nativeSetter?.set) {
      nativeSetter.set.call(input, pol.policyNo);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      input.value = pol.policyNo;
    }
    btn.click();

    // Wait for page to update
    const updated = await waitForUpdate(snap);
    if (!updated) await delay(WAIT_MS);
    else await delay(1500);

    // Extract plan fields
    const fields = extractPlanFields();
    const result = {
      policyNo:      pol.policyNo,
      owner:         pol.owner,
      insured:       pol.insured,
      planName:      fields.planName,
      sumAssured:    fields.sumAssured,
      annualPremium: fields.annualPremium,
      policyStatus:  fields.policyStatus,
      commencedDate: fields.commencedDate,
      nextDueDate:   fields.nextDueDate,
      scrapedAt:     new Date().toISOString(),
      _pass: 3,  // ← identifies this as Pass 3 data for import routing
    };

    state.results.push(result);
    doneSet.add(pol.policyNo);
    saveState();
    processed++;

    const ok = result.planName || result.annualPremium;
    console.log(`  → ${ok ? '✅' : '⚠️ no plan data'} plan:"${result.planName||'-'}" SA:${result.sumAssured||'-'} prem:${result.annualPremium||'-'} status:${result.policyStatus||'-'}`);

    if (processed % PAUSE_AFTER === 0) {
      console.log(`%c[ALPP Pass3] Checkpoint (${processed} done)`, 'color:yellow');
      download(`_partial_${processed}`);
    }
  }

  /* ── 6. DONE ── */
  const withPlan  = state.results.filter(r => r.planName).length;
  const withPrem  = state.results.filter(r => r.annualPremium).length;
  console.log('%c[ALPP Pass3] ✅ COMPLETE!', 'color:lime;font-size:16px;font-weight:bold');
  console.log(`  Total: ${state.results.length} | With plan name: ${withPlan} | With premium: ${withPrem}`);
  download();
  localStorage.removeItem(STORAGE_KEY);

})();
