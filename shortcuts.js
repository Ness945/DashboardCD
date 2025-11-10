// === KEYBOARD SHORTCUTS MODULE ===

class ShortcutManager {
  constructor() {
    this.shortcuts = {};
    this.enabled = true;
    this.modal = null;
    this.init();
  }

  // === INIT ===
  init() {
    this.registerDefaultShortcuts();
    this.attachListener();
    this.createHelpModal();
    console.log('⌨️ Shortcuts activés');
  }

  // === REGISTER DEFAULT SHORTCUTS ===
  registerDefaultShortcuts() {
    // Navigation
    this.register('ctrl+1', () => this.goToTab('accueil'), 'Aller à Accueil');
    this.register('ctrl+2', () => this.goToTab('saisir'), 'Aller à Saisir CD');
    this.register('ctrl+3', () => this.goToTab('historique'), 'Aller à Historique');
    this.register('ctrl+4', () => this.goToTab('feedback'), 'Aller à Feedback');
    this.register('ctrl+5', () => this.goToTab('stats'), 'Aller à Stats');

    // Actions
    this.register('ctrl+s', (e) => {
      e.preventDefault();
      storageManager.save(true);
    }, 'Sauvegarder');

    this.register('ctrl+e', () => {
      if (typeof exportToExcel === 'function') {
        exportToExcel();
      }
    }, 'Exporter Excel');

    this.register('ctrl+n', () => {
      this.goToTab('saisir');
      document.getElementById('cdDate').focus();
    }, 'Nouveau CD');

    this.register('ctrl+k', () => {
      this.showSearch();
    }, 'Recherche globale');

    this.register('ctrl+h', () => {
      this.showHelp();
    }, 'Aide raccourcis');

    this.register('ctrl+z', () => {
      if (typeof undoManager !== 'undefined') {
        undoManager.undo();
      }
    }, 'Annuler (Undo)');

    this.register('ctrl+shift+z', () => {
      if (typeof undoManager !== 'undefined') {
        undoManager.redo();
      }
    }, 'Refaire (Redo)');

    this.register('escape', () => {
      this.closeAllModals();
    }, 'Fermer les modals');

    // Debug
    this.register('ctrl+shift+d', () => {
      this.toggleDebugMode();
    }, 'Mode debug');
  }

  // === REGISTER SHORTCUT ===
  register(combination, callback, description = '') {
    const key = combination.toLowerCase();
    this.shortcuts[key] = { callback, description, combination };
  }

