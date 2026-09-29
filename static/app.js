// State Management
const state = {
  items: [],
  activeFilter: 'all',
  currentView: 'table', // 'table' | 'grid'
  isProcessing: false,
  shouldStop: false,
  selectedItemId: null,
  concurrency: 3
};

// DOM Elements
const dropzone = document.getElementById('dropzone');
const csvFileInput = document.getElementById('csv-file-input');
const btnBrowseFile = document.getElementById('btn-browse-file');
const btnLoadSample = document.getElementById('btn-load-sample');
const btnTrySampleInline = document.getElementById('btn-try-sample-inline');
const btnManualPaste = document.getElementById('btn-manual-paste');

const uploadSection = document.getElementById('upload-section');
const workspaceSection = document.getElementById('workspace-section');
const progressContainer = document.getElementById('progress-container');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');
const progressPercentage = document.getElementById('progress-percentage');

const statTotal = document.getElementById('stat-total');
const statMatched = document.getElementById('stat-matched');
const statPending = document.getElementById('stat-pending');
const statScore = document.getElementById('stat-score');

const filterCountAll = document.getElementById('filter-count-all');
const filterCountMatched = document.getElementById('filter-count-matched');
const filterCountPending = document.getElementById('filter-count-pending');

const btnStartProcess = document.getElementById('btn-start-process');
const btnStopProcess = document.getElementById('btn-stop-process');
const btnResetWorkspace = document.getElementById('btn-reset-workspace');
const btnExportCsv = document.getElementById('btn-export-csv');
const btnCopyUrls = document.getElementById('btn-copy-urls');

const btnViewTable = document.getElementById('btn-view-table');
const btnViewGrid = document.getElementById('btn-view-grid');
const tableViewContainer = document.getElementById('table-view-container');
const gridViewContainer = document.getElementById('grid-view-container');
const productTableBody = document.getElementById('product-table-body');
const brandPrefixInput = document.getElementById('brand-prefix-input');

// Modals
const pasteModal = document.getElementById('paste-modal');
const pasteTextarea = document.getElementById('paste-textarea');
const btnClosePaste = document.getElementById('btn-close-paste');
const btnCancelPaste = document.getElementById('btn-cancel-paste');
const btnSubmitPaste = document.getElementById('btn-submit-paste');

const apiModal = document.getElementById('api-modal');
const btnApiSettings = document.getElementById('btn-api-settings');
const btnCloseApiModal = document.getElementById('btn-close-api-modal');
const apiKeyInput = document.getElementById('api-key-input');
const btnSaveApi = document.getElementById('btn-save-api');
const btnClearApi = document.getElementById('btn-clear-api');

const alternativesModal = document.getElementById('alternatives-modal');
const altModalProductName = document.getElementById('alt-modal-product-name');
const altSearchInput = document.getElementById('alt-search-input');
const btnAltSearch = document.getElementById('btn-alt-search');
const altImagesGrid = document.getElementById('alt-images-grid');
const customImageUrlInput = document.getElementById('custom-image-url-input');
const btnApplyCustomUrl = document.getElementById('btn-apply-custom-url');
const btnCloseAltModal = document.getElementById('btn-close-alt-modal');

const lightboxModal = document.getElementById('lightbox-modal');
const lightboxImg = document.getElementById('lightbox-img');
const lightboxCaption = document.getElementById('lightbox-caption');
const btnCloseLightbox = document.getElementById('btn-close-lightbox');

