const lookupBtn = document.getElementById('lookupBtn');
const memberIDInput = document.getElementById('memberID');
const passwordInput = document.getElementById('password');

const loadingEl = document.getElementById('loading');
const messageEl = document.getElementById('message');
const cardArea = document.getElementById('cardArea');
const cardImage = document.getElementById('cardImage');
const downloadLink = document.getElementById('downloadLink');

let pending = false; 
function showLoading(show = true) {
  loadingEl.style.display = show ? 'flex' : 'none';
}

function setMessage(html, type = 'info') {
  messageEl.innerHTML = html;
  if (type === 'error') messageEl.style.color = '#ffd6d6';
  else if (type === 'success') messageEl.style.color = '#d6ffd6';
  else messageEl.style.color = '#fff';
}

function hideCardArea() {
  cardArea.style.display = 'none';
  cardArea.classList.remove('show');
  cardArea.setAttribute('aria-hidden', 'true');
  cardImage.src = '';
  downloadLink.href = '#';
}

function imageExists(path) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = path;
  });
}

async function findCardImage(memberId) {
  const extensions = ['.png', '.jpg', '.jpeg'];
  for (const ext of extensions) {
    const path = `cards/${memberId}${ext}`;
    const exists = await imageExists(path);
    if (exists) return path;
  }
  return null;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"'`]/g, s => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;'
  }[s]));
}

async function lookupCard() {
  if (pending) return;
  pending = true;
  lookupBtn.setAttribute('aria-pressed', 'true');

  const rawId = memberIDInput.value.trim();
  const idInput = rawId.toUpperCase();
  const password = passwordInput.value;

  hideCardArea();
  setMessage('');
  showLoading(true);

  if (!idInput || !password) {
    showLoading(false);
    setMessage('❗ Please enter both Member ID and password.', 'error');
    pending = false;
    lookupBtn.setAttribute('aria-pressed', 'false');
    return;
  }

  try {
    const res = await fetch('members.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('Members data not available');
    const members = await res.json();

    let valid = false;
    if (members[idInput] && typeof members[idInput] === 'string') {
      valid = members[idInput] === password;
    } else if (members[idInput] && typeof members[idInput] === 'object') {
      valid = members[idInput].password === password || members[idInput].pass === password;
    } else {
      const foundKey = Object.keys(members).find(k => k.toUpperCase() === idInput);
      if (foundKey) {
        const entry = members[foundKey];
        valid = (typeof entry === 'string' && entry === password) ||
                (typeof entry === 'object' && (entry.password === password || entry.pass === password));
      }
    }

    if (!valid) {
      showLoading(false);
      setMessage('❌ Invalid ID or Password. Please double-check and try again.', 'error');
      pending = false;
      lookupBtn.setAttribute('aria-pressed', 'false');
      return;
    }

    setMessage('✅ Credentials verified. Looking for your card...');
    const foundPath = await findCardImage(idInput);

    showLoading(false);

    if (foundPath) {
      // display card
      cardImage.src = foundPath;
      cardImage.alt = `Digital card for ${escapeHtml(idInput)}`;
      downloadLink.href = foundPath;
      const ext = foundPath.split('.').pop() || 'png';
      downloadLink.download = `${idInput}.${ext}`;

      cardArea.style.display = 'flex';
      requestAnimationFrame(() => cardArea.classList.add('show'));
      cardArea.setAttribute('aria-hidden', 'false');
      setMessage('✅ Card found — you can download it below.', 'success');
    } else {
      const whatsappNumber = '263777217619';
      const prefill = encodeURIComponent(`Hello Mondli, I couldn't access my union card. Member ID: ${idInput}`);
      const whatsappLink = `https://wa.me/${whatsappNumber}?text=${prefill}`;

      setMessage(`
        ⚠️ Sorry, your card image was not found.<br>
        <a class="whatsapp-btn" href="${whatsappLink}" target="_blank" rel="noopener">
          <i class="fab fa-whatsapp"></i> Contact Support
        </a>
      `, 'error');

      hideCardArea();
    }
  } catch (err) {
    console.error(err);
    showLoading(false);
    setMessage('⚠️ Error fetching member data. Please try again later or contact support.', 'error');
    hideCardArea();
  }

  pending = false;
  lookupBtn.setAttribute('aria-pressed', 'false');
}

lookupBtn.addEventListener('click', lookupCard);

[memberIDInput, passwordInput].forEach(el =>
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') lookupCard();
  })
);

document.addEventListener('click', (e) => {
  const btn = e.target.closest('.download-btn');
  if (!btn) return;
  const ripple = btn.querySelector('.btn-ripple');
  if (!ripple) return;
  ripple.style.transition = 'none';
  ripple.style.width = '0';
  ripple.style.height = '0';
  requestAnimationFrame(() => {
    ripple.style.transition = 'width .45s ease, height .45s ease';
    ripple.style.width = '240%';
    ripple.style.height = '480%';
  });
});
