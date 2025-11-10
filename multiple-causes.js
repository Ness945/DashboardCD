// === MODULE DE GESTION DES CAUSES MULTIPLES ===

class MultipleCausesManager {
  constructor() {
    this.selectedCodesQualite = []; // Plusieurs retours archi
    this.selectedCodesCQ = [];      // Plusieurs CQ
    this.selectedCodesIncident = []; // Plusieurs incidents
    this.selectedCommentsIncident = {}; // Commentaires par incident
    this.selectedTempsImpactIncident = {}; // Temps d'impact par incident (en minutes)
  }

  // === RESET ===
  reset() {
    this.selectedCodesQualite = [];
    this.selectedCodesCQ = [];
    this.selectedCodesIncident = [];
    this.selectedCommentsIncident = {};
    this.selectedTempsImpactIncident = {};
  }

  // === RETOURS ARCHI MULTIPLES ===
  openRetourArchiSelector(niveau) {
    const codes = dbData.codesQualite.filter(c => {
      if (niveau === '2') return c.niveau === '2';
      if (niveau === '2_grave' || niveau === '2_cc') return c.niveau === '2_grave';
      if (niveau === '3') return c.niveau === '3';
      return false;
    });

    if (codes.length === 0) {
      alert('Aucun code Retour Archi disponible pour ce niveau');
      return;
    }

    // Créer le modal
    let html = `
      <div class="modal" id="modalMultipleRetourArchi" style="display: flex;">
        <div class="modal-content modal-large">
          <h3>Sélectionner les Codes Retour Archi (Niveau ${niveau === '2_grave' || niveau === '2_cc' ? '2 CC' : niveau})</h3>
          <p style="color: var(--color-text-secondary); margin-bottom: 20px;">
            ✅ Cliquez pour sélectionner plusieurs codes. Vous pouvez en choisir autant que nécessaire.
          </p>

          <div class="multiple-causes-grid">
    `;

    codes.forEach(code => {
      const isSelected = this.selectedCodesQualite.includes(code.id);
      html += `
        <div class="cause-item ${isSelected ? 'selected' : ''}"
             data-code-id="${code.id}"
             onclick="multipleCausesManager.toggleRetourArchi('${code.id}', this)">
          <div class="cause-item-header">
            <span class="cause-item-code">${code.code}</span>
            <span class="cause-item-check">${isSelected ? '✓' : '+'}</span>
          </div>
          <div class="cause-item-desc">${code.description}</div>
        </div>
      `;
    });

    html += `
          </div>

          <div class="modal-actions" style="margin-top: 20px;">
            <div class="selected-count">
              <strong id="retourArchiCount">${this.selectedCodesQualite.length}</strong> code(s) sélectionné(s)
            </div>
            <button class="btn btn--primary" onclick="multipleCausesManager.validateRetourArchi()">
              Valider la sélection
            </button>
            <button class="btn btn--secondary" onclick="multipleCausesManager.cancelRetourArchi()">
              Annuler
            </button>
          </div>
        </div>
      </div>
    `;

    // Injecter le modal
    const existingModal = document.getElementById('modalMultipleRetourArchi');
    if (existingModal) existingModal.remove();
    document.body.insertAdjacentHTML('beforeend', html);
  }

  toggleRetourArchi(codeId, element) {
    const index = this.selectedCodesQualite.indexOf(codeId);

    if (index > -1) {
      // Retirer
      this.selectedCodesQualite.splice(index, 1);
      element.classList.remove('selected');
      element.querySelector('.cause-item-check').textContent = '+';
    } else {
      // Ajouter
      this.selectedCodesQualite.push(codeId);
      element.classList.add('selected');
      element.querySelector('.cause-item-check').textContent = '✓';
    }

    // Mettre à jour le compteur
    const countElement = document.getElementById('retourArchiCount');
    if (countElement) {
      countElement.textContent = this.selectedCodesQualite.length;
    }
  }

