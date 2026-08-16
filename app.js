/**
 * 個人書櫃與借閱統計系統 - 核心邏輯
 * 適用於個人藏書整理與自主學習成果展現
 */

// 預設範例資料（供第一次載入或重置時使用）
const DEFAULT_BOOKS = [];

// 應用程式狀態 (State)
let books = [];
let currentDetailBookId = null;

// DOM 元素引用
const booksGrid = document.getElementById('books-grid');
const emptyState = document.getElementById('empty-state');

// 統計元素
const statTotal = document.getElementById('stat-total');
const statAvailable = document.getElementById('stat-available');
const statBorrowed = document.getElementById('stat-borrowed');
const statCategories = document.getElementById('stat-categories');

// 搜尋與篩選元素
const searchInput = document.getElementById('search-input');
const filterCategory = document.getElementById('filter-category');
const filterStatus = document.getElementById('filter-status');
const sortBy = document.getElementById('sort-by');

// 初始化應用程式
function initApp() {
  initBootScreen();
  cycleLyrics(); // 頁面一開立即啟動歌詞字幕輪播！
  loadBooksFromStorage();
  setupEventListeners();
  renderApp();
}

// 預先掛載全域處理函數防止載入延遲
window.handleBootKeypad = function(char) {
  if (window._handleBootInputReal) {
    window._handleBootInputReal(char);
  }
};

// ==========================================================================
// 🎵 專屬神曲《青銅密語》音訊播放與動態歌詞引擎
// ==========================================================================
let isMusicPlaying = false;
let lyricsTimer = null;
let currentLyricIdx = 0;

// 古風歌曲《青銅密語》專屬動態歌詞庫
const ANCIENT_LYRICS = [
  { main: "「一曲嗩吶破黃泉，千年青銅鎖萬仙」", sub: "冥霧漫漫 · 玄門未開 · 靜待有緣" },
  { main: "「饕餮暗鎖符文動，敢問君子何處來」", sub: "敲擊密碼 · 符文共鳴 · 引動乾坤" },
  { main: "「若逢密碼心不對，厲鬼破門現形骸」", sub: "幽冥煞氣 · 萬鬼呼嘯 · 莫闖玄關" },
  { main: "「神光乍現青銅展，萬卷藏書入懷來」", sub: "金石為開 · 迎光入殿 · 藏書大啟" },
  { main: "「借閱乾坤自成竹，讀書何必待明朝」", sub: "自主學習 · 書香漫卷 · 筆墨通神" }
];

function getBgmAudio() {
  return document.getElementById('bgm-audio');
}

// 動態歌詞獨立循環滾動 (頁面一開立即自動滾動)
function cycleLyrics() {
  const mainEl = document.getElementById('lyrics-main');
  const subEl = document.getElementById('lyrics-sub');

  if (mainEl && subEl) {
    const item = ANCIENT_LYRICS[currentLyricIdx];
    mainEl.style.opacity = '0';
    mainEl.style.transform = 'scale(0.92)';

    setTimeout(() => {
      mainEl.textContent = item.main;
      subEl.textContent = item.sub;
      mainEl.style.opacity = '1';
      mainEl.style.transform = 'scale(1.03)';
    }, 280);

    currentLyricIdx = (currentLyricIdx + 1) % ANCIENT_LYRICS.length;
  }

  clearTimeout(lyricsTimer);
  lyricsTimer = setTimeout(cycleLyrics, 4500);
}

// 確保音樂播放
function ensureMusicPlaying() {
  if (isMusicPlaying) return;
  startMusicPlayback();
}

function startMusicPlayback() {
  const audio = getBgmAudio();
  isMusicPlaying = true;

  if (audio) {
    audio.volume = 0.7;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        updateMusicBtnUI(true);
      }).catch(err => {
        console.log('音訊播放等待使用者點擊:', err);
      });
    }
  }

  updateMusicBtnUI(true);
}

function stopMusicPlayback() {
  const audio = getBgmAudio();
  isMusicPlaying = false;

  if (audio) {
    audio.pause();
  }
  updateMusicBtnUI(false);
}

window.toggleMusicPlayback = function() {
  if (isMusicPlaying) {
    stopMusicPlayback();
  } else {
    startMusicPlayback();
  }
};

// 保持與舊介面相容
window.toggleSuonaBGM = window.toggleMusicPlayback;
window.toggleAncientBGM = window.toggleMusicPlayback;