// Initialize Events
document.addEventListener('DOMContentLoaded', () => {
  setupUploadEvents();
  setupToolbarEvents();
  setupModalEvents();
  setupViewToggle();
  
  // Load saved API key from localStorage if any
  const savedKey = localStorage.getItem('google_serper_api_key') || '';
  if (apiKeyInput) apiKeyInput.value = savedKey;
  if (savedKey && btnApiSettings) {
    btnApiSettings.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
      Google API Active
    `;
  }
});

// Setup Modals
function setupModalEvents() {
  // API Key Modal
  if (btnApiSettings) {
    btnApiSettings.addEventListener('click', () => {
      apiKeyInput.value = localStorage.getItem('google_serper_api_key') || '';
      apiModal.classList.remove('hidden');
    });
  }
  if (btnCloseApiModal) btnCloseApiModal.addEventListener('click', () => apiModal.classList.add('hidden'));
  if (btnSaveApi) {
    btnSaveApi.addEventListener('click', () => {
      const key = apiKeyInput.value.trim();
      localStorage.setItem('google_serper_api_key', key);
      apiModal.classList.add('hidden');
      if (key) {
        btnApiSettings.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          Google API Active
        `;
        alert('Google API Key saved!');
      } else {
        btnApiSettings.textContent = 'Google API Key';
      }
    });
  }
  if (btnClearApi) {
    btnClearApi.addEventListener('click', () => {
      localStorage.removeItem('google_serper_api_key');
      apiKeyInput.value = '';
      btnApiSettings.textContent = 'Google API Key';
      apiModal.classList.add('hidden');
    });
  }

  // Paste Modal
  if (btnManualPaste) {
    btnManualPaste.addEventListener('click', () => {
      pasteModal.classList.remove('hidden');
      pasteTextarea.focus();
    });
  }

  if (btnClosePaste) btnClosePaste.addEventListener('click', () => pasteModal.classList.add('hidden'));
  if (btnCancelPaste) btnCancelPaste.addEventListener('click', () => pasteModal.classList.add('hidden'));

  if (btnSubmitPaste) {
    btnSubmitPaste.addEventListener('click', () => {
      const text = pasteTextarea.value.trim();
      if (!text) return;
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
      const items = lines.map((name, idx) => ({
        id: `item-${idx + 1}`,
        row_index: idx + 1,
        product_name: name,
        image_url: '',
        thumbnail_url: '',
        match_score: 0,
        status: 'ready',
        candidates: []
      }));
      loadItemsIntoState(items);
      pasteModal.classList.add('hidden');
      pasteTextarea.value = '';
    });
  }

  // Alternatives Modal
  if (btnCloseAltModal) btnCloseAltModal.addEventListener('click', () => alternativesModal.classList.add('hidden'));
  if (btnAltSearch) {
    btnAltSearch.addEventListener('click', () => {
      const customQuery = altSearchInput.value.trim();
      if (customQuery && state.selectedItemId) {
        searchAlternativesForItem(state.selectedItemId, customQuery);
      }
    });
  }
  if (altSearchInput) {
    altSearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') btnAltSearch.click();
    });
  }

  if (btnApplyCustomUrl) {
    btnApplyCustomUrl.addEventListener('click', () => {
      const customUrl = customImageUrlInput.value.trim();
      if (customUrl && state.selectedItemId) {
        updateItemWithChosenImage(state.selectedItemId, customUrl, customUrl, 'Custom URL', 100);
        alternativesModal.classList.add('hidden');
      }
    });
  }

  // Lightbox
  if (btnCloseLightbox) btnCloseLightbox.addEventListener('click', () => lightboxModal.classList.add('hidden'));
  if (lightboxModal) {
    lightboxModal.addEventListener('click', (e) => {
      if (e.target === lightboxModal) lightboxModal.classList.add('hidden');
    });
  }
}

// Setup File Upload & Drag-and-Drop
function setupUploadEvents() {
  if (btnBrowseFile) {
    btnBrowseFile.addEventListener('click', (e) => {
      e.stopPropagation();
      csvFileInput.click();
    });
  }

  if (btnTrySampleInline) {
    btnTrySampleInline.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      loadSampleDataset();
    });
  }

  if (btnLoadSample) {
    btnLoadSample.addEventListener('click', (e) => {
      e.stopPropagation();
      loadSampleDataset();
    });
  }

  if (dropzone) {
    dropzone.addEventListener('click', (e) => {
      if (e.target && e.target.closest('button')) {
        return;
      }
      csvFileInput.click();
    });

    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add('drag-over');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('drag-over');
      });
    });

    dropzone.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        processCsvFile(files[0]);
      }
    });
  }

  if (csvFileInput) csvFileInput.addEventListener('change', handleFileSelected);
}

function handleFileSelected(e) {
  if (e.target.files.length > 0) {
    processCsvFile(e.target.files[0]);
  }
}

