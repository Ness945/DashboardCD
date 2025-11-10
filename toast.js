// === TOAST NOTIFICATION SYSTEM ===
class ToastManager {
  constructor() {
    this.container = null;
    this.toasts = [];
    this.init();
  }

  init() {
    // Créer le conteneur de toasts
    this.container = document.createElement('div');
    this.container.className = 'toast-container';
    document.body.appendChild(this.container);
  }

  show(options) {
    const {
      type = 'info',
      title = '',
      message = '',
      duration = 5000,
      icon = this.getDefaultIcon(type)
    } = options;

    const toastId = 'toast_' + Date.now();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.id = toastId;

    toast.innerHTML = `
      <div class="toast-icon">${icon}</div>
      <div class="toast-content">
        ${title ? `<div class="toast-title">${title}</div>` : ''}
        ${message ? `<div class="toast-message">${message}</div>` : ''}
      </div>
      <button class="toast-close" onclick="toastManager.dismiss('${toastId}')">&times;</button>
      ${duration > 0 ? '<div class="toast-progress"><div class="toast-progress-bar"></div></div>' : ''}
    `;

    this.container.appendChild(toast);
    this.toasts.push({ id: toastId, element: toast });

    // Auto dismiss
    if (duration > 0) {
      setTimeout(() => this.dismiss(toastId), duration);
    }

    return toastId;
  }

  dismiss(toastId) {
    const toastObj = this.toasts.find(t => t.id === toastId);
    if (!toastObj) return;

    toastObj.element.classList.add('toast-exit');

    setTimeout(() => {
      if (toastObj.element.parentNode) {
        toastObj.element.parentNode.removeChild(toastObj.element);
      }
      this.toasts = this.toasts.filter(t => t.id !== toastId);
    }, 300);
  }

  dismissAll() {
    this.toasts.forEach(toast => this.dismiss(toast.id));
  }

  getDefaultIcon(type) {
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️',
      loading: '⏳'
    };
    return icons[type] || icons.info;
  }

  // Méthodes de raccourci
  success(title, message = '', duration = 5000) {
    return this.show({ type: 'success', title, message, duration });
  }

  error(title, message = '', duration = 6000) {
    return this.show({ type: 'error', title, message, duration });
  }

  warning(title, message = '', duration = 5000) {
    return this.show({ type: 'warning', title, message, duration });
  }

  info(title, message = '', duration = 5000) {
    return this.show({ type: 'info', title, message, duration });
  }

  loading(title, message = '') {
    return this.show({ type: 'loading', title, message, duration: 0, icon: '⏳' });
  }

  // Toast avec bouton d'action
  showWithAction(options) {
    const {
      type = 'info',
      title = '',
      message = '',
      actionText = 'Action',
      onAction = () => {},
      duration = 0
    } = options;

    const toastId = 'toast_' + Date.now();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.id = toastId;

    toast.innerHTML = `
      <div class="toast-icon">${this.getDefaultIcon(type)}</div>
      <div class="toast-content">
        ${title ? `<div class="toast-title">${title}</div>` : ''}
        ${message ? `<div class="toast-message">${message}</div>` : ''}
      </div>
      <button class="btn btn--small btn--primary" style="pointer-events: all; margin-right: var(--space-8);" id="${toastId}_action">
        ${actionText}
      </button>
      <button class="toast-close" onclick="toastManager.dismiss('${toastId}')">&times;</button>
    `;

    this.container.appendChild(toast);
    this.toasts.push({ id: toastId, element: toast });

    // Action button handler
    document.getElementById(`${toastId}_action`).addEventListener('click', () => {
      onAction();
      this.dismiss(toastId);
    });

    if (duration > 0) {
      setTimeout(() => this.dismiss(toastId), duration);
    }

    return toastId;
  }
}

// Instance globale
const toastManager = new ToastManager();

// Remplacer les alerts/confirms natifs
function showToast(message, type = 'info') {
  return toastManager.show({ type, title: message });
}

function showSuccess(message, details = '') {
  return toastManager.success(message, details);
}

function showError(message, details = '') {
  return toastManager.error(message, details);
}

function showWarning(message, details = '') {
  return toastManager.warning(message, details);
}

function showInfo(message, details = '') {
  return toastManager.info(message, details);
}

function showLoading(message = 'Chargement...') {
  return toastManager.loading(message);
}
