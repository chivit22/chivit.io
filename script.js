const form = document.getElementById('contact-form');
const status = document.getElementById('form-status');
const feedbackList = document.getElementById('feedback-list');
const ratingStars = document.querySelectorAll('.rating-stars .star');
const ratingInput = document.getElementById('rating');
const ratingNote = document.getElementById('rating-note');
const hireBtn = document.getElementById('hire-btn');
const hireInfo = document.getElementById('hire-info');
const closeHireInfo = document.getElementById('close-hire-info');
const adminToggle = document.getElementById('admin-toggle');

let backendAvailable = false;
let adminMode = false;
let adminToken = '';

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function fetchServerFeedbacks() {
  try {
    const res = await fetch('/api/feedbacks');
    if (!res.ok) throw new Error('no server');
    const items = await res.json();
    backendAvailable = true;
    return items;
  } catch (e) {
    backendAvailable = false;
    return null;
  }
}

function getLocalFeedbacks() {
  try {
    return JSON.parse(localStorage.getItem('feedbacks') || '[]');
  } catch (e) {
    return [];
  }
}

function saveLocalFeedbacks(list) {
  localStorage.setItem('feedbacks', JSON.stringify(list));
}

function makeStars(n) {
  n = Number(n) || 0;
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}

function renderList(items, source = 'local') {
  if (!feedbackList) return;
  feedbackList.innerHTML = items.length === 0 ? '<p class="no-feedback">No feedback yet. Be the first to share!</p>' : '';
  [...items].reverse().forEach((fb) => {
    const card = document.createElement('article');
    card.className = 'feedback-card';
    const stars = makeStars(fb.rating);
    const idAttr = fb.id ? `data-id="${fb.id}"` : '';
    const deleteBtn = adminMode ? `<button class="feedback-delete" data-id="${fb.id || ''}">Delete</button>` : '';
    card.innerHTML = `
      <div class="feedback-meta">
        <div class="feedback-name">${escapeHTML(fb.name)}</div>
        <div class="feedback-stars">${stars}</div>
      </div>
      <div class="feedback-body">${escapeHTML(fb.report)}</div>
      <div class="feedback-footer">
        <span class="feedback-email">${escapeHTML(fb.email)}</span>
        <span class="feedback-address">${escapeHTML(fb.address || '')}</span>
        <span class="feedback-date">${escapeHTML(fb.time || '')}</span>
        ${deleteBtn}
      </div>
    `;
    feedbackList.appendChild(card);
  });

  // attach delete handlers
  document.querySelectorAll('.feedback-delete').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const id = btn.dataset.id;
      if (backendAvailable) {
        try {
          const res = await fetch(`/api/feedback/${id}`, { method: 'DELETE', headers: { 'x-admin-token': adminToken } });
          if (res.ok) {
            loadAndRender();
          } else {
            alert('Delete failed (check admin token).');
          }
        } catch (err) {
          alert('Server not reachable.');
        }
      } else {
        // local deletion
        const list = getLocalFeedbacks().filter((f) => f.id !== id);
        saveLocalFeedbacks(list);
        renderList(list, 'local');
      }
    });
  });
}

async function loadAndRender() {
  const serverItems = await fetchServerFeedbacks();
  if (serverItems) {
    renderList(serverItems, 'server');
  } else {
    renderList(getLocalFeedbacks(), 'local');
  }
}

// Initialize render
loadAndRender();

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const name = document.getElementById('name')?.value.trim();
  const email = document.getElementById('email')?.value.trim();
  const address = document.getElementById('address')?.value.trim();
  const subject = document.getElementById('subject')?.value.trim();
  const message = document.getElementById('message')?.value.trim();
  const report = document.getElementById('report')?.value.trim();
  const rating = Number(ratingInput?.value || 0);

  if (!name || !email || !report) {
    status.textContent = 'Please complete required fields: name, email, and report.';
    return;
  }

  const time = new Date().toLocaleString();
  const entry = { id: String(Date.now()) + Math.floor(Math.random() * 1000), name, email, address, subject, message, report, rating, time };

  if (backendAvailable) {
    try {
      const res = await fetch('/api/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry) });
      if (res.ok) {
        // server will add id/time too; reload from server
        await loadAndRender();
      } else {
        // fallback to local
        const items = getLocalFeedbacks();
        items.push(entry);
        saveLocalFeedbacks(items);
        renderList(items, 'local');
      }
    } catch (err) {
      // fallback to local
      const items = getLocalFeedbacks();
      items.push(entry);
      saveLocalFeedbacks(items);
      renderList(items, 'local');
    }
  } else {
    const items = getLocalFeedbacks();
    items.push(entry);
    saveLocalFeedbacks(items);
    renderList(items, 'local');
  }

  // reset UI
  form.reset();
  if (ratingInput) ratingInput.value = '0';
  ratingStars.forEach((s) => s.classList.remove('selected'));
  if (ratingNote) ratingNote.textContent = 'Click a star to rate the website.';

  status.textContent = 'Report submitted. Thank you for your feedback!';
  setTimeout(() => (status.textContent = ''), 3500);
});

ratingStars.forEach((star) => {
  star.addEventListener('click', () => {
    const value = star.dataset.value;
    if (!ratingInput) return;
    ratingInput.value = value;
    ratingStars.forEach((item) => {
      item.classList.toggle('selected', Number(item.dataset.value) <= Number(value));
    });
    if (ratingNote) ratingNote.textContent = `Rating selected: ${value} star${value === '1' ? '' : 's'}.`;
  });
});

form.addEventListener('reset', () => {
  if (ratingInput) ratingInput.value = '0';
  ratingStars.forEach((s) => s.classList.remove('selected'));
  if (ratingNote) ratingNote.textContent = 'Click a star to rate the website.';
});

hireBtn?.addEventListener('click', () => {
  hireInfo?.classList.toggle('visible');
});

closeHireInfo?.addEventListener('click', () => {
  hireInfo?.classList.remove('visible');
});

document.addEventListener('click', (event) => {
  if (!hireInfo?.contains(event.target) && event.target !== hireBtn) {
    hireInfo?.classList.remove('visible');
  }
});