const BUILTIN_SAMPLE_CSV = `Product Name,Category,Price
Apple iPhone 15 Pro 128GB Black Titanium,Smartphones,$999
Sony WH-1000XM5 Wireless Noise Canceling Headphones Silver,Audio,$399
Nike Air Jordan 1 Retro High OG Chicago,Footwear,$180
Logitech MX Master 3S Wireless Performance Mouse,Accessories,$99
Dyson V15 Detect Cordless Vacuum Cleaner Yellow/Nickel,Home Appliances,$749
Nutella Hazelnut Spread with Cocoa 750g Jar,Groceries,$6.99
Samsung 65-Inch Class OLED 4K S90C Series Smart TV,Television,$1599
Nintendo Switch OLED Model with White Joy-Con,Gaming,$349
Stanley Quencher H2.0 FlowState Stainless Steel Tumbler 40oz,Kitchen,$45
Ray-Ban Classic Polarized Wayfarer Sunglasses Black,Eyewear,$210`;

async function processCsvFile(file) {
  try {
    const text = await file.text();
    const items = parseCsvContentLocally(text);
    if (!items || items.length === 0) {
      throw new Error('No valid product rows found in CSV.');
    }
    loadItemsIntoState(items);
  } catch (err) {
    alert('Error loading CSV: ' + err.message);
  }
}

function parseCsvContentLocally(text) {
  if (!text || typeof text !== 'string') return [];
  const cleanText = text.trim();
  
  if (cleanText.startsWith('<!DOCTYPE') || cleanText.startsWith('<html') || cleanText.startsWith('<head')) {
    throw new Error('Received an HTML page instead of a valid CSV file.');
  }

  const lines = cleanText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length === 0) return [];

  function parseLine(line) {
    const res = [];
    let cur = '', inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') inQuote = !inQuote;
      else if (c === ',' && !inQuote) {
        res.push(cur.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
        cur = '';
      } else cur += c;
    }
    res.push(cur.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
    return res;
  }

  const rows = lines.map(parseLine);
  const headers = rows[0];
  let nameColIdx = 0;
  for (let idx = 0; idx < headers.length; idx++) {
    const col = headers[idx].toLowerCase();
    if (['product', 'name', 'title', 'item', 'description', 'sku'].some(k => col.includes(k))) {
      nameColIdx = idx;
      break;
    }
  }

  const dataRows = rows.slice(1);
  return dataRows.map((row, i) => {
    const name = row[nameColIdx] ? row[nameColIdx].trim() : '';
    if (!name || name.startsWith('<')) return null;
    let existingImg = '';
    for (const cell of row) {
      if (cell.startsWith('http') && ['.jpg', '.png', '.jpeg', '.webp', '.avif', 'image'].some(ext => cell.toLowerCase().includes(ext))) {
        existingImg = cell;
        break;
      }
    }
    return {
      id: `item-${i + 1}`,
      row_index: i + 1,
      product_name: name,
      image_url: existingImg,
      thumbnail_url: existingImg,
      match_score: existingImg ? 100 : 0,
      status: existingImg ? 'completed' : 'ready',
      candidates: [],
      raw_row: row
    };
  }).filter(Boolean);
}

function loadSampleDataset() {
  try {
    const items = parseCsvContentLocally(BUILTIN_SAMPLE_CSV);
    loadItemsIntoState(items);
  } catch (err) {
    alert('Failed to load sample: ' + err.message);
  }
}

function loadItemsIntoState(items) {
  state.items = items;
  uploadSection.classList.add('hidden');
  workspaceSection.classList.remove('hidden');
  updateStats();
  renderProducts();
}

function setupToolbarEvents() {
  if (btnStartProcess) btnStartProcess.addEventListener('click', startBatchProcessing);
  if (btnStopProcess) {
    btnStopProcess.addEventListener('click', () => {
      state.shouldStop = true;
      btnStopProcess.classList.add('hidden');
      btnStartProcess.classList.remove('hidden');
    });
  }
  if (btnResetWorkspace) btnResetWorkspace.addEventListener('click', resetWorkspace);

  document.querySelectorAll('.filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.activeFilter = pill.dataset.filter;
      renderProducts();
    });
  });

  if (btnExportCsv) btnExportCsv.addEventListener('click', exportCsv);
  if (btnCopyUrls) btnCopyUrls.addEventListener('click', copyAllUrls);
}

