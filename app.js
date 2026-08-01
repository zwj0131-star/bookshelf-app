/**
 * 個人書櫃與借閱統計系統 - 核心邏輯
 * 適用於個人藏書整理與自主學習成果展現
 */

// 預設範例資料（供第一次載入或重置時使用）
const DEFAULT_BOOKS = [
  {
    id: 'b-101',
    title: '被討厭的勇氣：自我啟發之父阿德勒的教導',
    author: '岸見一郎, 古賀史健',
    category: '心理勵志',
    rating: 5,
    cover: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&q=80',
    summary: '【自主學習心得筆記】\n這本書以青年與哲學家的對話形式呈現。核心概念是「所有煩惱都來自於人際關係」，強調課題分離與阿德勒心理學。對於學習調適人際壓力與建立自信有非常深刻的啟發。',
    status: 'available', // 'available' | 'borrowed'
    borrower: null,
    borrowDate: null,
    borrowNote: null,
    createdAt: Date.now() - 86400000 * 10
  },
  {
    id: 'b-102',
    title: '原子習慣：細微改變帶來巨大成就',
    author: 'James Clear',
    category: '學習考照',
    rating: 5,
    cover: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=400&q=80',
    summary: '【書籍摘要】\n說明建立習慣的四個步驟：提示、渴望、回應、獎賞。每天進步 1%，一年後就會進步 37 倍！適合用於規劃高中自主學習計畫與讀書計畫。',
    status: 'borrowed',
    borrower: '陳大明（同班同學）',
    borrowDate: '2026-07-20',
    borrowNote: '借去研究讀書計畫方法，預計下週歸還',
    createdAt: Date.now() - 86400000 * 7
  },
  {
    id: 'b-103',
    title: 'Python 程式設計超入門',
    author: '彭彭',
    category: '資訊程式',
    rating: 4,
    cover: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&q=80',
    summary: '【自主學習重點】\n從變數、迴圈到函式基礎教學，內含許多範例程式碼。這是這次自主學習專案的主要參考書籍之一。',
    status: 'available',
    borrower: null,
    borrowDate: null,
    borrowNote: null,
    createdAt: Date.now() - 86400000 * 5
  },
  {
    id: 'b-104',
    title: '人類簡史：從動物到上帝',
    author: '哈拉瑞 (Yuval Noah Harari)',
    category: '人文歷史',
    rating: 5,
    cover: 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=400&q=80',
    summary: '【閱讀重點】\n縱觀人類智人如何透過「想像的秩序」與共同信念建構文明。對於了解歷史脈絡與批判思考極有幫助。',
    status: 'available',
    borrower: null,
    borrowDate: null,
    borrowNote: null,
    createdAt: Date.now() - 86400000 * 2
  }
];

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
  loadBooksFromStorage();
  setupEventListeners();
  renderApp();
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
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(books, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `My_Bookshelf_Backup_${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
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

// 重置為預設範例書籍
function resetToDemoData() {
  if (confirm('確定要將所有書籍資料重置為初始範例書籍嗎？此操作將覆蓋目前變更。')) {
    books = [...DEFAULT_BOOKS];
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
