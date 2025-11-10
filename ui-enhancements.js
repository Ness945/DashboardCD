// ===================================
// UI ENHANCEMENTS - MICHELIN CD
// ===================================

// === TOAST NOTIFICATIONS AMÉLIORÉES ===
// Override la fonction showToast existante pour ajouter des icônes
const originalShowToast = typeof showToast !== 'undefined' ? showToast : null;

if (typeof showToast !== 'undefined') {
  window.showToast = function(message, type = 'success') {
    const toastContainer = document.getElementById('toastContainer') || createToastContainer();

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    // Icônes selon le type
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };

    toast.setAttribute('data-icon', icons[type] || icons.success);
    toast.innerHTML = `<span style="flex: 1;">${message}</span>`;

    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'toastSlideOut 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  };
}

function createToastContainer() {
  const container = document.createElement('div');
  container.id = 'toastContainer';
  container.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    display: flex;
    flex-direction: column;
    gap: 12px;
  `;
  document.body.appendChild(container);
  return container;
}

// Animation pour la sortie des toasts
const style = document.createElement('style');
style.textContent = `
  @keyframes toastSlideOut {
    to {
      opacity: 0;
      transform: translateX(120%);
    }
  }
`;
document.head.appendChild(style);

// === BREADCRUMBS ===
function updateBreadcrumbs(tabName) {
  const breadcrumbsContainer = document.getElementById('breadcrumbs');
  if (!breadcrumbsContainer) return;

  const tabNames = {
    'accueil': 'Accueil',
    'saisir': 'Saisir CD',
    'historique': 'Historique',
    'feedback': 'Feedback',
    'stats': 'Statistiques',
    'manager': 'Vue Manager',
    'machine': 'Machine',
    'qualite': 'Qualité',
    'admin': 'Administration',
    'sauvegarde': 'Sauvegarde',
    'insights': 'Insights'
  };

  breadcrumbsContainer.innerHTML = `
    <a href="#" onclick="activerOnglet('accueil'); return false;">Accueil</a>
    ${tabName !== 'accueil' ? `
      <span class="separator">›</span>
      <span>${tabNames[tabName] || tabName}</span>
    ` : ''}
  `;
}

// === CLEAR BUTTON POUR RECHERCHES ===
function addClearButtons() {
  const searchInputs = document.querySelectorAll('input[type="text"].form-control, input[type="search"].form-control');

  searchInputs.forEach(input => {
    if (input.nextElementSibling?.classList.contains('search-clear-btn')) return;

    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    wrapper.style.display = 'inline-block';
    wrapper.style.width = '100%';

    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);

    const clearBtn = document.createElement('button');
    clearBtn.className = 'search-clear-btn';
    clearBtn.innerHTML = '×';
    clearBtn.type = 'button';
    clearBtn.style.display = 'none';

    clearBtn.onclick = () => {
      input.value = '';
      clearBtn.style.display = 'none';
      input.dispatchEvent(new Event('input'));
      input.dispatchEvent(new Event('keyup'));
    };

    input.addEventListener('input', () => {
      clearBtn.style.display = input.value ? 'block' : 'none';
    });

    wrapper.appendChild(clearBtn);
  });
}

// === BADGE NOMBRE DE FILTRES ACTIFS ===
function updateFilterBadge() {
  const activeFilters = [];

  // Vérifier les filtres actifs
  const searchHistorique = document.getElementById('searchHistorique');
  if (searchHistorique && searchHistorique.value) activeFilters.push('search');

  const filterQualite = document.getElementById('filterQualite');
  if (filterQualite && filterQualite.value) activeFilters.push('qualité');

  const filterMachine = document.getElementById('filterMachine');
  if (filterMachine && filterMachine.value) activeFilters.push('machine');

  // Filtres rapides
  const quickFilters = document.querySelectorAll('.quick-filter-btn.active');
  activeFilters.push(...Array.from(quickFilters).map(() => 'quick'));

  // Tags
  if (typeof advancedFilters !== 'undefined' && advancedFilters.selectedTags.length > 0) {
    activeFilters.push('tags');
  }

  // Recherche avancée
  const advancedSearch = document.getElementById('advancedSearch');
  if (advancedSearch && advancedSearch.value) activeFilters.push('advanced');

  // Mettre à jour le badge
  const historiqueTab = document.querySelector('[data-tab="historique"]');
  if (!historiqueTab) return;

  let badge = historiqueTab.querySelector('.filter-badge');

  if (activeFilters.length > 0) {
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'filter-badge';
      historiqueTab.appendChild(badge);
    }
    badge.textContent = activeFilters.length;
  } else if (badge) {
    badge.remove();
  }
}

// === PROGRESS RING POUR KPIs ===
function createProgressRing(percentage, size = 80, strokeWidth = 8) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return `
    <svg width="${size}" height="${size}" class="progress-ring">
      <circle
        class="progress-ring-bg"
        stroke="rgba(var(--michelin-blue-rgb), 0.1)"
        stroke-width="${strokeWidth}"
        fill="transparent"
        r="${radius}"
        cx="${size / 2}"
        cy="${size / 2}"
      />
      <circle
        class="progress-ring-circle"
        stroke="var(--michelin-blue)"
        stroke-width="${strokeWidth}"
        fill="transparent"
        r="${radius}"
        cx="${size / 2}"
        cy="${size / 2}"
        style="
          stroke-dasharray: ${circumference} ${circumference};
          stroke-dashoffset: ${offset};
          transform-origin: center;
          transform: rotate(-90deg);
        "
      />
      <text
        x="50%"
        y="50%"
        text-anchor="middle"
        dominant-baseline="middle"
        font-size="${size / 4}"
        font-weight="bold"
        fill="var(--michelin-blue)"
      >
        ${Math.round(percentage)}%
      </text>
    </svg>
  `;
}

// === CONFETTI POUR PERFORMANCES EXCEPTIONNELLES ===
function showConfetti() {
  // Simple confetti avec des emojis
  const emojis = ['🎉', '✨', '⭐', '🌟', '💫'];
  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 9999;
  `;

  for (let i = 0; i < 30; i++) {
    const confetti = document.createElement('div');
    confetti.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    confetti.style.cssText = `
      position: absolute;
      top: -20px;
      left: ${Math.random() * 100}%;
      font-size: ${20 + Math.random() * 20}px;
      animation: confettiFall ${2 + Math.random() * 2}s ease-out forwards;
    `;
    container.appendChild(confetti);
  }

  document.body.appendChild(container);

  setTimeout(() => container.remove(), 4000);
}