function resetWorkspace() {
  state.shouldStop = true;
  state.isProcessing = false;
  state.items = [];
  state.selectedItemId = null;
  state.activeFilter = 'all';

  if (csvFileInput) csvFileInput.value = '';
  if (progressContainer) progressContainer.classList.add('hidden');
  if (progressFill) progressFill.style.width = '0%';
  if (progressPercentage) progressPercentage.textContent = '0%';
  if (progressText) progressText.textContent = '';

  if (btnStopProcess) btnStopProcess.classList.add('hidden');
  if (btnStartProcess) btnStartProcess.classList.remove('hidden');

  workspaceSection.classList.add('hidden');
  uploadSection.classList.remove('hidden');
}

function setupViewToggle() {
  if (btnViewTable) {
    btnViewTable.addEventListener('click', () => {
      state.currentView = 'table';
      btnViewTable.classList.add('active');
      btnViewGrid.classList.remove('active');
      tableViewContainer.classList.remove('hidden');
      gridViewContainer.classList.add('hidden');
      renderProducts();
    });
  }

  if (btnViewGrid) {
    btnViewGrid.addEventListener('click', () => {
      state.currentView = 'grid';
      btnViewGrid.classList.add('active');
      btnViewTable.classList.remove('active');
      tableViewContainer.classList.add('hidden');
      gridViewContainer.classList.remove('hidden');
      renderProducts();
    });
  }
}

// Batch Processing
async function startBatchProcessing() {
  if (state.isProcessing) return;
  state.isProcessing = true;
  state.shouldStop = false;

  btnStartProcess.classList.add('hidden');
  btnStopProcess.classList.remove('hidden');
  progressContainer.classList.remove('hidden');

  const pendingItems = state.items.filter(it => it.status !== 'completed' || !it.image_url);
  const totalToProcess = pendingItems.length;
  let processedCount = 0;

  const brandPrefix = brandPrefixInput ? brandPrefixInput.value.trim() : '';
  const apiKey = localStorage.getItem('google_serper_api_key') || '';

  const pool = [];
  let itemIndex = 0;

  async function worker() {
    while (itemIndex < pendingItems.length && !state.shouldStop) {
      const item = pendingItems[itemIndex++];
      item.status = 'searching';
      renderProducts();

      try {
        const res = await fetch('/api/search-item', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            product_name: item.product_name,
            brand_prefix: brandPrefix,
            api_key: apiKey
          })
        });
        const data = await res.json();
        
        if (data.best_image_url) {
          item.image_url = data.best_image_url;
          item.thumbnail_url = data.best_thumbnail_url || data.best_image_url;
          item.best_title = data.best_title;
          item.match_score = data.match_score;
          item.candidates = data.candidates || [];
          item.status = 'completed';
        } else {
          item.status = 'not_found';
        }
      } catch (err) {
        item.status = 'error';
      }

      processedCount++;
      updateProgress(processedCount, totalToProcess);
      updateStats();
      renderProducts();
    }
  }

  const concurrency = Math.min(state.concurrency, totalToProcess || 1);
  for (let i = 0; i < concurrency; i++) {
    pool.push(worker());
  }

  await Promise.all(pool);

  state.isProcessing = false;
  if (btnStopProcess) btnStopProcess.classList.add('hidden');
  if (btnStartProcess) btnStartProcess.classList.remove('hidden');

  const matchedCount = state.items.filter(i => !!i.image_url).length;
  const notFoundCount = state.items.filter(i => i.status === 'not_found' || i.status === 'error').length;

  if (state.shouldStop) {
    progressText.textContent = `Process paused (${matchedCount} found so far)`;
  } else if (matchedCount === totalToProcess && totalToProcess > 0) {
    progressText.textContent = `✨ Completed! Found all ${matchedCount} product images.`;
  } else if (matchedCount > 0) {
    progressText.textContent = `Finished: ${matchedCount} images found, ${notFoundCount} not found.`;
  } else {
    progressText.textContent = `Search finished: 0 images matched. Try clearing brand prefix.`;
  }

  updateStats();
  renderProducts();
}