  validateRetourArchi() {
    if (this.selectedCodesQualite.length === 0) {
      alert('Veuillez sélectionner au moins un code Retour Archi');
      return;
    }

    // Mettre à jour l'affichage dans le formulaire
    this.updateRetourArchiDisplay();

    // Fermer le modal
    const modal = document.getElementById('modalMultipleRetourArchi');
    if (modal) modal.remove();
  }

  cancelRetourArchi() {
    const modal = document.getElementById('modalMultipleRetourArchi');
    if (modal) modal.remove();
  }

  updateRetourArchiDisplay() {
    const container = document.getElementById('selectedRetourArchiDisplay');
    if (!container) return;

    if (this.selectedCodesQualite.length === 0) {
      container.innerHTML = '<span style="color: var(--color-text-secondary);">Aucun code sélectionné</span>';
      return;
    }

    let html = '<div class="selected-causes-list">';
    this.selectedCodesQualite.forEach(codeId => {
      const code = dbData.codesQualite.find(c => c.id === codeId);
      if (code) {
        html += `
          <div class="selected-cause-badge">
            <span>${code.code}</span>
            <button class="remove-cause-btn" onclick="multipleCausesManager.removeRetourArchi('${codeId}')" title="Retirer">✕</button>
          </div>
        `;
      }
    });
    html += '</div>';
    container.innerHTML = html;
  }

  removeRetourArchi(codeId) {
    const index = this.selectedCodesQualite.indexOf(codeId);
    if (index > -1) {
      this.selectedCodesQualite.splice(index, 1);
      this.updateRetourArchiDisplay();
    }
  }

  // === CQ MULTIPLES ===
  openCQSelector() {
    if (dbData.codesCQ.length === 0) {
      alert('Aucun code CQ disponible');
      return;
    }

    let html = `
      <div class="modal" id="modalMultipleCQ" style="display: flex;">
        <div class="modal-content modal-large">
          <h3>Sélectionner les Codes CQ</h3>
          <p style="color: var(--color-text-secondary); margin-bottom: 20px;">
            ✅ Sélectionnez tous les codes CQ détectés après le CD.
          </p>

          <div class="multiple-causes-grid">
    `;

    dbData.codesCQ.forEach(code => {
      const isSelected = this.selectedCodesCQ.includes(code.id);
      html += `
        <div class="cause-item ${isSelected ? 'selected' : ''}"
             data-code-id="${code.id}"
             onclick="multipleCausesManager.toggleCQ('${code.id}', this)">
          <div class="cause-item-header">
            <span class="cause-item-code">${code.code}</span>
            <span class="cause-item-check">${isSelected ? '✓' : '+'}</span>
          </div>
          <div class="cause-item-desc">${code.description}</div>
        </div>
      `;
    });

    html += `
          </div>

          <div class="modal-actions" style="margin-top: 20px;">
            <div class="selected-count">
              <strong id="cqCount">${this.selectedCodesCQ.length}</strong> code(s) sélectionné(s)
            </div>
            <button class="btn btn--primary" onclick="multipleCausesManager.validateCQ()">
              Valider la sélection
            </button>
            <button class="btn btn--secondary" onclick="multipleCausesManager.cancelCQ()">
              Annuler
            </button>
          </div>
        </div>
      </div>
    `;

    const existingModal = document.getElementById('modalMultipleCQ');
    if (existingModal) existingModal.remove();
    document.body.insertAdjacentHTML('beforeend', html);
  }

  toggleCQ(codeId, element) {
    const index = this.selectedCodesCQ.indexOf(codeId);

    if (index > -1) {
      this.selectedCodesCQ.splice(index, 1);
      element.classList.remove('selected');
      element.querySelector('.cause-item-check').textContent = '+';
    } else {
      this.selectedCodesCQ.push(codeId);
      element.classList.add('selected');
      element.querySelector('.cause-item-check').textContent = '✓';
    }

    const countElement = document.getElementById('cqCount');
    if (countElement) {
      countElement.textContent = this.selectedCodesCQ.length;
    }
  }