function updateMusicBtnUI(playing) {
  const bootIcon = document.getElementById('boot-suona-icon');
  const bootText = document.getElementById('boot-suona-text');
  const headerText = document.getElementById('header-suona-text');
  const btnSuona = document.getElementById('btn-suona-toggle');
  const lyricsContainer = document.getElementById('suona-lyrics-container');

  const text = playing ? '青銅密語: 播放中' : '青銅密語: 已暫停';
  if (bootText) bootText.textContent = text;
  if (headerText) headerText.textContent = playing ? '青銅密語' : '音樂已暫停';

  if (bootIcon) {
    bootIcon.textContent = playing ? '🎵' : '🔇';
  }
  if (btnSuona) {
    btnSuona.style.borderColor = playing ? 'var(--accent-color)' : 'var(--border-color)';
    btnSuona.style.color = playing ? 'var(--accent-color)' : 'var(--text-muted)';
  }
  if (lyricsContainer) {
    lyricsContainer.style.opacity = '1';
  }
}

// 首次使用者點擊/按鍵/觸控時自動啟動《青銅密語》
['click', 'touchstart', 'keydown'].forEach(evtType => {
  document.addEventListener(evtType, () => {
    ensureMusicPlaying();
  }, { once: true, passive: true });
});

// ==========================================================================
// 3D 古老青銅門機關與厲鬼破門 (Boot Screen Module)
// ==========================================================================
const VALID_BOOT_PASSWORDS = ['520945', '8888'];
let bootAudioCtx = null;
let bootAudioEnabled = true;

