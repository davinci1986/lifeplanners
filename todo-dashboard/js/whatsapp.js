/* ============================================
   WhatsApp Script Templates — EN / ZH / MY
   ============================================ */

const WA_SCRIPTS = {
  sales: {
    1: {
      en: (name) => `Hi ${name}! 👋 This is [Your Name] from AIA/Snapwill. I'd love to share some financial planning insights that could benefit you. Would you be open for a quick chat? 😊`,
      zh: (name) => `你好 ${name}！👋 我是来自AIA/Snapwill的[您的名字]。我很想分享一些可能对您有益的财务规划见解。您方便聊一聊吗？😊`,
      my: (name) => `Hai ${name}! 👋 Saya [Nama Anda] dari AIA/Snapwill. Saya ingin berkongsi beberapa maklumat perancangan kewangan yang mungkin bermanfaat untuk anda. Boleh kita berbual sebentar? 😊`
    },
    2: {
      en: (name) => `Hi ${name}, thank you for your time earlier! 🙏 To better understand your needs, I'd like to schedule a Fact-Finding session. This helps me tailor the best plan for you. Are you free this week?`,
      zh: (name) => `您好 ${name}，感谢您之前的时间！🙏 为了更好地了解您的需求，我想安排一次需求分析会议。这有助于我为您量身定制最佳方案。这周您方便吗？`,
      my: (name) => `Hai ${name}, terima kasih atas masa anda tadi! 🙏 Untuk memahami keperluan anda dengan lebih baik, saya ingin menjadualkan sesi Fakta-Mencari. Ini membantu saya menyesuaikan pelan terbaik untuk anda. Adakah anda bebas minggu ini?`
    },
    3: {
      en: (name) => `Hi ${name}! 📋 I've prepared your personalized Policy Summary based on our discussion. I'd love to walk you through it and answer any questions. When would be a good time to meet?`,
      zh: (name) => `您好 ${name}！📋 我已根据我们的讨论准备了您的个性化保单摘要。我很乐意为您详细讲解并回答任何问题。什么时候方便见面？`,
      my: (name) => `Hai ${name}! 📋 Saya telah menyediakan Ringkasan Polisi peribadi anda berdasarkan perbincangan kita. Saya ingin membimbing anda melaluinya dan menjawab sebarang soalan. Bilakah masa yang sesuai untuk bertemu?`
    },
    4: {
      en: (name) => `Hi ${name}! 🎯 I'd like to schedule our Closing Appointment to finalize your protection plan. I'm confident this solution will give you and your family great peace of mind. Are you available this week?`,
      zh: (name) => `您好 ${name}！🎯 我想安排我们的签约会面，确定您的保障计划。我相信这个解决方案将给您和您的家人带来很大的安心感。这周您有空吗？`,
      my: (name) => `Hai ${name}! 🎯 Saya ingin menjadualkan Temu Janji Penutupan kita untuk memuktamadkan pelan perlindungan anda. Saya yakin penyelesaian ini akan memberikan ketenangan fikiran yang besar kepada anda dan keluarga. Adakah anda tersedia minggu ini?`
    },
    5: {
      en: (name) => `Hi ${name}! 🎉 Congratulations on your new policy! Welcome to the [AIA/Snapwill] family! I'll be your dedicated life planner. Feel free to reach out anytime you need assistance. 😊`,
      zh: (name) => `您好 ${name}！🎉 恭喜您拥有新保单！欢迎加入[AIA/Snapwill]大家庭！我将是您专属的理财规划师。随时欢迎联系我寻求帮助。😊`,
      my: (name) => `Hai ${name}! 🎉 Tahniah atas polisi baru anda! Selamat datang ke keluarga [AIA/Snapwill]! Saya akan menjadi perancang kehidupan khusus anda. Jangan teragak-agak untuk menghubungi saya bila-bila masa anda memerlukan bantuan. 😊`
    },
    6: {
      en: (name) => `Hi ${name}! 🤝 I'd like to schedule a Cementing Session to review your policy details and ensure everything is in order. This is an important step to make sure you get the full benefits. When are you free?`,
      zh: (name) => `您好 ${name}！🤝 我想安排一次回顾会议，审查您的保单详情并确保一切正常。这是确保您获得全部福利的重要步骤。您什么时候有空？`,
      my: (name) => `Hai ${name}! 🤝 Saya ingin menjadualkan Sesi Pengukuhan untuk mengkaji semula butiran polisi anda dan memastikan semuanya teratur. Ini adalah langkah penting untuk memastikan anda mendapat manfaat penuh. Bilakah anda bebas?`
    },
    7: {
      en: (name) => `Hi ${name}! 😊 I hope you're enjoying your coverage! I was wondering if you know of any friends or family who might also benefit from financial planning? Even a simple introduction would mean the world to me! 🙏`,
      zh: (name) => `您好 ${name}！😊 希望您对保障满意！我想知道您是否认识任何朋友或家人也可能受益于财务规划？哪怕只是一个简单的介绍对我来说也意义重大！🙏`,
      my: (name) => `Hai ${name}! 😊 Harap anda berpuas hati dengan perlindungan anda! Saya ingin tahu sama ada anda tahu rakan atau keluarga yang mungkin juga mendapat manfaat daripada perancangan kewangan? Walaupun sekadar pengenalan ringkas akan bermakna besar bagi saya! 🙏`
    }
  },
  claims: {
    1: {
      en: (name) => `Hi ${name}! 📄 To proceed with your claim, I'll need the following documents:\n• Receipts\n• Itemized Bill\n• IC (front)\nPlease send them at your earliest convenience. 🙏`,
      zh: (name) => `您好 ${name}！📄 为了处理您的理赔，我需要以下文件：\n• 收据\n• 逐项账单\n• 身份证（正面）\n请尽快发送给我。🙏`,
      my: (name) => `Hai ${name}! 📄 Untuk meneruskan tuntutan anda, saya memerlukan dokumen berikut:\n• Resit\n• Bil Terperinci\n• IC (hadapan)\nSila hantar kepada saya secepat mungkin. 🙏`
    },
    3: {
      en: (name) => `Hi ${name}! ✅ Great news — your claim has been successfully submitted! The processing time is approximately 7 working days. I'll update you once I receive the status. 😊`,
      zh: (name) => `您好 ${name}！✅ 好消息——您的理赔已成功提交！处理时间约为7个工作日。一旦收到状态更新，我会立即通知您。😊`,
      my: (name) => `Hai ${name}! ✅ Berita baik — tuntutan anda telah berjaya dihantar! Masa pemprosesan adalah lebih kurang 7 hari bekerja. Saya akan mengemas kini anda apabila saya menerima statusnya. 😊`
    },
    10: {
      en: (name) => `Hi ${name}! 🎉 Your claim has been approved and completed! The payment should be in your account shortly. Please let me know if you need anything else. 😊`,
      zh: (name) => `您好 ${name}！🎉 您的理赔已获批准并完成！款项应该很快就会入账。如果您还需要什么，请告诉我。😊`,
      my: (name) => `Hai ${name}! 🎉 Tuntutan anda telah diluluskan dan selesai! Pembayaran sepatutnya masuk ke akaun anda tidak lama lagi. Sila beritahu saya jika anda memerlukan apa-apa lagi. 😊`
    }
  },
  servicing: {
    1: {
      en: (name) => `Hi ${name}! 📝 To process your [service request], I'll need you to fill up the required forms. I'll send them to you shortly. 🙏`,
      zh: (name) => `您好 ${name}！📝 为了处理您的[服务请求]，我需要您填写所需表格。我会尽快发送给您。🙏`,
      my: (name) => `Hai ${name}! 📝 Untuk memproses [permintaan perkhidmatan] anda, saya perlu anda mengisi borang yang diperlukan. Saya akan menghantarnya kepada anda tidak lama lagi. 🙏`
    },
    2: {
      en: (name) => `Hi ${name}! 🔗 Here is the link to complete your request: [LINK]. Please approve it at your earliest convenience. Let me know if you need any help! 😊`,
      zh: (name) => `您好 ${name}！🔗 这是完成您请求的链接：[链接]。请尽快批准。如果需要帮助，请告诉我！😊`,
      my: (name) => `Hai ${name}! 🔗 Berikut adalah pautan untuk melengkapkan permintaan anda: [PAUTAN]. Sila luluskan secepat mungkin. Beritahu saya jika anda memerlukan bantuan! 😊`
    },
    3: {
      en: (name) => `Hi ${name}! 🔔 Just a gentle reminder to approve your pending request. It only takes a moment! Please let me know once done. 😊`,
      zh: (name) => `您好 ${name}！🔔 温馨提醒您批准待处理的请求。只需片刻即可完成！完成后请告知我。😊`,
      my: (name) => `Hai ${name}! 🔔 Sekadar peringatan lembut untuk meluluskan permintaan anda yang tertunggak. Ia hanya mengambil masa sebentar! Sila beritahu saya setelah selesai. 😊`
    },
    9: {
      en: (name) => `Hi ${name}! ✅ Great news — your [service request] has been approved and updated successfully! Please let me know if you need anything else. 😊`,
      zh: (name) => `您好 ${name}！✅ 好消息——您的[服务请求]已成功批准和更新！如果还有其他需要，请告诉我。😊`,
      my: (name) => `Hai ${name}! ✅ Berita baik — [permintaan perkhidmatan] anda telah berjaya diluluskan dan dikemas kini! Sila beritahu saya jika anda memerlukan apa-apa lagi. 😊`
    }
  },
  recruitment: {
    1: {
      en: (name) => `Hi ${name}! 👋 I'm reaching out because I see great potential in you! I'd love to share an exciting career opportunity in the financial industry. Are you open for a quick chat? 😊`,
      zh: (name) => `您好 ${name}！👋 我联系您是因为我看到了您身上巨大的潜力！我很想分享金融行业中一个令人兴奋的职业机会。您方便聊一聊吗？😊`,
      my: (name) => `Hai ${name}! 👋 Saya menghubungi anda kerana saya melihat potensi yang besar dalam diri anda! Saya ingin berkongsi peluang kerjaya yang menarik dalam industri kewangan. Boleh kita berbual sebentar? 😊`
    },
    3: {
      en: (name) => `Hi ${name}! 🎯 I'd like to invite you for a formal Recruitment Closing Meeting where I can share the full career details, earning potential, and growth path. Are you available this week?`,
      zh: (name) => `您好 ${name}！🎯 我想邀请您参加正式的招募会议，在那里我可以分享完整的职业详情、收入潜力和发展路径。这周您有空吗？`,
      my: (name) => `Hai ${name}! 🎯 Saya ingin menjemput anda untuk Mesyuarat Penutupan Pengambilan formal di mana saya boleh berkongsi butiran kerjaya penuh, potensi pendapatan, dan laluan pertumbuhan. Adakah anda tersedia minggu ini?`
    },
    4: {
      en: (name) => `Hi ${name}! 🤔 I understand you're still considering. No rush! I just wanted to check in — do you have any questions I can help clarify? I'm here whenever you're ready. 😊`,
      zh: (name) => `您好 ${name}！🤔 我理解您还在考虑中。不用急！我只是想跟进一下——您有什么问题需要我澄清吗？随时准备好了随时联系我。😊`,
      my: (name) => `Hai ${name}! 🤔 Saya faham anda masih mempertimbangkan. Tiada tergesa-gesa! Saya hanya ingin bertanya — adakah ada soalan yang boleh saya bantu jelaskan? Saya sedia menunggu bila-bila masa anda bersedia. 😊`
    },
    5: {
      en: (name) => `Hi ${name}! 🎉 Welcome to the team! I'm so excited to start this journey with you. Let's schedule your onboarding soon. Great things are ahead! 🚀`,
      zh: (name) => `您好 ${name}！🎉 欢迎加入团队！我非常兴奋与您一起开始这段旅程。让我们尽快安排您的入职培训。前方有美好的事情在等着我们！🚀`,
      my: (name) => `Hai ${name}! 🎉 Selamat datang ke pasukan! Saya sangat teruja untuk memulakan perjalanan ini bersama anda. Mari kita jadualkan onboarding anda tidak lama lagi. Perkara-perkara hebat ada di hadapan! 🚀`
    }
  },
  onboarding: {
    1: {
      en: (name) => `Hi ${name}! 📝 Please complete your Be A Life Planner (BALP) application as soon as possible. I'll guide you through the process. Let's get started! 💪`,
      zh: (name) => `您好 ${name}！📝 请尽快完成Be A Life Planner (BALP)申请。我会指导您完成整个流程。让我们开始吧！💪`,
      my: (name) => `Hai ${name}! 📝 Sila lengkapkan permohonan Be A Life Planner (BALP) anda secepat mungkin. Saya akan membimbing anda melalui proses tersebut. Jom mulakan! 💪`
    },
    2: {
      en: (name) => `Hi ${name}! 📚 Time to arrange your examination! Here are the details:\n• Exam: [Type]\n• Date: [Date]\n• Time: [Time]\n• Venue: [Venue]\n\nPlease confirm your attendance. Good luck! 🍀`,
      zh: (name) => `您好 ${name}！📚 是时候安排您的考试了！以下是详情：\n• 考试：[类型]\n• 日期：[日期]\n• 时间：[时间]\n• 地点：[地点]\n\n请确认您的出席。祝您好运！🍀`,
      my: (name) => `Hai ${name}! 📚 Masa untuk mengatur peperiksaan anda! Berikut adalah butirannya:\n• Peperiksaan: [Jenis]\n• Tarikh: [Tarikh]\n• Masa: [Masa]\n• Tempat: [Tempat]\n\nSila sahkan kehadiran anda. Semoga berjaya! 🍀`
    },
    3: {
      en: (name) => `Hi ${name}! 📝 Please prepare your 20 Names Hotlist as soon as possible. This is a key step in starting your career! I'm here to help if you need guidance. 💪`,
      zh: (name) => `您好 ${name}！📝 请尽快准备您的20人热门名单。这是开始您职业生涯的关键步骤！如果需要指导，我在这里。💪`,
      my: (name) => `Hai ${name}! 📝 Sila sediakan Senarai Panas 20 Nama anda secepat mungkin. Ini adalah langkah utama dalam memulakan kerjaya anda! Saya di sini untuk membantu jika anda memerlukan bimbingan. 💪`
    }
  },
  snapwill: {
    1: {
      en: (name) => `Hi ${name}! 👋 I'd like to introduce you to Snapwill — an innovative solution that can help protect and organize your assets efficiently. Would you be open to learn more? 😊`,
      zh: (name) => `您好 ${name}！👋 我想向您介绍Snapwill——一种可以帮助您有效保护和组织资产的创新解决方案。您有兴趣了解更多吗？😊`,
      my: (name) => `Hai ${name}! 👋 Saya ingin memperkenalkan anda kepada Snapwill — penyelesaian inovatif yang boleh membantu melindungi dan mengatur aset anda dengan cekap. Adakah anda terbuka untuk mengetahui lebih lanjut? 😊`
    },
    2: {
      en: (name) => `Hi ${name}! 📅 Let's schedule a meetup to discuss Snapwill in detail!\n• Purpose: [Purpose]\n• Venue: [Venue]\n• Date: [Date]\n• Time: [Time]\n\nLooking forward to seeing you! 😊`,
      zh: (name) => `您好 ${name}！📅 让我们安排一次见面，详细讨论Snapwill！\n• 目的：[目的]\n• 地点：[地点]\n• 日期：[日期]\n• 时间：[时间]\n\n期待见到您！😊`,
      my: (name) => `Hai ${name}! 📅 Mari kita jadualkan pertemuan untuk membincangkan Snapwill secara terperinci!\n• Tujuan: [Tujuan]\n• Tempat: [Tempat]\n• Tarikh: [Tarikh]\n• Masa: [Masa]\n\nNantikan pertemuan kita! 😊`
    },
    5: {
      en: (name) => `Hi ${name}! 🎉 Congratulations on completing your Snapwill setup! You're now well-protected. Please don't hesitate to reach out if you need any assistance. 😊`,
      zh: (name) => `您好 ${name}！🎉 恭喜您完成Snapwill设置！您现在已获得完善保障。如需任何帮助，随时联系我。😊`,
      my: (name) => `Hai ${name}! 🎉 Tahniah kerana melengkapkan persediaan Snapwill anda! Anda kini dilindungi dengan baik. Jangan teragak-agak untuk menghubungi saya jika anda memerlukan sebarang bantuan. 😊`
    }
  }
};