function updateProgress(current, total) {
  const percent = total > 0 ? Math.round((current / total) * 100) : 100;
  progressFill.style.width = `${percent}%`;
  progressPercentage.textContent = `${percent}%`;
  progressText.textContent = `Finding image ${current} of ${total}...`;
}

function updateStats() {
  const total = state.items.length;
  const matched = state.items.filter(i => !!i.image_url).length;
  const unsearched = state.items.filter(i => !i.image_url && i.status !== 'not_found' && i.status !== 'error').length;
  const notFound = state.items.filter(i => i.status === 'not_found' || i.status === 'error').length;

  statTotal.textContent = total;
  statMatched.textContent = matched;
  statPending.textContent = unsearched > 0 ? unsearched : (notFound > 0 ? `${notFound} not found` : 0);

  filterCountAll.textContent = total;
  filterCountMatched.textContent = matched;
  filterCountPending.textContent = total - matched;

  const matchedItems = state.items.filter(i => i.match_score > 0);
  if (matchedItems.length > 0) {
    const avgScore = (matchedItems.reduce((acc, curr) => acc + (curr.match_score || 0), 0) / matchedItems.length).toFixed(0);
    statScore.textContent = `${avgScore}%`;
  } else {
    statScore.textContent = `0%`;
  }
}

function renderProducts() {
  const filtered = state.items.filter(item => {
    if (state.activeFilter === 'matched') return !!item.image_url;
    if (state.activeFilter === 'pending') return !item.image_url;
    return true;
  });

  if (state.currentView === 'table') {
    renderTableView(filtered);
  } else {
    renderGridView(filtered);
  }
}

function renderTableView(items) {
  productTableBody.innerHTML = '';
  if (items.length === 0) {
    productTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 36px; color: var(--text-dim);">No products found in this filter.</td></tr>`;
    return;
  }

  items.forEach((item, index) => {
    const tr = document.createElement('tr');
    tr.id = `row-${item.id}`;
    
    let thumbHtml = '';
    if (item.status === 'searching') {
      thumbHtml = `<div class="thumbnail-box"><div class="spinner"></div></div>`;
    } else if (item.image_url) {
      thumbHtml = `
        <div class="thumbnail-box" onclick="openLightbox('${escapeHtml(item.image_url)}', '${escapeHtml(item.product_name)}')">
          <img src="${escapeHtml(item.thumbnail_url || item.image_url)}" onerror="this.src='/api/proxy-image?url=' + encodeURIComponent('${escapeHtml(item.image_url)}')" alt="Thumbnail" loading="lazy">
        </div>
      `;
    } else {
      thumbHtml = `<div class="thumbnail-box"><span class="thumbnail-placeholder">📦</span></div>`;
    }

    let scoreBadge = `<span class="score-badge score-low">Pending</span>`;
    if (item.match_score >= 80) {
      scoreBadge = `<span class="score-badge score-high">★ ${item.match_score}% Match</span>`;
    } else if (item.match_score >= 50) {
      scoreBadge = `<span class="score-badge score-med">⚡ ${item.match_score}% Match</span>`;
    } else if (item.status === 'not_found') {
      scoreBadge = `<span class="score-badge score-low">Not found</span>`;
    }

    let urlHtml = `<span class="url-empty">Pending search...</span>`;
    if (item.image_url) {
      urlHtml = `
        <div class="url-cell">
          <a href="${escapeHtml(item.image_url)}" target="_blank" rel="noopener noreferrer" class="url-link-preview" title="${escapeHtml(item.image_url)}">
            ${escapeHtml(item.image_url)}
          </a>
        </div>
      `;
    }

    tr.innerHTML = `
      <td style="color: var(--text-dim); font-weight: 500;">${index + 1}</td>
      <td>${thumbHtml}</td>
      <td>
        <div class="product-name-text">${escapeHtml(item.product_name)}</div>
      </td>
      <td>${urlHtml}</td>
      <td>${scoreBadge}</td>
      <td>
        <div class="row-actions">
          <button class="btn btn-secondary btn-sm" onclick="openAlternativesModal('${item.id}')" title="Change or pick alternative image">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h7"/><path d="M16 19h6"/><path d="M19 16l3 3-3 3"/></svg>
            Alternatives
          </button>
          <button class="btn btn-ghost btn-sm" onclick="reSearchSingleItem('${item.id}')" title="Retry search">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>
          </button>
        </div>
      </td>
    `;
    productTableBody.appendChild(tr);
  });
}