function initBootAudio() {
  if (!bootAudioCtx) {
    bootAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (bootAudioCtx.state === 'suspended') {
    bootAudioCtx.resume();
  }
}

window.toggleBootAudio = function() {
  bootAudioEnabled = !bootAudioEnabled;
  const icon = document.getElementById('boot-audio-icon');
  const text = document.getElementById('boot-audio-text');
  if (icon && text) {
    icon.innerHTML = bootAudioEnabled ? '<i class="fa-solid fa-volume-high"></i>' : '<i class="fa-solid fa-volume-xmark"></i>';
    text.textContent = bootAudioEnabled ? '音效已啟用' : '音效已靜音';
  }
};

function playBootClickSound() {
  if (!bootAudioEnabled) return;
  initBootAudio();
  try {
    const osc = bootAudioCtx.createOscillator();
    const gain = bootAudioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, bootAudioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(60, bootAudioCtx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.3, bootAudioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, bootAudioCtx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(bootAudioCtx.destination);
    osc.start();
    osc.stop(bootAudioCtx.currentTime + 0.08);
  } catch (e) { console.warn(e); }
}

function playBootGateOpenSound() {
  if (!bootAudioEnabled) return;
  initBootAudio();
  try {
    const bufferSize = bootAudioCtx.sampleRate * 2.5;
    const noiseBuffer = bootAudioCtx.createBuffer(1, bufferSize, bootAudioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    const whiteNoise = bootAudioCtx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = bootAudioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(120, bootAudioCtx.currentTime);
    filter.frequency.linearRampToValueAtTime(450, bootAudioCtx.currentTime + 1.2);
    filter.frequency.linearRampToValueAtTime(80, bootAudioCtx.currentTime + 2.5);

    const noiseGain = bootAudioCtx.createGain();
    noiseGain.gain.setValueAtTime(0.6, bootAudioCtx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, bootAudioCtx.currentTime + 2.5);

    whiteNoise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(bootAudioCtx.destination);
    whiteNoise.start();

    const freqs = [110, 164.8, 220, 329.6];
    freqs.forEach((f) => {
      const osc = bootAudioCtx.createOscillator();
      const gain = bootAudioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, bootAudioCtx.currentTime);
      gain.gain.setValueAtTime(0.15, bootAudioCtx.currentTime + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, bootAudioCtx.currentTime + 2.0);
      osc.connect(gain);
      gain.connect(bootAudioCtx.destination);
      osc.start(bootAudioCtx.currentTime + 0.1);
      osc.stop(bootAudioCtx.currentTime + 2.0);
    });
  } catch (e) { console.warn(e); }
}

function playBootGateSlamSound() {
  if (!bootAudioEnabled) return;
  initBootAudio();
  try {
    const osc = bootAudioCtx.createOscillator();
    const gain = bootAudioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, bootAudioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(20, bootAudioCtx.currentTime + 0.5);
    gain.gain.setValueAtTime(0.85, bootAudioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, bootAudioCtx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(bootAudioCtx.destination);
    osc.start();
    osc.stop(bootAudioCtx.currentTime + 0.5);
  } catch (e) { console.warn(e); }
}

function playBootGhostScreamSound() {
  if (!bootAudioEnabled) return;
  initBootAudio();
  try {
    const carrier = bootAudioCtx.createOscillator();
    const modulator = bootAudioCtx.createOscillator();
    const modGain = bootAudioCtx.createGain();
    const mainGain = bootAudioCtx.createGain();

    carrier.type = 'sawtooth';
    carrier.frequency.setValueAtTime(450, bootAudioCtx.currentTime);
    carrier.frequency.exponentialRampToValueAtTime(1400, bootAudioCtx.currentTime + 0.3);
    carrier.frequency.exponentialRampToValueAtTime(220, bootAudioCtx.currentTime + 1.6);

    modulator.type = 'square';
    modulator.frequency.setValueAtTime(50, bootAudioCtx.currentTime);
    modGain.gain.setValueAtTime(350, bootAudioCtx.currentTime);

    modulator.connect(modGain);
    modGain.connect(carrier.frequency);

    mainGain.gain.setValueAtTime(0.85, bootAudioCtx.currentTime);
    mainGain.gain.exponentialRampToValueAtTime(0.01, bootAudioCtx.currentTime + 1.7);

    carrier.connect(mainGain);
    mainGain.connect(bootAudioCtx.destination);

    modulator.start();
    carrier.start();
    modulator.stop(bootAudioCtx.currentTime + 1.7);
    carrier.stop(bootAudioCtx.currentTime + 1.7);

    const oscLow = bootAudioCtx.createOscillator();
    const gainLow = bootAudioCtx.createGain();
    oscLow.type = 'sine';
    oscLow.frequency.setValueAtTime(200, bootAudioCtx.currentTime);
    oscLow.frequency.exponentialRampToValueAtTime(35, bootAudioCtx.currentTime + 0.7);
    gainLow.gain.setValueAtTime(0.9, bootAudioCtx.currentTime);
    gainLow.gain.exponentialRampToValueAtTime(0.01, bootAudioCtx.currentTime + 0.7);
    oscLow.connect(gainLow);
    gainLow.connect(bootAudioCtx.destination);
    oscLow.start();
    oscLow.stop(bootAudioCtx.currentTime + 0.7);
  } catch (e) { console.warn(e); }
}

function initBootScreen() {
  const bootScreen = document.getElementById('boot-screen');
  if (!bootScreen) return;

  const ghostEmergence = document.getElementById('ghost-emergence');
  const bloodOverlay = document.getElementById('blood-overlay');
  const statusToast = document.getElementById('boot-status-toast');
  const bootPwdInput = document.getElementById('boot-password-input');

  let currentInput = '';
  let isOpening = false;
  let isJumpscaring = false;

  function updateDisplay() {
    for (let i = 1; i <= 6; i++) {
      const el = document.getElementById('pd' + i);
      if (!el) continue;
      if (i <= currentInput.length) {
        // ✨ 極致 4K 金光雕刻數字
        el.textContent = currentInput[i - 1];
        el.style.color = '#ffffff';
        el.style.borderColor = '#ffd700';
        el.style.background = 'linear-gradient(180deg, #2b5547 0%, #152d25 100%)';
        el.style.boxShadow = '0 0 16px rgba(255, 215, 0, 0.8), inset 0 1px 3px rgba(255, 255, 255, 0.6)';
        el.style.textShadow = '0 2px 4px rgba(0, 0, 0, 0.9), 0 0 10px #ffd700';
        el.style.transform = 'scale(1.06)';
      } else {
        el.textContent = '-';
        el.style.color = 'rgba(61, 250, 203, 0.5)';
        el.style.borderColor = 'rgba(61, 250, 203, 0.35)';
        el.style.background = 'linear-gradient(180deg, #11221b 0%, #060e0b 100%)';
        el.style.boxShadow = 'inset 0 1px 3px rgba(255, 255, 255, 0.1), inset 0 0 10px rgba(0, 0, 0, 0.9)';
        el.style.textShadow = 'none';
        el.style.transform = 'scale(1)';
      }
    }
    if (bootPwdInput && bootPwdInput.value !== currentInput) {
      bootPwdInput.value = currentInput;
    }
  }

  let lastInputTime = 0;
  function handleInput(char) {
    if (isOpening || isJumpscaring) return;
    
    // 任何按鍵互動立即喚醒音樂播放
    ensureMusicPlaying();
    
    // 防重複過快連擊 (50ms)
    const now = Date.now();
    if (now - lastInputTime < 40 && char !== 'clear' && char !== 'backspace') return;
    lastInputTime = now;

    if (char === 'clear') {
      currentInput = '';
      updateDisplay();
      playBootClickSound();
      return;
    }
    
    if (char === 'backspace') {
      currentInput = currentInput.slice(0, -1);
      updateDisplay();
      playBootClickSound();
      return;
    }

    if (char === 'enter') {
      if (currentInput.length > 0) {
        checkPassword();
      }
      return;
    }

    if (currentInput.length < 6 && char >= '0' && char <= '9') {
      currentInput += char;
      playBootClickSound();
      updateDisplay();
      if (currentInput.length === 6 || currentInput === '8888') {
        setTimeout(checkPassword, 280);
      }
    }
  }

  window.handleBootKeypad = handleInput;
  window._handleBootInputReal = handleInput;

  // 為所有按鍵綁定點擊與觸控
  const numPad = document.getElementById('quick-num-pad');
  if (numPad) {
    numPad.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-key');
      if (btn) {
        e.preventDefault();
        e.stopPropagation();
        const key = btn.getAttribute('data-key');
        if (key) handleInput(key);
      }
    });

    numPad.addEventListener('touchstart', (e) => {
      const btn = e.target.closest('.btn-key');
      if (btn) {
        const key = btn.getAttribute('data-key');
        if (key) {
          handleInput(key);
          if (navigator.vibrate) navigator.vibrate(15);
        }
      }
    }, { passive: false });
  }

  // 專為平板與手機提供點擊聚焦喚醒虛擬鍵盤
  window.focusBootInput = function() {
    if (bootPwdInput) {
      bootPwdInput.focus();
    }
  };

  // 監聽平板 / 手機虛擬螢幕鍵盤輸入
  if (bootPwdInput) {
    bootPwdInput.addEventListener('input', (e) => {
      if (isOpening || isJumpscaring) return;
      const val = e.target.value.replace(/[^0-9]/g, '');
      currentInput = val.slice(0, 6);
      playBootClickSound();
      updateDisplay();
      if (currentInput.length === 6 || currentInput === '8888') {
        setTimeout(checkPassword, 280);
      }
    });

    bootPwdInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        if (currentInput.length > 0) {
          checkPassword();
        }
      }
    });
  }

  function checkPassword() {
    if (VALID_BOOT_PASSWORDS.includes(currentInput)) {
      triggerSuccess();
    } else {
      triggerFail();
    }
  }

  function triggerSuccess() {
    if (isOpening) return;
    isOpening = true;

    if (statusToast) {
      statusToast.textContent = '🌟 符文共鳴！青銅巨門開啟，進入書櫃...';
      statusToast.style.borderColor = '#3dfacb';
      statusToast.style.color = '#3dfacb';
    }

    playBootGateOpenSound();

    bootScreen.classList.remove('ghost-cracked');
    if (ghostEmergence) ghostEmergence.classList.remove('active');
    bootScreen.classList.add('opening');

    setTimeout(() => {
      bootScreen.classList.add('dismissed');
      setTimeout(() => {
        bootScreen.style.display = 'none';
      }, 1200);
    }, 1800);
  }

  function triggerFail() {
    if (isJumpscaring) return;
    isJumpscaring = true;

    if (statusToast) {
      statusToast.textContent = '⚠️ 封印暴走！青銅門裂開，千年怨靈衝出！';
      statusToast.style.borderColor = '#ff3b30';
      statusToast.style.color = '#ff3b30';
    }

    playBootGhostScreamSound();

    bootScreen.classList.add('ghost-cracked');
    if (ghostEmergence) ghostEmergence.classList.add('active');
    bootScreen.classList.add('shake-intense');
    if (bloodOverlay) bloodOverlay.classList.add('flash');

    setTimeout(() => {
      bootScreen.classList.remove('shake-intense');
    }, 750);

    setTimeout(() => {
      if (ghostEmergence) ghostEmergence.classList.remove('active');
      bootScreen.classList.remove('ghost-cracked');
      playBootGateSlamSound();
      if (bloodOverlay) bloodOverlay.classList.remove('flash');
      currentInput = '';
      updateDisplay();
      if (statusToast) {
        statusToast.textContent = '💀 厲鬼遁回門內，青銅門緊閉！請重新嘗試。';
      }
      isJumpscaring = false;
    }, 1900);
  }

  // 實體鍵盤與觸控按鍵全域監聽
  document.addEventListener('keydown', (e) => {
    if (isOpening || isJumpscaring || bootScreen.style.display === 'none') return;
    if (e.key >= '0' && e.key <= '9') {
      handleInput(e.key);
    } else if (e.key === 'Backspace') {
      currentInput = currentInput.slice(0, -1);
      updateDisplay();
    } else if (e.key === 'Enter') {
      if (currentInput.length > 0) {
        checkPassword();
      }
    }
  });

  updateDisplay();
}

