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
  loadBooksFromStorage();
  setupEventListeners();
  renderApp();
}

// 開機畫面：需輸入密碼才能開啟青銅門
// 注意：這只是純前端的簡單門鎖，防君子不防懂技術的人
const BOOT_PASSWORD = '520945';

function initBootScreen() {
  const bootScreen = document.getElementById('boot-screen');
  if (!bootScreen) return;

  const form = document.getElementById('boot-password-form');
  const input = document.getElementById('boot-password-input');
  const hint = document.getElementById('boot-hint');

  let opened = false;

  function openDoor() {
    if (opened) return;
    opened = true;
    bootScreen.classList.add('opening');
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setTimeout(() => {
      bootScreen.style.display = 'none';
    }, prefersReducedMotion ? 450 : 1300);
  }

  function checkPassword() {
    if (input.value === BOOT_PASSWORD) {
      openDoor();
    } else {
      hint.textContent = '密碼錯誤，請再試一次';
      bootScreen.classList.add('shake');
      input.value = '';
      setTimeout(() => bootScreen.classList.remove('shake'), 900);
    }
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      checkPassword();
    });
  }

  // 開機畫面點擊聚焦到輸入框，方便直接打字
  bootScreen.addEventListener('click', (e) => {
    if (e.target === input || e.target.closest('.boot-password-form')) return;
    input.focus();
  });
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
