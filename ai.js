// FocoDesk AI Danışman Motoru

function toggleChatModal() {
  const m = document.getElementById('ai-chat-modal');
  m.classList.toggle('hidden');
  m.classList.toggle('flex');
  if (!m.classList.contains('hidden')) {
    setTimeout(() => document.getElementById('chat-input').focus(), 100);
  }
}

function handleChatKeyDown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendChatMessage();
  }
}

async function sendChatMessage() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;

  const geminiKey = (localStorage.getItem('gemini_api_key') || '').trim();
  if (!geminiKey) {
    alert("Lütfen önce sağ üstteki Ayarlar (⚙️) butonundan Gemini API anahtarınızı girin.");
    toggleConfigModal();
    return;
  }

  const chatContainer = document.getElementById('chat-messages');

  chatContainer.innerHTML += `
    <div class="bg-purple-600/30 border border-purple-500/30 text-purple-100 self-end p-3 rounded-xl max-w-[85%] whitespace-pre-wrap">
      ${text}
    </div>
  `;
  input.value = '';
  chatContainer.scrollTop = chatContainer.scrollHeight;

  const loadingId = 'loading-' + Date.now();
  chatContainer.innerHTML += `
    <div id="${loadingId}" class="bg-slate-700/50 border border-slate-700 self-start p-3 rounded-xl max-w-[85%] flex items-center gap-2 text-slate-300">
      <i class="fas fa-circle-notch fa-spin text-purple-400"></i> FocoDesk verileriniz inceleniyor ve yanıt oluşturuluyor...
    </div>
  `;
  chatContainer.scrollTop = chatContainer.scrollHeight;

  const focoVerileri = {
    alanlar: state.habits.map(h => h.title),
    kayitlar: state.logs,
    yapilacak_isler: state.tasks.filter(t => !t.done).map(t => `${t.category === 'is' ? 'Sprint' : 'Ev'}: ${t.text}`)
  };

  const systemPrompt = `Sen FocoDesk akıllı akademik danışmanısın. 
Karşındaki araştırmacının FocoDesk çalışma masasındaki güncel verileri şöyledir:
${JSON.stringify(focoVerileri)}

GÖREVİN:
- Araştırmacı analiz istediğinde doğrudan yukarıdaki sürelere, odaklandığı alt başlıklara ve sprint görevlerine bakarak somut tavsiyeler ver.
- Akademik konularda (yayın, tez, revizyon, veri analizi vb.) hem stratejik destek sun hem de mevcut çalışma temposuyla ilişkilendir.
- Samimi, çözüm odaklı ve motive edici bir dille Türkçe yanıt ver.`;

  let replyText = null;
  const modelsToTry = ['gemini-2.5-flash', 'gemini-1.5-flash'];

  for (const m of modelsToTry) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { role: 'user', parts: [{ text: `${systemPrompt}\n\nKullanıcı Sorusu: ${text}` }] }
          ]
        })
      });

      const data = await res.json();
      if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        replyText = data.candidates[0].content.parts[0].text;
        break;
      } else if (data.error && !replyText) {
        replyText = `API Hatası: ${data.error.message}`;
      }
    } catch (e) {
      replyText = `Bağlantı Hatası: ${e.message}`;
    }
  }

  const loaderEl = document.getElementById(loadingId);
  if (loaderEl) loaderEl.remove();

  chatContainer.innerHTML += `
    <div class="bg-slate-700/50 border border-slate-700 self-start p-3 rounded-xl max-w-[85%] text-slate-200 whitespace-pre-wrap leading-relaxed">
      ${replyText || "Cevap üretilemedi."}
    </div>
  `;
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function toggleConfigModal() {
  const m = document.getElementById('config-modal');
  m.classList.toggle('hidden');
  m.classList.toggle('flex');
  document.getElementById('cfg-gemini').value = localStorage.getItem('gemini_api_key') || '';
}

function saveConfigurations() {
  const g = document.getElementById('cfg-gemini').value.trim();
  if (g) {
    localStorage.setItem('gemini_api_key', g);
    alert("Gemini API Anahtarı başarıyla kaydedildi!");
  }
  toggleConfigModal();
}