// 從 LocalStorage 載入資料
function loadBooksFromStorage() {
  const stored = localStorage.getItem('my_bookshelf_data');
  if (stored) {
    try {
      books = JSON.parse(stored);
    } catch (e) {
      console.error('解析 LocalStorage 失敗，使用預設資料', e);
      books = [...DEFAULT_BOOKS];
      saveBooksToStorage();
    }
  } else {
    books = [...DEFAULT_BOOKS];
    saveBooksToStorage();
  }
}

// 儲存至 LocalStorage
function saveBooksToStorage() {
  localStorage.setItem('my_bookshelf_data', JSON.stringify(books));
}

// 計算與更新統計數字
function updateStats() {
  const total = books.length;
  const borrowedCount = books.filter(b => b.status === 'borrowed').length;
  const availableCount = total - borrowedCount;
  
  // 計算相異分類數量
  const categoriesSet = new Set(books.map(b => b.category).filter(Boolean));

  statTotal.textContent = total;
  statAvailable.textContent = availableCount;
  statBorrowed.textContent = borrowedCount;
  statCategories.textContent = categoriesSet.size;

  // 更新類別篩選下拉選單選項
  updateCategoryDropdownOptions(Array.from(categoriesSet));
}

// 動態更新分類選單
function updateCategoryDropdownOptions(categories) {
  const currentSelected = filterCategory.value;
  filterCategory.innerHTML = '<option value="all">所有類別</option>';
  
  categories.sort().forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    if (cat === currentSelected) opt.selected = true;
    filterCategory.appendChild(opt);
  });
}