function renderGridView(items) {
  gridViewContainer.innerHTML = '';
  if (items.length === 0) {
    gridViewContainer.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 36px; color: var(--text-dim);">No products found in this filter.</div>`;
    return;
  }

  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'grid-card';
    card.id = `grid-card-${item.id}`;

    let imgTag = '';
    if (item.status === 'searching') {
      imgTag = `<div class="spinner"></div>`;
    } else if (item.image_url) {
      imgTag = `<img src="${escapeHtml(item.thumbnail_url || item.image_url)}" onerror="this.src='/api/proxy-image?url=' + encodeURIComponent('${escapeHtml(item.image_url)}')" alt="${escapeHtml(item.product_name)}" loading="lazy">`;
    } else {
      imgTag = `<span style="font-size: 32px; color: var(--text-dim);">📦</span>`;
    }

    let scoreBadge = `<span class="score-badge score-low grid-card-badge">Pending</span>`;
    if (item.match_score >= 80) {
      scoreBadge = `<span class="score-badge score-high grid-card-badge">★ ${item.match_score}%</span>`;
    } else if (item.match_score >= 50) {
      scoreBadge = `<span class="score-badge score-med grid-card-badge">⚡ ${item.match_score}%</span>`;
    }

    card.innerHTML = `
      <div class="grid-card-img-wrap" onclick="openLightbox('${escapeHtml(item.image_url)}', '${escapeHtml(item.product_name)}')">
        ${imgTag}
        ${scoreBadge}
      </div>
      <div class="grid-card-body">
        <div>
          <h4 class="grid-card-title" title="${escapeHtml(item.product_name)}">${escapeHtml(item.product_name)}</h4>
          <div class="grid-card-url" title="${escapeHtml(item.image_url || 'No URL')}">${escapeHtml(item.image_url || 'No URL yet')}</div>
        </div>
        <div class="grid-card-actions">
          <button class="btn btn-secondary btn-sm" onclick="openAlternativesModal('${item.id}')">
            Swap Image
          </button>
          <button class="btn btn-ghost btn-sm" onclick="reSearchSingleItem('${item.id}')">
            Retry
          </button>
        </div>
      </div>
    `;
    gridViewContainer.appendChild(card);
  });
}

// Single Item Re-Search
async function reSearchSingleItem(itemId) {
  const item = state.items.find(i => i.id === itemId);
  if (!item) return;

  item.status = 'searching';
  renderProducts();

  const brandPrefix = brandPrefixInput ? brandPrefixInput.value.trim() : '';
  const apiKey = localStorage.getItem('google_serper_api_key') || '';

  try {
    const res = await fetch('/api/search-item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        product_name: item.product_name,
        brand_prefix: brandPrefix,
        api_key: apiKey
      })
    });
    const data = await res.json();
    if (data.best_image_url) {
      item.image_url = data.best_image_url;
      item.thumbnail_url = data.best_thumbnail_url || data.best_image_url;
      item.best_title = data.best_title;
      item.match_score = data.match_score;
      item.candidates = data.candidates || [];
      item.status = 'completed';
    } else {
      item.status = 'not_found';
    }
  } catch (e) {
    item.status = 'error';
  }
  updateStats();
  renderProducts();
}

// Alternatives Modal Logic
async function openAlternativesModal(itemId) {
  state.selectedItemId = itemId;
  const item = state.items.find(i => i.id === itemId);
  if (!item) return;

  altModalProductName.textContent = item.product_name;
  altSearchInput.value = item.product_name;
  customImageUrlInput.value = item.image_url || '';
  alternativesModal.classList.remove('hidden');

  if (item.candidates && item.candidates.length > 0) {
    renderCandidatesInModal(item.candidates, item.image_url);
  } else {
    await searchAlternativesForItem(itemId, item.product_name);
  }
}