  validateCQ() {
    if (this.selectedCodesCQ.length === 0) {
      alert('Veuillez sélectionner au moins un code CQ');
      return;
    }

    this.updateCQDisplay();
    const modal = document.getElementById('modalMultipleCQ');
    if (modal) modal.remove();
  }

  cancelCQ() {
    const modal = document.getElementById('modalMultipleCQ');
    if (modal) modal.remove();
  }

  updateCQDisplay() {
    const container = document.getElementById('selectedCQDisplay');
    if (!container) return;

    if (this.selectedCodesCQ.length === 0) {
      container.innerHTML = '<span style="color: var(--color-text-secondary);">Aucun code sélectionné</span>';
      return;
    }

    let html = '<div class="selected-causes-list">';
    this.selectedCodesCQ.forEach(codeId => {
      const code = dbData.codesCQ.find(c => c.id === codeId);
      if (code) {
        html += `
          <div class="selected-cause-badge">
            <span>${code.code}</span>
            <button class="remove-cause-btn" onclick="multipleCausesManager.removeCQ('${codeId}')" title="Retirer">✕</button>
          </div>
        `;
      }
    });
    html += '</div>';
    container.innerHTML = html;
  }

  removeCQ(codeId) {
    const index = this.selectedCodesCQ.indexOf(codeId);
    if (index > -1) {
      this.selectedCodesCQ.splice(index, 1);
      this.updateCQDisplay();
    }
  }

  // === INCIDENTS MULTIPLES ===
  openIncidentSelector() {
    if (dbData.codesIncident.length === 0) {
      alert('Aucun code incident disponible');
      return;
    }

    let html = `
      <div class="modal" id="modalMultipleIncident" style="display: flex;">
        <div class="modal-content modal-large">
          <h3>Sélectionner les Incidents</h3>
          <p style="color: var(--color-text-secondary); margin-bottom: 20px;">
            ✅ Sélectionnez tous les incidents survenus pendant le CD.
          </p>

          <div class="multiple-causes-grid">
    `;

    dbData.codesIncident.forEach(code => {
      const isSelected = this.selectedCodesIncident.includes(code.id);
      html += `
        <div class="cause-item ${isSelected ? 'selected' : ''}"
             data-code-id="${code.id}"
             onclick="multipleCausesManager.toggleIncident('${code.id}', this)">
          <div class="cause-item-header">
            <span class="cause-item-code">${code.code}</span>
            <span class="cause-item-check">${isSelected ? '✓' : '+'}</span>
          </div>
          <div class="cause-item-desc">${code.description}</div>
        </div>
      `;
    });

    html += `
          </div>

          <!-- Liste des incidents sélectionnés avec temps individuel -->
          <div id="selectedIncidentsDetails" style="margin-top: 20px;">
            <!-- Rempli dynamiquement par updateIncidentDetailsForm() -->
          </div>

          <div class="form-group" style="margin-top: 12px;">
            <label class="form-label">Commentaire global sur les incidents (optionnel)</label>
            <textarea id="incidentGlobalComment" class="form-control" rows="3" placeholder="Décrivez les circonstances des incidents...">${this.selectedCommentsIncident['global'] || ''}</textarea>
          </div>

          <div class="modal-actions" style="margin-top: 20px;">
            <div class="selected-count">
              <strong id="incidentCount">${this.selectedCodesIncident.length}</strong> incident(s) sélectionné(s)
            </div>
            <button class="btn btn--primary" onclick="multipleCausesManager.validateIncident()">
              Valider la sélection
            </button>
            <button class="btn btn--secondary" onclick="multipleCausesManager.cancelIncident()">
              Annuler
            </button>
          </div>
        </div>
      </div>
    `;

    const existingModal = document.getElementById('modalMultipleIncident');
    if (existingModal) existingModal.remove();
    document.body.insertAdjacentHTML('beforeend', html);

    // Mettre à jour la liste des incidents avec leurs champs de temps
    this.updateIncidentDetailsForm();
  }