// 繪製與更新介面
function renderApp() {
  updateStats();
  renderBooksList();
}

// 渲染書籍卡片列表
function renderBooksList() {
  const query = searchInput.value.trim().toLowerCase();
  const selectedCat = filterCategory.value;
  const selectedStatus = filterStatus.value;
  const selectedSort = sortBy.value;

  // 1. 搜尋與過濾
  let filtered = books.filter(book => {
    // 關鍵字搜尋：搜尋書名、作者、分類、簡介、借閱者
    const matchQuery = !query || 
      (book.title && book.title.toLowerCase().includes(query)) ||
      (book.author && book.author.toLowerCase().includes(query)) ||
      (book.category && book.category.toLowerCase().includes(query)) ||
      (book.summary && book.summary.toLowerCase().includes(query)) ||
      (book.borrower && book.borrower.toLowerCase().includes(query));

    // 分類過濾
    const matchCat = (selectedCat === 'all') || (book.category === selectedCat);

    // 狀態過濾
    const matchStatus = (selectedStatus === 'all') || (book.status === selectedStatus);

    return matchQuery && matchCat && matchStatus;
  });

  // 2. 排序
  filtered.sort((a, b) => {
    if (selectedSort === 'newest') {
      return (b.createdAt || 0) - (a.createdAt || 0);
    } else if (selectedSort === 'title') {
      return a.title.localeCompare(b.title, 'zh-TW');
    } else if (selectedSort === 'rating') {
      return (b.rating || 0) - (a.rating || 0);
    }
    return 0;
  });

  // 3. 畫面呈現
  booksGrid.innerHTML = '';

  if (filtered.length === 0) {
    emptyState.classList.remove('hidden');
  } else {
    emptyState.classList.add('hidden');
    filtered.forEach(book => {
      const card = createBookCardElement(book);
      booksGrid.appendChild(card);
    });
  }
}

// 生成單一書籍卡片 DOM
function createBookCardElement(book) {
  const card = document.createElement('div');
  card.className = 'book-card';

  // 封面圖片處置
  const coverUrl = book.cover || 'https://via.placeholder.com/300x400/3b82f6/ffffff?text=' + encodeURIComponent(book.title.substring(0, 4));
  
  // 星等呈現
  const starsHtml = '★'.repeat(book.rating || 3) + '☆'.repeat(5 - (book.rating || 3));

  // 借閱狀態 Badge
  const isBorrowed = book.status === 'borrowed';
  const statusBadgeHtml = isBorrowed
    ? `<span class="book-status-badge badge-borrowed"><i class="fa-solid fa-hand-holding"></i> 已借出</span>`
    : `<span class="book-status-badge badge-available"><i class="fa-solid fa-check"></i> 在櫃中</span>`;

  // 借閱資訊警示標籤
  const borrowInfoTagHtml = isBorrowed && book.borrower
    ? `<div class="borrow-info-tag"><i class="fa-solid fa-user"></i> 借給：${escapeHtml(book.borrower)}</div>`
    : '';

  card.innerHTML = `
    <div class="book-cover-wrap">
      <img class="book-cover-img" src="${escapeHtml(coverUrl)}" alt="${escapeHtml(book.title)}" onerror="this.src='https://via.placeholder.com/300x400/64748b/ffffff?text=無封面圖片'">
      ${statusBadgeHtml}
    </div>
    <div class="book-card-body">
      <div class="book-category">${escapeHtml(book.category || '未分類')}</div>
      <h3 class="book-title" title="${escapeHtml(book.title)}">${escapeHtml(book.title)}</h3>
      <div class="book-author"><i class="fa-solid fa-pen-nib"></i> ${escapeHtml(book.author || '未知作者')}</div>
      <div class="book-rating-stars">${starsHtml}</div>
      <div class="book-summary-preview">${escapeHtml(book.summary || '尚無簡介筆記')}</div>
      ${borrowInfoTagHtml}
      <div class="book-card-footer">
        <button class="btn btn-secondary btn-view" data-id="${book.id}">
          <i class="fa-solid fa-eye"></i> 檢視簡介
        </button>
        <button class="btn ${isBorrowed ? 'btn-secondary' : 'btn-accent'} btn-borrow-toggle" data-id="${book.id}">
          <i class="fa-solid ${isBorrowed ? 'fa-rotate-left' : 'fa-handshake'}"></i> ${isBorrowed ? '歸還' : '借出'}
        </button>
      </div>
    </div>
  `;

  // 綁定卡片內按鈕點擊事件
  card.querySelector('.btn-view').addEventListener('click', () => openBookDetailModal(book.id));
  card.querySelector('.btn-borrow-toggle').addEventListener('click', () => handleQuickBorrowToggle(book.id));

  return card;
}