async function searchAlternativesForItem(itemId, query) {
  altImagesGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 24px;"><div class="spinner" style="margin: 0 auto 8px;"></div>Searching Images...</div>';
  
  const brandPrefix = brandPrefixInput ? brandPrefixInput.value.trim() : '';
  const apiKey = localStorage.getItem('google_serper_api_key') || '';

  try {
    const res = await fetch('/api/search-item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        product_name: query, 
        custom_query: query,
        brand_prefix: brandPrefix,
        api_key: apiKey
      })
    });
    const data = await res.json();
    const item = state.items.find(i => i.id === itemId);
    if (item) {
      item.candidates = data.candidates || [];
    }
    renderCandidatesInModal(data.candidates || [], item ? item.image_url : '');
  } catch (err) {
    altImagesGrid.innerHTML = `<div style="grid-column: 1/-1; color: var(--danger); text-align: center; padding: 20px;">Search failed: ${err.message}</div>`;
  }
}

function renderCandidatesInModal(candidates, currentSelectedUrl) {
  altImagesGrid.innerHTML = '';
  if (candidates.length === 0) {
    altImagesGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 20px; color: var(--text-dim);">No candidate images found. Try refining keywords above.</div>';
    return;
  }

  candidates.forEach(cand => {
    const card = document.createElement('div');
    const isSelected = cand.image_url === currentSelectedUrl;
    card.className = `alt-item-card ${isSelected ? 'selected' : ''}`;
    
    card.innerHTML = `
      <div class="alt-img-wrap">
        <img src="${escapeHtml(cand.thumbnail_url || cand.image_url)}" onerror="this.src='/api/proxy-image?url=' + encodeURIComponent('${escapeHtml(cand.image_url)}')" alt="Candidate" loading="lazy">
      </div>
      <span class="score-badge score-high alt-score">${cand.score}%</span>
      <div class="alt-info">
        <div class="alt-title">${escapeHtml(cand.title || 'Product Match')}</div>
      </div>
    `;

    card.addEventListener('click', () => {
      updateItemWithChosenImage(state.selectedItemId, cand.image_url, cand.thumbnail_url, cand.title, cand.score);
      alternativesModal.classList.add('hidden');
    });

    altImagesGrid.appendChild(card);
  });
}

function updateItemWithChosenImage(itemId, imageUrl, thumbUrl, title, score) {
  const item = state.items.find(i => i.id === itemId);
  if (item) {
    item.image_url = imageUrl;
    item.thumbnail_url = thumbUrl || imageUrl;
    item.best_title = title;
    item.match_score = score;
    item.status = 'completed';
    updateStats();
    renderProducts();
  }
}

// Lightbox
function openLightbox(url, title) {
  if (!url) return;
  lightboxImg.src = url;
  lightboxImg.onerror = () => {
    lightboxImg.src = '/api/proxy-image?url=' + encodeURIComponent(url);
  };
  lightboxCaption.textContent = title;
  lightboxModal.classList.remove('hidden');
}

// Export CSV
async function exportCsv() {
  if (state.items.length === 0) {
    alert('No items to export.');
    return;
  }

  try {
    const payload = {
      headers: ['Product Name', 'Image URL', 'Match Score (%)', 'Image Title'],
      rows: state.items
    };

    const res = await fetch('/api/export-csv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const csvText = await res.text();

    // Check if running inside Desktop Native PyWebView app
    if (window.pywebview && window.pywebview.api && typeof window.pywebview.api.save_csv === 'function') {
      const result = await window.pywebview.api.save_csv(csvText, 'products_with_matching_images.csv');
      if (result && result.success) {
        alert('File saved successfully to:\n' + result.path);
        return;
      } else if (result && result.cancelled) {
        // User cancelled dialog
        return;
      } else if (result && result.error) {
        alert('Could not save file: ' + result.error);
        return;
      }
    }

    // Standard browser fallback
    const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'products_with_matching_images.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  } catch (err) {
    alert('Failed to export CSV: ' + err.message);
  }
}

function copyAllUrls() {
  const urls = state.items.map(i => i.image_url).filter(u => !!u);
  if (urls.length === 0) {
    alert('No image URLs found to copy yet.');
    return;
  }
  navigator.clipboard.writeText(urls.join('\n')).then(() => {
    alert(`Copied ${urls.length} image URLs to clipboard!`);
  }).catch(() => {
    alert('Could not copy to clipboard.');
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
