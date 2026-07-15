/**
 * MediQueue - Core Client Javascript
 * Satu file untuk seluruh halaman. Mendeteksi halaman aktif via body id.
 */

// ─── CONFIGURATION & GLOBAL UTILITIES ─────────────────────────────────
const API_BASE = ''; // Menggunakan relative path karena frontend disajikan oleh Flask yang sama

// Toast Notification
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type === 'error' ? 'toast-error' : ''}`;

  const icon = type === 'error' ? 'ti-alert-triangle' : 'ti-circle-check';
  toast.innerHTML = `
    <div style="display: flex; align-items: center; gap: 0.5rem;">
      <i class="ti ${icon} toast-icon"></i>
      <span>${message}</span>
    </div>
    <button class="toast-close">&times;</button>
  `;

  // Close button listener
  toast.querySelector('.toast-close').addEventListener('click', () => {
    toast.remove();
  });

  container.appendChild(toast);

  // Auto remove
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Empty / Error state renderer for table bodies
function renderEmptyState(colspan, { icon, title, text, variant = 'default' }) {
  return `
    <tr>
      <td colspan="${colspan}">
        <div class="empty-state empty-state--${variant}">
          <div class="empty-state-icon"><i class="ti ${icon}"></i></div>
          <p class="empty-state-title">${title}</p>
          <p class="empty-state-text">${text}</p>
        </div>
      </td>
    </tr>
  `;
}

// Auth Helpers
function saveAuth(token, user) {
  localStorage.setItem('mq_token', token);
  localStorage.setItem('mq_user', JSON.stringify(user));
}

function getAuth() {
  const token = localStorage.getItem('mq_token');
  const userJson = localStorage.getItem('mq_user');
  if (!token || !userJson) return null;
  try {
    return { token, user: JSON.parse(userJson) };
  } catch (e) {
    return null;
  }
}

function clearAuth() {
  localStorage.removeItem('mq_token');
  localStorage.removeItem('mq_user');
}

// ─── THEME TOGGLE (KONSISTEN DI SEMUA HALAMAN) ────────────────────────
function initTheme() {
  const themeToggle = document.getElementById('theme-toggle');
  const themeKnob = document.getElementById('theme-knob');
  const savedTheme = localStorage.getItem('theme') || 'light';

  if (savedTheme === 'dark') {
    document.body.classList.add('dark');
    if (themeKnob) themeKnob.innerHTML = '<i class="ti ti-moon"></i>';
  } else {
    document.body.classList.remove('dark');
    if (themeKnob) themeKnob.innerHTML = '<i class="ti ti-sun"></i>';
  }

  if (themeToggle) {
    themeToggle.onclick = () => {
      const isDark = document.body.classList.toggle('dark');
      const nextTheme = isDark ? 'dark' : 'light';
      localStorage.setItem('theme', nextTheme);
      if (themeKnob) themeKnob.innerHTML = isDark ? '<i class="ti ti-moon"></i>' : '<i class="ti ti-sun"></i>';
      showToast(`Tema diubah ke mode ${isDark ? 'Gelap' : 'Terang'}`, 'success');
    };
  }
}

// Format Date Utility
function formatDate(isoString) {
  if (!isoString) return '-';
  const date = new Date(isoString);
  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// ─── ROLE-BASED ROUTING HELPERS ──────────────────────────────────────
function getDashboardUrl(role) {
  if (role === 'admin') return 'dashboard_admin.html';
  if (role === 'petugas') return 'dashboard_petugas.html';
  return 'dashboard_pasien.html';
}

function redirectByRole(role) {
  window.location.href = getDashboardUrl(role);
}

// ─── DOKTER HARI INI — SHARED RENDERER ───────────────────────────────
/**
 * Fetch & render dokter yang praktik hari ini ke dalam containerId.
 * mode: 'public' → hanya info, tanpa tombol
 *       'pasien'  → ada tombol "Ambil Antrian" per dokter
 *       'admin'   → ada toggle hadir/status per dokter
 */
function loadDokterHariIni(containerId, mode = 'public', auth = null) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const headers = auth ? { 'Authorization': `Bearer ${auth.token}` } : {};

  fetch(`${API_BASE}/api/dokter/jadwal/hari-ini`, { headers })
    .then(res => res.json())
    .then(list => {
      if (!list.length) {
        container.innerHTML = `
          <div style="grid-column:1/-1; text-align:center; color:var(--text-secondary); padding:2rem 0;">
            <i class="ti ti-calendar-off" style="font-size:2rem; opacity:0.4; display:block; margin-bottom:0.5rem;"></i>
            Belum ada dokter yang dijadwalkan hari ini.
          </div>`;
        return;
      }

      container.innerHTML = list.map(d => {
        const statusClass = d.status === 'sedang_periksa' ? 'dokter-status-periksa'
                          : d.status === 'selesai'        ? 'dokter-status-selesai'
                          :                                 'dokter-status-tersedia';
        const statusLabel = d.status === 'sedang_periksa' ? '<i class="ti ti-activity"></i> Sedang Periksa'
                          : d.status === 'selesai'        ? '<i class="ti ti-check"></i> Selesai'
                          :                                 '<i class="ti ti-circle-check"></i> Tersedia';

        let actionHtml = '';
        if (mode === 'pasien') {
          const disabled = d.status === 'selesai' ? 'disabled' : '';
          actionHtml = `
            <button class="dokter-card-btn" ${disabled}
              onclick="ambilAntrianDokter(${d.id}, '${d.poli}')">
              <i class="ti ti-ticket"></i> Ambil Antrian
            </button>`;
        } else if (mode === 'admin') {
          actionHtml = `
            <div class="jadwal-toggle">
              <input type="checkbox" id="toggle-${d.id}"
                ${d.hadir ? 'checked' : ''}
                onchange="toggleHadirDokter(${d.id}, this.checked)" />
              <label for="toggle-${d.id}">Hadir hari ini</label>
            </div>`;
        }

        return `
          <div class="dokter-card">
            <div class="dokter-card-avatar"><i class="ti ti-stethoscope"></i></div>
            <div class="dokter-card-name">${d.nama}</div>
            <div class="dokter-card-poli"><i class="ti ti-building-hospital" style="font-size:0.8rem;"></i> ${d.poli || '–'}</div>
            <div class="dokter-card-jam"><i class="ti ti-clock" style="font-size:0.8rem;"></i> ${d.jam_mulai || '08:00'} – ${d.jam_selesai || '16:00'}</div>
            <div class="dokter-card-status ${statusClass}">${statusLabel}</div>
            ${actionHtml}
          </div>`;
      }).join('');
    })
    .catch(() => {
      container.innerHTML = `
        <div style="grid-column:1/-1; color:var(--text-secondary); font-size:0.875rem;">
          <i class="ti ti-wifi-off"></i> Gagal memuat info dokter.
        </div>`;
    });
}

// ─── ROUTING & INITIALIZATION ON PAGE LOAD ───────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initTheme();

  const pageId = document.body.id;
  const auth = getAuth();

  // Unified CTA handling on Navbar
  const navCta = document.getElementById('nav-cta');
  const navCtaBtn = document.getElementById('nav-cta-btn');
  if (navCta && navCtaBtn && auth) {
    navCtaBtn.textContent = 'Dashboard';
    navCta.href = getDashboardUrl(auth.user.role);
  }

  // Redirect if already logged in and visiting login/register
  if ((pageId === 'login-page' || pageId === 'register-page') && auth) {
    redirectByRole(auth.user.role);
    return;
  }

  // Route page specific logic
  switch (pageId) {
    case 'index-page':
      initIndexPage(auth);
      break;
    case 'login-page':
      initLoginPage();
      break;
    case 'register-page':
      initRegisterPage();
      break;
    case 'pasien-dashboard':
      if (!auth || auth.user.role !== 'pasien') {
        window.location.href = 'login.html';
      } else {
        initPasienDashboard(auth);
      }
      break;
    case 'petugas-dashboard':
      if (!auth || (auth.user.role !== 'petugas' && auth.user.role !== 'dokter')) {
        window.location.href = 'login.html';
      } else {
        initPetugasDashboard(auth);
      }
      break;
    case 'profil-page':
      if (!auth) {
        window.location.href = 'login.html';
      } else {
        initProfilPage(auth);
      }
      break;
    case 'admin-dashboard':
      if (!auth || auth.user.role !== 'admin') {
        window.location.href = 'login.html';
      } else {
        initAdminDashboard(auth);
      }
      break;
  }
});

// ─── PAGE LOGIC: INDEX / LANDING PAGE ────────────────────────────────
function initIndexPage(auth) {
  const servingNum = document.getElementById('current-serving-number');
  const servingStatus = document.getElementById('current-serving-status');
  const tableBody = document.getElementById('active-queues-table-body');
  const countBadge = document.getElementById('active-count-badge');
  const heroSecLink = document.getElementById('hero-secondary-link');

  if (heroSecLink && auth) {
    heroSecLink.href = getDashboardUrl(auth.user.role);
  }

  // Load dokter hari ini (publik)
  loadDokterHariIni('index-dokter-grid', 'public');

  function fetchActiveQueues() {
    fetch(`${API_BASE}/api/queue/status`)
      .then(res => res.json())
      .then(queues => {
        // Update total active badge
        countBadge.textContent = `${queues.length} Antrian Aktif`;

        // Update currently serving (first active queue with status 'dipanggil')
        const currentServing = queues.find(q => q.status === 'dipanggil');
        if (currentServing) {
          servingNum.textContent = currentServing.nomor_antrian;
          servingStatus.textContent = 'Silakan menuju ke Ruang Pemeriksaan';
          servingStatus.style.color = 'var(--color-brand)';
        } else {
          // If no active calling queue, check if there are waiting ones
          const waitingQueue = queues.find(q => q.status === 'menunggu');
          if (waitingQueue) {
            servingNum.textContent = '--';
            servingStatus.textContent = 'Menunggu panggilan berikutnya...';
            servingStatus.style.color = 'var(--text-secondary)';
          } else {
            servingNum.textContent = '--';
            servingStatus.textContent = 'Tidak ada antrian aktif saat ini';
            servingStatus.style.color = 'var(--text-secondary)';
          }
        }

        // Render queues table
        if (queues.length === 0) {
          tableBody.innerHTML = renderEmptyState(3, {
            icon: 'ti-armchair-2',
            title: 'Klinik sedang kosong',
            text: 'Tidak ada antrian aktif saat ini. Nikmati waktu santainya!'
          });
          return;
        }

        tableBody.innerHTML = queues.map(q => `
          <tr>
            <td style="font-weight: 700;">${q.nomor_antrian}</td>
            <td>${formatDate(q.created_at)}</td>
            <td>
              <span class="badge status-${q.status}">
                ${q.status === 'dipanggil' ? '<i class="ti ti-speakerphone"></i> dipanggil' : '<i class="ti ti-clock-hour-4"></i> menunggu'}
              </span>
            </td>
          </tr>
        `).join('');
      })
      .catch(err => {
        console.error('Error fetching status:', err);
        tableBody.innerHTML = renderEmptyState(3, {
          icon: 'ti-wifi-off',
          title: 'Gagal mengambil data',
          text: 'Periksa koneksi ke server lalu coba lagi.',
          variant: 'error'
        });
      });
  }

  // Initial fetch and start interval
  fetchActiveQueues();
  const pollInterval = setInterval(fetchActiveQueues, 10000);

  // Clean up interval when navigating away
  window.addEventListener('beforeunload', () => clearInterval(pollInterval));
}

// ─── PAGE LOGIC: LOGIN PAGE ──────────────────────────────────────────
function initLoginPage() {
  const form = document.getElementById('login-form');
  const submitBtn = document.getElementById('submit-btn');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Memproses...';

    fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Login gagal');
        return data;
      })
      .then(data => {
        saveAuth(data.access_token, data.user);
        showToast('Login Berhasil! Mengarahkan...', 'success');

        setTimeout(() => redirectByRole(data.user.role), 1000);
      })
      .catch(err => {
        showToast(err.message, 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Masuk';
      });
  });
}

// ─── PAGE LOGIC: REGISTER PAGE ───────────────────────────────────────
function initRegisterPage() {
  const form = document.getElementById('register-form');
  const submitBtn = document.getElementById('submit-btn');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const nama = document.getElementById('nama').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Memproses...';

    fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nama, email, password, role: 'pasien' })
    })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Registrasi gagal');
        return data;
      })
      .then(data => {
        // Save auth data returned directly by register endpoint
        saveAuth(data.access_token, data.user);
        showToast('Registrasi Berhasil! Selamat datang.', 'success');

        setTimeout(() => redirectByRole(data.user.role), 1200);
      })
      .catch(err => {
        showToast(err.message, 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Daftar';
      });
  });
}

// ─── PAGE LOGIC: PASIEN DASHBOARD ────────────────────────────────────
function initPasienDashboard(auth) {
  // Populate user name
  document.getElementById('pasien-name').textContent = auth.user.nama;

  // Setup Logout
  document.getElementById('logout-btn').onclick = () => {
    clearAuth();
    window.location.href = 'index.html';
  };

  const ticketSection = document.getElementById('ticket-section');
  const historyTableBody = document.getElementById('history-table-body');
  const clinicServing = document.getElementById('clinic-serving-number');
  const clinicActive = document.getElementById('clinic-active-count');

  // Load dokter hari ini
  loadDokterHariIni('pasien-dokter-grid', 'pasien', auth);

  // Ambil antrian berdasarkan dokter/poli pilihan
  window.ambilAntrianDokter = function(dokterId, poli) {
    fetch(`${API_BASE}/api/queue/ambil`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.token}`
      },
      body: JSON.stringify({ dokter_id: dokterId, poli })
    })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Gagal mengambil antrian');
        return data;
      })
      .then(data => {
        showToast(`Antrian berhasil diambil! Nomor: ${data.queue.nomor_antrian}`, 'success');
        loadDashboardData();
      })
      .catch(err => showToast(err.message, 'error'));
  };

  const estimasiEl = document.getElementById('estimasi-tunggu');

  // Rata-rata waktu layanan per pasien dalam menit
  const MENIT_PER_PASIEN = 10;

  function hitungEstimasi(queues, myQueue) {
    if (!estimasiEl) return;
    if (!myQueue) { estimasiEl.textContent = '–'; return; }
    if (myQueue.status === 'dipanggil') { estimasiEl.textContent = 'Giliran Anda!'; return; }
    const antriDepan = queues.filter(q =>
      q.status === 'menunggu' &&
      new Date(q.created_at) < new Date(myQueue.created_at)
    ).length;
    const totalMenit = antriDepan * MENIT_PER_PASIEN;
    estimasiEl.textContent = totalMenit === 0 ? '< 10 mnt' : `~${totalMenit} mnt`;
  }

  function loadDashboardData() {
    // 1. Fetch active clinic queue status
    fetch(`${API_BASE}/api/queue/status`)
      .then(res => res.json())
      .then(queues => {
        // Set clinic live stats
        clinicActive.textContent = queues.length;
        const currentServing = queues.find(q => q.status === 'dipanggil');
        clinicServing.textContent = currentServing ? currentServing.nomor_antrian : '--';

        // Check if current user has an active queue in the clinic
        const myActiveQueue = queues.find(q => String(q.user_id) === String(auth.user.id));

        // Hitung estimasi waktu tunggu dinamis
        hitungEstimasi(queues, myActiveQueue);

        if (myActiveQueue) {
          // Calculate estimation of people in front
          // Filter queues with status 'menunggu' that have a lower ID / were created before
          const waitingInFront = queues.filter(q =>
            q.status === 'menunggu' &&
            new Date(q.created_at) < new Date(myActiveQueue.created_at)
          ).length;

          let estimationText = '';
          if (myActiveQueue.status === 'dipanggil') {
            estimationText = 'Nomor Anda sedang dipanggil! Silakan ke Ruang Pemeriksaan.';
          } else if (waitingInFront === 0) {
            estimationText = 'Anda adalah antrian berikutnya. Bersiaplah!';
          } else {
            estimationText = `Ada ${waitingInFront} orang menunggu di depan Anda.`;
          }

          ticketSection.innerHTML = `
            <div class="card my-ticket-card">
              <div class="active-label">
                <span class="pulse-dot" style="background-color: ${myActiveQueue.status === 'dipanggil' ? 'var(--status-active-text)' : 'var(--status-waiting-text)'}"></span>
                Antrian Anda (${myActiveQueue.status === 'dipanggil' ? '<i class="ti ti-speakerphone"></i> Dipanggil' : '<i class="ti ti-clock-hour-4"></i> Menunggu'})
              </div>
              <div class="ticket-number">${myActiveQueue.nomor_antrian}</div>
              <div class="ticket-estimation">${estimationText}</div>
              <button id="cancel-queue-btn" class="logout-btn" style="width: 100%;" data-id="${myActiveQueue.id}">Batalkan Antrian</button>
            </div>
          `;

          // Attach cancel event
          document.getElementById('cancel-queue-btn').onclick = function () {
            const queueId = this.getAttribute('data-id');
            if (confirm('Apakah Anda yakin ingin membatalkan antrian ini?')) {
              this.disabled = true;
              this.textContent = 'Membatalkan...';

              fetch(`${API_BASE}/api/queue/batal/${queueId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${auth.token}` }
              })
                .then(async res => {
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.message || 'Gagal membatalkan antrian');
                  return data;
                })
                .then(() => {
                  showToast('Antrian berhasil dibatalkan.', 'success');
                  loadDashboardData();
                })
                .catch(err => {
                  showToast(err.message, 'error');
                  this.disabled = false;
                  this.textContent = 'Batalkan Antrian';
                });
            }
          };

        } else {
          // No active queue: Render "Ambil Antrian" UI
          ticketSection.innerHTML = `
            <div class="card take-queue-card">
              <div class="take-queue-icon"><i class="ti ti-ticket"></i></div>
              <h3 style="margin-bottom: 0.5rem; font-weight: 800;">Belum Mengambil Antrian</h3>
              <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 1.5rem;">
                Silakan ambil nomor antrian untuk mendapatkan pelayanan medis hari ini.
              </p>
              <button id="take-queue-btn" class="auth-btn" style="margin-top: 0;">Ambil Nomor Antrian</button>
            </div>
          `;

          // Attach take event
          document.getElementById('take-queue-btn').onclick = function () {
            this.disabled = true;
            this.textContent = 'Mengambil...';

            fetch(`${API_BASE}/api/queue/ambil`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${auth.token}` }
            })
              .then(async res => {
                const data = await res.json();
                if (!res.ok) throw new Error(data.message || 'Gagal mengambil antrian');
                return data;
              })
              .then(data => {
                showToast(`Antrian berhasil diambil! Nomor Anda: ${data.queue.nomor_antrian}`, 'success');
                loadDashboardData();
              })
              .catch(err => {
                showToast(err.message, 'error');
                this.disabled = false;
                this.textContent = 'Ambil Nomor Antrian';
              });
          };
        }
      })
      .catch(err => console.error('Error loading active queues:', err));

    // 2. Fetch Personal Queue History
    fetch(`${API_BASE}/api/history/`, {
      headers: { 'Authorization': `Bearer ${auth.token}` }
    })
      .then(res => res.json())
      .then(history => {
        if (history.length === 0) {
          historyTableBody.innerHTML = renderEmptyState(3, {
            icon: 'ti-history-toggle',
            title: 'Belum ada riwayat',
            text: 'Riwayat antrian Anda yang selesai/batal akan tampil di sini.'
          });
          return;
        }

        historyTableBody.innerHTML = history.map(h => `
          <tr>
            <td style="font-weight: 700;">${h.nomor_antrian}</td>
            <td>${formatDate(h.created_at)}</td>
            <td>
              <span class="badge status-${h.status}">${h.status}</span>
            </td>
          </tr>
        `).join('');
      })
      .catch(err => {
        console.error('Error fetching history:', err);
        historyTableBody.innerHTML = renderEmptyState(3, {
          icon: 'ti-wifi-off',
          title: 'Gagal mengambil riwayat',
          text: 'Periksa koneksi ke server lalu coba lagi.',
          variant: 'error'
        });
      });
  }

  // Load and set poll interval
  loadDashboardData();
  const pollInterval = setInterval(loadDashboardData, 10000);
  window.addEventListener('beforeunload', () => clearInterval(pollInterval));
}

// ─── PAGE LOGIC: PETUGAS DASHBOARD ───────────────────────────────────
function initPetugasDashboard(auth) {
  // Populate officer name
  document.getElementById('petugas-name').textContent = auth.user.nama;

  // Setup Logout
  document.getElementById('logout-btn').onclick = () => {
    clearAuth();
    window.location.href = 'index.html';
  };

  const tableBody = document.getElementById('petugas-queues-table-body');
  const statTotal = document.getElementById('stat-total');
  const statWaiting = document.getElementById('stat-waiting');
  const statServing = document.getElementById('stat-serving');
  const statDone = document.getElementById('stat-done');
  const refreshBtn = document.getElementById('refresh-btn');

  // Selesai hari ini dihitung lewat endpoint terpisah (/api/queue/status hanya
  // mengembalikan antrian aktif: menunggu/dipanggil, tidak termasuk selesai)
  function loadRekapData() {
    fetch(`${API_BASE}/api/queue/rekap`)
      .then(res => res.json())
      .then(data => {
        if (statDone) statDone.textContent = data.selesai_hari_ini ?? 0;
      })
      .catch(err => {
        console.error('Error fetching rekap:', err);
        if (statDone) statDone.textContent = '–';
      });
  }

  function loadPetugasData() {
    fetch(`${API_BASE}/api/queue/status`)
      .then(res => res.json())
      .then(queues => {
        // Calculate statistics
        const total = queues.length;
        const waiting = queues.filter(q => q.status === 'menunggu').length;
        const serving = queues.filter(q => q.status === 'dipanggil').length;

        statTotal.textContent = total;
        statWaiting.textContent = waiting;
        statServing.textContent = serving;

        if (queues.length === 0) {
          tableBody.innerHTML = renderEmptyState(5, {
            icon: 'ti-clipboard-text',
            title: 'Tidak ada antrian aktif',
            text: 'Semua pasien sudah selesai dilayani. Kerja bagus!'
          });
          return;
        }

        // Render queue control panel
        tableBody.innerHTML = queues.map(q => {
          let actionButtons = '';
          if (q.status === 'menunggu') {
            actionButtons = `
              <button class="action-btn btn-call" onclick="updateQueueStatus(${q.id}, 'panggil')"><i class="ti ti-speakerphone"></i> Panggil</button>
              <button class="action-btn btn-complete" onclick="updateQueueStatus(${q.id}, 'selesai')"><i class="ti ti-check"></i> Selesai</button>
            `;
          } else if (q.status === 'dipanggil') {
            actionButtons = `
              <button class="action-btn btn-complete" onclick="updateQueueStatus(${q.id}, 'selesai')"><i class="ti ti-check"></i> Selesai</button>
            `;
          }

          // Add a cancellation option from staff view too
          actionButtons += `
            <button class="action-btn btn-cancel" onclick="cancelQueueFromStaff(${q.id}, '${q.nomor_antrian}')"><i class="ti ti-x"></i> Batal</button>
          `;

          return `
            <tr>
              <td style="font-weight: 700;">${q.nomor_antrian}</td>
              <td style="font-weight: 500;">${q.nama_pasien || 'Pasien Klinik'}</td>
              <td>${formatDate(q.created_at)}</td>
              <td>
                <span class="badge status-${q.status}">
                  ${q.status === 'dipanggil' ? '<i class="ti ti-speakerphone"></i> dipanggil' : '<i class="ti ti-clock-hour-4"></i> menunggu'}
                </span>
              </td>
              <td>
                <div class="btn-group">
                  ${actionButtons}
                </div>
              </td>
            </tr>
          `;
        }).join('');
      })
      .catch(err => {
        console.error('Error fetching staff queues:', err);
        tableBody.innerHTML = renderEmptyState(5, {
          icon: 'ti-wifi-off',
          title: 'Gagal mengambil data',
          text: 'Periksa koneksi ke server lalu coba lagi.',
          variant: 'error'
        });
      });
  }

  // Expose action handlers to window namespace so inline onclick attributes can call them
  window.updateQueueStatus = function (queueId, action) {
    const endpoint = `/api/queue/${action}/${queueId}`;

    fetch(`${API_BASE}${endpoint}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${auth.token}` }
    })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Gagal mengubah status antrian');
        return data;
      })
      .then(data => {
        const actionLabel = action === 'panggil' ? 'dipanggil' : 'selesai diproses';
        showToast(`Antrian ${data.queue.nomor_antrian} berhasil ${actionLabel}!`, 'success');
        loadPetugasData();
        if (action === 'selesai') loadRekapData();
      })
      .catch(err => {
        showToast(err.message, 'error');
      });
  };

  window.cancelQueueFromStaff = function (queueId, nomorAntrian) {
    if (confirm(`Apakah Anda yakin ingin membatalkan antrian ${nomorAntrian}?`)) {
      fetch(`${API_BASE}/api/queue/batal/${queueId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${auth.token}` }
      })
        .then(async res => {
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || 'Gagal membatalkan antrian');
          return data;
        })
        .then(() => {
          showToast(`Antrian ${nomorAntrian} berhasil dibatalkan.`, 'success');
          loadPetugasData();
        })
        .catch(err => {
          showToast(err.message, 'error');
        });
    }
  };

  // Initial load
  loadPetugasData();
  loadRekapData();

  // Setup manual refresh
  refreshBtn.onclick = () => {
    loadPetugasData();
    loadRekapData();
    showToast('Data antrian klinik telah disegarkan.', 'success');
  };

  // Poll active clinic queues status
  const pollInterval = setInterval(() => {
    loadPetugasData();
    loadRekapData();
  }, 10000);
  window.addEventListener('beforeunload', () => clearInterval(pollInterval));
}
// ─── PAGE LOGIC: ADMIN DASHBOARD ─────────────────────────────────────
function initAdminDashboard(auth) {
  document.getElementById('admin-name').textContent = auth.user.nama;

  document.getElementById('logout-btn').onclick = () => {
    clearAuth();
    window.location.href = 'index.html';
  };

  const statPasien = document.getElementById('stat-total-pasien');
  const statPetugas = document.getElementById('stat-total-petugas');
  const statAntrian = document.getElementById('stat-antrian-hari-ini');
  const statPoli = document.getElementById('stat-total-poli');

  const petugasTableBody = document.getElementById('petugas-table-body');
  const poliTableBody = document.getElementById('poli-table-body');
  const antrianTableBody = document.getElementById('admin-antrian-table-body');

  // ── Jadwal Dokter Hari Ini ─────────────────────────────────────────
  loadDokterHariIni('admin-dokter-grid', 'admin', auth);

  document.getElementById('refresh-jadwal-btn')?.addEventListener('click', () => {
    loadDokterHariIni('admin-dokter-grid', 'admin', auth);
    showToast('Data dokter diperbarui.', 'success');
  });

  window.toggleHadirDokter = function(dokterId, hadir) {
    fetch(`${API_BASE}/api/dokter/jadwal/${dokterId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.token}`
      },
      body: JSON.stringify({ hadir })
    })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Gagal update jadwal');
        showToast(`Jadwal dokter berhasil diperbarui.`, 'success');
        loadDokterHariIni('admin-dokter-grid', 'admin', auth);
      })
      .catch(err => {
        showToast(err.message, 'error');
        loadDokterHariIni('admin-dokter-grid', 'admin', auth);
      });
  };

  // ── Stat overview ──────────────────────────────────────────────────
  function loadStats() {
    fetch(`${API_BASE}/api/admin/stats`, {
      headers: { 'Authorization': `Bearer ${auth.token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (statPasien) statPasien.textContent = data.total_pasien ?? '–';
        if (statPetugas) statPetugas.textContent = data.total_petugas ?? '–';
        if (statAntrian) statAntrian.textContent = data.antrian_hari_ini ?? '–';
        if (statPoli) statPoli.textContent = data.total_poli ?? '–';
      })
      .catch(() => { });
  }

  // ── Manajemen Petugas ──────────────────────────────────────────────
  function loadPetugas() {
    fetch(`${API_BASE}/api/admin/petugas`, {
      headers: { 'Authorization': `Bearer ${auth.token}` }
    })
      .then(res => res.json())
      .then(list => {
        if (!list.length) {
          petugasTableBody.innerHTML = renderEmptyState(4, {
            icon: 'ti-users',
            title: 'Belum ada petugas',
            text: 'Tambahkan akun petugas menggunakan form di atas.'
          });
          return;
        }
        petugasTableBody.innerHTML = list.map(p => `
          <tr>
            <td style="font-weight:600;">${p.nama}</td>
            <td>${p.email}</td>
            <td>${p.poli || '–'}</td>
            <td>
              <button class="action-btn btn-cancel" onclick="deletePetugas(${p.id}, '${p.nama}')">
                <i class="ti ti-trash"></i> Hapus
              </button>
            </td>
          </tr>
        `).join('');
      })
      .catch(() => {
        petugasTableBody.innerHTML = renderEmptyState(4, {
          icon: 'ti-wifi-off', title: 'Gagal mengambil data',
          text: 'Periksa koneksi ke server.', variant: 'error'
        });
      });
  }

  // Form tambah petugas
  const addPetugasForm = document.getElementById('add-petugas-form');
  if (addPetugasForm) {
    addPetugasForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const btn = addPetugasForm.querySelector('button[type="submit"]');
      const nama = document.getElementById('petugas-nama').value.trim();
      const email = document.getElementById('petugas-email').value.trim();
      const password = document.getElementById('petugas-password').value;
      const poli = document.getElementById('petugas-poli').value.trim();

      btn.disabled = true;
      btn.textContent = 'Menyimpan...';

      fetch(`${API_BASE}/api/admin/petugas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify({ nama, email, password, poli, role: 'petugas' })
      })
        .then(async res => {
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || 'Gagal menambahkan petugas');
          return data;
        })
        .then(() => {
          showToast('Akun petugas berhasil dibuat!', 'success');
          addPetugasForm.reset();
          loadPetugas();
          loadStats();
        })
        .catch(err => showToast(err.message, 'error'))
        .finally(() => {
          btn.disabled = false;
          btn.textContent = 'Tambah Petugas';
        });
    });
  }

  window.deletePetugas = function (id, nama) {
    if (!confirm(`Hapus akun petugas "${nama}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    fetch(`${API_BASE}/api/admin/petugas/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${auth.token}` }
    })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Gagal menghapus petugas');
        showToast(`Akun "${nama}" berhasil dihapus.`, 'success');
        loadPetugas();
        loadStats();
      })
      .catch(err => showToast(err.message, 'error'));
  };

  // ── Manajemen Poli ─────────────────────────────────────────────────
  function loadPoli() {
    fetch(`${API_BASE}/api/admin/poli`, {
      headers: { 'Authorization': `Bearer ${auth.token}` }
    })
      .then(res => res.json())
      .then(list => {
        if (!list.length) {
          poliTableBody.innerHTML = renderEmptyState(3, {
            icon: 'ti-building-hospital',
            title: 'Belum ada poli',
            text: 'Tambahkan poli/layanan menggunakan form di atas.'
          });
          return;
        }
        poliTableBody.innerHTML = list.map(p => `
          <tr>
            <td style="font-weight:600;">${p.nama}</td>
            <td>${p.deskripsi || '–'}</td>
            <td>
              <button class="action-btn btn-cancel" onclick="deletePoli(${p.id}, '${p.nama}')">
                <i class="ti ti-trash"></i> Hapus
              </button>
            </td>
          </tr>
        `).join('');
      })
      .catch(() => {
        poliTableBody.innerHTML = renderEmptyState(3, {
          icon: 'ti-wifi-off', title: 'Gagal mengambil data',
          text: 'Periksa koneksi ke server.', variant: 'error'
        });
      });
  }

  const addPoliForm = document.getElementById('add-poli-form');
  if (addPoliForm) {
    addPoliForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const btn = addPoliForm.querySelector('button[type="submit"]');
      const nama = document.getElementById('poli-nama').value.trim();
      const deskripsi = document.getElementById('poli-deskripsi').value.trim();

      btn.disabled = true;
      btn.textContent = 'Menyimpan...';

      fetch(`${API_BASE}/api/admin/poli`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify({ nama, deskripsi })
      })
        .then(async res => {
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || 'Gagal menambahkan poli');
          return data;
        })
        .then(() => {
          showToast('Poli berhasil ditambahkan!', 'success');
          addPoliForm.reset();
          loadPoli();
          loadStats();
        })
        .catch(err => showToast(err.message, 'error'))
        .finally(() => {
          btn.disabled = false;
          btn.textContent = 'Tambah Poli';
        });
    });
  }

  window.deletePoli = function (id, nama) {
    if (!confirm(`Hapus poli "${nama}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    fetch(`${API_BASE}/api/admin/poli/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${auth.token}` }
    })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Gagal menghapus poli');
        showToast(`Poli "${nama}" berhasil dihapus.`, 'success');
        loadPoli();
        loadStats();
      })
      .catch(err => showToast(err.message, 'error'));
  };

  // ── Monitor Antrian (semua poli) ───────────────────────────────────
  function loadAntrianAdmin() {
    fetch(`${API_BASE}/api/queue/status`, {
      headers: { 'Authorization': `Bearer ${auth.token}` }
    })
      .then(res => res.json())
      .then(queues => {
        if (!queues.length) {
          antrianTableBody.innerHTML = renderEmptyState(5, {
            icon: 'ti-clipboard-text',
            title: 'Tidak ada antrian aktif',
            text: 'Semua antrian sudah selesai atau belum ada yang mendaftar.'
          });
          return;
        }
        antrianTableBody.innerHTML = queues.map(q => `
          <tr>
            <td style="font-weight:700;">${q.nomor_antrian}</td>
            <td>${q.nama_pasien || '–'}</td>
            <td>${q.poli || '–'}</td>
            <td>${formatDate(q.created_at)}</td>
            <td><span class="badge status-${q.status}">${q.status}</span></td>
          </tr>
        `).join('');
      })
      .catch(() => {
        antrianTableBody.innerHTML = renderEmptyState(5, {
          icon: 'ti-wifi-off', title: 'Gagal mengambil data',
          text: 'Periksa koneksi ke server.', variant: 'error'
        });
      });
  }

  const refreshAntrianBtn = document.getElementById('refresh-antrian-btn');
  if (refreshAntrianBtn) {
    refreshAntrianBtn.onclick = () => {
      loadAntrianAdmin();
      showToast('Data antrian diperbarui.', 'success');
    };
  }

  // ── Initial load & polling ─────────────────────────────────────────
  loadStats();
  loadPetugas();
  loadPoli();
  loadAntrianAdmin();

  const pollInterval = setInterval(() => {
    loadStats();
    loadAntrianAdmin();
  }, 15000);
  window.addEventListener('beforeunload', () => clearInterval(pollInterval));
}
// ─── PAGE LOGIC: PROFIL PASIEN ────────────────────────────────────────
function initProfilPage(auth) {
  // Populate existing data
  document.getElementById('profil-nama').value  = auth.user.nama  || '';
  document.getElementById('profil-email').value = auth.user.email || '';

  document.getElementById('logout-btn').onclick = () => {
    clearAuth();
    window.location.href = 'index.html';
  };

  // ── Update Profil ────────────────────────────────────────────────
  const profilForm = document.getElementById('profil-form');
  profilForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn  = document.getElementById('profil-submit-btn');
    const nama  = document.getElementById('profil-nama').value.trim();
    const email = document.getElementById('profil-email').value.trim();

    btn.disabled = true;
    btn.textContent = 'Menyimpan...';

    fetch(`${API_BASE}/api/auth/profil`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.token}`
      },
      body: JSON.stringify({ nama, email })
    })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Gagal memperbarui profil');
        return data;
      })
      .then(data => {
        // Update stored user data
        saveAuth(auth.token, { ...auth.user, nama: data.user.nama, email: data.user.email });
        showToast('Profil berhasil diperbarui!', 'success');
      })
      .catch(err => showToast(err.message, 'error'))
      .finally(() => {
        btn.disabled = false;
        btn.textContent = 'Simpan Perubahan';
      });
  });

  // ── Ganti Password ───────────────────────────────────────────────
  const passForm = document.getElementById('password-form');
  passForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn         = document.getElementById('password-submit-btn');
    const passwordLama = document.getElementById('password-lama').value;
    const passwordBaru = document.getElementById('password-baru').value;
    const passwordKonfirmasi = document.getElementById('password-konfirmasi').value;

    if (passwordBaru !== passwordKonfirmasi) {
      showToast('Password baru dan konfirmasi tidak cocok.', 'error');
      return;
    }
    if (passwordBaru.length < 8) {
      showToast('Password baru minimal 8 karakter.', 'error');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Menyimpan...';

    fetch(`${API_BASE}/api/auth/ganti-password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.token}`
      },
      body: JSON.stringify({ password_lama: passwordLama, password_baru: passwordBaru })
    })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Gagal mengganti password');
        return data;
      })
      .then(() => {
        showToast('Password berhasil diubah!', 'success');
        passForm.reset();
      })
      .catch(err => showToast(err.message, 'error'))
      .finally(() => {
        btn.disabled = false;
        btn.textContent = 'Ganti Password';
      });
  });
}