// 開啟書籍詳細簡介 Modal
function openBookDetailModal(bookId) {
  const book = books.find(b => b.id === bookId);
  if (!book) return;

  currentDetailBookId = bookId;

  document.getElementById('detail-title').textContent = book.title;
  document.getElementById('detail-author').textContent = book.author || '未知作者';
  document.getElementById('detail-category-badge').textContent = book.category || '未分類';
  document.getElementById('detail-rating').textContent = '★'.repeat(book.rating || 3) + '☆'.repeat(5 - (book.rating || 3));
  
  const coverImg = document.getElementById('detail-cover');
  coverImg.src = book.cover || 'https://via.placeholder.com/300x400/3b82f6/ffffff?text=' + encodeURIComponent(book.title.substring(0, 4));

  const statusBadge = document.getElementById('detail-status-badge');
  const borrowBox = document.getElementById('detail-borrow-box');
  const toggleBtn = document.getElementById('btn-toggle-borrow-from-detail');

  if (book.status === 'borrowed') {
    statusBadge.textContent = '已借出';
    statusBadge.className = 'badge badge-borrowed';
    borrowBox.style.display = 'block';
    borrowBox.innerHTML = `
      <strong><i class="fa-solid fa-circle-info"></i> 目前借閱狀態：</strong><br>
      • 借閱人：${escapeHtml(book.borrower || '未紀錄')}<br>
      • 借出日期：${escapeHtml(book.borrowDate || '無紀錄')}<br>
      • 備註：${escapeHtml(book.borrowNote || '無')}
    `;
    toggleBtn.innerHTML = '<i class="fa-solid fa-rotate-left"></i> 辦理還書歸位';
    toggleBtn.className = 'btn btn-secondary';
  } else {
    statusBadge.textContent = '在櫃中';
    statusBadge.className = 'badge badge-available';
    borrowBox.style.display = 'none';
    toggleBtn.innerHTML = '<i class="fa-solid fa-handshake"></i> 登記借出';
    toggleBtn.className = 'btn btn-accent';
  }

  document.getElementById('detail-summary').textContent = book.summary || '目前尚未寫入這本書的簡介與筆記。可以點擊「編輯簡介」隨時補充！';

  openModal('modal-book-detail');
}