  // === ATTACH LISTENER ===
  attachListener() {
    document.addEventListener('keydown', (e) => {
      if (!this.enabled) return;

      // Ignorer si dans un input/textarea
      const target = e.target;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        // Sauf pour Ctrl+S et Escape
        if (!(e.ctrlKey && e.key === 's') && e.key !== 'Escape') {
          return;
        }
      }

      const combination = this.getCombination(e);
      const shortcut = this.shortcuts[combination];

      if (shortcut) {
        e.preventDefault();
        shortcut.callback(e);
      }
    });
  }

  // === GET COMBINATION ===
  getCombination(e) {
    const parts = [];
    if (e.ctrlKey) parts.push('ctrl');
    if (e.shiftKey) parts.push('shift');
    if (e.altKey) parts.push('alt');
    if (e.metaKey) parts.push('meta');

    const key = e.key.toLowerCase();
    if (!['control', 'shift', 'alt', 'meta'].includes(key)) {
      parts.push(key);
    }

    return parts.join('+');
  }

  // === GO TO TAB ===
  goToTab(tabName) {
    if (typeof activerOnglet === 'function') {
      activerOnglet(tabName);
      showToast(`📍 ${tabName}`, 'info');
    }
  }

  // === SHOW SEARCH ===
  showSearch() {
    // Créer une recherche globale
    const searchModal = document.createElement('div');
    searchModal.className = 'modal active';
    searchModal.id = 'modalSearch';
    searchModal.innerHTML = `
      <div class="modal-content" style="max-width: 600px;">
        <h3 style="margin-bottom: var(--space-16);">🔍 Recherche Globale</h3>
        <input
          type="text"
          id="globalSearchInput"
          class="form-control"
          placeholder="Rechercher CAI, Dimension, Opérateur, Machine..."
          autofocus
          style="margin-bottom: var(--space-16);">
        <div id="searchResults" style="max-height: 400px; overflow-y: auto;"></div>
        <div class="modal-actions" style="margin-top: var(--space-16);">
          <button class="btn btn--secondary" onclick="shortcutManager.closeSearch()">Fermer (Esc)</button>
        </div>
      </div>
    `;
    document.body.appendChild(searchModal);

    const input = document.getElementById('globalSearchInput');
    input.focus();

    input.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      if (query.length < 2) {
        document.getElementById('searchResults').innerHTML = '<p style="color: var(--color-text-secondary);">Entrez au moins 2 caractères...</p>';
        return;
      }

      const results = this.performGlobalSearch(query);
      this.displaySearchResults(results);
    });

    // Fermer avec Escape
    const escapeHandler = (e) => {
      if (e.key === 'Escape') {
        this.closeSearch();
        document.removeEventListener('keydown', escapeHandler);
      }
    };
    document.addEventListener('keydown', escapeHandler);
  }

  performGlobalSearch(query) {
    const results = {
      cd: [],
      operateurs: [],
      machines: []
    };

    // Rechercher dans les CD
    dbData.cd.forEach(cd => {
      const machine = dbData.machines.find(m => m.id === cd.numMachine);
      const op1 = dbData.operateurs.find(o => o.id === cd.conf1);
      const op2 = dbData.operateurs.find(o => o.id === cd.conf2);

      const searchText = `${cd.cai} ${cd.dimension} ${cd.date} ${machine?.numero} ${op1?.nom} ${op2?.nom}`.toLowerCase();

      if (searchText.includes(query)) {
        results.cd.push({ ...cd, machine, op1, op2 });
      }
    });

    // Rechercher dans les opérateurs
    dbData.operateurs.forEach(op => {
      if (op.nom.toLowerCase().includes(query)) {
        results.operateurs.push(op);
      }
    });

    // Rechercher dans les machines
    dbData.machines.forEach(m => {
      if (m.numero.toLowerCase().includes(query) || m.type.toLowerCase().includes(query)) {
        results.machines.push(m);
      }
    });

    return results;
  }

  displaySearchResults(results) {
    const container = document.getElementById('searchResults');
    let html = '';

    if (results.cd.length === 0 && results.operateurs.length === 0 && results.machines.length === 0) {
      html = '<p style="color: var(--color-text-secondary);">Aucun résultat trouvé</p>';
    } else {
      if (results.cd.length > 0) {
        html += '<h4 style="margin-bottom: var(--space-12);">Changements de Dimension</h4>';
        html += '<div style="display: flex; flex-direction: column; gap: var(--space-8); margin-bottom: var(--space-20);">';
        results.cd.slice(0, 10).forEach(cd => {
          html += `
            <div style="padding: var(--space-12); background: var(--color-bg-1); border-radius: var(--radius-base); cursor: pointer;" onclick="voirDetailsCD('${cd.id}'); shortcutManager.closeSearch();">
              <strong>${cd.cai}</strong> - ${cd.dimension}<br>
              <small style="color: var(--color-text-secondary);">${cd.date} • ${cd.machine?.numero || 'N/A'} • ${cd.op1?.nom || 'N/A'} / ${cd.op2?.nom || 'N/A'}</small>
            </div>
          `;
        });
        html += '</div>';
      }

      if (results.operateurs.length > 0) {
        html += '<h4 style="margin-bottom: var(--space-12);">Opérateurs</h4>';
        html += '<div style="display: flex; flex-direction: column; gap: var(--space-8); margin-bottom: var(--space-20);">';
        results.operateurs.forEach(op => {
          html += `<div style="padding: var(--space-8); background: var(--color-bg-2); border-radius: var(--radius-base);">${op.nom}</div>`;
        });
        html += '</div>';
      }

      if (results.machines.length > 0) {
        html += '<h4 style="margin-bottom: var(--space-12);">Machines</h4>';
        html += '<div style="display: flex; flex-direction: column; gap: var(--space-8);">';
        results.machines.forEach(m => {
          html += `<div style="padding: var(--space-8); background: var(--color-bg-3); border-radius: var(--radius-base);">${m.numero} - ${m.type}</div>`;
        });
        html += '</div>';
      }
    }

    container.innerHTML = html;
  }

  closeSearch() {
    const modal = document.getElementById('modalSearch');
    if (modal) {
      modal.remove();
    }
  }

  // === SHOW HELP ===
  showHelp() {
    if (this.modal) {
      this.modal.classList.add('active');
      return;
    }

    this.createHelpModal();
    this.modal.classList.add('active');
  }

  createHelpModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'modalShortcutsHelp';

    let shortcutsHTML = '<div style="display: grid; gap: var(--space-12);">';

    Object.entries(this.shortcuts).forEach(([key, data]) => {
      shortcutsHTML += `
        <div style="display: flex; justify-content: space-between; padding: var(--space-8); background: var(--color-bg-1); border-radius: var(--radius-base);">
          <span>${data.description}</span>
          <kbd style="padding: var(--space-4) var(--space-8); background: var(--color-secondary); border-radius: var(--radius-sm); font-family: monospace; font-size: var(--font-size-sm);">${data.combination}</kbd>
        </div>
      `;
    });

    shortcutsHTML += '</div>';

    modal.innerHTML = `
      <div class="modal-content" style="max-width: 700px;">
        <h3 style="margin-bottom: var(--space-16);">⌨️ Raccourcis Clavier</h3>
        ${shortcutsHTML}
        <div class="modal-actions" style="margin-top: var(--space-20);">
          <button class="btn btn--secondary" onclick="shortcutManager.closeHelp()">Fermer (Esc)</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.modal = modal;

    // Fermer avec Escape
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.closeHelp();
      }
    });
  }

  closeHelp() {
    if (this.modal) {
      this.modal.classList.remove('active');
    }
  }

  // === CLOSE ALL MODALS ===
  closeAllModals() {
    document.querySelectorAll('.modal.active').forEach(modal => {
      if (modal.id !== 'modalShortcutsHelp') {
        modal.classList.remove('active');
      }
    });
    this.closeSearch();
    showToast('Modals fermées', 'info');
  }

  // === TOGGLE DEBUG MODE ===
  toggleDebugMode() {
    const debugInfo = {
      version: '2.0.0',
      cdCount: dbData.cd.length,
      storageSize: storageManager.getStats().sizeKB + ' KB',
      shortcuts: Object.keys(this.shortcuts).length
    };

    console.log('🐛 DEBUG INFO:', debugInfo);
    showInfo('Mode Debug', `CD: ${debugInfo.cdCount} | Storage: ${debugInfo.storageSize}`);

    // Afficher les stats dans la console
    storageManager.displayStats();
  }

  // === ENABLE/DISABLE ===
  enable() {
    this.enabled = true;
    showToast('⌨️ Raccourcis activés', 'info');
  }

  disable() {
    this.enabled = false;
    showToast('⌨️ Raccourcis désactivés', 'info');
  }
}

// Instance globale
const shortcutManager = new ShortcutManager();

// Afficher l'aide au premier lancement
document.addEventListener('DOMContentLoaded', () => {
  const firstLaunch = !localStorage.getItem('shortcuts_help_shown');
  if (firstLaunch) {
    setTimeout(() => {
      showInfo('Raccourcis disponibles', 'Appuyez sur Ctrl+H pour voir tous les raccourcis clavier');
      localStorage.setItem('shortcuts_help_shown', 'true');
    }, 2000);
  }
});