  toggleIncident(codeId, element) {
    const index = this.selectedCodesIncident.indexOf(codeId);

    if (index > -1) {
      this.selectedCodesIncident.splice(index, 1);
      element.classList.remove('selected');
      element.querySelector('.cause-item-check').textContent = '+';
    } else {
      this.selectedCodesIncident.push(codeId);
      element.classList.add('selected');
      element.querySelector('.cause-item-check').textContent = '✓';
    }

    const countElement = document.getElementById('incidentCount');
    if (countElement) {
      countElement.textContent = this.selectedCodesIncident.length;
    }

    // Mettre à jour les champs de temps individuel
    this.updateIncidentDetailsForm();
  }

  updateIncidentDetailsForm() {
    const container = document.getElementById('selectedIncidentsDetails');
    if (!container) return;

    if (this.selectedCodesIncident.length === 0) {
      container.innerHTML = '';
      return;
    }

    let html = `
      <div style="background: var(--color-bg-1); padding: var(--space-16); border-radius: var(--radius-base); border: 1px solid var(--color-border);">
        <h4 style="margin: 0 0 var(--space-12) 0; color: var(--color-text);">⏱️ Temps d'impact par incident</h4>
        <div style="display: grid; gap: var(--space-12);">
    `;

    this.selectedCodesIncident.forEach(codeId => {
      const code = dbData.codesIncident.find(c => c.id === codeId);
      if (code) {
        const currentValue = this.selectedTempsImpactIncident[codeId] || '';
        html += `
          <div style="display: grid; grid-template-columns: 1fr auto; gap: var(--space-12); align-items: center;">
            <div>
              <strong style="color: var(--color-text);">${code.code}</strong>
              <div style="font-size: 13px; color: var(--color-text-secondary);">${code.description}</div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <input
                type="number"
                id="incidentTemps_${codeId}"
                class="form-control"
                min="0"
                placeholder="min"
                value="${currentValue}"
                style="width: 100px; text-align: center;"
                onchange="multipleCausesManager.updateIncidentTemps('${codeId}', this.value)"
              >
              <span style="color: var(--color-text-secondary); font-size: 14px;">min</span>
            </div>
          </div>
        `;
      }
    });

    html += `
        </div>
      </div>
    `;

    container.innerHTML = html;
  }

  updateIncidentTemps(codeId, value) {
    this.selectedTempsImpactIncident[codeId] = value ? parseInt(value) : 0;
  }

  validateIncident() {
    if (this.selectedCodesIncident.length === 0) {
      alert('Veuillez sélectionner au moins un incident');
      return;
    }

    // Sauvegarder le commentaire global
    const comment = document.getElementById('incidentGlobalComment')?.value || '';
    this.selectedCommentsIncident['global'] = comment;

    // Les temps d'impact individuels sont déjà sauvegardés via updateIncidentTemps()
    // Pas besoin de récupérer un temps global

    this.updateIncidentDisplay();
    const modal = document.getElementById('modalMultipleIncident');
    if (modal) modal.remove();
  }

  cancelIncident() {
    const modal = document.getElementById('modalMultipleIncident');
    if (modal) modal.remove();
  }