// 依書名或 ISBN 向 Google Books 查詢資料，自動帶入作者/分類/簡介/封面
async function handleAutoFillBook() {
  const query = document.getElementById('book-title').value.trim();
  if (!query) {
    alert('請先在「書名」欄位輸入書名或 ISBN，再按此按鈕查詢。');
    return;
  }

  const btn = document.getElementById('btn-auto-fill');
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 查詢中...';

  try {
    const cleaned = query.replace(/[\s-]/g, '');
    const isIsbn = /^[0-9]{9,13}[0-9Xx]?$/.test(cleaned);
    const q = isIsbn ? `isbn:${cleaned}` : encodeURIComponent(query);
    const url = `https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=1`;

    const res = await fetch(url);
    const data = await res.json();

    if (!data.items || data.items.length === 0) {
      alert('查無符合的書籍資料，請確認書名/ISBN 是否正確，或改為手動輸入。');
      return;
    }

    const info = data.items[0].volumeInfo;
    document.getElementById('book-title').value = info.title || query;
    if (info.authors) document.getElementById('book-author').value = info.authors.join('、');
    if (info.categories && info.categories[0]) document.getElementById('book-category').value = info.categories[0];
    if (info.description) document.getElementById('book-summary').value = info.description;

    if (info.imageLinks) {
      const coverUrl = (info.imageLinks.thumbnail || info.imageLinks.smallThumbnail).replace('http://', 'https://');
      document.getElementById('book-cover').value = coverUrl;
      const preview = document.getElementById('cover-preview');
      preview.src = coverUrl;
      preview.classList.remove('hidden');
    }
  } catch (err) {
    console.error('自動查詢書籍資料失敗', err);
    alert('查詢失敗，請確認網路連線後再試一次。');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

// 處理封面圖片上傳：讀取檔案、壓縮並轉為 Base64 存入隱藏欄位
function handleCoverFileSelect(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (readerEvent) => {
    const img = new Image();
    img.onload = () => {
      // 縮小圖片避免 LocalStorage 空間被過大的圖片佔滿
      const maxSize = 500;
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      document.getElementById('book-cover').value = dataUrl;

      const preview = document.getElementById('cover-preview');
      preview.src = dataUrl;
      preview.classList.remove('hidden');
    };
    img.src = readerEvent.target.result;
  };
  reader.readAsDataURL(file);
}

// 處理新增 / 編輯表單提交
function handleBookFormSubmit(e) {
  e.preventDefault();

  const id = document.getElementById('book-id').value;
  const title = document.getElementById('book-title').value.trim();
  const author = document.getElementById('book-author').value.trim();
  const category = document.getElementById('book-category').value.trim() || '通用藏書';
  const rating = parseInt(document.getElementById('book-rating').value, 10);
  const cover = document.getElementById('book-cover').value.trim();
  const summary = document.getElementById('book-summary').value.trim();

  if (id) {
    // 編輯既有書籍
    const index = books.findIndex(b => b.id === id);
    if (index !== -1) {
      books[index] = {
        ...books[index],
        title,
        author,
        category,
        rating,
        cover,
        summary
      };
    }
  } else {
    // 新增書籍
    const newBook = {
      id: 'b-' + Date.now(),
      title,
      author,
      category,
      rating,
      cover,
      summary,
      status: 'available',
      borrower: null,
      borrowDate: null,
      borrowNote: null,
      createdAt: Date.now()
    };
    books.unshift(newBook);
  }

  saveBooksToStorage();
  renderApp();
  closeModal('modal-book-form');
}

// 開啟新增書籍Modal
function openAddBookModal() {
  document.getElementById('form-modal-title').innerHTML = '<i class="fa-solid fa-book-plus"></i> 新增書籍紀錄';
  document.getElementById('book-form').reset();
  document.getElementById('book-id').value = '';
  document.getElementById('book-cover').value = '';
  const preview = document.getElementById('cover-preview');
  preview.src = '';
  preview.classList.add('hidden');
  openModal('modal-book-form');
}

// 開啟編輯書籍Modal
function openEditBookModal(bookId) {
  const book = books.find(b => b.id === bookId);
  if (!book) return;

  document.getElementById('form-modal-title').innerHTML = '<i class="fa-solid fa-pen-to-square"></i> 編輯書籍與筆記';
  document.getElementById('book-id').value = book.id;
  document.getElementById('book-title').value = book.title;
  document.getElementById('book-author').value = book.author || '';
  document.getElementById('book-category').value = book.category || '';
  document.getElementById('book-rating').value = book.rating || 3;
  document.getElementById('book-cover').value = book.cover || '';
  document.getElementById('book-summary').value = book.summary || '';

  const preview = document.getElementById('cover-preview');
  if (book.cover) {
    preview.src = book.cover;
    preview.classList.remove('hidden');
  } else {
    preview.src = '';
    preview.classList.add('hidden');
  }

  closeModal('modal-book-detail');
  openModal('modal-book-form');
}

// 快速借出/還書切換邏輯
function handleQuickBorrowToggle(bookId) {
  const book = books.find(b => b.id === bookId);
  if (!book) return;

  if (book.status === 'borrowed') {
    // 辦理還書
    if (confirm(`確定要把《${book.title}》標記為「在櫃中」（已歸還）嗎？`)) {
      book.status = 'available';
      book.borrower = null;
      book.borrowDate = null;
      book.borrowNote = null;
      saveBooksToStorage();
      renderApp();
      if (currentDetailBookId === bookId) openBookDetailModal(bookId);
    }
  } else {
    // 彈出借閱填寫Modal
    openBorrowModal(bookId);
  }
}

// 開啟借閱 Modal
function openBorrowModal(bookId) {
  const book = books.find(b => b.id === bookId);
  if (!book) return;

  document.getElementById('borrow-book-id').value = book.id;
  document.getElementById('borrow-book-title-display').textContent = book.title;
  document.getElementById('borrower-name').value = '';
  document.getElementById('borrow-note').value = '';
  
  // 預設今日日期 (YYYY-MM-DD)
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('borrow-date').value = today;

  closeModal('modal-book-detail');
  openModal('modal-borrow');
}

// 處理借閱表單提交
function handleBorrowFormSubmit(e) {
  e.preventDefault();

  const bookId = document.getElementById('borrow-book-id').value;
  const borrower = document.getElementById('borrower-name').value.trim();
  const borrowDate = document.getElementById('borrow-date').value;
  const borrowNote = document.getElementById('borrow-note').value.trim();

  if (!borrower) {
    alert('請輸入借閱者姓名');
    return;
  }

  const book = books.find(b => b.id === bookId);
  if (book) {
    book.status = 'borrowed';
    book.borrower = borrower;
    book.borrowDate = borrowDate;
    book.borrowNote = borrowNote;
    
    saveBooksToStorage();
    renderApp();
    closeModal('modal-borrow');
  }
}

// 刪除書籍
function handleDeleteBook(bookId) {
  const book = books.find(b => b.id === bookId);
  if (!book) return;

  if (confirm(`確定要刪除《${book.title}》嗎？此動作無法復原。`)) {
    books = books.filter(b => b.id !== bookId);
    saveBooksToStorage();
    renderApp();
    closeModal('modal-book-detail');
  }
}

// 匯出 JSON 備份檔案
function exportJsonBackup() {
  const filename = `My_Bookshelf_Backup_${new Date().toISOString().split('T')[0]}.json`;
  const blob = new Blob([JSON.stringify(books, null, 2)], { type: 'application/json' });

  // iOS/iPadOS 獨立 App 模式下，data URI 下載連結常常無效，
  // 改用原生分享選單讓使用者選擇「儲存到檔案」較為可靠
  const file = new File([blob], filename, { type: 'application/json' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    navigator.share({ files: [file], title: filename }).catch(() => {});
    return;
  }

  const url = URL.createObjectURL(blob);
  const downloadAnchor = document.createElement('a');
  downloadAnchor.href = url;
  downloadAnchor.download = filename;
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// 匯入 JSON 備份檔案
function handleImportJson(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(event) {
    try {
      const importedData = JSON.parse(event.target.result);
      if (Array.isArray(importedData)) {
        if (confirm(`確認要匯入 ${importedData.length} 本書籍資料嗎？目前的書櫃將會備份並更新。`)) {
          books = importedData;
          saveBooksToStorage();
          renderApp();
          closeModal('modal-backup');
          alert('資料匯入成功！');
        }
      } else {
        alert('匯入失敗：格式不符合書籍 JSON 陣列標準');
      }
    } catch (err) {
      alert('無法解析此 JSON 檔案');
    }
  };
  reader.readAsText(file);
}

// 清空所有書籍
function resetToDemoData() {
  if (confirm('確定要清空所有書籍資料嗎？此操作無法復原。')) {
    books = [];
    saveBooksToStorage();
    renderApp();
    closeModal('modal-backup');
  }
}

// 通用 Modal 控制
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('hidden');
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('hidden');
}

// HTML 逸出防堵 XSS
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// 設定事件監聽器
function setupEventListeners() {
  // 頂部按鈕
  document.getElementById('btn-add-book').addEventListener('click', openAddBookModal);
  document.getElementById('btn-export-import').addEventListener('click', () => openModal('modal-backup'));

  // 搜尋與篩選事件
  searchInput.addEventListener('input', renderBooksList);
  filterCategory.addEventListener('change', renderBooksList);
  filterStatus.addEventListener('change', renderBooksList);
  sortBy.addEventListener('change', renderBooksList);

  // 表單事件
  document.getElementById('book-form').addEventListener('submit', handleBookFormSubmit);
  document.getElementById('borrow-form').addEventListener('submit', handleBorrowFormSubmit);
  document.getElementById('book-cover-file').addEventListener('change', handleCoverFileSelect);
  document.getElementById('btn-auto-fill').addEventListener('click', handleAutoFillBook);

  // 詳細 modal 內部按鈕
  document.getElementById('btn-edit-book').addEventListener('click', () => {
    if (currentDetailBookId) openEditBookModal(currentDetailBookId);
  });
  document.getElementById('btn-delete-book').addEventListener('click', () => {
    if (currentDetailBookId) handleDeleteBook(currentDetailBookId);
  });
  document.getElementById('btn-toggle-borrow-from-detail').addEventListener('click', () => {
    if (currentDetailBookId) handleQuickBorrowToggle(currentDetailBookId);
  });

  // 備份功能按鈕
  document.getElementById('btn-download-json').addEventListener('click', exportJsonBackup);
  document.getElementById('import-file').addEventListener('change', handleImportJson);
  document.getElementById('btn-reset-demo').addEventListener('click', resetToDemoData);

  // 關閉 Modal 按鈕 (data-close 屬性)
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modalId = btn.getAttribute('data-close');
      closeModal(modalId);
    });
  });

  // 點擊 Overlay 背景關閉 Modal
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      const modal = overlay.closest('.modal');
      if (modal) modal.classList.add('hidden');
    });
  });
}

// 頁面載入完成後發動
document.addEventListener('DOMContentLoaded', initApp);