function getWAScript(category, status, contactName, lang = 'en') {
  const cat = WA_SCRIPTS[category];
  if (!cat) return getGenericScript(contactName, lang);
  const st = cat[status];
  if (!st) {
    // Find nearest
    const keys = Object.keys(cat).map(Number).sort((a,b) => a-b);
    const nearest = keys.reverse().find(k => k <= status) || keys[0];
    const fallback = cat[nearest];
    if (fallback && fallback[lang]) return fallback[lang](contactName);
  }
  if (st && st[lang]) return st[lang](contactName);
  return getGenericScript(contactName, lang);
}

function getGenericScript(name, lang) {
  const scripts = {
    en: `Hi ${name}! 😊 Just checking in to see how you're doing. Please let me know if there's anything I can help you with. Have a great day! 🙏`,
    zh: `您好 ${name}！😊 只是来问候一下，看看您最近如何。如有任何需要帮助的地方，请告诉我。祝您有美好的一天！🙏`,
    my: `Hai ${name}! 😊 Sekadar ingin tahu khabar anda. Sila beritahu saya jika ada apa-apa yang boleh saya bantu. Semoga hari anda menyenangkan! 🙏`
  };
  return scripts[lang] || scripts.en;
}

function renderWAScriptBox(category, status, contactName) {
  return `
    <div style="margin-top:12px">
      <div class="flex items-center justify-between mb-8">
        <span class="form-label" style="margin-bottom:0">💬 WhatsApp Script</span>
        <div class="lang-selector">
          <button class="lang-btn active" onclick="switchLang(this,'en','${category}',${status},'${escHtml(contactName)}')" data-lang="en">EN</button>
          <button class="lang-btn" onclick="switchLang(this,'zh','${category}',${status},'${escHtml(contactName)}')" data-lang="zh">中文</button>
          <button class="lang-btn" onclick="switchLang(this,'my','${category}',${status},'${escHtml(contactName)}')" data-lang="my">BM</button>
        </div>
      </div>
      <div class="wa-script-box" id="waScriptContent">${escHtml(getWAScript(category, status, contactName, 'en'))}
        <button class="wa-copy-btn" onclick="copyWAScript()">Copy</button>
      </div>
    </div>`;
}

function switchLang(btn, lang, category, status, name) {
  document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const box = document.getElementById('waScriptContent');
  if (box) {
    const script = getWAScript(category, status, name, lang);
    box.childNodes[0].textContent = escHtml(script);
    box.innerHTML = escHtml(script) + `<button class="wa-copy-btn" onclick="copyWAScript()">Copy</button>`;
  }
  playClick();
}

function copyWAScript() {
  const box = document.getElementById('waScriptContent');
  if (!box) return;
  const text = box.childNodes[0].textContent || box.innerText.replace('Copy','').trim();
  navigator.clipboard.writeText(text).then(() => {
    showToast('Script copied to clipboard!', 'success');
    playSuccess();
  }).catch(() => {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    showToast('Script copied!', 'success');
  });
}