  updateIncidentDisplay() {
    const container = document.getElementById('selectedIncidentDisplay');
    if (!container) return;

    if (this.selectedCodesIncident.length === 0) {
      container.innerHTML = '<span style="color: var(--color-text-secondary);">Aucun incident sélectionné</span>';
      return;
    }

    let html = '<div class="selected-causes-list">';
    this.selectedCodesIncident.forEach(codeId => {
      const code = dbData.codesIncident.find(c => c.id === codeId);
      if (code) {
        const temps = this.selectedTempsImpactIncident[codeId] || 0;
        const tempsDisplay = temps > 0 ? ` (${temps} min)` : '';
        html += `
          <div class="selected-cause-badge">
            <span>${code.code}${tempsDisplay}</span>
            <button class="remove-cause-btn" onclick="multipleCausesManager.removeIncident('${codeId}')" title="Retirer">✕</button>
          </div>
        `;
      }
    });
    html += '</div>';
    container.innerHTML = html;
  }

  removeIncident(codeId) {
    const index = this.selectedCodesIncident.indexOf(codeId);
    if (index > -1) {
      this.selectedCodesIncident.splice(index, 1);
      // Supprimer aussi le temps d'impact associé
      delete this.selectedTempsImpactIncident[codeId];
      this.updateIncidentDisplay();
    }
  }

  // === ÉDITION: CHARGER LES DONNÉES EXISTANTES ===
  loadFromCD(cd) {
    this.reset();

    // Charger les retours archi (ancienne version: string, nouvelle: array)
    if (cd.codesQualite && Array.isArray(cd.codesQualite)) {
      this.selectedCodesQualite = [...cd.codesQualite];
    } else if (cd.codeQualite) {
      // Migration: ancienne donnée
      this.selectedCodesQualite = [cd.codeQualite];
    }

    // Charger les CQ
    if (cd.codesCQ && Array.isArray(cd.codesCQ)) {
      this.selectedCodesCQ = [...cd.codesCQ];
    } else if (cd.codeCQ) {
      this.selectedCodesCQ = [cd.codeCQ];
    }

    // Charger les incidents
    if (cd.codesIncident && Array.isArray(cd.codesIncident)) {
      this.selectedCodesIncident = [...cd.codesIncident];
    } else if (cd.codeIncident) {
      this.selectedCodesIncident = [cd.codeIncident];
    }

    // Charger les commentaires
    if (cd.commentsIncident && typeof cd.commentsIncident === 'object') {
      this.selectedCommentsIncident = { ...cd.commentsIncident };
    } else if (cd.commentaireIncident) {
      this.selectedCommentsIncident = { global: cd.commentaireIncident };
    }

    // Charger les temps d'impact
    if (cd.tempsImpactIncident && typeof cd.tempsImpactIncident === 'object') {
      this.selectedTempsImpactIncident = { ...cd.tempsImpactIncident };
    } else if (cd.tempsImpact) {
      // Migration: ancien système avec temps global
      this.selectedTempsImpactIncident = { global: cd.tempsImpact };
    }

    // Mettre à jour les affichages
    this.updateRetourArchiDisplay();
    this.updateCQDisplay();
    this.updateIncidentDisplay();
  }

  // === CALCULER LE PIRE SCORE (pour performance) ===
  getWorstQualityScore() {
    if (this.selectedCodesQualite.length === 0) {
      return 100; // NIV 1 par défaut
    }

    let worstScore = 100;

    this.selectedCodesQualite.forEach(codeId => {
      const code = dbData.codesQualite.find(c => c.id === codeId);
      if (code) {
        const niveau = dbData.niveauxQualite.find(n => n.niveau === code.niveau);
        if (niveau && niveau.scorePerformance < worstScore) {
          worstScore = niveau.scorePerformance;
        }
      }
    });

    return worstScore;
  }

  // === OBTENIR LES DONNÉES POUR SAUVEGARDE ===
  getDataForSave() {
    return {
      codesQualite: [...this.selectedCodesQualite],
      codesCQ: [...this.selectedCodesCQ],
      codesIncident: [...this.selectedCodesIncident],
      commentsIncident: { ...this.selectedCommentsIncident },
      tempsImpactIncident: { ...this.selectedTempsImpactIncident }
    };
  }
}

// Instance globale
const multipleCausesManager = new MultipleCausesManager();
