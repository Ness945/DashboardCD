// === LOADING STATES MANAGER ===

class LoadingManager {
  constructor() {
    this.overlay = null;
    this.activeLoaders = new Set();
    this.init();
  }

  // === INIT ===
  init() {
    this.createOverlay();
  }

  // === CREATE OVERLAY ===
  createOverlay() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'loading-overlay';
    this.overlay.id = 'globalLoadingOverlay';
    this.overlay.innerHTML = `
      <div class="loading-content">
        <div class="spinner spinner--large"></div>
        <div class="loading-text" id="loadingText">Chargement...</div>
      </div>
    `;
    document.body.appendChild(this.overlay);
  }

  // === SHOW OVERLAY ===
  show(text = 'Chargement...') {
    const loadingText = document.getElementById('loadingText');
    if (loadingText) {
      loadingText.textContent = text;
    }
    this.overlay.classList.add('active');
    return this.generateLoaderId();
  }

  // === HIDE OVERLAY ===
  hide(loaderId = null) {
    if (loaderId) {
      this.activeLoaders.delete(loaderId);
      if (this.activeLoaders.size > 0) {
        return; // D'autres loaders sont encore actifs
      }
    }
    this.overlay.classList.remove('active');
  }

  // === GENERATE LOADER ID ===
  generateLoaderId() {
    const id = 'loader_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    this.activeLoaders.add(id);
    return id;
  }

  // === SHOW BUTTON LOADING ===
  showButtonLoading(buttonId) {
    const button = document.getElementById(buttonId);
    if (button) {
      button.classList.add('btn--loading');
      button.disabled = true;
    }
  }

  // === HIDE BUTTON LOADING ===
  hideButtonLoading(buttonId) {
    const button = document.getElementById(buttonId);
    if (button) {
      button.classList.remove('btn--loading');
      button.disabled = false;
    }
  }

  // === SHOW CARD LOADING ===
  showCardLoading(cardId) {
    const card = document.getElementById(cardId);
    if (card) {
      card.classList.add('card--loading');
    }
  }

  // === HIDE CARD LOADING ===
  hideCardLoading(cardId) {
    const card = document.getElementById(cardId);
    if (card) {
      card.classList.remove('card--loading');
    }
  }

  // === SHOW TABLE LOADING ===
  showTableLoading(tableId) {
    const table = document.getElementById(tableId);
    if (table) {
      if (!table.querySelector('.table-loading-overlay')) {
        const overlay = document.createElement('div');
        overlay.className = 'table-loading-overlay';
        overlay.innerHTML = `
          <div style="display: flex; flex-direction: column; align-items: center; gap: var(--space-12);">
            <div class="spinner spinner--large"></div>
            <div style="color: var(--color-text-secondary);">Chargement des données...</div>
          </div>
        `;
        table.style.position = 'relative';
        table.appendChild(overlay);
      }
    }
  }

  // === HIDE TABLE LOADING ===
  hideTableLoading(tableId) {
    const table = document.getElementById(tableId);
    if (table) {
      const overlay = table.querySelector('.table-loading-overlay');
      if (overlay) {
        overlay.remove();
      }
    }
  }

  // === SHOW SKELETON ===
  showSkeleton(containerId, count = 5, type = 'text') {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';

    for (let i = 0; i < count; i++) {
      const skeleton = document.createElement('div');
      skeleton.className = `skeleton skeleton-${type}`;
      container.appendChild(skeleton);
    }
  }

  // === SHOW PROGRESS ===
  showProgress(containerId, progress = 0) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let progressBar = container.querySelector('.progress-bar');

    if (!progressBar) {
      progressBar = document.createElement('div');
      progressBar.className = 'progress-bar';
      progressBar.innerHTML = '<div class="progress-bar-fill"></div>';
      container.appendChild(progressBar);
    }

    const fill = progressBar.querySelector('.progress-bar-fill');
    if (fill) {
      fill.style.width = progress + '%';
    }
  }

  // === SHOW INDETERMINATE PROGRESS ===
  showIndeterminateProgress(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '<div class="progress-bar progress-bar-indeterminate"></div>';
  }

  // === HIDE PROGRESS ===
  hideProgress(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
      const progressBar = container.querySelector('.progress-bar');
      if (progressBar) {
        progressBar.remove();
      }
    }
  }

  // === SHOW DOTS LOADING ===
  showDotsLoading(containerId, text = 'Chargement') {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div style="display: flex; align-items: center; gap: var(--space-8);">
        <span>${text}</span>
        <div class="dots-loading">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    `;
  }

  // === ASYNC WRAPPER ===
  async wrapAsync(asyncFn, options = {}) {
    const {
      loadingText = 'Chargement...',
      successText = 'Opération réussie',
      errorText = 'Erreur',
      showOverlay = true
    } = options;

    let loaderId = null;

    try {
      if (showOverlay) {
        loaderId = this.show(loadingText);
      }

      const result = await asyncFn();

      if (successText) {
        showSuccess(successText);
      }

      return result;
    } catch (error) {
      console.error('❌ Erreur:', error);
      showError(errorText, error.message);
      throw error;
    } finally {
      if (showOverlay && loaderId) {
        this.hide(loaderId);
      }
    }
  }

  // === SIMULATE ASYNC (for demo) ===
  simulateAsync(duration = 2000) {
    return new Promise(resolve => setTimeout(resolve, duration));
  }
}

// Instance globale
const loadingManager = new LoadingManager();

// === HELPER FUNCTIONS ===

function showLoading(text = 'Chargement...') {
  return loadingManager.show(text);
}

function hideLoading(loaderId = null) {
  loadingManager.hide(loaderId);
}

async function withLoading(asyncFn, options = {}) {
  return loadingManager.wrapAsync(asyncFn, options);
}

// Exemple d'utilisation
/*
// Afficher le loading et exécuter une action async
await withLoading(async () => {
  await fetch('/api/data');
}, {
  loadingText: 'Récupération des données...',
  successText: 'Données chargées',
  errorText: 'Erreur de chargement'
});

// Ou manuellement
const loaderId = showLoading('Exportation...');
try {
  await exportToExcel();
  showSuccess('Export réussi');
} finally {
  hideLoading(loaderId);
}
*/