// Animation confetti
const confettiStyle = document.createElement('style');
confettiStyle.textContent = `
  @keyframes confettiFall {
    to {
      transform: translateY(100vh) rotate(${Math.random() * 360}deg);
      opacity: 0;
    }
  }
`;
document.head.appendChild(confettiStyle);

// === INITIALISATION ===
document.addEventListener('DOMContentLoaded', () => {
  // Ajouter les breadcrumbs
  const navContainer = document.querySelector('.nav-container');
  if (navContainer && !document.getElementById('breadcrumbs')) {
    const breadcrumbs = document.createElement('div');
    breadcrumbs.id = 'breadcrumbs';
    breadcrumbs.className = 'breadcrumbs';
    breadcrumbs.style.marginTop = 'var(--space-12)';
    navContainer.appendChild(breadcrumbs);
    updateBreadcrumbs('accueil');
  }

  // Ajouter les clear buttons
  setTimeout(addClearButtons, 500);

  // Observer les changements d'onglets pour les breadcrumbs
  const navTabs = document.querySelectorAll('.nav-tab');
  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.getAttribute('data-tab');
      updateBreadcrumbs(tabName);
      updateFilterBadge();
    });
  });

  // Observer les changements de filtres
  setTimeout(() => {
    const filterElements = [
      'searchHistorique',
      'filterQualite',
      'filterMachine',
      'advancedSearch'
    ];

    filterElements.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', updateFilterBadge);
        el.addEventListener('change', updateFilterBadge);
      }
    });

    // Observer les quick filters
    document.querySelectorAll('.quick-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        setTimeout(updateFilterBadge, 100);
      });
    });
  }, 1000);
});

// Exposer les fonctions globalement
window.updateBreadcrumbs = updateBreadcrumbs;
window.updateFilterBadge = updateFilterBadge;
window.createProgressRing = createProgressRing;
window.showConfetti = showConfetti;

console.log('✨ UI Enhancements loaded');
