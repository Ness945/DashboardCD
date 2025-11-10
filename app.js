// === Filtre date global ===
let globalDateFilter = { mode: 'all', start: null, end: null, badge: null };

function parseISO(d){ return d ? new Date(d + 'T00:00:00') : null; }
function fmtISO(d){ return d.toISOString().slice(0,10); }

function setQuickRange(key){
  const end = new Date();
  const start = new Date(end);
  if(key==='1d'){ start.setDate(end.getDate()-1); }
  else if(key==='7d'){ start.setDate(end.getDate()-7); }
  else if(key==='1m'){ start.setMonth(end.getMonth()-1); }
  else if(key==='6m'){ start.setMonth(end.getMonth()-6); }
  else if(key==='1y'){ start.setFullYear(end.getFullYear()-1); }
  globalDateFilter = { mode:'quick', start: fmtISO(start), end: fmtISO(end), badge:key };
}

function setRange(startISO, endISO){
  globalDateFilter = { mode:'range', start:startISO||null, end:endISO||null, badge:null };
}

function clearDateFilter(){
  globalDateFilter = { mode:'all', start:null, end:null, badge:null };
}

function inRange(cdDateISO, startISO, endISO){
  if(!startISO && !endISO) return true;
  const d = parseISO(cdDateISO);
  if(startISO && d < parseISO(startISO)) return false;
  if(endISO && d > parseISO(endISO)) return false;
  return true;
}

function getFilteredCD(opts = { excludeCached:false }){
  let source = Array.isArray(dbData?.cd) ? dbData.cd.slice() : [];
  if (opts.excludeCached) source = source.filter(c => !c.cache);
  if (globalDateFilter.mode !== 'all') {
    source = source.filter(c => inRange(c.date, globalDateFilter.start, globalDateFilter.end));
  }
  return source;
}

function rafraichirVuesApresFiltre(){
  try { afficherAccueil && afficherAccueil(); } catch(e){}
  try { afficherStats && afficherStats(); } catch(e){}
  try {
    if (document.getElementById('historique')?.classList?.contains('active')) {
      appliquerFiltres && appliquerFiltres();
    } else {
      afficherHistorique && afficherHistorique();
    }
  } catch(e){}
  try {
    if (document.getElementById('feedbackOperateur')?.value) {
      afficherFeedback && afficherFeedback();
    }
  } catch(e){}
  try { afficherVueManager && afficherVueManager(); } catch(e){}
  try { afficherMachinePerformance && afficherMachinePerformance(); } catch(e){}
  try { afficherQualite && afficherQualite(); } catch(e){}
}

// Base de données en mémoire
let dbData = {
  operateurs: [],
  machines: [],
  codesQualite: [],
  codesCQ: [],
  codesIncident: [],
  cd: [],
  tags: [],
  feedbackShowHidden: false,
  niveauxQualite: [
    { id: 'niv_1', niveau: '1', label: 'NIV 1', couleur: '#2E7D32', scorePerformance: 100 },
    { id: 'niv_2', niveau: '2', label: 'NIV 2', couleur: '#F57C00', scorePerformance: 70, severite: 'standard' },
    { id: 'niv_2_cc', niveau: '2_cc', label: 'NIV 2 CC', couleur: '#C62828', scorePerformance: 50, severite: 'cc' },
    { id: 'niv_3', niveau: '3', label: 'NIV 3', couleur: '#C62828', scorePerformance: 30 }
  ]
};

// Filtres avancés et recherche
let advancedFilters = {
  searchQuery: '',
  quickFilters: {
    anomaliesOnly: false,
    cqThisWeek: false,
    lowPerformance: false
  },
  selectedTags: []
};


// Variables temporaires pour les modals
let tempCodeQualite = null;
let tempCodeCQ = null;
let tempCodeIncident = null;
let tempCommentaireIncident = null;
let tempTempsImpact = null;
let currentEditingCD = null;

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
  initNavigation();
  initBadgeButtons();
  initFormHandlers();
  initialiserDonneesExemple();
  chargerToutesLesVues();
  afficherScoresPerformance();
  afficherAccueil();
  
  // Définir la date par défaut à aujourd'hui
  document.getElementById('cdDate').valueAsDate = new Date();
  
  // S'assurer que toutes les sections Admin sont fermées au démarrage
  const allAdminSections = document.querySelectorAll('#admin .collapsible-section');
  allAdminSections.forEach(sec => {
    sec.classList.remove('active');
    const chevron = sec.querySelector('.collapsible-chevron');
    if (chevron) chevron.textContent = '>';
  });


// Filtres date globaux (UI)
(function(){
  const gdfButtons = document.querySelectorAll('.gdf-badge');
  gdfButtons.forEach(b=>{
    b.addEventListener('click', ()=>{
      gdfButtons.forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      setQuickRange(b.dataset.range);
      rafraichirVuesApresFiltre();
      const gs = document.getElementById('gdfStart');  if(gs) gs.value = globalDateFilter.start || '';
      const ge = document.getElementById('gdfEnd');    if(ge) ge.value = globalDateFilter.end   || '';
    });
  });
  const apply = document.getElementById('gdfApply');
  if(apply){
    apply.addEventListener('click', ()=>{
      const s = document.getElementById('gdfStart')?.value || null;
      const e = document.getElementById('gdfEnd')?.value || null;
      setRange(s,e);
      document.querySelectorAll('.gdf-badge').forEach(x=>x.classList.remove('active'));
      rafraichirVuesApresFiltre();
    });
  }
  const reset = document.getElementById('gdfReset');
  if(reset){
    reset.addEventListener('click', ()=>{
      clearDateFilter();
      const gs = document.getElementById('gdfStart'); if(gs) gs.value = '';
      const ge = document.getElementById('gdfEnd');   if(ge) ge.value = '';
      document.querySelectorAll('.gdf-badge').forEach(x=>x.classList.remove('active'));
      rafraichirVuesApresFiltre();
    });
  }
})();
});

// === COLLAPSIBLE SECTIONS ===
function toggleCollapsible(sectionId) {
  const section = document.getElementById(sectionId);
  if (!section) return;
  
  // Check if this section is in Admin tab
  const isAdminSection = section.closest('#admin') !== null;
  
  if (isAdminSection) {
    // ACCORDION BEHAVIOR FOR ADMIN SECTIONS
    // Check if this section is already open
    const isCurrentlyOpen = section.classList.contains('active');
    
    // CLOSE ALL admin sections first and reset chevrons
    const allAdminSections = document.querySelectorAll('#admin .collapsible-section');
    allAdminSections.forEach(sec => {
      sec.classList.remove('active');
      const chevron = sec.querySelector('.collapsible-chevron');
      if (chevron) chevron.textContent = '>';
    });
    
    // If the section was NOT open, open it now and change chevron
    // If it WAS open, leave it closed (toggle behavior)
    if (!isCurrentlyOpen) {
      section.classList.add('active');
      const chevron = section.querySelector('.collapsible-chevron');
      if (chevron) chevron.textContent = '∨'; // ∨
    }
  } else {
    // NON-ADMIN SECTIONS: Simple toggle (no accordion)
    const isOpen = section.classList.toggle('active');
    const chevron = section.querySelector('.collapsible-chevron');
    if (chevron) {
      chevron.textContent = isOpen ? '∨' : '>'; // ∨ or >
    }
  }
}

// Navigation entre onglets
function initNavigation() {
  const navTabs = document.querySelectorAll('.nav-tab');
  navTabs.forEach(tab => {
    tab.addEventListener('click', function() {
      const targetTab = this.getAttribute('data-tab');
      activerOnglet(targetTab);
    });
  });
}

function activerOnglet(tabName) {
  // Désactiver tous les onglets
  document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
  
  // Activer l'onglet sélectionné
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
  document.getElementById(tabName).classList.add('active');
  
  // Rafraîchir les données selon l'onglet
  if (tabName === 'accueil') {
    afficherAccueil();
  } else if (tabName === 'admin') {
    // Fermer toutes les sections Admin au chargement (accordéon strict)
    const allAdminSections = document.querySelectorAll('#admin .collapsible-section');
    allAdminSections.forEach(sec => {
      sec.classList.remove('active');
      const chevron = sec.querySelector('.collapsible-chevron');
      if (chevron) chevron.textContent = '>';
    });
    
    afficherOperateurs();
    afficherMachines();
    afficherCodesQualite();
    afficherCodesCQ();
    afficherCodesIncident();
    afficherScoresPerformance();
  } else if (tabName === 'saisir') {
    remplirSelectsMachines();
    remplirSelectsOperateurs();
    afficherTagsFormCD();
  } else if (tabName === 'historique') {
    afficherHistorique();
    remplirFiltreMachines();
  } else if (tabName === 'feedback') {
    remplirSelectFeedback();
  } else if (tabName === 'stats') {
    afficherStats();
  } else if (tabName === 'manager') {
    afficherVueManager('operateurs');
  } else if (tabName === 'machine') {
    afficherMachinePerformance();
    const cdData = getFilteredCD({ excludeCached: true });
    if (typeof afficherMachinesProblematiques === 'function') {
      afficherMachinesProblematiques(cdData);
    }
  } else if (tabName === 'analyse') {
    afficherAnalyse();
  } else if (tabName === 'qualite') {
    afficherQualite();
  } else if (tabName === 'sauvegarde') {
    afficherInfoSauvegarde();
  }
}

// Gestion des badge buttons
function initBadgeButtons() {
  document.querySelectorAll('.badge-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      const group = this.closest('.badge-group');
      const hiddenInput = group.nextElementSibling;
      
      // Désactiver tous les badges du groupe
      group.querySelectorAll('.badge-btn').forEach(b => b.classList.remove('active'));
      
      // Activer celui cliqué
      this.classList.add('active');
      hiddenInput.value = this.getAttribute('data-value');

      // Gérer les cas spéciaux
      if (hiddenInput.id === 'cdTypeMachine') {
        // Filtrer les machines selon le type sélectionné
        const typeMachine = this.getAttribute('data-value');
        remplirSelectsMachines(typeMachine);
      } else if (hiddenInput.id === 'cdQualite') {
        const niveau = this.getAttribute('data-value');
        if (niveau === '2' || niveau === '2_cc' || niveau === '3') {
          // Utiliser le système de sélection multiple
          if (typeof multipleCausesManager !== 'undefined') {
            multipleCausesManager.openRetourArchiSelector(niveau);
          } else {
            ouvrirModalCodeQualite(niveau);
          }
        } else {
          tempCodeQualite = null;
          if (typeof multipleCausesManager !== 'undefined') {
            multipleCausesManager.selectedCodesQualite = [];
            multipleCausesManager.updateRetourArchiDisplay();
          }
        }
      } else if (hiddenInput.id === 'cdCQApres') {
        if (this.getAttribute('data-value') === 'Oui') {
          // Utiliser le système de sélection multiple
          if (typeof multipleCausesManager !== 'undefined') {
            multipleCausesManager.openCQSelector();
          } else {
            ouvrirModalCodeCQ();
          }
        } else {
          tempCodeCQ = null;
          if (typeof multipleCausesManager !== 'undefined') {
            multipleCausesManager.selectedCodesCQ = [];
            multipleCausesManager.updateCQDisplay();
          }
        }
      } else if (hiddenInput.id === 'cdIncident') {
        if (this.getAttribute('data-value') === 'Oui') {
          // Utiliser le système de sélection multiple
          if (typeof multipleCausesManager !== 'undefined') {
            multipleCausesManager.openIncidentSelector();
          } else {
            ouvrirModalIncident();
          }
        } else {
          tempCodeIncident = null;
          tempCommentaireIncident = null;
          tempTempsImpact = null;
          if (typeof multipleCausesManager !== 'undefined') {
            multipleCausesManager.selectedCodesIncident = [];
            multipleCausesManager.selectedCommentsIncident = {};
            multipleCausesManager.selectedTempsImpactIncident = {};
            multipleCausesManager.updateIncidentDisplay();
          }
        }
      }
    });
  });
}

// Form Handlers
function initFormHandlers() {
  // Heure custom
  document.getElementById('cdHeure').addEventListener('change', function() {
    if (this.value === 'autre') {
      ouvrirModal('modalHeureCustom');
    }
  });
  
  // Form submission
  document.getElementById('formSaisieCD').addEventListener('submit', function(e) {
    e.preventDefault();
    enregistrerCD();
  });
}

// === GESTION DES OPÉRATEURS ===
function ajouterOperateur() {
  const nom = document.getElementById('newOperateurNom').value.trim();
  
  if (!nom) {
    alert('Veuillez remplir le nom de l\'opérateur');
    return;
  }
  
  const nouvelOperateur = {
    id: 'op_' + Date.now(),
    nom: nom,
    dateAjout: new Date().toISOString().split('T')[0]
  };
  
  dbData.operateurs.push(nouvelOperateur);
  document.getElementById('newOperateurNom').value = '';

  // Marquer comme modifié pour l'auto-save
  if (typeof storageManager !== 'undefined') {
    storageManager.markAsModified();
  }

  afficherOperateurs();
  remplirSelectsOperateurs();
  remplirSelectFeedback();
}

function afficherOperateurs() {
  const tbody = document.getElementById('tableOperateurs');
  tbody.innerHTML = '';
  
  if (dbData.operateurs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" class="empty-state">Aucun opérateur enregistré</td></tr>';
    return;
  }
  
  dbData.operateurs.forEach(op => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${op.nom}</td>
      <td>${op.dateAjout}</td>
      <td>
        <button class="btn btn--small btn--danger" onclick="supprimerOperateur('${op.id}')">Supprimer</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function supprimerOperateur(id) {
  // Vérifier si l'opérateur est protégé
  const operateur = dbData.operateurs.find(op => op.id === id);
  if (operateur && operateur.protected) {
    alert('❌ Cet opérateur est protégé et ne peut pas être supprimé.\n\nHarel et Kyndt sont des opérateurs système permanents.');
    return;
  }

  if (confirm('Êtes-vous sûr de vouloir supprimer cet opérateur ?')) {
    dbData.operateurs = dbData.operateurs.filter(op => op.id !== id);

    // Marquer comme modifié pour l'auto-save
    if (typeof storageManager !== 'undefined') {
      storageManager.markAsModified();
    }

    afficherOperateurs();
    remplirSelectsOperateurs();
    remplirSelectFeedback();
  }
}

// === GESTION DES MACHINES ===
function ajouterMachine() {
  const numero = document.getElementById('newMachineNumero').value.trim();
  const type = document.getElementById('newMachineType').value;
  
  if (!numero || !type) {
    alert('Veuillez remplir tous les champs');
    return;
  }
  
  const nouvelleMachine = {
    id: 'mc_' + Date.now(),
    numero: numero,
    type: type,
    statut: 'actif'
  };
  
  dbData.machines.push(nouvelleMachine);
  document.getElementById('newMachineNumero').value = '';
  document.getElementById('newMachineType').value = '';

  // Marquer comme modifié pour l'auto-save
  if (typeof storageManager !== 'undefined') {
    storageManager.markAsModified();
  }

  afficherMachines();
  remplirSelectsMachines();
}

function afficherMachines() {
  const tbody = document.getElementById('tableMachines');
  tbody.innerHTML = '';
  
  if (dbData.machines.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty-state">Aucune machine enregistrée</td></tr>';
    return;
  }
  
  dbData.machines.forEach(mc => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${mc.numero}</td>
      <td>${mc.type}</td>
      <td><span class="status status--success">${mc.statut}</span></td>
      <td>
        <button class="btn btn--small btn--danger" onclick="supprimerMachine('${mc.id}')">Supprimer</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function supprimerMachine(id) {
  if (confirm('Êtes-vous sûr de vouloir supprimer cette machine ?')) {
    dbData.machines = dbData.machines.filter(mc => mc.id !== id);

    // Marquer comme modifié pour l'auto-save
    if (typeof storageManager !== 'undefined') {
      storageManager.markAsModified();
    }

    afficherMachines();
    remplirSelectsMachines();
  }
}

// === GESTION DES CODES QUALITÉ ===
function ajouterCodeQualite() {
  const code = document.getElementById('newCodeQualiteCode').value.trim();
  const desc = document.getElementById('newCodeQualiteDesc').value.trim();
  const niveau = document.getElementById('newCodeQualiteNiveau').value;
  
  if (!code || !desc || !niveau) {
    alert('Veuillez remplir tous les champs');
    return;
  }
  
  const nouveauCode = {
    id: 'code_' + Date.now(),
    code: code,
    description: desc,
    niveau: niveau
  };
  
  dbData.codesQualite.push(nouveauCode);
  document.getElementById('newCodeQualiteCode').value = '';
  document.getElementById('newCodeQualiteDesc').value = '';
  document.getElementById('newCodeQualiteNiveau').value = '';
  afficherCodesQualite();
}

// === GESTION DES SCORES DE PERFORMANCE ===
function afficherScoresPerformance() {
  const tbody = document.getElementById('tableScoresPerformance');
  tbody.innerHTML = '';
  
  dbData.niveauxQualite.forEach(niveau => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${niveau.label}</strong></td>
      <td>
        <div style="width: 20px; height: 20px; background-color: ${niveau.couleur}; border-radius: var(--radius-sm); border: 1px solid var(--color-border);"></div>
      </td>
      <td><strong>${niveau.scorePerformance}</strong> pts</td>
      <td>
        <input type="number" id="score_${niveau.id}" class="form-control" value="${niveau.scorePerformance}" min="0" max="100" step="1" style="max-width: 120px;">
      </td>
      <td>
        <button class="btn btn--small btn--primary" onclick="mettreAJourScore('${niveau.id}')">Mettre à jour</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function mettreAJourScore(niveauId) {
  const input = document.getElementById(`score_${niveauId}`);
  const newScore = parseInt(input.value);
  
  if (isNaN(newScore) || newScore < 0 || newScore > 100) {
    alert('Le score doit être un nombre entre 0 et 100');
    return;
  }
  
  // Mettre à jour le score
  const niveau = dbData.niveauxQualite.find(n => n.id === niveauId);
  if (niveau) {
    niveau.scorePerformance = newScore;
    
    // Recalculer toutes les performances des CD
    dbData.cd.forEach(cd => {
      const qualiteScore = getScoreQualite(cd.qualite);
      cd.performance = Math.round((cd.efficacite * qualiteScore) / 100 * 100) / 100;
    });
    
    // Rafraîchir toutes les vues
    afficherScoresPerformance();
    afficherHistorique();
    if (document.getElementById('feedbackOperateur').value) {
      afficherFeedback();
    }

    showToast(`✅ Score du ${niveau.label} mis à jour à ${newScore} pts. Tous les calculs ont été recalculés.`, 'success');
  }
}

function getScoreQualite(qualiteNiveau) {
  // Si NIV 1, score parfait
  if (qualiteNiveau === '1') {
    return 100;
  }

  // Si plusieurs codes sont sélectionnés, prendre le pire score
  if (typeof multipleCausesManager !== 'undefined' && multipleCausesManager.selectedCodesQualite.length > 0) {
    return multipleCausesManager.getWorstQualityScore();
  }

  // Sinon, utiliser le score standard du niveau
  const niveau = dbData.niveauxQualite.find(n => n.niveau === qualiteNiveau);
  return niveau ? niveau.scorePerformance : 100;
}

function filtrerCodesRetour() {
  const filter = document.getElementById('filterNiveauRetour').value;
  const filteredCodes = filter ? dbData.codesQualite.filter(c => c.niveau === filter) : dbData.codesQualite;
  afficherCodesQualiteFiltered(filteredCodes);
}

function afficherCodesQualite() {
  afficherCodesQualiteFiltered(dbData.codesQualite);
}

function afficherCodesQualiteFiltered(codes) {
  const tbody = document.getElementById('tableCodesQualite');
  tbody.innerHTML = '';
  
  if (codes.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty-state">Aucun code qualité enregistré</td></tr>';
    return;
  }
  
  codes.forEach(code => {
    const tr = document.createElement('tr');
    let badgeClass, badgeLabel;
    if (code.niveau === '2') {
      badgeClass = 'status--warning';
      badgeLabel = 'NIV 2 (70 pts)';
    } else if (code.niveau === '2_cc') {
      badgeClass = 'status--error';
      badgeLabel = '⚠️ NIV 2 CC (50 pts)';
    } else {
      badgeClass = 'status--error';
      badgeLabel = 'NIV 3 (30 pts)';
    }
    tr.innerHTML = `
      <td>${code.code}</td>
      <td>${code.description}</td>
      <td><span class="status ${badgeClass}">${badgeLabel}</span></td>
      <td>
        <button class="btn btn--small btn--danger" onclick="supprimerCodeQualite('${code.id}')">Supprimer</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function supprimerCodeQualite(id) {
  if (confirm('Êtes-vous sûr de vouloir supprimer ce code ?')) {
    dbData.codesQualite = dbData.codesQualite.filter(c => c.id !== id);
    afficherCodesQualite();
  }
}

// === GESTION DES CODES CQ ===
function ajouterCodeCQ() {
  const code = document.getElementById('newCodeCQCode').value.trim();
  const desc = document.getElementById('newCodeCQDesc').value.trim();
  
  if (!code || !desc) {
    alert('Veuillez remplir tous les champs');
    return;
  }
  
  const nouveauCode = {
    id: 'cq_' + Date.now(),
    code: code,
    description: desc
  };
  
  dbData.codesCQ.push(nouveauCode);
  document.getElementById('newCodeCQCode').value = '';
  document.getElementById('newCodeCQDesc').value = '';
  afficherCodesCQ();
}

function filtrerCodesCQ() {
  const searchTerm = document.getElementById('searchCodesCQ').value.toLowerCase();
  const filteredCodes = dbData.codesCQ.filter(c => 
    c.code.toLowerCase().includes(searchTerm) || 
    c.description.toLowerCase().includes(searchTerm)
  );
  afficherCodesCQFiltered(filteredCodes);
}

function afficherCodesCQ() {
  afficherCodesCQFiltered(dbData.codesCQ);
}

function afficherCodesCQFiltered(codes) {
  const tbody = document.getElementById('tableCodesCQ');
  tbody.innerHTML = '';
  
  if (codes.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" class="empty-state">Aucun code CQ trouvé</td></tr>';
    return;
  }
  
  codes.forEach(code => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${code.code}</td>
      <td>${code.description}</td>
      <td>
        <button class="btn btn--small btn--danger" onclick="supprimerCodeCQ('${code.id}')">Supprimer</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function supprimerCodeCQ(id) {
  if (confirm('Êtes-vous sûr de vouloir supprimer ce code ?')) {
    dbData.codesCQ = dbData.codesCQ.filter(c => c.id !== id);
    afficherCodesCQ();
  }
}

// === GESTION DES CODES INCIDENT ===
function ajouterCodeIncident() {
  const code = document.getElementById('newCodeIncidentCode').value.trim();
  const desc = document.getElementById('newCodeIncidentDesc').value.trim();
  
  if (!code || !desc) {
    alert('Veuillez remplir tous les champs');
    return;
  }
  
  const nouveauCode = {
    id: 'inc_' + Date.now(),
    code: code,
    description: desc
  };
  
  dbData.codesIncident.push(nouveauCode);
  document.getElementById('newCodeIncidentCode').value = '';
  document.getElementById('newCodeIncidentDesc').value = '';
  afficherCodesIncident();
}

function filtrerCodesIncident() {
  const searchTerm = document.getElementById('searchCodesIncident').value.toLowerCase();
  const filteredCodes = dbData.codesIncident.filter(c => 
    c.code.toLowerCase().includes(searchTerm) || 
    c.description.toLowerCase().includes(searchTerm)
  );
  afficherCodesIncidentFiltered(filteredCodes);
}

function afficherCodesIncident() {
  afficherCodesIncidentFiltered(dbData.codesIncident);
}

function afficherCodesIncidentFiltered(codes) {
  const tbody = document.getElementById('tableCodesIncident');
  tbody.innerHTML = '';
  
  if (codes.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" class="empty-state">Aucun code incident trouvé</td></tr>';
    return;
  }
  
  codes.forEach(code => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${code.code}</td>
      <td>${code.description}</td>
      <td>
        <button class="btn btn--small btn--danger" onclick="supprimerCodeIncident('${code.id}')">Supprimer</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function supprimerCodeIncident(id) {
  if (confirm('Êtes-vous sûr de vouloir supprimer ce code ?')) {
    dbData.codesIncident = dbData.codesIncident.filter(c => c.id !== id);
    afficherCodesIncident();
  }
}

// === MODALS ===
function ouvrirModal(modalId) {
  document.getElementById(modalId).classList.add('active');
}

function fermerModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
}

function validerHeureCustom() {
  const heure = document.getElementById('heureCustomInput').value;
  if (heure) {
    const select = document.getElementById('cdHeure');
    // Vérifier si cette option existe déjà
    let optionExists = false;
    for (let option of select.options) {
      if (option.value === heure) {
        optionExists = true;
        break;
      }
    }
    if (!optionExists) {
      const newOption = new Option(heure, heure);
      select.add(newOption, select.options.length - 1);
    }
    select.value = heure;
    fermerModal('modalHeureCustom');
  }
}

function ouvrirModalCodeQualite(niveau) {
  const select = document.getElementById('codeQualiteSelect');
  select.innerHTML = '<option value="">-- Sélectionner un code --</option>';
  
  dbData.codesQualite
    .filter(c => c.niveau === niveau)
    .forEach(code => {
      const option = new Option(`${code.code} - ${code.description}`, code.id);
      select.add(option);
    });
  
  ouvrirModal('modalCodeQualite');
}

function validerCodeQualite() {
  const select = document.getElementById('codeQualiteSelect');
  if (select.value) {
    tempCodeQualite = select.value;
    fermerModal('modalCodeQualite');
  } else {
    alert('Veuillez sélectionner un code Retour Archi');
  }
}

function ouvrirModalCodeCQ() {
  const select = document.getElementById('codeCQSelect');
  select.innerHTML = '<option value="">-- Sélectionner --</option>';
  
  dbData.codesCQ.forEach(code => {
    const option = new Option(`${code.code} - ${code.description}`, code.id);
    select.add(option);
  });
  
  ouvrirModal('modalCodeCQ');
}

function validerCodeCQ() {
  const select = document.getElementById('codeCQSelect');
  if (select.value) {
    tempCodeCQ = select.value;
    fermerModal('modalCodeCQ');
  } else {
    alert('Veuillez sélectionner un code CQ');
  }
}

function ouvrirModalIncident() {
  const select = document.getElementById('codeIncidentSelect');
  select.innerHTML = '<option value="">-- Sélectionner un code --</option>';

  dbData.codesIncident.forEach(code => {
    const option = new Option(`${code.code} - ${code.description}`, code.id);
    select.add(option);
  });

  document.getElementById('commentaireIncident').value = '';
  document.getElementById('tempsImpactIncident').value = '';
  ouvrirModal('modalIncident');
}

function validerIncident() {
  const codeSelect = document.getElementById('codeIncidentSelect');
  const commentaire = document.getElementById('commentaireIncident').value.trim();
  const tempsImpact = document.getElementById('tempsImpactIncident').value;

  if (codeSelect.value) {
    tempCodeIncident = codeSelect.value;
    tempCommentaireIncident = commentaire;
    tempTempsImpact = tempsImpact ? parseInt(tempsImpact) : 0;
    fermerModal('modalIncident');
  } else {
    alert('Veuillez sélectionner un code incident');
  }
}

// === REMPLIR LES SELECTS ===
function remplirSelectsMachines(typeMachineFiltre = null) {
  const select = document.getElementById('cdNumMachine');
  select.innerHTML = '<option value="">-- Sélectionner --</option>';

  // Filtrer les machines selon le type si un filtre est spécifié
  const machinesFiltrees = typeMachineFiltre
    ? dbData.machines.filter(mc => mc.type === typeMachineFiltre)
    : dbData.machines;

  machinesFiltrees.forEach(mc => {
    const option = new Option(`${mc.numero} (${mc.type})`, mc.id);
    select.add(option);
  });
}

function remplirSelectsOperateurs() {
  const select1 = document.getElementById('cdConf1');
  const select2 = document.getElementById('cdConf2');
  
  select1.innerHTML = '<option value="">-- Sélectionner --</option>';
  select2.innerHTML = '<option value="">-- Sélectionner --</option>';
  
  dbData.operateurs.forEach(op => {
    const option1 = new Option(op.nom, op.id);
    const option2 = new Option(op.nom, op.id);
    select1.add(option1);
    select2.add(option2);
  });
}

function remplirSelectFeedback() {
  const select = document.getElementById('feedbackOperateur');
  select.innerHTML = '<option value="">-- Sélectionner --</option>';
  
  dbData.operateurs.forEach(op => {
    const option = new Option(op.nom, op.id);
    select.add(option);
  });
}

function remplirFiltreMachines() {
  const select = document.getElementById('filterMachine');
  select.innerHTML = '<option value="">Toutes les machines</option>';
  
  dbData.machines.forEach(mc => {
    const option = new Option(`${mc.numero} (${mc.type})`, mc.id);
    select.add(option);
  });
}

// === ENREGISTREMENT CD ===
function enregistrerCD() {
  // Récupérer les valeurs
  const date = document.getElementById('cdDate').value;
  const heure = document.getElementById('cdHeure').value;
  const typeProd = document.getElementById('cdTypeProd').value;
  const typeMachine = document.getElementById('cdTypeMachine').value;
  const numMachine = document.getElementById('cdNumMachine').value;
  const typeCD = document.getElementById('cdTypeCD').value;
  const cai = document.getElementById('cdCAI').value;
  const dimension = document.getElementById('cdDimension').value;
  const conf1 = document.getElementById('cdConf1').value;
  const conf2 = document.getElementById('cdConf2').value;
  const d1Reel = parseFloat(document.getElementById('cdD1Reel').value);
  const d1Net = parseFloat(document.getElementById('cdD1Net').value);
  const qualite = document.getElementById('cdQualite').value;
  const cqApres = document.getElementById('cdCQApres').value;
  const incident = document.getElementById('cdIncident').value;
  const commentaire = document.getElementById('cdCommentaire').value;
  
  // Validations
  if (!date || !heure || !typeProd || !typeMachine || !numMachine || !typeCD || !cai || !dimension || !conf1 || !conf2 || !d1Reel || !d1Net || !qualite || !cqApres || !incident) {
    alert('Veuillez remplir tous les champs obligatoires');
    return;
  }
  
  if (conf1 === conf2) {
    alert('Les opérateurs CONF1 et CONF2 doivent être différents');
    return;
  }
  
  if (d1Reel <= 0 || d1Net <= 0) {
    alert('D1 Réel et D1 Net doivent être supérieurs à 0');
    return;
  }
  
  // Validation avec gestion des causes multiples
  if (typeof multipleCausesManager !== 'undefined') {
    if (qualite !== '1' && multipleCausesManager.selectedCodesQualite.length === 0) {
      alert('Veuillez sélectionner au moins un code Retour Archi pour NIV 2/NIV 3');
      return;
    }

    if (cqApres === 'Oui' && multipleCausesManager.selectedCodesCQ.length === 0) {
      alert('Veuillez sélectionner au moins un code CQ');
      return;
    }

    if (incident === 'Oui' && multipleCausesManager.selectedCodesIncident.length === 0) {
      alert('Veuillez sélectionner au moins un code incident');
      return;
    }
  } else {
    // Fallback pour l'ancien système
    if (qualite !== '1' && !tempCodeQualite) {
      alert('Veuillez sélectionner un code Retour Archi pour NIV 2/NIV 3');
      return;
    }

    if (cqApres === 'Oui' && !tempCodeCQ) {
      alert('Veuillez sélectionner un code CQ');
      return;
    }

    if (incident === 'Oui' && !tempCodeIncident) {
      alert('Veuillez sélectionner un code incident');
      return;
    }
  }
  
  // Calculs
  const tempsStandard = 8; // Par défaut
  const efficacite = (tempsStandard / d1Reel) * 100;
  const qualiteScore = getScoreQualite(qualite);
  const performance = (efficacite * qualiteScore) / 100;
  const anomalie = d1Reel > 18;
  
  // Récupérer les tags sélectionnés
  const selectedTags = [];
  document.querySelectorAll('.cd-tag-item.selected').forEach(tagElement => {
    selectedTags.push(tagElement.dataset.tagId);
  });

  // Créer l'objet CD avec gestion des causes multiples
  const nouveauCD = {
    id: currentEditingCD || 'cd_' + Date.now(),
    date: date,
    heure: heure,
    typeProd: typeProd,
    typeMachine: typeMachine,
    numMachine: numMachine,
    typeCD: typeCD,
    cai: cai,
    dimension: dimension,
    conf1: conf1,
    conf2: conf2,
    d1Reel: d1Reel,
    d1Net: d1Net,
    qualite: qualite,
    cqApres: cqApres,
    incident: incident,
    commentaire: commentaire,
    tempsStandard: tempsStandard,
    efficacite: Math.round(efficacite * 100) / 100,
    performance: Math.round(performance * 100) / 100,
    anomalie: anomalie,
    dateAjout: new Date().toISOString(),
    cache: false,
    tags: selectedTags
  };

  // Ajouter les données des causes (multiples ou uniques)
  if (typeof multipleCausesManager !== 'undefined') {
    const causesData = multipleCausesManager.getDataForSave();
    Object.assign(nouveauCD, causesData);
  } else {
    // Fallback pour l'ancien système
    nouveauCD.codeQualite = tempCodeQualite;
    nouveauCD.codeCQ = tempCodeCQ;
    nouveauCD.codeIncident = tempCodeIncident;
    nouveauCD.commentaireIncident = tempCommentaireIncident;
    nouveauCD.tempsImpact = tempTempsImpact;
  }
  
  if (currentEditingCD) {
    // Mode édition
    const index = dbData.cd.findIndex(cd => cd.id === currentEditingCD);
    if (index !== -1) {
      dbData.cd[index] = nouveauCD;
    }
    currentEditingCD = null;
    fermerModal('modalEditerCD');
  } else {
    // Nouveau CD
    dbData.cd.push(nouveauCD);
  }

  // Marquer comme modifié pour l'auto-save
  if (typeof storageManager !== 'undefined') {
    storageManager.markAsModified();
  }

  // Message de confirmation avec confettis pour performance exceptionnelle
  if (anomalie) {
    showToast('⚠️ ATTENTION: Anomalie détectée (D1 > 18h)', 'warning');
    showToast('CD enregistré avec succès!', 'success');
  } else if (performance >= 95) {
    showToast('🎉 Performance exceptionnelle ! CD enregistré avec succès!', 'success');
    if (typeof showConfetti !== 'undefined') {
      setTimeout(showConfetti, 200);
    }
  } else {
    showToast('CD enregistré avec succès!', 'success');
  }

  // Réinitialiser
  reinitialiserFormCD();
  afficherHistorique();
}

function reinitialiserFormCD() {
  document.getElementById('formSaisieCD').reset();
  document.getElementById('cdDate').valueAsDate = new Date();
  document.querySelectorAll('.badge-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.cd-tag-item').forEach(tag => tag.classList.remove('selected'));
  tempCodeQualite = null;
  tempCodeCQ = null;
  tempCodeIncident = null;
  tempCommentaireIncident = null;
  currentEditingCD = null;

  // Réinitialiser le gestionnaire de causes multiples
  if (typeof multipleCausesManager !== 'undefined') {
    multipleCausesManager.reset();
  }
}

// Afficher les tags dans le formulaire de saisie CD
function afficherTagsFormCD() {
  const container = document.getElementById('cdTagsSelector');
  if (!container) return;

  container.innerHTML = '';

  if (!dbData.tags || dbData.tags.length === 0) {
    container.innerHTML = '<p style="color: var(--color-text-secondary); font-size: 12px; margin: 0;">Aucun tag disponible. Créez des tags dans la section Admin.</p>';
    return;
  }

  dbData.tags.forEach(tag => {
    const tagElement = document.createElement('div');
    tagElement.className = 'cd-tag-item';
    tagElement.dataset.tagId = tag.id;
    tagElement.style.backgroundColor = tag.couleur;
    tagElement.style.color = 'white';
    tagElement.textContent = tag.nom;

    tagElement.onclick = function() {
      this.classList.toggle('selected');
    };

    container.appendChild(tagElement);
  });
}

// === HISTORIQUE ===
function afficherHistorique(filteredData = null) {
  const tbody = document.getElementById('tableHistorique');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  const base = getFilteredCD({ excludeCached:false });
  const data = filteredData || base;
  
  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="17" class="empty-state">Aucun CD enregistré</td></tr>';
    return;
  }
  
  data.forEach(cd => {
    const machine = dbData.machines.find(m => m.id === cd.numMachine);
    const op1 = dbData.operateurs.find(o => o.id === cd.conf1);
    const op2 = dbData.operateurs.find(o => o.id === cd.conf2);
    
    let qualiteClass, qualiteLabel;
    if (cd.qualite === '1') {
      qualiteClass = 'status--success';
      qualiteLabel = 'NIV 1';
    } else if (cd.qualite === '2') {
      qualiteClass = 'status--warning';
      qualiteLabel = 'NIV 2';
    } else if (cd.qualite === '2_cc') {
      qualiteClass = 'status--error';
      qualiteLabel = '⚠️ NIV 2 CC';
    } else {
      qualiteClass = 'status--error';
      qualiteLabel = 'NIV 3';
    }
    
    const tr = document.createElement('tr');
    tr.dataset.cdId = cd.id; // Ajouter l'ID pour les alertes visuelles

    // Gérer les CD cachés (grisés)
    if (cd.cache) {
      tr.classList.add('cd-cache');
      tr.style.opacity = '0.45';
      tr.style.backgroundColor = 'rgba(var(--color-gray-400-rgb, 119, 124, 124), 0.15)';
    } else if (cd.anomalie) {
      tr.classList.add('anomalie');
    } else {
      // Couleur de fond selon la performance
      // >= 80% = vert, < 80% = orange, < 50% = rouge
      if (cd.performance >= 80) {
        tr.style.backgroundColor = 'rgba(76, 175, 80, 0.15)'; // Vert léger
      } else if (cd.performance >= 50) {
        tr.style.backgroundColor = 'rgba(255, 152, 0, 0.15)'; // Orange léger
      } else {
        tr.style.backgroundColor = 'rgba(244, 67, 54, 0.15)'; // Rouge léger
      }
    }

    const incBadgeClass = cd.incident === 'Oui' ? 'status--warning' : 'status--info';
    const incLabel = cd.incident === 'Oui' ? 'OUI' : 'NON';

    // Badge rouge pour CQ Après CD - support multiple codes
    let cqContent = '-';
    if (cd.cqApres === 'Oui') {
      // Support pour causes multiples
      if (cd.codesCQ && Array.isArray(cd.codesCQ) && cd.codesCQ.length > 0) {
        const codesList = cd.codesCQ.map(id => {
          const code = dbData.codesCQ.find(c => c.id === id);
          return code ? `${code.code} - ${code.description}` : '?';
        }).join('<br>');

        cqContent = `
          <div class="multiple-codes-tooltip">
            <span class="status status--error" style="cursor: pointer;">CQ (${cd.codesCQ.length})</span>
            <span class="tooltip-content">${codesList}</span>
          </div>
        `;
      }
      // Fallback pour l'ancien format (single code)
      else if (cd.codeCQ) {
        const codeCQ = dbData.codesCQ.find(c => c.id === cd.codeCQ);
        if (codeCQ) {
          cqContent = `
            <div class="tooltip">
              <span class="status status--error" style="cursor: pointer;">CQ</span>
              <span class="tooltiptext">
                <strong>CQ Post CD</strong><br>
                Code: <strong>${codeCQ.code}</strong><br>
                ${codeCQ.description}
              </span>
            </div>
          `;
        } else {
          cqContent = `<span class="status status--error">CQ</span>`;
        }
      } else {
        cqContent = `<span class="status status--error">CQ</span>`;
      }
    }
    
    // Tooltip pour Retour Archi avec info Niv 2/3 - support multiple codes
    let qualiteContent = `<span class="status ${qualiteClass}">${qualiteLabel}</span>`;
    if (cd.qualite !== '1') {
      // Support pour causes multiples
      if (cd.codesQualite && Array.isArray(cd.codesQualite) && cd.codesQualite.length > 0) {
        const codesList = cd.codesQualite.map(id => {
          const code = dbData.codesQualite.find(c => c.id === id);
          return code ? `${code.code} - ${code.description}` : '?';
        }).join('<br>');

        qualiteContent = `
          <div class="multiple-codes-tooltip">
            <span class="status ${qualiteClass}" style="cursor: pointer;">${qualiteLabel} (${cd.codesQualite.length})</span>
            <span class="tooltip-content">${codesList}</span>
          </div>
        `;
      }
      // Fallback pour l'ancien format (single code)
      else if (cd.codeQualite) {
        const codeQualite = dbData.codesQualite.find(c => c.id === cd.codeQualite);
        if (codeQualite) {
          qualiteContent = `
            <div class="tooltip">
              <span class="status ${qualiteClass}" style="cursor: pointer;">${qualiteLabel}</span>
              <span class="tooltiptext">
                <strong>Code Retour Archi:</strong><br>
                ${codeQualite.code} - ${codeQualite.description}
              </span>
            </div>
          `;
        }
      }
    }
    
    // Rendre la ligne cliquable
    tr.style.cursor = 'pointer';
    tr.onclick = (e) => {
      // Ne pas ouvrir si on clique sur un bouton d'action
      if (!e.target.closest('.emoji-actions')) {
        voirDetailsCD(cd.id);
      }
    };

    // Générer les badges de tags
    let tagsHtml = '';
    if (cd.tags && cd.tags.length > 0) {
      cd.tags.forEach(tagId => {
        const tag = dbData.tags.find(t => t.id === tagId);
        if (tag) {
          tagsHtml += `<span class="tag-badge" style="background-color: ${tag.couleur}; color: white;" onclick="event.stopPropagation(); retirerTagDuCD('${cd.id}', '${tag.id}')" title="Cliquer pour retirer">${tag.nom}</span>`;
        }
      });
    }
    tagsHtml += `<button class="tag-add-btn" onclick="event.stopPropagation(); ouvrirSelecteurTags('${cd.id}')" title="Ajouter un tag">+ Tag</button>`;

    tr.innerHTML = `
      <td>${cd.date}</td>
      <td>${cd.heure}</td>
      <td>${cd.typeProd}</td>
      <td>${machine ? machine.numero : 'N/A'}</td>
      <td>${cd.cai}</td>
      <td>${cd.dimension}</td>
      <td>${op1 ? op1.nom : 'N/A'}</td>
      <td>${op2 ? op2.nom : 'N/A'}</td>
      <td>${cd.d1Reel}h</td>
      <td>${cd.d1Net}h</td>
      <td>${qualiteContent}</td>
      <td>${cd.performance}%</td>
      <td>${cqContent}</td>
      <td><span class="status ${incBadgeClass}">${incLabel}</span></td>
      <td>${cd.anomalie ? '<span class="status status--error">Anomalie</span>' : '-'}</td>
      <td><div class="tags-cell">${tagsHtml}</div></td>
      <td>
        <div class="emoji-actions">
          <button class="emoji-btn" onclick="event.stopPropagation(); editerCD('${cd.id}')" title="Éditer">
            ✏️
            <span class="emoji-tooltip">Éditer</span>
          </button>
          <button class="emoji-btn" onclick="event.stopPropagation(); toggleCacheCD('${cd.id}')" title="${cd.cache ? 'Afficher dans les stats' : 'Masquer des stats'}">
            ${cd.cache ? '👁️‍🗨️' : '👁️'}
            <span class="emoji-tooltip">${cd.cache ? 'Afficher' : 'Masquer'}</span>
          </button>
          <button class="emoji-btn" onclick="event.stopPropagation(); supprimerCD('${cd.id}')" title="Supprimer">
            🗑️
            <span class="emoji-tooltip">Supprimer</span>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Appliquer les alertes visuelles
  if (typeof visualAlerts !== 'undefined') {
    visualAlerts.applyAlertsToHistorique();
  }
}

let currentModalCDId = null;

function voirDetailsCD(id) {
  currentModalCDId = id;
  const cd = dbData.cd.find(c => c.id === id);
  if (!cd) return;

  const machine = dbData.machines.find(m => m.id === cd.numMachine);
  const op1 = dbData.operateurs.find(o => o.id === cd.conf1);
  const op2 = dbData.operateurs.find(o => o.id === cd.conf2);

  // Support causes multiples
  const codesQualite = [];
  if (cd.codesQualite && Array.isArray(cd.codesQualite)) {
    cd.codesQualite.forEach(codeId => {
      const code = dbData.codesQualite.find(c => c.id === codeId);
      if (code) codesQualite.push(code);
    });
  } else if (cd.codeQualite) {
    const code = dbData.codesQualite.find(c => c.id === cd.codeQualite);
    if (code) codesQualite.push(code);
  }

  const codesCQ = [];
  if (cd.codesCQ && Array.isArray(cd.codesCQ)) {
    cd.codesCQ.forEach(codeId => {
      const code = dbData.codesCQ.find(c => c.id === codeId);
      if (code) codesCQ.push(code);
    });
  } else if (cd.codeCQ) {
    const code = dbData.codesCQ.find(c => c.id === cd.codeCQ);
    if (code) codesCQ.push(code);
  }

  const codesIncident = [];
  if (cd.codesIncident && Array.isArray(cd.codesIncident)) {
    cd.codesIncident.forEach(codeId => {
      const code = dbData.codesIncident.find(c => c.id === codeId);
      if (code) codesIncident.push(code);
    });
  } else if (cd.codeIncident) {
    const code = dbData.codesIncident.find(c => c.id === cd.codeIncident);
    if (code) codesIncident.push(code);
  }

  // Tags
  const tags = cd.tags ? cd.tags.map(tagId => dbData.tags.find(t => t.id === tagId)).filter(t => t) : [];
  
  let qualiteClass, qualiteLabel;
  if (cd.qualite === '1') {
    qualiteClass = 'niv1';
    qualiteLabel = 'NIV 1 - Très bien';
  } else if (cd.qualite === '2') {
    qualiteClass = 'niv2';
    qualiteLabel = 'NIV 2 - Passable';
  } else if (cd.qualite === '2_cc') {
    qualiteClass = 'niv2_cc';
    qualiteLabel = '⚠️ NIV 2 CC';
  } else {
    qualiteClass = 'niv3';
    qualiteLabel = 'NIV 3 - Très mauvais';
  }
  
  const content = `
    <div class="modal-header" style="background: linear-gradient(135deg, #27509B 0%, #1a3a6e 100%); color: white; padding: var(--space-24); border-radius: var(--radius-lg) var(--radius-lg) 0 0;">
      <div class="modal-details-title-section">
        <div class="modal-details-title">
          <h3 style="color: white; margin: 0 0 var(--space-8) 0; font-size: var(--font-size-2xl);">Détails du Changement de Dimension</h3>
          <div style="display: flex; gap: var(--space-8); align-items: center;">
            <div class="modal-quality-badge ${qualiteClass}">${qualiteLabel}</div>
            ${cd.cache ? '<div class="modal-quality-badge" style="background: rgba(255,255,255,0.3); color: white; border: 1px solid white;">MASQUÉ</div>' : ''}
          </div>
        </div>
        <button class="modal-close-btn" onclick="fermerModal('modalDetailsCD')" style="color: white; opacity: 0.9;">&times;</button>
      </div>
    </div>
    
    <div class="modal-content-scrollable">
      ${cd.anomalie ? `
        <div class="modal-anomalie-alert">
          <div class="modal-anomalie-text">ANOMALIE DÉTECTÉE : D1 Réel supérieur à 18 heures</div>
        </div>
      ` : ''}
      
      <div class="modal-details-columns">
      <div class="modal-details-column">
        <h4 style="color: #27509B; border-left: 4px solid #FCE500; padding-left: var(--space-12); margin-bottom: var(--space-16);">Références &amp; Production</h4>
        
        <div class="modal-detail-field">
          <div class="modal-detail-label">CAI</div>
          <div class="modal-detail-value large">${cd.cai}</div>
        </div>
        
        <div class="modal-detail-field">
          <div class="modal-detail-label">Dimension</div>
          <div class="modal-detail-value">${cd.dimension}</div>
        </div>
        
        <div class="modal-detail-field">
          <div class="modal-detail-label">Type Production</div>
          <div class="modal-detail-value"><span class="badge">${cd.typeProd}</span></div>
        </div>
        
        <div class="modal-detail-field">
          <div class="modal-detail-label">Machine</div>
          <div class="modal-detail-value">${machine ? machine.type + ' ' + machine.numero : 'N/A'}</div>
        </div>
        
        <div class="modal-detail-field">
          <div class="modal-detail-label">Date &amp; Heure</div>
          <div class="modal-detail-value">${new Date(cd.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} à ${cd.heure}</div>
        </div>
      </div>
      
      <div class="modal-details-column">
        <h4 style="color: #27509B; border-left: 4px solid #FCE500; padding-left: var(--space-12); margin-bottom: var(--space-16);">Équipe</h4>
        
        <div class="modal-detail-field">
          <div class="modal-detail-label">Binôme</div>
          <div class="modal-detail-value">${op1 ? op1.nom : 'N/A'} / ${op2 ? op2.nom : 'N/A'}</div>
        </div>
        
        <div class="modal-detail-field">
          <div class="modal-detail-label">CONF1 (PNC)</div>
          <div class="modal-detail-value">${op1 ? op1.nom : 'N/A'}</div>
        </div>
        
        <div class="modal-detail-field">
          <div class="modal-detail-label">CONF2 (PNS)</div>
          <div class="modal-detail-value">${op2 ? op2.nom : 'N/A'}</div>
        </div>
        
        <div class="modal-detail-field">
          <div class="modal-detail-label">Type CD</div>
          <div class="modal-detail-value">${cd.typeCD}</div>
        </div>
      </div>
    </div>
    
    <div class="modal-performance-section" style="background: linear-gradient(to right, rgba(252, 229, 0, 0.05), transparent); border-left: 4px solid #FCE500; padding-left: var(--space-16);">
      <h4 style="color: #27509B; margin-bottom: var(--space-16);">Temporalité &amp; Performance</h4>
      <div class="modal-performance-grid">
        <div class="modal-performance-item">
          <div class="modal-performance-label">D1 Réel</div>
          <div class="modal-performance-value" style="color: var(--michelin-blue);">${cd.d1Reel} h</div>
        </div>

        <div class="modal-performance-item">
          <div class="modal-performance-label">D1 Net</div>
          <div class="modal-performance-value" style="color: var(--color-primary);">${cd.d1Net} h</div>
        </div>

        <div class="modal-performance-item">
          <div class="modal-performance-label">Différence (Temps perdu)</div>
          <div class="modal-performance-value" style="color: ${(cd.d1Reel - cd.d1Net) > 1 ? 'var(--color-error)' : 'var(--color-success)'};">${(cd.d1Reel - cd.d1Net).toFixed(1)} h</div>
        </div>

        <div class="modal-performance-item">
          <div class="modal-performance-label">Efficacité</div>
          <div class="modal-performance-value">${cd.efficacite ? cd.efficacite.toFixed(1) : 0}%</div>
        </div>

        <div class="modal-performance-item">
          <div class="modal-performance-label">Performance Globale</div>
          <div class="modal-performance-value" style="color: ${cd.performance >= 80 ? 'var(--color-success)' : cd.performance >= 50 ? 'var(--color-warning)' : 'var(--color-error)'}; font-weight: 700;">${cd.performance ? cd.performance.toFixed(1) : 0}%</div>
        </div>

        <div class="modal-performance-item">
          <div class="modal-performance-label">Temps Standard</div>
          <div class="modal-performance-value">${cd.tempsStandard || 8} h</div>
        </div>
      </div>
    </div>
    
    ${codesQualite.length > 0 ? `
      <div class="modal-codes-section">
        <h4>Codes Retour Archi ${codesQualite.length > 1 ? `(${codesQualite.length})` : ''}</h4>
        ${codesQualite.map(code => `
          <div class="modal-code-item">
            <div class="modal-code-label">Code :</div>
            <div class="modal-code-value"><strong>${code.code}</strong> - ${code.description}</div>
          </div>
        `).join('')}
      </div>
    ` : ''}
    
    <div class="modal-codes-section">
      <h4>CQ Après CD</h4>
      <div class="modal-code-item" style="align-items: center;">
        <div class="modal-code-label">CQ Après CD :</div>
        <div class="modal-code-value">
          <span class="status ${cd.cqApres === 'Oui' ? 'status--success' : 'status--info'}" style="font-weight: var(--font-weight-bold); font-size: var(--font-size-base);">${cd.cqApres === 'Oui' ? 'OUI' : 'NON'}</span>
        </div>
      </div>
      ${codesCQ.length > 0 ?
        codesCQ.map(code => `
          <div class="modal-code-item">
            <div class="modal-code-label">Code CQ :</div>
            <div class="modal-code-value"><strong>${code.code}</strong> - ${code.description}</div>
          </div>
        `).join('')
      : `
        <div class="modal-code-item">
          <div class="modal-code-label"></div>
          <div class="modal-code-value" style="color: var(--color-text-secondary); font-style: italic;">Aucun CQ</div>
        </div>
      `}
    </div>
    
    <div class="modal-codes-section">
      <h4>Incident</h4>
      <div class="modal-code-item" style="align-items: center;">
        <div class="modal-code-label">Incident :</div>
        <div class="modal-code-value">
          <span class="status ${cd.incident === 'Oui' ? 'status--warning' : 'status--info'}" style="font-weight: var(--font-weight-bold); font-size: var(--font-size-base);">${cd.incident === 'Oui' ? 'OUI' : 'NON'}</span>
        </div>
      </div>
      ${codesIncident.length > 0 ?
        codesIncident.map(code => `
          <div class="modal-code-item">
            <div class="modal-code-label">Code Incident :</div>
            <div class="modal-code-value"><strong>${code.code}</strong> - ${code.description}</div>
          </div>
        `).join('')
      : `
        <div class="modal-code-item">
          <div class="modal-code-label"></div>
          <div class="modal-code-value" style="color: var(--color-text-secondary); font-style: italic;">Aucun incident</div>
        </div>
      `}
      ${cd.commentaireIncident || (cd.commentsIncident && cd.commentsIncident.global) ? `
        <div class="modal-code-item">
          <div class="modal-code-label">Commentaire :</div>
          <div class="modal-code-value">${cd.commentaireIncident || cd.commentsIncident.global}</div>
        </div>
      ` : ''}
    </div>
    
    ${cd.commentaire ? `
      <div class="modal-codes-section">
        <h4>Commentaire Général</h4>
        <div class="modal-code-item">
          <div class="modal-code-value">${cd.commentaire}</div>
        </div>
      </div>
    ` : ''}

    ${tags.length > 0 ? `
      <div class="modal-codes-section">
        <h4>🏷️ Tags</h4>
        <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px;">
          ${tags.map(tag => `
            <span style="display: inline-block; padding: 6px 12px; border-radius: 12px; background: ${tag.couleur}; color: white; font-size: 13px; font-weight: 500;">
              ${tag.nom}
            </span>
          `).join('')}
        </div>
      </div>
    ` : ''}
    </div>
    
    <div class="modal-footer">
      <button class="btn btn--primary" onclick="editerCDFromModal()">Éditer</button>
      <button class="btn btn--secondary" onclick="fermerModal('modalDetailsCD')">Fermer</button>
    </div>
  `;
  
  document.getElementById('detailsCDContainer').innerHTML = content;
  ouvrirModal('modalDetailsCD');

  // Fermeture au clic sur l'overlay
  document.getElementById('modalDetailsCD').onclick = function(e) {
    if (e.target === this) {
      fermerModal('modalDetailsCD');
    }
  };
}

function voirDetailsMachine(machineId) {
  const machine = dbData.machines.find(m => m.id === machineId);
  if (!machine) return;

  const cdActifs = dbData.cd.filter(cd => !cd.cache && cd.numMachine === machineId);

  if (cdActifs.length === 0) {
    alert('Aucun CD trouvé pour cette machine');
    return;
  }

  // Calculs
  const nbCD = cdActifs.length;
  const perfMoyenne = (cdActifs.reduce((sum, cd) => sum + cd.performance, 0) / nbCD).toFixed(1);
  const efficaciteMoyenne = (cdActifs.reduce((sum, cd) => sum + cd.efficacite, 0) / nbCD).toFixed(1);
  const d1Moyen = (cdActifs.reduce((sum, cd) => sum + cd.d1Reel, 0) / nbCD).toFixed(1);
  const d1NetMoyen = (cdActifs.reduce((sum, cd) => sum + cd.d1Net, 0) / nbCD).toFixed(1);

  const niv1 = cdActifs.filter(cd => cd.qualite === '1').length;
  const niv2 = cdActifs.filter(cd => cd.qualite === '2').length;
  const niv2CC = cdActifs.filter(cd => cd.qualite === '2_cc').length;
  const niv3 = cdActifs.filter(cd => cd.qualite === '3').length;

  const pctNiv1 = Math.round((niv1 / nbCD) * 100);
  const pctNiv2 = Math.round((niv2 / nbCD) * 100);
  const pctNiv2CC = Math.round((niv2CC / nbCD) * 100);
  const pctNiv3 = Math.round((niv3 / nbCD) * 100);

  const anomalies = cdActifs.filter(cd => cd.anomalie).length;
  const incidents = cdActifs.filter(cd => cd.incident === 'Oui').length;
  const cqOui = cdActifs.filter(cd => cd.cqApres === 'Oui').length;

  // Trouver les CD les plus récents
  const cdRecents = [...cdActifs].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

  const content = `
    <div class="modal-header" style="background: linear-gradient(135deg, #27509B 0%, #1a3a6e 100%); color: white; padding: var(--space-24); border-radius: var(--radius-lg) var(--radius-lg) 0 0;">
      <div class="modal-details-title-section">
        <div class="modal-details-title">
          <h3 style="color: white; margin: 0 0 var(--space-8) 0; font-size: var(--font-size-2xl);">Détails Machine ${machine.numero}</h3>
          <div style="color: rgba(255,255,255,0.9); font-size: var(--font-size-lg);">${machine.type}</div>
        </div>
        <button class="modal-close-btn" onclick="fermerModal('modalDetailsMachine')" style="color: white; opacity: 0.9;">&times;</button>
      </div>
    </div>

    <div class="modal-content-scrollable">
      <!-- KPIs Machine -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: var(--space-16); margin-bottom: var(--space-24);">
        <div style="background: linear-gradient(135deg, #2E7D32 0%, #1B5E20 100%); color: white; padding: var(--space-16); border-radius: var(--radius-lg); text-align: center;">
          <div style="font-size: var(--font-size-sm); opacity: 0.9; margin-bottom: var(--space-4);">Performance</div>
          <div style="font-size: var(--font-size-3xl); font-weight: 700;">${perfMoyenne}%</div>
        </div>
        <div style="background: linear-gradient(135deg, #1976D2 0%, #0D47A1 100%); color: white; padding: var(--space-16); border-radius: var(--radius-lg); text-align: center;">
          <div style="font-size: var(--font-size-sm); opacity: 0.9; margin-bottom: var(--space-4);">Efficacité</div>
          <div style="font-size: var(--font-size-3xl); font-weight: 700;">${efficaciteMoyenne}%</div>
        </div>
        <div style="background: linear-gradient(135deg, #F57C00 0%, #E65100 100%); color: white; padding: var(--space-16); border-radius: var(--radius-lg); text-align: center;">
          <div style="font-size: var(--font-size-sm); opacity: 0.9; margin-bottom: var(--space-4);">NIV 1</div>
          <div style="font-size: var(--font-size-3xl); font-weight: 700;">${pctNiv1}%</div>
        </div>
        <div style="background: linear-gradient(135deg, #7B1FA2 0%, #4A148C 100%); color: white; padding: var(--space-16); border-radius: var(--radius-lg); text-align: center;">
          <div style="font-size: var(--font-size-sm); opacity: 0.9; margin-bottom: var(--space-4);">Total CD</div>
          <div style="font-size: var(--font-size-3xl); font-weight: 700;">${nbCD}</div>
        </div>
      </div>

      <!-- Statistiques détaillées -->
      <div class="modal-codes-section">
        <h4>📊 Statistiques Globales</h4>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-12);">
          <div class="modal-code-item">
            <div class="modal-code-label">D1 Moyen</div>
            <div class="modal-code-value">${d1Moyen}h</div>
          </div>
          <div class="modal-code-item">
            <div class="modal-code-label">D1 Net Moyen</div>
            <div class="modal-code-value">${d1NetMoyen}h</div>
          </div>
          <div class="modal-code-item">
            <div class="modal-code-label">Anomalies</div>
            <div class="modal-code-value"><span class="status ${anomalies > 0 ? 'status--error' : 'status--success'}">${anomalies}</span></div>
          </div>
          <div class="modal-code-item">
            <div class="modal-code-label">Incidents</div>
            <div class="modal-code-value"><span class="status ${incidents > 0 ? 'status--warning' : 'status--info'}">${incidents}</span></div>
          </div>
          <div class="modal-code-item">
            <div class="modal-code-label">CQ Après CD</div>
            <div class="modal-code-value"><span class="status ${cqOui > 0 ? 'status--error' : 'status--success'}">${cqOui}</span></div>
          </div>
          <div class="modal-code-item">
            <div class="modal-code-label">Taux anomalies</div>
            <div class="modal-code-value">${Math.round((anomalies / nbCD) * 100)}%</div>
          </div>
        </div>
      </div>

      <!-- Répartition Qualité -->
      <div class="modal-codes-section">
        <h4>🎯 Répartition Qualité</h4>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-8);">
          <div style="text-align: center; padding: var(--space-12); background: var(--color-surface); border-radius: var(--radius-base);">
            <div style="font-size: var(--font-size-2xl); font-weight: 700; color: #2E7D32;">${niv1}</div>
            <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">NIV 1</div>
            <div style="font-size: var(--font-size-xs); color: var(--color-text-secondary);">${pctNiv1}%</div>
          </div>
          <div style="text-align: center; padding: var(--space-12); background: var(--color-surface); border-radius: var(--radius-base);">
            <div style="font-size: var(--font-size-2xl); font-weight: 700; color: #F57C00;">${niv2}</div>
            <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">NIV 2</div>
            <div style="font-size: var(--font-size-xs); color: var(--color-text-secondary);">${pctNiv2}%</div>
          </div>
          <div style="text-align: center; padding: var(--space-12); background: var(--color-surface); border-radius: var(--radius-base);">
            <div style="font-size: var(--font-size-2xl); font-weight: 700; color: #C62828;">${niv2CC}</div>
            <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">NIV 2 CC</div>
            <div style="font-size: var(--font-size-xs); color: var(--color-text-secondary);">${pctNiv2CC}%</div>
          </div>
          <div style="text-align: center; padding: var(--space-12); background: var(--color-surface); border-radius: var(--radius-base);">
            <div style="font-size: var(--font-size-2xl); font-weight: 700; color: #8B0000;">${niv3}</div>
            <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">NIV 3</div>
            <div style="font-size: var(--font-size-xs); color: var(--color-text-secondary);">${pctNiv3}%</div>
          </div>
        </div>
      </div>

      <!-- CD Récents -->
      <div class="modal-codes-section">
        <h4>📋 Derniers CD (${cdRecents.length})</h4>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>CAI</th>
                <th>Opérateurs</th>
                <th>Performance</th>
                <th>Qualité</th>
              </tr>
            </thead>
            <tbody>
              ${cdRecents.map(cd => {
                const op1 = dbData.operateurs.find(o => o.id === cd.conf1);
                const op2 = dbData.operateurs.find(o => o.id === cd.conf2);
                let qualiteLabel, qualiteClass;
                if (cd.qualite === '1') { qualiteClass = 'status--success'; qualiteLabel = 'NIV 1'; }
                else if (cd.qualite === '2') { qualiteClass = 'status--warning'; qualiteLabel = 'NIV 2'; }
                else if (cd.qualite === '2_cc') { qualiteClass = 'status--error'; qualiteLabel = 'NIV 2 CC'; }
                else { qualiteClass = 'status--error'; qualiteLabel = 'NIV 3'; }
                return `
                  <tr style="cursor: pointer;" onclick="fermerModal('modalDetailsMachine'); voirDetailsCD('${cd.id}')">
                    <td>${new Date(cd.date).toLocaleDateString('fr-FR')}</td>
                    <td>${cd.cai}</td>
                    <td>${op1?.nom || '?'} / ${op2?.nom || '?'}</td>
                    <td>${cd.performance.toFixed(1)}%</td>
                    <td><span class="status ${qualiteClass}">${qualiteLabel}</span></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="modal-footer">
      <button class="btn btn--secondary" onclick="fermerModal('modalDetailsMachine')">Fermer</button>
    </div>
  `;

  document.getElementById('detailsMachineContainer').innerHTML = content;
  ouvrirModal('modalDetailsMachine');

  // Fermeture au clic sur l'overlay
  document.getElementById('modalDetailsMachine').onclick = function(e) {
    if (e.target === this) {
      fermerModal('modalDetailsMachine');
    }
  };
}

function editerCD(id) {
  const cd = dbData.cd.find(c => c.id === id);
  if (!cd) return;

  currentEditingCD = id;

  // Basculer vers l'onglet de saisie AVANT de remplir les champs
  activerOnglet('saisir');

  // S'assurer que les selects sont remplis avec les bonnes options
  remplirSelectsMachines();
  remplirSelectsOperateurs();

  // Utiliser setTimeout pour s'assurer que les selects sont bien remplis avant de set les valeurs
  setTimeout(() => {
    // Pré-remplir le formulaire
    document.getElementById('cdDate').value = cd.date;
    document.getElementById('cdHeure').value = cd.heure;
    document.getElementById('cdTypeProd').value = cd.typeProd;
    document.getElementById('cdTypeMachine').value = cd.typeMachine;
    document.getElementById('cdNumMachine').value = cd.numMachine;
    document.getElementById('cdTypeCD').value = cd.typeCD;
    document.getElementById('cdCAI').value = cd.cai;
    document.getElementById('cdDimension').value = cd.dimension;
    document.getElementById('cdConf1').value = cd.conf1;
    document.getElementById('cdConf2').value = cd.conf2;
    document.getElementById('cdD1Reel').value = cd.d1Reel;
    document.getElementById('cdD1Net').value = cd.d1Net;
    document.getElementById('cdQualite').value = cd.qualite;
    document.getElementById('cdCQApres').value = cd.cqApres;
    document.getElementById('cdIncident').value = cd.incident;
    document.getElementById('cdCommentaire').value = cd.commentaire || '';

    tempCodeQualite = cd.codeQualite;
    tempCodeCQ = cd.codeCQ;
    tempCodeIncident = cd.codeIncident;
    tempCommentaireIncident = cd.commentaireIncident;

    // Charger les causes multiples si disponible
    if (typeof multipleCausesManager !== 'undefined') {
      multipleCausesManager.loadFromCD(cd);
    }

    // Désactiver tous les badges d'abord
    document.querySelectorAll('.badge-btn').forEach(btn => {
      btn.classList.remove('active');
    });

    // Activer les badges appropriés en fonction des valeurs des inputs cachés
    // Pour chaque groupe de badges, activer le bon badge
    document.querySelectorAll('.badge-group').forEach(group => {
      const hiddenInput = group.nextElementSibling;
      if (!hiddenInput || hiddenInput.tagName !== 'INPUT' || hiddenInput.type !== 'hidden') return;

      const currentValue = hiddenInput.value;
      if (!currentValue) return;

      // Trouver et activer le badge correspondant dans ce groupe
      group.querySelectorAll('.badge-btn').forEach(btn => {
        if (btn.getAttribute('data-value') === currentValue) {
          btn.classList.add('active');
        }
      });
    });

    alert('Mode édition activé. Modifiez les champs et cliquez sur "Enregistrer CD".');
  }, 50);
}

function supprimerCD(id) {
  if (confirm('Êtes-vous sûr de vouloir supprimer ce CD ?')) {
    dbData.cd = dbData.cd.filter(c => c.id !== id);

    // Marquer comme modifié pour l'auto-save
    if (typeof storageManager !== 'undefined') {
      storageManager.markAsModified();
    }

    afficherHistorique();
  }
}

// Ouvrir le sélecteur de tags pour un CD
function ouvrirSelecteurTags(cdId) {
  const cd = dbData.cd.find(c => c.id === cdId);
  if (!cd) return;

  if (!dbData.tags || dbData.tags.length === 0) {
    showToast('⚠️ Aucun tag disponible. Créez des tags dans la section Admin.', 'warning');
    return;
  }

  // Créer le contenu du modal
  let tagsHtml = '<div class="tag-selector">';
  dbData.tags.forEach(tag => {
    const isSelected = cd.tags && cd.tags.includes(tag.id);
    tagsHtml += `
      <div class="tag-selector-item ${isSelected ? 'selected' : ''}"
           style="background-color: ${tag.couleur}; color: white;"
           onclick="toggleTagOnCD('${cdId}', '${tag.id}', this)">
        ${tag.nom} ${isSelected ? '✓' : ''}
      </div>
    `;
  });
  tagsHtml += '</div>';

  // Créer un modal simple
  const modalHtml = `
    <div class="modal" id="modalTagSelector" style="display: flex;">
      <div class="modal-content">
        <h3>Gérer les tags pour ce CD</h3>
        <p style="color: var(--color-text-secondary); font-size: 13px; margin-bottom: 15px;">
          Cliquez sur les tags pour les ajouter ou retirer
        </p>
        ${tagsHtml}
        <div class="modal-actions" style="margin-top: 20px;">
          <button class="btn btn--primary" onclick="fermerModalTags()">Fermer</button>
        </div>
      </div>
    </div>
  `;

  // Injecter le modal dans le DOM
  const existingModal = document.getElementById('modalTagSelector');
  if (existingModal) {
    existingModal.remove();
  }
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function toggleTagOnCD(cdId, tagId, element) {
  const cd = dbData.cd.find(c => c.id === cdId);
  if (!cd) return;

  if (!cd.tags) cd.tags = [];

  const index = cd.tags.indexOf(tagId);
  if (index > -1) {
    // Retirer le tag
    cd.tags.splice(index, 1);
    element.classList.remove('selected');
    element.innerHTML = element.innerHTML.replace(' ✓', '');
  } else {
    // Ajouter le tag
    cd.tags.push(tagId);
    element.classList.add('selected');
    element.innerHTML = element.innerHTML.trim() + ' ✓';
  }

  if (typeof storageManager !== 'undefined') {
    storageManager.markAsModified();
  }

  // Rafraîchir l'affichage de l'historique
  afficherHistorique();
}

function fermerModalTags() {
  const modal = document.getElementById('modalTagSelector');
  if (modal) {
    modal.remove();
  }
}

function editerCDFromModal() {
  if (currentModalCDId) {
    fermerModal('modalDetailsCD');
    editerCD(currentModalCDId);
  }
}

function trierHistorique(colonne) {
  let sorted = [...dbData.cd];
  
  if (colonne === 'date') {
    sorted.sort((a, b) => new Date(b.date) - new Date(a.date));
  } else if (colonne === 'performance') {
    sorted.sort((a, b) => b.performance - a.performance);
  }
  
  afficherHistorique(sorted);
}

function appliquerFiltres() {
  const searchTerm = (document.getElementById('searchHistorique')?.value || '').toLowerCase();
  const filterQualite = document.getElementById('filterQualite')?.value || '';
  const filterMachine = document.getElementById('filterMachine')?.value || '';

  let filtered = getFilteredCD({ excludeCached:false }).filter(cd => {
    const matchSearch = !searchTerm ||
      (cd.cai && cd.cai.toLowerCase().includes(searchTerm)) ||
      (cd.dimension && cd.dimension.toLowerCase().includes(searchTerm));
    const matchQualite = !filterQualite || cd.qualite === filterQualite;
    const matchMachine = !filterMachine || cd.numMachine === filterMachine;
    return matchSearch && matchQualite && matchMachine;
  });

  afficherHistorique(filtered);
}

function resetFiltres() {
  document.getElementById('searchHistorique').value = '';
  document.getElementById('filterQualite').value = '';
  document.getElementById('filterMachine').value = '';
  afficherHistorique();
}

// === VUE MANAGER ===
function afficherVueManager(vue) {
  if (vue === 'operateurs') {
    document.getElementById('managerOperateursContent').style.display = 'block';
    document.getElementById('managerBinomesContent').style.display = 'none';
    document.getElementById('btnVueOperateurs').className = 'btn btn--primary';
    document.getElementById('btnVueBinomes').className = 'btn btn--secondary';
    afficherManager();
  } else if (vue === 'binomes') {
    document.getElementById('managerOperateursContent').style.display = 'none';
    document.getElementById('managerBinomesContent').style.display = 'block';
    document.getElementById('btnVueOperateurs').className = 'btn btn--secondary';
    document.getElementById('btnVueBinomes').className = 'btn btn--primary';
    afficherBestTeams();
  }
}

function afficherManager() {
  const cdData = getFilteredCD({ excludeCached: true });
  const container = document.getElementById('managerOperateursContent');

  if (!container) return;

  if (cdData.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>Aucune donnée disponible</p></div>';
    return;
  }

  // Calculer les stats par opérateur
  const operateurStats = {};
  cdData.forEach(cd => {
    [cd.conf1, cd.conf2].forEach(opId => {
      if (!operateurStats[opId]) {
        operateurStats[opId] = {
          opId: opId,
          cd: [],
          totalPerf: 0,
          niv1: 0
        };
      }
      operateurStats[opId].cd.push(cd);
      operateurStats[opId].totalPerf += cd.performance;
      if (cd.qualite === '1') operateurStats[opId].niv1++;
    });
  });

  // Convertir en tableau et trier
  const operateurs = Object.values(operateurStats).map(stat => {
    const op = dbData.operateurs.find(o => o.id === stat.opId);
    return {
      nom: op ? op.nom : 'Inconnu',
      nbCD: stat.cd.length,
      perfMoyenne: (stat.totalPerf / stat.cd.length).toFixed(1),
      tauxNiv1: ((stat.niv1 / stat.cd.length) * 100).toFixed(1)
    };
  }).sort((a, b) => b.perfMoyenne - a.perfMoyenne);

  // Générer le HTML
  let html = '<div class="table-container"><table><thead><tr>';
  html += '<th>Rang</th><th>Opérateur</th><th>Performance Moyenne</th><th>Taux NIV 1</th><th>Nombre de CD</th>';
  html += '</tr></thead><tbody>';

  operateurs.forEach((op, index) => {
    const rankClass = index === 0 ? 'rank-1' : index === 1 ? 'rank-2' : index === 2 ? 'rank-3' : '';
    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
    html += `<tr class="${rankClass}">`;
    html += `<td>${medal} ${index + 1}</td>`;
    html += `<td><strong>${op.nom}</strong></td>`;
    html += `<td>${op.perfMoyenne}%</td>`;
    html += `<td>${op.tauxNiv1}%</td>`;
    html += `<td>${op.nbCD}</td>`;
    html += '</tr>';
  });

  html += '</tbody></table></div>';
  container.innerHTML = html;
}

function afficherBestTeams() {
  const cdData = getFilteredCD({ excludeCached: true });
  if (typeof afficherMeilleursBinomes === 'function') {
    afficherMeilleursBinomes(cdData);
  }
}

// === FEEDBACK ===
function toggleCacheCD(cdId) {
  const cd = dbData.cd.find(c => c.id === cdId);
  if (!cd) return;

  cd.cache = !cd.cache;

  // Marquer comme modifié pour l'auto-save
  if (typeof storageManager !== 'undefined') {
    storageManager.markAsModified();
  }

  // Rafraîchir toutes les vues
  afficherHistorique();
  afficherFeedback();
}

function afficherFeedback() {
  const opId = document.getElementById('feedbackOperateur').value;
  if (!opId) {
    document.getElementById('feedbackContent').innerHTML = '';
    // Retirer le thème
    document.getElementById('feedback').style.removeProperty('background');
    document.getElementById('feedback').style.removeProperty('position');
    return;
  }

  const operateur = dbData.operateurs.find(o => o.id === opId);

  // Logos pour Kyndt (OM) et Harel (PSG)
  let themeStyle = '';
  let logoHtml = '';

  if (operateur && operateur.nom === 'Harel') {
    // Logo PSG officiel en premier plan
    themeStyle = 'position: relative;';
    logoHtml = `
      <div style="position: absolute; top: 10%; left: 50%; transform: translateX(-50%); opacity: 0.15; animation: pulseLogo 3s ease-in-out infinite; z-index: 999; pointer-events: none;">
        <img src="https://upload.wikimedia.org/wikipedia/fr/thumb/4/4a/Paris_Saint-Germain_Football_Club_%28logo%29.svg/500px-Paris_Saint-Germain_Football_Club_%28logo%29.svg.png" width="300" height="300" alt="PSG Logo" style="display: block;" />
      </div>
      <style>
        @keyframes pulseLogo {
          0%, 100% { transform: translateX(-50%) scale(1); opacity: 0.15; }
          50% { transform: translateX(-50%) scale(1.05); opacity: 0.2; }
        }
      </style>
    `;
  } else if (operateur && operateur.nom === 'Kyndt') {
    // Logo OM officiel en premier plan
    themeStyle = 'position: relative;';
    logoHtml = `
      <div style="position: absolute; top: 10%; left: 50%; transform: translateX(-50%); opacity: 0.15; animation: pulseLogo 3s ease-in-out infinite; z-index: 999; pointer-events: none;">
        <svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 192.756 192.756">
          <g fill-rule="evenodd" clip-rule="evenodd">
            <path d="M153.088 174.184l4.281-4.396 3.367-3.742 2.9-.188 7.506-.631 3.975-.562-3.975-3.531 7.787-.303-1.496-1.566-3.883-4.445-4.396-6.969-2.127-4.373-2.199-4.443 1.123-1.777 3.695-7.318 2.221-6.057 2.246-8.467 1.379-8.605.305-4.373.07-6.946 5.309-.749-.678-4.069 3.553-.561-4.746-29.747-12.16 2.058-1.498-2.713-5.473-7.998-6.057-7.156-1.029-.912v4.701l3.906 4.373 5.66 8.162 1.309 2.245-10.875 1.754v2.923l23.9-3.929 3.883 24.134-27.783 4.561V106.6l2.34 9.262-.818 2.432-1.24 3.25-.281.586v7.014l2.783-5.635 2.363-6.479 1.754-7.344.936-7.178.279-4.164v-.467l11.975-1.941-.094 3.32-.188 3.742-.936 8.256-1.871 8.162-2.76 8.021-3.625 7.576-4.373 6.969-5.215 6.432-1.029 1.029v5.004l2.525-2.689 5.217-6.713 1.754-2.502.936 2.059 3.062 5.939 2.129 3.346 2.502 3.623h-7.576l-2.807 3.064-7.742 8.068v5.542zm-8.535 7.972l5.496-4.863 3.039-3.109v-5.543l-.725.771-3.998 3.883.678-2.199 1.379-6.805.375-3.719.188-3.883 1.941-2.057.162-.188v-5.004l-4.793 4.816-3.742 3.041v24.859zm8.535-138.513l-5.354-4.841-3.182-2.409v3.906l2.877 2.385 3.438 3.157 2.221 2.502v-4.7zm-8.535-9.495l.211-.538 2.877-6.034 3.156-4.256 1.941-2.151-8.186-.749v3.438l2.316.234-1.1 1.497-1.217 2.151v6.408h.002zm8.535 30.729V67.8l-8.535 1.403V56.716l3.93 4.724 1.449 2.058 1.24 1.684 1.916-.305zm0 27.689v14.031l-1.916-7.6-6.619 1.051v-6.08l8.535-1.402zm0 29.561v7.014l-.045.117-3.93 6.127-4.561 5.707v-28.344l4.49 17.445 1.193-2.127 2.853-5.939zm-11.178 43.379l.982-.561v3.907l-.748 6.127-.234 1.215v8.209l1.17-.959 1.473-1.287V157.3l-2.643 2.127v6.079zm2.643-129.113l-.725-.538.725-1.707V27.74l-1.66 2.876-.983 2.784v31.688l.422 1.73-.422.07v2.76l2.643-.444V56.716l-.467-.561-1.754-1.754-.117-2.876.117-3.25.561-6.711.258-2.433 1.402 1.169v-3.907zm0-15.972l-2.643-.234v3.415l2.643.257v-3.438zm0 73.548v6.08l-2.643.422V94.39l2.643-.421zm0 18.779v28.344l-.164.188-2.479 2.385v-4.607l.492-.514-.492-1.895V102.53l2.643 10.218zm-23.455 62.814l.631-.211 9.074-3.742 8.207-4.441 2.9-1.662v-6.08l-.023.023-7.062 4.467-7.904 3.93-5.822 1.988v5.728h-.001zm20.812.631l-1.264 6.314-.816 3.625 2.08-1.73v-8.209zm0-156.006l-7.576-.702-13.236-6.688v3.765l12.301 6.15 8.512.889v-3.414h-.001zm0 13.213v31.688l-.701-2.783-.818-4.303-.865-8.723v-4.817l1.24-7.834 1.144-3.228zm0 33.488l-9.051 1.427-3.555-14.102-1.754-7.062-1.754-6.898-2.992-9.074-1.707-4.35v9.682l1.822 4.864-1.822-.725v3.297l2.758 1.146 3.135 12.839-1.754 11.599-4.139.631v2.899l20.812-3.414v-2.759h.001zm0 27.502v6.081l-.514.094.514 1.965v34.119l-9.33-34.705-9.355 1.566-2.127 14.688V97.781l20.812-3.391zm0 44.667v4.607l-2.9 2.807-5.963 4.443-6.314 3.719-2.992 1.496-2.643 1.24v-3.789l.631-.258 5.939-3.062 6.221-4.023 5.754-4.887 2.267-2.293zm-20.812 26.193v-7.391l.631.654 2.572 2.689 1.801 1.311 1.824 1.309-6.828 1.428zm-2.082 10.967l2.082-.654v-5.729l-2.082.701v5.682zm2.082-163.42l-2.082-1.053v3.765l2.082 1.053v-3.765zm0 14.032v9.682l-2.082-5.589v-8.957l.561 1.006 1.521 3.858zm0 13.82v3.297l-1.707-.701-.375 2.502v-5.753l1.402.374.68.281zm0 29.514v2.899l-2.082.351V70.49l2.082-.327zm0 27.618v20.416l-2.082 14.428v-22.73l.748-5.074-.748.117v-6.805l2.082-.352zm0 55.799v3.789l-.305.139.305.352v7.391l-2.082.443v-2.992l1.402-.281-1.027-1.217-.375-.631v-7.203l.281.959 1.801-.749zm-6.479 23.877l2.152-.537 2.244-.703v-5.682l-.188.07-4.209 1.004v5.848h.001zm4.397-165.712l-4.396-2.222v3.789l4.396 2.198v-3.765zm0 10.219v8.957l-1.496-4.022-2.9-.655V14.387l1.146 1.73 3.25 5.847zm0 18.031v5.753l-3.812 25.35 3.812-.608v2.923l-4.396.725V38.732l4.396 1.263zm0 58.138v6.805l-4.396.725v-6.828l4.396-.702zm0 11.762v22.73l-1.006 7.041-.188 1.379-.186 3.25.186 3.555.633 3.229.373 1.613.188.678v7.203l-2.059-3.484-1.941-6.314-.396-4.021v-6.947l.094-.818 4.302-29.094zm0 52.806v2.992l-4.396.912v-2.924l4.396-.98zm-18.897 22.824l4.047-5.707 3.719-.748 6.734-1.613v-5.848l-2.854.68-2.945.561 4.068-5.869 1.73-.375v-2.924l-3.484.75-10.898 15.785-.117-.141v5.449zm14.5-176.002l-10.758-5.449 1.311 1.567 2.525 3.344 2.877 4.304-10.455-4.701v.749l.865 1.263 3.742 6.08 1.381 2.619 1.027 2.151-2.525-.28-4.49-.211v3.438h.117l8.279.749 4.373.701 1.73.398V14.387l-1.1-1.637 1.1.561V9.523h.001zm0 29.209v35.406l-14.5 2.386v-2.9l7.951-1.286 3.883-27.432-2.689-.562-7.273-.912-1.871-.047v-6.688l4.211.117 8.559 1.426 1.729.492zm0 60.102v6.828l-4.607.725-9.098 61.412.07.256-.865-5.215v-35.709l2.924-19.527-2.924.49v-6.875l14.5-2.385zm0 40.971l-.094.562-.141 4.186.234 2.199v-6.947h.001zm-27.08 40.084l9.447 10.033 3.133-4.396v-5.449l-15.458-16.348v4.373l4.817 5.355-2.759-.467-2.058-.469v6.9l2.878.468zm12.58-171.302l-.771-.351.771 1.099v-.748zm0 12.371v3.438l-4.864.187-5.963.444-4.443.632-.188.046v-8.91l2.128-3.928 1.379-2.245-3.508 1.59V8.471l12.512-5.637-1.825 2.55-2.245 3.157-4.256 6.688-2.502 4.631-1.005 1.964 3.321-.468 8.068-.561 3.391.163zm0 15.74v6.688l-5.051-.14-7.156.725-3.251.585v-6.455l3.251-.725 7.811-.818 4.396.14zm0 36.926v2.9l-15.458 2.525v-2.923l.936-.164-.936-5.636V49.77l4.186 25.701 11.272-1.847zm0 27.595v6.875l-5.705 1.006 4.326 27.127 1.379-9.096v35.709l-8.956-53.178-6.501 1.051v-6.969l15.457-2.525zm-15.457 50.537l.444-1.684.679-4.842.187-3.811-.116-2.619-.188-3.252-.07-.561-.936-5.449v22.218zm0-143.285l-18.334 8.208v3.835l18.334-8.302V8.471zM66.328 174.066l1.239.607 7.366 2.619 8.162 1.871 1.567.258v-6.9l-5.215-1.215-7.951-2.572-5.168-2.41v7.742zm18.334-157.27v8.91l-1.684.257-1.099 3.344-1.029 3.438-1.029 3.438-1.005 3.438 4.841-1.31 1.005-.21v6.455l-.818.164.818 5.051v20.556l-4.653-27.922-2.058.654-4.514 18.194L76.01 77.6l8.652-1.473v2.923l-18.334 3.017v-6.268l8.489-32.927.631-2.433 1.684-5.753 3.157-8.91 2.151-4.934 2.222-4.046zm0 86.948v6.969l-3.157.516 3.157 18.311v22.217l-.631 2.385-1.871 4.561-1.123 2.129-1.216 1.963 4.841.936v4.373l-1.192-1.309-11.085-1.871 2.058-2.129 1.567-1.871 1.052-1.59.515-1.121-2.759-1.193-2.994-1.311-5.495-2.898v-3.742l2.455 1.566 6.478 3.32 3.368 1.568.374-1.381.375-2.807-.118-2.502-.187-1.098-5.753-35.197-6.992 1.17v-6.945l18.333-3.019zM66.328 16.679l-2.549 1.123-9.214-.398v3.508l9.542.608 2.222-1.006v-3.835h-.001zM54.564 181.736l.655.654-.655-2.807v2.153zm0-14.031l6.033 3.531 5.73 2.83v-7.742l-3.415-1.59-7.507-4.652-.842-.68v8.303h.001zm11.764-91.907v6.268l-11.763 1.941V81.06l10.851-1.777.912-3.485zm0 30.964v6.945l-6.922 1.146-4.841 18.404v-12.861l1.286-4.982-1.286.211v-6.945l11.763-1.918zm0 42.304v3.742l-.795-.422-6.057-4.186-4.911-4.42v-4.162l.187.232 3.274 3.205 4.256 3.461 4.046 2.55zM54.564 75.565V54.377l1.029-1.029.094-1.824-.094-5.565-.374-3.368-.655-3.344V30.22l2.713 6.782 1.753 7.343.562 6.876-.374 5.87-.491 2.222-4.163 16.252zm0-58.161l-3.906-.187v3.438l3.906.257v-3.508zm-3.905 169.664l1.474 1.566-1.474-5.846v4.28zm0-9.214l3.906 3.883v-2.152l-.093-.42-1.661-7.623-.562-3.135-.374-2.432 2.596 1.684.093.047v-8.303l-3.906-3.133v21.584h.001zm3.905-147.635v9.027l-.093-.491-2.035 1.497-1.777 1.613V22.759l.351.585 3.368 6.431.186.444zm0 24.158v21.188l-1.497 5.753 1.497-.258v2.947l-3.906.631V66.702l1.287-5.075-1.287 1.661V58.61l2.783-3.11 1.123-1.123zm0 54.303v6.945l-3.906.678v-6.969l3.906-.654zm0 11.716v12.861l-1.31 4.91 1.31 1.451v4.162l-.468-.42-3.438-3.674v-5.121l.164.234 3.742-14.403zM50.659 17.217l-1.497-.07v26.075l1.497-1.356V22.759l-1.286-2.175 1.286.07v-3.437zm-1.497 168.285l1.497 1.566v-4.279l-1.497-5.939v8.652zm0-9.145V171.4l.023.023-.023-.141v-16.23l1.497 1.217v21.584l-1.497-1.496zM50.659 58.61v4.678l-.023.023-1.474 2.245v-5.262l1.497-1.684zm0 8.092v17.937l-1.497.257V72.571l1.497-5.869zm0 42.632v6.969l-1.497.258v-6.992l1.497-.235zm0 25.232v5.121l-.725-.771-.772-1.051v-5.402l.468.678 1.029 1.425zM49.162 17.147l-6.01-.281 1.777 2.526 2.011 3.25h-6.782l1.403 1.871 3.929 6.197 1.824 3.648 1.754 4.186-2.315 1.941-6.595 6.688-2.315 2.783v5.472l.631-.958 6.455-7.437 4.233-3.812V17.147zM37.843 172.779l1.684 2.012 4.35 5.027 4.303 4.631.982 1.053v-8.652l-.164-.68.164.188V171.4l-2.222-2.176-6.127-6.781-2.712-3.252-.258-.021v13.609zM49.162 60.293v5.262l-2.292 3.508-3.368 6.711-1.38 3.578-1.403 4.022 5.963-1.029 2.479-9.775v12.324l-11.319 1.848v-4.046l.444-1.473 2.807-7.32 3.648-7.086 4.069-6.127.352-.397zm0 49.275v6.992l-5.659.982-1.006 2.596.936 2.127 1.193 2.689 3.32 5.754 1.216 1.754v5.402l-2.783-3.789-3.882-6.805-2.899-6.385-1.006-2.596-.749.141v-6.992l11.319-1.87zm0 45.485v16.23l-.421-3.182-.678-7.271-.187-2.76-2.011-1.754-5.332-4.936-2.689-3.062v-5.916l3.718 4.863 7.25 7.508.35.28zM37.843 49.958l-1.567 1.871-3.507 4.701-3.087 4.771-2.806 4.935-4.069 8.536-2.689 7.881-1.122 4.093-6.338 1.123.749 3.625-4.701.818 4.817 29.98 6.291-1.121.865 2.713 2.385 6.617 3.368 6.945 1.754 3.088 1.684 2.875-.748 2.012-2.502 5.309-3.18 4.842-3.134 3.32-1.497 1.311 1.31.816-.935 1.053-2.058 1.754-2.689 1.871 3.368.281 6.875.561 6.221.375 2.315.186 2.573 3.252 2.058 2.432V159.17l-2.572-.281-6.431-.633-2.338-.303.117-.07 1.099-1.379 1.497-1.941 2.994-4.771 1.192-2.689 1.006-2.877 1.497 1.871 1.94 2.223v-5.916l-1.94-2.551-4.116-7.178-3.414-7.904-1.685-4.445 11.155-1.893v-6.992l-17.913 2.922-3.812-24.04 21.725-3.578v-4.046l-.374 1.24-12.651 2.058.748-2.993 2.151-7.717 3.063-7.788 4.443-8.185 2.619-3.882v-5.474h-.004z" fill="#4284b5"/>
          </g>
        </svg>
      </div>
      <style>
        @keyframes pulseLogo {
          0%, 100% { transform: translateX(-50%) scale(1); opacity: 0.15; }
          50% { transform: translateX(-50%) scale(1.05); opacity: 0.2; }
        }
      </style>
    `;
  }

  // Appliquer le style au conteneur feedback
  const feedbackSection = document.getElementById('feedback');
  if (themeStyle) {
    feedbackSection.setAttribute('style', themeStyle);
  } else {
    feedbackSection.style.removeProperty('background');
    feedbackSection.style.removeProperty('position');
  }
  const cdOperateurAll = dbData.cd.filter(cd => cd.conf1 === opId || cd.conf2 === opId);

  // Pour les stats : EXCLURE les CD cachés
  const cdOperateur = cdOperateurAll.filter(cd => !cd.cache);

  // Calculer PNC et PNS pour cet opérateur spécifique
  const cdActifs = dbData.cd.filter(cd => !cd.cache);
  let nbPNC = 0;
  let nbPNS = 0;
  cdActifs.forEach(cd => {
    if (cd.conf1 === opId) nbPNC++;
    if (cd.conf2 === opId) nbPNS++;
  });

  if (cdOperateur.length === 0) {
    document.getElementById('feedbackContent').innerHTML = '<div class="empty-state"><p>Aucun CD trouvé pour cet opérateur</p></div>';
    return;
  }

  // Calculs
  const nbCD = cdOperateur.length;
  const d1Moyen = cdOperateur.reduce((sum, cd) => sum + cd.d1Reel, 0) / nbCD;
  const efficaciteMoyenne = cdOperateur.reduce((sum, cd) => sum + cd.efficacite, 0) / nbCD;
  const performanceMoyenne = cdOperateur.reduce((sum, cd) => sum + cd.performance, 0) / nbCD;
  const nbAnomalies = cdOperateur.filter(cd => cd.anomalie).length;
  
  const niv1 = cdOperateur.filter(cd => cd.qualite === '1').length;
  const niv2 = cdOperateur.filter(cd => cd.qualite === '2').length;
  const niv2CC = cdOperateur.filter(cd => cd.qualite === '2_cc').length;
  const niv3 = cdOperateur.filter(cd => cd.qualite === '3').length;
  
  const pctNiv1 = Math.round((niv1 / nbCD) * 100);
  const pctNiv2 = Math.round((niv2 / nbCD) * 100);
  const pctNiv2CC = Math.round((niv2CC / nbCD) * 100);
  const pctNiv3 = Math.round((niv3 / nbCD) * 100);
  
  // Top binômes
  const binomes = {};
  cdOperateur.forEach(cd => {
    const autreOp = cd.conf1 === opId ? cd.conf2 : cd.conf1;
    if (!binomes[autreOp]) {
      binomes[autreOp] = { count: 0, performances: [] };
    }
    binomes[autreOp].count++;
    binomes[autreOp].performances.push(cd.performance);
  });
  
  const topBinomes = Object.entries(binomes)
    .map(([opId, data]) => {
      const op = dbData.operateurs.find(o => o.id === opId);
      const perfMoyenne = data.performances.reduce((a, b) => a + b, 0) / data.performances.length;
      return { nom: op ? op.nom : 'N/A', count: data.count, performance: perfMoyenne };
    })
    .sort((a, b) => b.performance - a.performance)
    .slice(0, 5);
  
  // Codes problèmes
  const codesProblemes = {};
  cdOperateur.filter(cd => cd.codeQualite).forEach(cd => {
    const code = dbData.codesQualite.find(c => c.id === cd.codeQualite);
    if (code) {
      if (!codesProblemes[code.code]) {
        codesProblemes[code.code] = { description: code.description, count: 0 };
      }
      codesProblemes[code.code].count++;
    }
  });
  
  const topProblemes = Object.entries(codesProblemes)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5);
  
  // Préparer l'historique des CD triés par date (récent en premier)
  // TOUJOURS afficher tous les CD (cachés ET visibles), les cachés seront grisés
  const historiqueCD = cdOperateurAll.slice().sort((a, b) => {
    const dateA = new Date(a.date + 'T' + a.heure);
    const dateB = new Date(b.date + 'T' + b.heure);
    return dateB - dateA;
  });
  
  let currentModalCDId = null;
  
  // HTML
  const html = `
    ${logoHtml}
    <div class="feedback-controls" style="margin-bottom: var(--space-16); display: flex; align-items: center; gap: var(--space-12); padding: var(--space-12); background: var(--color-bg-1); border-radius: var(--radius-base); position: relative; z-index: 1;">
      <span style="font-size: var(--font-size-base); color: var(--color-text); font-weight: var(--font-weight-medium);">ℹ️ Les CD cachés sont toujours affichés (grisés) mais exclus des statistiques</span>
    </div>
    
    <div class="feedback-stats" style="position: relative; z-index: 1;">
      <div class="stat-card">
        <h4>Nombre de CD</h4>
        <div class="value">${nbCD}</div>
      </div>
      <div class="stat-card">
        <h4>D1 Moyen</h4>
        <div class="value">${d1Moyen.toFixed(1)}<span class="unit">h</span></div>
      </div>
      <div class="stat-card">
        <h4>Efficacité Moyenne</h4>
        <div class="value">${efficaciteMoyenne.toFixed(1)}<span class="unit">%</span></div>
      </div>
      <div class="stat-card">
        <h4>Performance Moyenne</h4>
        <div class="value">${performanceMoyenne.toFixed(1)}<span class="unit">%</span></div>
      </div>
      <div class="stat-card">
        <h4>Anomalies</h4>
        <div class="value" style="color: ${nbAnomalies > 0 ? 'var(--color-error)' : 'var(--color-success)'}">${nbAnomalies}</div>
      </div>
      <div class="stat-card" style="background: linear-gradient(135deg, #1976D2 0%, #1565C0 100%); color: white;">
        <h4 style="color: white;">PNC (CONF1)</h4>
        <div class="value" style="color: white;">${nbPNC}</div>
      </div>
      <div class="stat-card" style="background: linear-gradient(135deg, #388E3C 0%, #2E7D32 100%); color: white;">
        <h4 style="color: white;">PNS (CONF2)</h4>
        <div class="value" style="color: white;">${nbPNS}</div>
      </div>
    </div>

    <div class="feedback-section" style="position: relative; z-index: 1;">
      <h4>Répartition Retour Archi</h4>
      <div class="bar-chart">
        <div class="bar-item">
          <div class="bar-label">NIV 1</div>
          <div class="bar-visual"><div class="bar-fill niv1" style="width: ${pctNiv1}%"></div></div>
          <div class="bar-value">${pctNiv1}% (${niv1})</div>
        </div>
        <div class="bar-item">
          <div class="bar-label">NIV 2</div>
          <div class="bar-visual"><div class="bar-fill niv2" style="width: ${pctNiv2}%"></div></div>
          <div class="bar-value">${pctNiv2}% (${niv2})</div>
        </div>
        <div class="bar-item">
          <div class="bar-label">⚠️ NIV 2 CC</div>
          <div class="bar-visual"><div class="bar-fill niv2_cc" style="width: ${pctNiv2CC}%"></div></div>
          <div class="bar-value">${pctNiv2CC}% (${niv2CC})</div>
        </div>
        <div class="bar-item">
          <div class="bar-label">NIV 3</div>
          <div class="bar-visual"><div class="bar-fill niv3" style="width: ${pctNiv3}%"></div></div>
          <div class="bar-value">${pctNiv3}% (${niv3})</div>
        </div>
      </div>
    </div>
    
    <div class="feedback-section" style="position: relative; z-index: 1;">
      <h4>Top 5 Binômes</h4>
      <table>
        <thead>
          <tr>
            <th>Partenaire</th>
            <th>Nombre CD</th>
            <th>Performance Moyenne</th>
          </tr>
        </thead>
        <tbody>
          ${topBinomes.map(b => `
            <tr>
              <td>${b.nom}</td>
              <td>${b.count}</td>
              <td>${b.performance.toFixed(1)}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    ${topProblemes.length > 0 ? `
      <div class="feedback-section" style="position: relative; z-index: 1;">
        <h4>Codes Problèmes Fréquents</h4>
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Description</th>
              <th>Occurrences</th>
            </tr>
          </thead>
          <tbody>
            ${topProblemes.map(([code, data]) => `
              <tr>
                <td>${code}</td>
                <td>${data.description}</td>
                <td>${data.count}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : ''}

    <div class="feedback-section" style="position: relative; z-index: 1;">
      <h4>Historique des CD effectués</h4>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Machine</th>
              <th>CAI</th>
              <th>Dimension</th>
              <th>Rôle</th>
              <th>Binôme</th>
              <th>D1 Réel</th>
              <th>D1 Net</th>
              <th>Qualité</th>
              <th>Perf</th>
              <th>CQ Après CD</th>
              <th>Incident</th>
              <th>Anomalie</th>
              <th>Visibilité</th>
            </tr>
          </thead>
          <tbody>
            ${historiqueCD.map(cd => {
              const machine = dbData.machines.find(m => m.id === cd.numMachine);
              const estConf1 = cd.conf1 === opId;
              const autreOpId = estConf1 ? cd.conf2 : cd.conf1;
              const autreOp = dbData.operateurs.find(o => o.id === autreOpId);
              const role = estConf1 ? 'PNC' : 'PNS';
              let qualiteClass, qualiteLabel;
              if (cd.qualite === '1') {
                qualiteClass = 'status--success';
                qualiteLabel = 'NIV 1';
              } else if (cd.qualite === '2') {
                qualiteClass = 'status--warning';
                qualiteLabel = 'NIV 2';
              } else if (cd.qualite === '2_cc') {
                qualiteClass = 'status--error';
                qualiteLabel = '⚠️ NIV 2 CC';
              } else {
                qualiteClass = 'status--error';
                qualiteLabel = 'NIV 3';
              }
              
              const cqBadgeClass = cd.cqApres === 'Oui' ? 'status--success' : 'status--info';
              const cqLabel = cd.cqApres === 'Oui' ? 'OUI' : 'NON';
              const incBadgeClass = cd.incident === 'Oui' ? 'status--warning' : 'status--info';
              const incLabel = cd.incident === 'Oui' ? 'OUI' : 'NON';
              
              // Tooltip pour CQ dans Feedback
              let cqContent = `<span class="status ${cqBadgeClass}">${cqLabel}</span>`;
              if (cd.cqApres === 'Oui' && cd.codeCQ) {
                const codeCQ = dbData.codesCQ.find(c => c.id === cd.codeCQ);
                if (codeCQ) {
                  cqContent = `
                    <div class="tooltip">
                      <span class="status ${cqBadgeClass}" style="cursor: pointer;">${cqLabel}</span>
                      <span class="tooltiptext">
                        <strong>CQ effectué(e)</strong><br>
                        Code: <strong>${codeCQ.code}</strong><br>
                        ${codeCQ.description}
                      </span>
                    </div>
                  `;
                }
              }
              
              // Tooltip pour Retour Archi dans Feedback
              let qualiteContent = `<span class="status ${qualiteClass}">${qualiteLabel}</span>`;
              if (cd.qualite !== '1' && cd.codeQualite) {
                const codeQualite = dbData.codesQualite.find(c => c.id === cd.codeQualite);
                if (codeQualite) {
                  qualiteContent = `
                    <div class="tooltip">
                      <span class="status ${qualiteClass}" style="cursor: pointer;">${qualiteLabel}</span>
                      <span class="tooltiptext">
                        <strong>Code Retour Archi:</strong><br>
                        ${codeQualite.code} - ${codeQualite.description}
                      </span>
                    </div>
                  `;
                }
              }
              
              let rowClass = '';
              let rowStyle = '';
              if (cd.cache) {
                rowClass = ' class="cd-cache"';
                rowStyle = ' style="opacity: 0.45; background-color: rgba(var(--color-gray-400-rgb, 119, 124, 124), 0.15);"';
              } else if (cd.anomalie) {
                rowClass = ' class="anomalie"';
              }
              
              // Formatter la date en format court (DD/MM/YY)
              const dateObj = new Date(cd.date);
              const dateFormatee = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${String(dateObj.getFullYear()).slice(-2)}`;

              return `
                <tr${rowClass}${rowStyle} style="${rowStyle ? rowStyle.replace('style="', '').replace('"', '') + ' cursor: pointer;' : 'cursor: pointer;'}" onclick="voirDetailsCD('${cd.id}')">
                  <td style="white-space: nowrap; font-size: 13px;">${dateFormatee}</td>
                  <td>${machine ? machine.numero : 'N/A'}</td>
                  <td>${cd.cai}</td>
                  <td>${cd.dimension}</td>
                  <td><strong>${role}</strong></td>
                  <td>${autreOp ? autreOp.nom : 'N/A'}</td>
                  <td>${cd.d1Reel}h</td>
                  <td>${cd.d1Net}h</td>
                  <td>${qualiteContent}</td>
                  <td>${cd.performance}%</td>
                  <td>${cqContent}</td>
                  <td><span class="status ${incBadgeClass}">${incLabel}</span></td>
                  <td>${cd.anomalie ? '<span class="status status--error">Oui</span>' : '-'}</td>
                  <td onclick="event.stopPropagation()">
                    <button
                      class="btn-icon-eye"
                      onclick="toggleCacheCD('${cd.id}')"
                      title="${cd.cache ? 'Afficher ce CD dans les stats' : 'Masquer ce CD des stats'}"
                      style="background: none; border: none; cursor: pointer; font-size: 20px; padding: var(--space-4);">
                      ${cd.cache ? '👁️‍🗨️' : '👁️'}
                    </button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
  
  document.getElementById('feedbackContent').innerHTML = html;
}

// === EXPORT / IMPORT / SAUVEGARDE ===
function exporterDonneesSauvegarde() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-'); // HH-MM-SS
  const fileName = `michelin_cd_data_${dateStr}_${timeStr}.json`;
  
  const dataStr = JSON.stringify(dbData, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
  
  alert(`✅ Sauvegarde exportée avec succès!\n\nFichier: ${fileName}\nTaille: ${(dataStr.length / 1024).toFixed(2)} KB`);
}

function importerDonneesSauvegarde(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      
      // Valider la structure des données
      if (!data.operateurs || !data.machines || !data.cd) {
        alert('❌ Erreur: Le fichier JSON ne contient pas la structure attendue.\n\nAssurez-vous d\'importer un fichier de sauvegarde valide.');
        return;
      }
      
      const confirmMessage = `⚠️ ATTENTION: Êtes-vous sûr?\n\nCette action va remplacer TOUTES les données actuelles par celles du fichier:\n${file.name}\n\nDonnées actuelles:\n- ${dbData.cd.length} CD enregistrés\n- ${dbData.operateurs.length} opérateurs\n- ${dbData.machines.length} machines\n\nDonnées du fichier:\n- ${data.cd.length} CD\n- ${data.operateurs.length} opérateurs\n- ${data.machines.length} machines\n\nCette action est IRRÉVERSIBLE!`;
      
      if (confirm(confirmMessage)) {
        dbData = data;
        chargerToutesLesVues();
        afficherInfoSauvegarde();
        alert(`✅ Sauvegarde restaurée avec succès!\n\n- ${data.cd.length} CD importés\n- ${data.operateurs.length} opérateurs\n- ${data.machines.length} machines\n- ${data.codesQualite.length} codes Retour Archi\n- ${data.codesCQ.length} codes CQ\n- ${data.codesIncident.length} codes incidents`);
      }
    } catch (err) {
      alert(`❌ Erreur lors de l'importation:\n\n${err.message}\n\nVeuillez vérifier que le fichier est un JSON valide.`);
    }
    
    // Réinitialiser l'input file
    event.target.value = '';
  };
  reader.readAsText(file);
}

function afficherInfoSauvegarde() {
  const nbCD = dbData.cd.length;
  const nbOperateurs = dbData.operateurs.length;
  const nbMachines = dbData.machines.length;
  const nbCodesQualite = dbData.codesQualite.length;
  const nbCodesCQ = dbData.codesCQ.length;
  const nbCodesIncident = dbData.codesIncident.length;
  
  // Calculer la date de dernière modification (dernier CD ajouté)
  let derniereModif = 'Aucune donnée';
  if (dbData.cd.length > 0) {
    const cdRecent = dbData.cd.reduce((latest, cd) => {
      const cdDate = new Date(cd.dateAjout || cd.date);
      const latestDate = new Date(latest.dateAjout || latest.date);
      return cdDate > latestDate ? cd : latest;
    });
    derniereModif = new Date(cdRecent.dateAjout || cdRecent.date).toLocaleString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  // Calculer la taille approximative des données
  const dataStr = JSON.stringify(dbData);
  const tailleDonnees = (dataStr.length / 1024).toFixed(2);
  
  const html = `
    <div class="feedback-stats" style="margin-bottom: var(--space-20);">
      <div class="stat-card">
        <h4>Total CD</h4>
        <div class="value" style="color: var(--michelin-blue);">${nbCD}</div>
        <div class="unit">enregistrés</div>
      </div>
      <div class="stat-card">
        <h4>Opérateurs</h4>
        <div class="value" style="color: var(--color-primary);">${nbOperateurs}</div>
      </div>
      <div class="stat-card">
        <h4>Machines</h4>
        <div class="value" style="color: var(--color-primary);">${nbMachines}</div>
      </div>
      <div class="stat-card">
        <h4>Taille données</h4>
        <div class="value" style="color: var(--color-warning);">${tailleDonnees}</div>
        <div class="unit">KB</div>
      </div>
    </div>
    
    <div style="background: var(--color-surface); border: 1px solid var(--color-card-border); border-radius: var(--radius-lg); padding: var(--space-20); margin-bottom: var(--space-20);">
      <h4 style="margin-bottom: var(--space-16); color: var(--color-text);">Dernière modification</h4>
      <p style="font-size: var(--font-size-lg); color: var(--color-text); margin: 0;">${derniereModif}</p>
    </div>
    
    <div style="background: var(--color-surface); border: 1px solid var(--color-card-border); border-radius: var(--radius-lg); padding: var(--space-20);">
      <h4 style="margin-bottom: var(--space-16); color: var(--color-text);">Détails des données</h4>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Type de données</th>
              <th>Nombre d'éléments</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Changements de Dimension (CD)</td>
              <td><strong>${nbCD}</strong></td>
            </tr>
            <tr>
              <td>Opérateurs</td>
              <td><strong>${nbOperateurs}</strong></td>
            </tr>
            <tr>
              <td>Machines</td>
              <td><strong>${nbMachines}</strong></td>
            </tr>
            <tr>
              <td>Codes Retour Archi</td>
              <td><strong>${nbCodesQualite}</strong></td>
            </tr>
            <tr>
              <td>Codes CQ</td>
              <td><strong>${nbCodesCQ}</strong></td>
            </tr>
            <tr>
              <td>Codes Incidents</td>
              <td><strong>${nbCodesIncident}</strong></td>
            </tr>
            <tr style="background: var(--color-bg-1); font-weight: var(--font-weight-bold);">
              <td>Taille totale (JSON)</td>
              <td><strong>${tailleDonnees} KB</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
  
  document.getElementById('infoSauvegardeContent').innerHTML = html;
}

// Fonction de compatibilité (ancienne version)
function exporterDonnees() {
  exporterDonneesSauvegarde();
}

function importerDonnees(event) {
  importerDonneesSauvegarde(event);
}

// === INITIALISATION DES DONNÉES D'EXEMPLE ===
function initialiserDonneesExemple() {
  // Opérateurs protégés (ne peuvent pas être supprimés)
  const operateursProtegés = [
    { id: 'op_harel_protected', nom: 'Harel', dateAjout: '2025-01-01', protected: true },
    { id: 'op_kyndt_protected', nom: 'Kyndt', dateAjout: '2025-01-01', protected: true }
  ];

  // Si les opérateurs protégés n'existent pas déjà, les ajouter
  operateursProtegés.forEach(opProtegé => {
    if (!dbData.operateurs.find(o => o.id === opProtegé.id)) {
      dbData.operateurs.push(opProtegé);
    }
  });

  // Autres opérateurs (SANS poste par défaut - tous peuvent faire PNC et PNS)
  // dbData.operateurs déjà initialisé avec les protégés ci-dessus
  
  // Machines
  dbData.machines = [

  ];
  
  // Codes Qualité
  dbData.codesQualite = [

  ];
  
  // Codes CQ
  dbData.codesCQ = [

  ];
  
  // Codes Incident
  dbData.codesIncident = [

  ];
  
  // Exemples de CD
  dbData.cd = [
    
  ];
}

function chargerToutesLesVues() {
  afficherOperateurs();
  afficherMachines();
  afficherCodesQualite();
  afficherCodesCQ();
  afficherCodesIncident();
  remplirSelectsMachines();
  remplirSelectsOperateurs();
  remplirSelectFeedback();
  afficherHistorique();
  afficherAccueil();
  afficherInfoSauvegarde();
}

// === ACCUEIL DASHBOARD ===
function afficherAccueil() {
  // patched afficherAccueil: utilize globally filtered list
  const cdBase = getFilteredCD({ excludeCached:false });

  const cdActifs = dbData.cd.filter(cd => !cd.cache);
  
  // KPI 1: Total CD
  const totalCD = cdActifs.length;
  
  // KPI 2: D1 Moyen
  const d1Moyen = cdActifs.length > 0 ? (cdActifs.reduce((sum, cd) => sum + cd.d1Reel, 0) / cdActifs.length).toFixed(1) : 0;
  
  // KPI 3: CD NIV 1
  const cdNiv1 = cdActifs.filter(cd => cd.qualite === '1').length;
  const pctNiv1 = cdActifs.length > 0 ? Math.round((cdNiv1 / cdActifs.length) * 100) : 0;
  
  // KPI 4: Incidents
  const incidents = cdActifs.filter(cd => cd.incident === 'Oui').length;
  const pctIncidents = cdActifs.length > 0 ? Math.round((incidents / cdActifs.length) * 100) : 0;
  
  // Afficher KPI Cards
  const kpiHTML = `
    <div class="kpi-card">
      <div class="kpi-card-icon">📊</div>
      <div class="kpi-card-title">Total CD</div>
      <div class="kpi-card-value">${totalCD}</div>
      <div class="kpi-card-subtitle">CD enregistrés</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-card-icon">⏱️</div>
      <div class="kpi-card-title">D1 Moyen</div>
      <div class="kpi-card-value">${d1Moyen} h</div>
      <div class="kpi-card-subtitle">Durée moyenne</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-card-icon">✅</div>
      <div class="kpi-card-title">CD NIV 1</div>
      <div class="kpi-card-value">${cdNiv1}</div>
      <div class="kpi-card-subtitle">${pctNiv1}% de qualité</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-card-icon">⚠️</div>
      <div class="kpi-card-title">Incidents</div>
      <div class="kpi-card-value">${incidents}</div>
      <div class="kpi-card-subtitle">${pctIncidents}% des CD</div>
    </div>
  `;
  document.getElementById('kpiContainer').innerHTML = kpiHTML;

  // Statistiques comparatives
  if (typeof afficherStatsComparatives === 'function') {
    afficherStatsComparatives();
  }

  // Pie Chart: Répartition Retour Archi
  afficherPieChartRetourArchi(cdActifs);

  // Bar Chart: Type Machine
  afficherBarChartMachine(cdActifs);

  // Bar Chart: Type CD
  afficherBarChartTypeCD(cdActifs);
}

function afficherPieChartRetourArchi(cdData) {
  const niv1 = cdData.filter(cd => cd.qualite === '1').length;
  const niv2 = cdData.filter(cd => cd.qualite === '2').length;
  const niv2CC = cdData.filter(cd => cd.qualite === '2_cc').length;
  const niv3 = cdData.filter(cd => cd.qualite === '3').length;
  const total = cdData.length;
  
  if (total === 0) {
    document.getElementById('pieChartRetourArchi').innerHTML = '<p style="text-align: center; color: var(--color-text-secondary);">Aucune donnée disponible</p>';
    return;
  }
  
  const pct1 = Math.round((niv1 / total) * 100);
  const pct2 = Math.round((niv2 / total) * 100);
  const pct2CC = Math.round((niv2CC / total) * 100);
  const pct3 = Math.round((niv3 / total) * 100);
  
  // Simple CSS-based pie chart using conic-gradient
  const colors = {
    niv1: '#2E7D32',
    niv2: '#F57C00',
    niv2CC: '#C62828',
    niv3: '#8B0000'
  };
  
  let angle = 0;
  const segments = [];
  
  if (niv1 > 0) {
    const segmentAngle = (niv1 / total) * 360;
    segments.push(`${colors.niv1} ${angle}deg ${angle + segmentAngle}deg`);
    angle += segmentAngle;
  }
  if (niv2 > 0) {
    const segmentAngle = (niv2 / total) * 360;
    segments.push(`${colors.niv2} ${angle}deg ${angle + segmentAngle}deg`);
    angle += segmentAngle;
  }
  if (niv2CC > 0) {
    const segmentAngle = (niv2CC / total) * 360;
    segments.push(`${colors.niv2CC} ${angle}deg ${angle + segmentAngle}deg`);
    angle += segmentAngle;
  }
  if (niv3 > 0) {
    const segmentAngle = (niv3 / total) * 360;
    segments.push(`${colors.niv3} ${angle}deg ${angle + segmentAngle}deg`);
  }
  
  const gradient = `conic-gradient(${segments.join(', ')})`;
  
  const html = `
    <div style="display: flex; flex-direction: column; align-items: center; gap: var(--space-20);">
      <div class="pie-chart" style="background: ${gradient};"></div>
      <div class="pie-legend">
        <div class="pie-legend-item">
          <div class="pie-legend-color" style="background: ${colors.niv1};"></div>
          <div class="pie-legend-label">NIV 1</div>
          <div class="pie-legend-value">${pct1}% (${niv1})</div>
        </div>
        <div class="pie-legend-item">
          <div class="pie-legend-color" style="background: ${colors.niv2};"></div>
          <div class="pie-legend-label">NIV 2</div>
          <div class="pie-legend-value">${pct2}% (${niv2})</div>
        </div>
        <div class="pie-legend-item">
          <div class="pie-legend-color" style="background: ${colors.niv2CC};"></div>
          <div class="pie-legend-label">NIV 2 CC</div>
          <div class="pie-legend-value">${pct2CC}% (${niv2CC})</div>
        </div>
        <div class="pie-legend-item">
          <div class="pie-legend-color" style="background: ${colors.niv3};"></div>
          <div class="pie-legend-label">NIV 3</div>
          <div class="pie-legend-value">${pct3}% (${niv3})</div>
        </div>
      </div>
    </div>
  `;
  
  document.getElementById('pieChartRetourArchi').innerHTML = html;
}

function afficherBarChartMachine(cdData) {
  const types = {};
  cdData.forEach(cd => {
    if (!types[cd.typeMachine]) types[cd.typeMachine] = 0;
    types[cd.typeMachine]++;
  });
  
  const maxCount = Math.max(...Object.values(types), 1);
  
  const html = `
    <div class="bar-chart-simple">
      ${Object.entries(types).map(([type, count]) => `
        <div class="bar-chart-item">
          <div class="bar-chart-label">
            <span>${type}</span>
            <span>${count} CD</span>
          </div>
          <div class="bar-chart-bar">
            <div class="bar-chart-fill" style="width: ${(count / maxCount) * 100}%">${count}</div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
  
  document.getElementById('barChartMachine').innerHTML = html;
}

function afficherBarChartTypeCD(cdData) {
  const types = {};
  cdData.forEach(cd => {
    if (!types[cd.typeCD]) types[cd.typeCD] = 0;
    types[cd.typeCD]++;
  });
  
  const maxCount = Math.max(...Object.values(types), 1);
  
  const html = `
    <div class="bar-chart-simple">
      ${Object.entries(types).map(([type, count]) => `
        <div class="bar-chart-item">
          <div class="bar-chart-label">
            <span>${type}</span>
            <span>${count} CD</span>
          </div>
          <div class="bar-chart-bar">
            <div class="bar-chart-fill" style="width: ${(count / maxCount) * 100}%">${count}</div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
  
  document.getElementById('barChartTypeCD').innerHTML = html;
}

// === STATS TAB ===
function afficherStats(){
  const cdActifs = getFilteredCD({ excludeCached:true });
  
  // Regrouper par mois
  const moisData = {};
  cdActifs.forEach(cd => {
    const date = new Date(cd.date);
    const moisKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const moisLabel = date.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' });
    
    if (!moisData[moisKey]) {
      moisData[moisKey] = {
        label: moisLabel,
        cd: [],
        niv1: 0,
        niv2: 0,
        niv2CC: 0,
        niv3: 0,
        incidents: 0
      };
    }
    
    moisData[moisKey].cd.push(cd);
    if (cd.qualite === '1') moisData[moisKey].niv1++;
    else if (cd.qualite === '2') moisData[moisKey].niv2++;
    else if (cd.qualite === '2_cc') moisData[moisKey].niv2CC++;
    else if (cd.qualite === '3') moisData[moisKey].niv3++;
    if (cd.incident === 'Oui') moisData[moisKey].incidents++;
  });
  
  const moisArray = Object.entries(moisData).sort((a, b) => a[0].localeCompare(b[0]));
  
  let html = '';
  
  // Graphique: Temps moyen par mois
  if (moisArray.length > 0) {
    const maxD1 = Math.max(...moisArray.map(([_, data]) => {
      const d1Moyen = data.cd.reduce((sum, cd) => sum + cd.d1Reel, 0) / data.cd.length;
      return d1Moyen;
    }));
    
    html += `
      <div class="stats-section">
        <h3>Temps moyen D1 par mois</h3>
        <div class="month-chart">
          ${moisArray.map(([moisKey, data]) => {
            const d1Moyen = (data.cd.reduce((sum, cd) => sum + cd.d1Reel, 0) / data.cd.length).toFixed(1);
            const height = (d1Moyen / maxD1) * 200;
            const shortLabel = data.label.split(' ').slice(0, 1).join(' ').substring(0, 3);
            return `
              <div class="month-bar">
                <div class="month-bar-fill" style="height: ${height}px; background: var(--michelin-blue);">
                  <div class="month-bar-value">${d1Moyen}h</div>
                </div>
                <div class="month-bar-label">${shortLabel}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
    
    // Graphique: Évolution Retour Archi
    const maxCD = Math.max(...moisArray.map(([_, data]) => data.cd.length));
    html += `
      <div class="stats-section">
        <h3>Évolution des Retours Archi par mois</h3>
        <div class="month-chart">
          ${moisArray.map(([moisKey, data]) => {
            const total = data.cd.length;
            const pctNiv1 = Math.round((data.niv1 / total) * 100);
            const shortLabel = data.label.split(' ').slice(0, 1).join(' ').substring(0, 3);
            return `
              <div class="month-bar">
                <div class="month-bar-fill" style="height: ${(total / maxCD) * 200}px; background: linear-gradient(to top, #8B0000 0%, #C62828 ${(data.niv3 + data.niv2CC) / total * 100}%, #F57C00 ${(data.niv3 + data.niv2CC + data.niv2) / total * 100}%, #2E7D32 100%);">
                  <div class="month-bar-value">${pctNiv1}%</div>
                </div>
                <div class="month-bar-label">${shortLabel}</div>
              </div>
            `;
          }).join('')}
        </div>
        <p style="font-size: var(--font-size-sm); color: var(--color-text-secondary); margin-top: var(--space-12); text-align: center;">Hauteur = Volume CD | Couleur = Répartition qualité | Valeur = % NIV 1</p>
      </div>
    `;
    
    // Graphique: Volume CD par mois
    html += `
      <div class="stats-section">
        <h3>Volume CD par mois</h3>
        <div class="month-chart">
          ${moisArray.map(([moisKey, data]) => {
            const count = data.cd.length;
            const height = (count / maxCD) * 200;
            const shortLabel = data.label.split(' ').slice(0, 1).join(' ').substring(0, 3);
            return `
              <div class="month-bar">
                <div class="month-bar-fill" style="height: ${height}px; background: var(--color-primary);">
                  <div class="month-bar-value">${count}</div>
                </div>
                <div class="month-bar-label">${shortLabel}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
    
    // Tableau synthèse
    html += `
      <div class="stats-section">
        <h3>Tableau de synthèse mensuelle</h3>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Mois</th>
                <th>Nb CD</th>
                <th>D1 Moyen</th>
                <th>% NIV 1</th>
                <th>% NIV 2</th>
                <th>% NIV 2 CC</th>
                <th>% NIV 3</th>
                <th>Incidents</th>
              </tr>
            </thead>
            <tbody>
              ${moisArray.map(([moisKey, data]) => {
                const total = data.cd.length;
                const d1Moyen = (data.cd.reduce((sum, cd) => sum + cd.d1Reel, 0) / total).toFixed(1);
                const pctNiv1 = Math.round((data.niv1 / total) * 100);
                const pctNiv2 = Math.round((data.niv2 / total) * 100);
                const pctNiv2CC = Math.round((data.niv2CC / total) * 100);
                const pctNiv3 = Math.round((data.niv3 / total) * 100);
                return `
                  <tr>
                    <td>${data.label}</td>
                    <td>${total}</td>
                    <td>${d1Moyen}h</td>
                    <td>${pctNiv1}%</td>
                    <td>${pctNiv2}%</td>
                    <td>${pctNiv2CC}%</td>
                    <td>${pctNiv3}%</td>
                    <td>${data.incidents}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } else {
    html = '<div class="empty-state"><p>Aucune donnée disponible</p></div>';
  }
  
  document.getElementById('statsContent').innerHTML = html;
}

// === MACHINE TAB ===
function afficherMachinePerformance() {
  // patched afficherMachinePerformance: utilize globally filtered list
  const cdBase = getFilteredCD({ excludeCached:false });

  const cdActifs = dbData.cd.filter(cd => !cd.cache);
  
  // Stats par machine
  const machineStats = {};
  dbData.machines.forEach(machine => {
    const cdMachine = cdActifs.filter(cd => cd.numMachine === machine.id);
    if (cdMachine.length > 0) {
      const nbCD = cdMachine.length;
      const perfMoyenne = cdMachine.reduce((sum, cd) => sum + cd.performance, 0) / nbCD;
      const efficaciteMoyenne = cdMachine.reduce((sum, cd) => sum + cd.efficacite, 0) / nbCD;
      const d1Moyen = cdMachine.reduce((sum, cd) => sum + cd.d1Reel, 0) / nbCD;
      const niv1 = cdMachine.filter(cd => cd.qualite === '1').length;
      const niv2 = cdMachine.filter(cd => cd.qualite === '2').length;
      const niv2CC = cdMachine.filter(cd => cd.qualite === '2_cc').length;
      const niv3 = cdMachine.filter(cd => cd.qualite === '3').length;
      
      machineStats[machine.id] = {
        numero: machine.numero,
        type: machine.type,
        nbCD: nbCD,
        performance: Math.round(perfMoyenne * 100) / 100,
        efficacite: Math.round(efficaciteMoyenne * 100) / 100,
        d1Moyen: Math.round(d1Moyen * 10) / 10,
        niv1: niv1,
        niv2: niv2,
        niv2CC: niv2CC,
        niv3: niv3,
        cd: cdMachine
      };
    }
  });
  
  const machineArray = Object.entries(machineStats).sort((a, b) => b[1].performance - a[1].performance);
  
  if (machineArray.length === 0) {
    document.getElementById('machineContent').innerHTML = '<div class="empty-state"><p>Aucune donnée disponible</p></div>';
    return;
  }
  
  let html = `
    <div class="stats-section">
      <h3>Classement des Machines</h3>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Rang</th>
              <th>N° Machine</th>
              <th>Type</th>
              <th>Performance Moyenne</th>
              <th>Efficacité Moyenne</th>
              <th>Nb CD</th>
              <th>D1 Moyen</th>
            </tr>
          </thead>
          <tbody>
            ${machineArray.map(([machineId, stats], index) => {
              const rankClass = index === 0 ? 'rank-1' : (index === 1 ? 'rank-2' : (index === 2 ? 'rank-3' : ''));
              const medal = index === 0 ? '🥇' : (index === 1 ? '🥈' : (index === 2 ? '🥉' : ''));
              return `
                <tr class="${rankClass}" style="cursor: pointer;" onclick="voirDetailsMachine('${machineId}')">
                  <td>${medal} ${index + 1}</td>
                  <td><strong>${stats.numero}</strong></td>
                  <td>${stats.type}</td>
                  <td>${stats.performance}%</td>
                  <td>${stats.efficacite}%</td>
                  <td>${stats.nbCD}</td>
                  <td>${stats.d1Moyen}h</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
    
    <div class="stats-section">
      <h3>Détails par Machine</h3>
      <div class="machine-selector">
        <label class="form-label">Sélectionner une machine :</label>
        <select id="machineDetailSelect" class="form-control" onchange="afficherDetailsMachine()">
          <option value="">-- Sélectionner --</option>
          ${machineArray.map(([machineId, stats]) => `
            <option value="${machineId}">${stats.numero} (${stats.type})</option>
          `).join('')}
        </select>
      </div>
      <div id="machineDetailContent"></div>
    </div>
  `;
  
  document.getElementById('machineContent').innerHTML = html;
}

function afficherDetailsMachine() {
  const machineId = document.getElementById('machineDetailSelect').value;
  if (!machineId) {
    document.getElementById('machineDetailContent').innerHTML = '';
    return;
  }
  
  const cdActifs = dbData.cd.filter(cd => !cd.cache && cd.numMachine === machineId);
  const machine = dbData.machines.find(m => m.id === machineId);
  
  if (!machine || cdActifs.length === 0) return;
  
  const nbCD = cdActifs.length;
  const perfMoyenne = (cdActifs.reduce((sum, cd) => sum + cd.performance, 0) / nbCD).toFixed(1);
  const efficaciteMoyenne = (cdActifs.reduce((sum, cd) => sum + cd.efficacite, 0) / nbCD).toFixed(1);
  const d1Moyen = (cdActifs.reduce((sum, cd) => sum + cd.d1Reel, 0) / nbCD).toFixed(1);
  
  const niv1 = cdActifs.filter(cd => cd.qualite === '1').length;
  const niv2 = cdActifs.filter(cd => cd.qualite === '2').length;
  const niv2CC = cdActifs.filter(cd => cd.qualite === '2_cc').length;
  const niv3 = cdActifs.filter(cd => cd.qualite === '3').length;
  
  const pctNiv1 = Math.round((niv1 / nbCD) * 100);
  const pctNiv2 = Math.round((niv2 / nbCD) * 100);
  const pctNiv2CC = Math.round((niv2CC / nbCD) * 100);
  const pctNiv3 = Math.round((niv3 / nbCD) * 100);
  
  // Pie chart simple
  const colors = { niv1: '#2E7D32', niv2: '#F57C00', niv2CC: '#C62828', niv3: '#8B0000' };
  let angle = 0;
  const segments = [];
  if (niv1 > 0) {
    const segmentAngle = (niv1 / nbCD) * 360;
    segments.push(`${colors.niv1} ${angle}deg ${angle + segmentAngle}deg`);
    angle += segmentAngle;
  }
  if (niv2 > 0) {
    const segmentAngle = (niv2 / nbCD) * 360;
    segments.push(`${colors.niv2} ${angle}deg ${angle + segmentAngle}deg`);
    angle += segmentAngle;
  }
  if (niv2CC > 0) {
    const segmentAngle = (niv2CC / nbCD) * 360;
    segments.push(`${colors.niv2CC} ${angle}deg ${angle + segmentAngle}deg`);
    angle += segmentAngle;
  }
  if (niv3 > 0) {
    const segmentAngle = (niv3 / nbCD) * 360;
    segments.push(`${colors.niv3} ${angle}deg ${angle + segmentAngle}deg`);
  }
  const gradient = `conic-gradient(${segments.join(', ')})`;
  
  const derniersCD = cdActifs.slice(-10).reverse();
  
  const html = `
    <div class="machine-details-grid">
      <div>
        <h4 style="margin-bottom: var(--space-16);">Statistiques Complètes</h4>
        <div class="feedback-stats" style="margin-bottom: var(--space-20);">
          <div class="stat-card">
            <h4>Performance</h4>
            <div class="value">${perfMoyenne}<span class="unit">%</span></div>
          </div>
          <div class="stat-card">
            <h4>Efficacité</h4>
            <div class="value">${efficaciteMoyenne}<span class="unit">%</span></div>
          </div>
          <div class="stat-card">
            <h4>D1 Moyen</h4>
            <div class="value">${d1Moyen}<span class="unit">h</span></div>
          </div>
          <div class="stat-card">
            <h4>Total CD</h4>
            <div class="value">${nbCD}</div>
          </div>
        </div>
        
        <h4 style="margin-bottom: var(--space-16);">Derniers CD</h4>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>CAI</th>
                <th>Opérateurs</th>
                <th>D1 Réel</th>
                <th>Qualité</th>
                <th>Performance</th>
              </tr>
            </thead>
            <tbody>
              ${derniersCD.map(cd => {
                const op1 = dbData.operateurs.find(o => o.id === cd.conf1);
                const op2 = dbData.operateurs.find(o => o.id === cd.conf2);
                let qualiteClass = cd.qualite === '1' ? 'status--success' : (cd.qualite === '2' ? 'status--warning' : 'status--error');
                let qualiteLabel = cd.qualite === '1' ? 'NIV 1' : (cd.qualite === '2' ? 'NIV 2' : (cd.qualite === '2_cc' ? 'NIV 2 CC' : 'NIV 3'));
                return `
                  <tr>
                    <td>${cd.date}</td>
                    <td>${cd.cai}</td>
                    <td>${op1 ? op1.nom : 'N/A'} / ${op2 ? op2.nom : 'N/A'}</td>
                    <td>${cd.d1Reel}h</td>
                    <td><span class="status ${qualiteClass}">${qualiteLabel}</span></td>
                    <td>${cd.performance}%</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
      
      <div>
        <h4 style="margin-bottom: var(--space-16);">Répartition Retour Archi</h4>
        <div style="display: flex; flex-direction: column; align-items: center; gap: var(--space-20);">
          <div class="pie-chart" style="background: ${gradient}; width: 180px; height: 180px;"></div>
          <div class="pie-legend">
            <div class="pie-legend-item">
              <div class="pie-legend-color" style="background: ${colors.niv1};"></div>
              <div class="pie-legend-label">NIV 1</div>
              <div class="pie-legend-value">${pctNiv1}% (${niv1})</div>
            </div>
            <div class="pie-legend-item">
              <div class="pie-legend-color" style="background: ${colors.niv2};"></div>
              <div class="pie-legend-label">NIV 2</div>
              <div class="pie-legend-value">${pctNiv2}% (${niv2})</div>
            </div>
            <div class="pie-legend-item">
              <div class="pie-legend-color" style="background: ${colors.niv2CC};"></div>
              <div class="pie-legend-label">NIV 2 CC</div>
              <div class="pie-legend-value">${pctNiv2CC}% (${niv2CC})</div>
            </div>
            <div class="pie-legend-item">
              <div class="pie-legend-color" style="background: ${colors.niv3};"></div>
              <div class="pie-legend-label">NIV 3</div>
              <div class="pie-legend-value">${pctNiv3}% (${niv3})</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.getElementById('machineDetailContent').innerHTML = html;
}

// === QUALITÉ TAB ===
let currentQualiteDetail = null;

function afficherQualite() {
  // patched afficherQualite: utilize globally filtered list
  const cdBase = getFilteredCD({ excludeCached:false });

  const cdActifs = dbData.cd.filter(cd => !cd.cache);
  
  // Stats Retour Archi
  const retourArchiStats = {
    'NIV 1': { count: 0, cd: [] },
    'NIV 2': { count: 0, cd: [] },
    'NIV 2 CC': { count: 0, cd: [] },
    'NIV 3': { count: 0, cd: [] }
  };
  
  cdActifs.forEach(cd => {
    const key = cd.qualite === '1' ? 'NIV 1' : (cd.qualite === '2' ? 'NIV 2' : (cd.qualite === '2_cc' ? 'NIV 2 CC' : 'NIV 3'));
    retourArchiStats[key].count++;
    retourArchiStats[key].cd.push(cd);
  });
  
  const total = cdActifs.length;
  const retourArchiArray = Object.entries(retourArchiStats).sort((a, b) => b[1].count - a[1].count);
  
  // Stats CQ
  const cqStats = {};
  cdActifs.filter(cd => cd.codeCQ).forEach(cd => {
    const cqCode = dbData.codesCQ.find(c => c.id === cd.codeCQ);
    if (cqCode) {
      if (!cqStats[cd.codeCQ]) {
        cqStats[cd.codeCQ] = {
          code: cqCode.code,
          description: cqCode.description,
          count: 0,
          cd: []
        };
      }
      cqStats[cd.codeCQ].count++;
      cqStats[cd.codeCQ].cd.push(cd);
    }
  });
  
  const totalCQ = Object.values(cqStats).reduce((sum, s) => sum + s.count, 0);
  const cqArray = Object.entries(cqStats).sort((a, b) => b[1].count - a[1].count);
  
  let html = `
    <div class="stats-section">
      <h3>Classement Retour Archi</h3>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Rang</th>
              <th>Retour Archi</th>
              <th>Nombre</th>
              <th>%</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${retourArchiArray.map(([niveau, stats], index) => {
              const pct = total > 0 ? Math.round((stats.count / total) * 100) : 0;
              return `
                <tr>
                  <td>${index + 1}</td>
                  <td><strong>${niveau}</strong></td>
                  <td>${stats.count}</td>
                  <td>${pct}%</td>
                  <td>
                    <button class="btn btn--small btn--primary" onclick="afficherDetailsRetourArchiModal('${niveau}')">
                      Voir détails
                    </button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
    
    <div class="stats-section">
      <h3>Classement CQ</h3>
      ${cqArray.length > 0 ? `
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Rang</th>
                <th>Code CQ</th>
                <th>Description</th>
                <th>Nombre</th>
                <th>% (de CD avec CQ)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${cqArray.map(([cqId, stats], index) => {
                const pct = totalCQ > 0 ? Math.round((stats.count / totalCQ) * 100) : 0;
                return `
                  <tr>
                    <td>${index + 1}</td>
                    <td><strong>${stats.code}</strong></td>
                    <td>${stats.description}</td>
                    <td>${stats.count}</td>
                    <td>${pct}%</td>
                    <td>
                      <button class="btn btn--small btn--primary" onclick="afficherDetailsCQ('${cqId}')">
                        Voir détails
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      ` : '<p style="color: var(--color-text-secondary); text-align: center;">Aucun CQ enregistré</p>'}
    </div>
    
    <div id="qualiteDetailSection"></div>
  `;
  
  document.getElementById('qualiteContent').innerHTML = html;
}

function afficherDetailsRetourArchiModal(niveau) {
  const cdActifs = dbData.cd.filter(cd => !cd.cache);
  const qualiteKey = niveau === 'NIV 1' ? '1' : (niveau === 'NIV 2' ? '2' : (niveau === 'NIV 2 CC' ? '2_cc' : '3'));
  const cdFiltered = cdActifs.filter(cd => cd.qualite === qualiteKey);
  
  const total = cdActifs.length;
  const pctTotal = total > 0 ? Math.round((cdFiltered.length / total) * 100) : 0;
  
  // Codes associés
  const codes = {};
  cdFiltered.forEach(cd => {
    if (cd.codeQualite) {
      const codeObj = dbData.codesQualite.find(c => c.id === cd.codeQualite);
      if (codeObj) {
        if (!codes[codeObj.code]) {
          codes[codeObj.code] = { description: codeObj.description, count: 0 };
        }
        codes[codeObj.code].count++;
      }
    }
  });
  const codesArray = Object.entries(codes).sort((a, b) => b[1].count - a[1].count);
  
  // Opérateurs affectés
  const operateurs = {};
  cdFiltered.forEach(cd => {
    [cd.conf1, cd.conf2].forEach(opId => {
      if (!operateurs[opId]) operateurs[opId] = 0;
      operateurs[opId]++;
    });
  });
  const operateursArray = Object.entries(operateurs)
    .map(([opId, count]) => {
      const op = dbData.operateurs.find(o => o.id === opId);
      return { nom: op ? op.nom : 'N/A', count: count, pct: Math.round((count / cdFiltered.length) * 100) };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  
  // Machines affectées
  const machines = {};
  cdFiltered.forEach(cd => {
    if (!machines[cd.numMachine]) machines[cd.numMachine] = 0;
    machines[cd.numMachine]++;
  });
  const machinesArray = Object.entries(machines)
    .map(([machineId, count]) => {
      const machine = dbData.machines.find(m => m.id === machineId);
      return { nom: machine ? `${machine.numero} (${machine.type})` : 'N/A', count: count, pct: Math.round((count / cdFiltered.length) * 100) };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  
  // Badge color
  let badgeClass = niveau === 'NIV 1' ? 'niv1' : (niveau === 'NIV 2' ? 'niv2' : (niveau === 'NIV 2 CC' ? 'niv2_cc' : 'niv3'));
  
  const content = `
    <div class="modal-header">
      <div class="modal-details-title-section">
        <div class="modal-details-title">
          <h3>Détails Retour Archi : ${niveau}</h3>
          <div class="modal-quality-badge ${badgeClass}">${niveau}</div>
        </div>
        <button class="modal-close-btn" onclick="fermerModal('modalDetailsCD')">&times;</button>
      </div>
    </div>
    
    <div class="modal-content-scrollable">
      <div class="modal-performance-section">
        <h4>Vue d'ensemble</h4>
        <div class="modal-performance-grid">
          <div class="modal-performance-item">
            <div class="modal-performance-label">Nombre de CD</div>
            <div class="modal-performance-value">${cdFiltered.length}</div>
          </div>
          <div class="modal-performance-item">
            <div class="modal-performance-label">% des CD totaux</div>
            <div class="modal-performance-value">${pctTotal}%</div>
          </div>
        </div>
      </div>
      
      ${codesArray.length > 0 ? `
        <div class="modal-codes-section">
          <h4>Codes associés (${codesArray.length})</h4>
          <div class="table-container">
            <table style="width: 100%;">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Description</th>
                  <th>Nombre</th>
                  <th>%</th>
                </tr>
              </thead>
              <tbody>
                ${codesArray.map(([code, data]) => `
                  <tr>
                    <td><strong>${code}</strong></td>
                    <td>${data.description}</td>
                    <td>${data.count}</td>
                    <td>${Math.round((data.count / cdFiltered.length) * 100)}%</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : ''}
      
      <div class="modal-codes-section">
        <h4>Opérateurs affectés (Top 5)</h4>
        <div class="table-container">
          <table style="width: 100%;">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Nombre CD</th>
                <th>%</th>
              </tr>
            </thead>
            <tbody>
              ${operateursArray.map(op => `
                <tr>
                  <td>${op.nom}</td>
                  <td>${op.count}</td>
                  <td>${op.pct}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
      
      <div class="modal-codes-section">
        <h4>Machines affectées (Top 5)</h4>
        <div class="table-container">
          <table style="width: 100%;">
            <thead>
              <tr>
                <th>Machine</th>
                <th>Nombre CD</th>
                <th>%</th>
              </tr>
            </thead>
            <tbody>
              ${machinesArray.map(machine => `
                <tr>
                  <td>${machine.nom}</td>
                  <td>${machine.count}</td>
                  <td>${machine.pct}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    
    <div class="modal-footer">
      <button class="btn btn--secondary" onclick="fermerModal('modalDetailsCD')">Fermer</button>
    </div>
  `;
  
  document.getElementById('detailsCDContainer').innerHTML = content;
  ouvrirModal('modalDetailsCD');
  
  document.getElementById('modalDetailsCD').onclick = function(e) {
    if (e.target === this) {
      fermerModal('modalDetailsCD');
    }
  };
}

function afficherDetailsCQModal(cqId) {
  const cdActifs = dbData.cd.filter(cd => !cd.cache && cd.codeCQ === cqId);
  const cqCode = dbData.codesCQ.find(c => c.id === cqId);
  
  if (!cqCode) return;
  
  const totalCDWithCQ = dbData.cd.filter(cd => !cd.cache && cd.codeCQ).length;
  const pctOfCQ = totalCDWithCQ > 0 ? Math.round((cdActifs.length / totalCDWithCQ) * 100) : 0;
  
  // Machines affectées
  const machines = {};
  cdActifs.forEach(cd => {
    if (!machines[cd.numMachine]) machines[cd.numMachine] = 0;
    machines[cd.numMachine]++;
  });
  const machinesArray = Object.entries(machines)
    .map(([machineId, count]) => {
      const machine = dbData.machines.find(m => m.id === machineId);
      return { nom: machine ? machine.numero : 'N/A', count: count, pct: Math.round((count / cdActifs.length) * 100) };
    })
    .sort((a, b) => b.count - a.count);
  
  // Opérateurs affectés
  const operateurs = {};
  cdActifs.forEach(cd => {
    [cd.conf1, cd.conf2].forEach(opId => {
      if (!operateurs[opId]) operateurs[opId] = 0;
      operateurs[opId]++;
    });
  });
  const operateursArray = Object.entries(operateurs)
    .map(([opId, count]) => {
      const op = dbData.operateurs.find(o => o.id === opId);
      return { nom: op ? op.nom : 'N/A', count: count, pct: Math.round((count / cdActifs.length) * 100) };
    })
    .sort((a, b) => b.count - a.count);
  
  // Retours Archi associés
  const retourArchi = {};
  cdActifs.forEach(cd => {
    const niveau = cd.qualite === '1' ? 'NIV 1' : (cd.qualite === '2' ? 'NIV 2' : (cd.qualite === '2_cc' ? 'NIV 2 CC' : 'NIV 3'));
    if (!retourArchi[niveau]) retourArchi[niveau] = 0;
    retourArchi[niveau]++;
  });
  const retourArchiArray = Object.entries(retourArchi)
    .map(([niveau, count]) => ({ niveau, count, pct: Math.round((count / cdActifs.length) * 100) }))
    .sort((a, b) => b.count - a.count);
  
  // Derniers 10 CD
  const derniersCD = cdActifs.slice(-10).reverse();
  
  const content = `
    <div class="modal-header">
      <div class="modal-details-title-section">
        <div class="modal-details-title">
          <h3>Détails CQ : ${cqCode.code}</h3>
          <p style="font-size: var(--font-size-base); color: var(--color-text-secondary); margin-top: var(--space-4);">${cqCode.description}</p>
        </div>
        <button class="modal-close-btn" onclick="fermerModal('modalDetailsCD')">&times;</button>
      </div>
    </div>
    
    <div class="modal-content-scrollable">
      <div class="modal-performance-section">
        <h4>Vue d'ensemble</h4>
        <div class="modal-performance-grid">
          <div class="modal-performance-item">
            <div class="modal-performance-label">Nombre de CD avec ce CQ</div>
            <div class="modal-performance-value">${cdActifs.length}</div>
          </div>
          <div class="modal-performance-item">
            <div class="modal-performance-label">% des CD ayant un CQ</div>
            <div class="modal-performance-value">${pctOfCQ}%</div>
          </div>
        </div>
      </div>
      
      <div class="modal-codes-section">
        <h4>Machines affectées</h4>
        <div class="table-container">
          <table style="width: 100%;">
            <thead>
              <tr>
                <th>Machine</th>
                <th>Nombre</th>
                <th>%</th>
              </tr>
            </thead>
            <tbody>
              ${machinesArray.map(machine => `
                <tr>
                  <td>${machine.nom}</td>
                  <td>${machine.count}</td>
                  <td>${machine.pct}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
      
      <div class="modal-codes-section">
        <h4>Opérateurs affectés</h4>
        <div class="table-container">
          <table style="width: 100%;">
            <thead>
              <tr>
                <th>Opérateur</th>
                <th>Nombre</th>
                <th>%</th>
              </tr>
            </thead>
            <tbody>
              ${operateursArray.map(op => `
                <tr>
                  <td>${op.nom}</td>
                  <td>${op.count}</td>
                  <td>${op.pct}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
      
      <div class="modal-codes-section">
        <h4>Codes Retour Archi les plus fréquents</h4>
        <div class="table-container">
          <table style="width: 100%;">
            <thead>
              <tr>
                <th>NIV</th>
                <th>Nombre</th>
                <th>%</th>
              </tr>
            </thead>
            <tbody>
              ${retourArchiArray.map(ra => `
                <tr>
                  <td>${ra.niveau}</td>
                  <td>${ra.count}</td>
                  <td>${ra.pct}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
      
      <div class="modal-codes-section">
        <h4>Derniers 10 CD avec ce CQ</h4>
        <div class="table-container">
          <table style="width: 100%;">
            <thead>
              <tr>
                <th>Date</th>
                <th>Machine</th>
                <th>Opérateurs</th>
                <th>Retour Archi</th>
              </tr>
            </thead>
            <tbody>
              ${derniersCD.map(cd => {
                const machine = dbData.machines.find(m => m.id === cd.numMachine);
                const op1 = dbData.operateurs.find(o => o.id === cd.conf1);
                const op2 = dbData.operateurs.find(o => o.id === cd.conf2);
                const qualiteLabel = cd.qualite === '1' ? 'NIV 1' : (cd.qualite === '2' ? 'NIV 2' : (cd.qualite === '2_cc' ? 'NIV 2 CC' : 'NIV 3'));
                return `
                  <tr>
                    <td>${cd.date}</td>
                    <td>${machine ? machine.numero : 'N/A'}</td>
                    <td>${op1 ? op1.nom : 'N/A'} / ${op2 ? op2.nom : 'N/A'}</td>
                    <td>${qualiteLabel}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    
    <div class="modal-footer">
      <button class="btn btn--secondary" onclick="fermerModal('modalDetailsCD')">Fermer</button>
    </div>
  `;
  
  document.getElementById('detailsCDContainer').innerHTML = content;
  ouvrirModal('modalDetailsCD');
  
  document.getElementById('modalDetailsCD').onclick = function(e) {
    if (e.target === this) {
      fermerModal('modalDetailsCD');
    }
  };
}

function afficherDetailsRetourArchi(niveau) {
  const cdActifs = dbData.cd.filter(cd => !cd.cache);
  const qualiteKey = niveau === 'NIV 1' ? '1' : (niveau === 'NIV 2' ? '2' : (niveau === 'NIV 2 CC' ? '2_cc' : '3'));
  const cdFiltered = cdActifs.filter(cd => cd.qualite === qualiteKey);
  
  // Codes associés
  const codes = {};
  cdFiltered.forEach(cd => {
    if (cd.codeQualite) {
      const codeObj = dbData.codesQualite.find(c => c.id === cd.codeQualite);
      if (codeObj) {
        if (!codes[codeObj.code]) {
          codes[codeObj.code] = { description: codeObj.description, count: 0 };
        }
        codes[codeObj.code].count++;
      }
    }
  });
  const codesArray = Object.entries(codes).sort((a, b) => b[1].count - a[1].count);
  
  // Opérateurs affectés
  const operateurs = {};
  cdFiltered.forEach(cd => {
    [cd.conf1, cd.conf2].forEach(opId => {
      if (!operateurs[opId]) operateurs[opId] = 0;
      operateurs[opId]++;
    });
  });
  const operateursArray = Object.entries(operateurs)
    .map(([opId, count]) => {
      const op = dbData.operateurs.find(o => o.id === opId);
      return { nom: op ? op.nom : 'N/A', count: count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  
  // Machines affectées
  const machines = {};
  cdFiltered.forEach(cd => {
    if (!machines[cd.numMachine]) machines[cd.numMachine] = 0;
    machines[cd.numMachine]++;
  });
  const machinesArray = Object.entries(machines)
    .map(([machineId, count]) => {
      const machine = dbData.machines.find(m => m.id === machineId);
      return { nom: machine ? `${machine.numero} (${machine.type})` : 'N/A', count: count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  
  const html = `
    <div class="quality-detail-modal">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-16);">
        <h4>Détails : ${niveau}</h4>
        <button class="btn btn--small btn--secondary" onclick="document.getElementById('qualiteDetailSection').innerHTML = ''">
          Fermer
        </button>
      </div>
      
      <div class="quality-detail-grid">
        <div class="quality-detail-section">
          <h5>Nombre de CD</h5>
          <p style="font-size: var(--font-size-2xl); font-weight: var(--font-weight-bold); color: var(--michelin-blue);">${cdFiltered.length}</p>
        </div>
        
        ${codesArray.length > 0 ? `
          <div class="quality-detail-section">
            <h5>Codes associés (Top 5)</h5>
            <table style="width: 100%; font-size: var(--font-size-sm);">
              <tbody>
                ${codesArray.slice(0, 5).map(([code, data]) => `
                  <tr>
                    <td><strong>${code}</strong></td>
                    <td style="text-align: right;">${data.count}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}
        
        <div class="quality-detail-section">
          <h5>Opérateurs les plus affectés</h5>
          <table style="width: 100%; font-size: var(--font-size-sm);">
            <tbody>
              ${operateursArray.map(op => `
                <tr>
                  <td>${op.nom}</td>
                  <td style="text-align: right;"><strong>${op.count}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        
        <div class="quality-detail-section">
          <h5>Machines les plus affectées</h5>
          <table style="width: 100%; font-size: var(--font-size-sm);">
            <tbody>
              ${machinesArray.map(machine => `
                <tr>
                  <td>${machine.nom}</td>
                  <td style="text-align: right;"><strong>${machine.count}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
      
      ${codesArray.length > 0 ? `
        <div style="margin-top: var(--space-20);">
          <h5 style="margin-bottom: var(--space-12);">Description des codes</h5>
          ${codesArray.slice(0, 5).map(([code, data]) => `
            <p style="font-size: var(--font-size-sm); margin-bottom: var(--space-8);">
              <strong>${code}:</strong> ${data.description} (${data.count} occurrences)
            </p>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `;
  
  document.getElementById('qualiteDetailSection').innerHTML = html;
}

function afficherDetailsCQ(cqId) {
  const cdActifs = dbData.cd.filter(cd => !cd.cache && cd.codeCQ === cqId);
  const cqCode = dbData.codesCQ.find(c => c.id === cqId);
  
  if (!cqCode) return;
  
  // Machines affectées
  const machines = {};
  cdActifs.forEach(cd => {
    if (!machines[cd.numMachine]) machines[cd.numMachine] = 0;
    machines[cd.numMachine]++;
  });
  const machinesArray = Object.entries(machines)
    .map(([machineId, count]) => {
      const machine = dbData.machines.find(m => m.id === machineId);
      return { nom: machine ? `${machine.numero} (${machine.type})` : 'N/A', count: count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  
  // Opérateurs affectés
  const operateurs = {};
  cdActifs.forEach(cd => {
    [cd.conf1, cd.conf2].forEach(opId => {
      if (!operateurs[opId]) operateurs[opId] = 0;
      operateurs[opId]++;
    });
  });
  const operateursArray = Object.entries(operateurs)
    .map(([opId, count]) => {
      const op = dbData.operateurs.find(o => o.id === opId);
      return { nom: op ? op.nom : 'N/A', count: count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  
  // Retours Archi associés
  const retourArchi = {};
  cdActifs.forEach(cd => {
    const niveau = cd.qualite === '1' ? 'NIV 1' : (cd.qualite === '2' ? 'NIV 2' : (cd.qualite === '2_cc' ? 'NIV 2 CC' : 'NIV 3'));
    if (!retourArchi[niveau]) retourArchi[niveau] = 0;
    retourArchi[niveau]++;
  });
  const retourArchiArray = Object.entries(retourArchi).sort((a, b) => b[1] - a[1]);
  
  // Derniers CD
  const derniersCD = cdActifs.slice(-10).reverse();
  
  const html = `
    <div class="quality-detail-modal">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-16);">
        <div>
          <h4>Détails CQ : ${cqCode.code}</h4>
          <p style="font-size: var(--font-size-sm); color: var(--color-text-secondary); margin-top: var(--space-4);">${cqCode.description}</p>
        </div>
        <button class="btn btn--small btn--secondary" onclick="document.getElementById('qualiteDetailSection').innerHTML = ''">
          Fermer
        </button>
      </div>
      
      <div class="quality-detail-grid">
        <div class="quality-detail-section">
          <h5>Nombre de CD avec ce CQ</h5>
          <p style="font-size: var(--font-size-2xl); font-weight: var(--font-weight-bold); color: var(--michelin-blue);">${cdActifs.length}</p>
        </div>
        
        <div class="quality-detail-section">
          <h5>Machines affectées (Top 5)</h5>
          <table style="width: 100%; font-size: var(--font-size-sm);">
            <tbody>
              ${machinesArray.map(machine => `
                <tr>
                  <td>${machine.nom}</td>
                  <td style="text-align: right;"><strong>${machine.count}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        
        <div class="quality-detail-section">
          <h5>Opérateurs affectés (Top 5)</h5>
          <table style="width: 100%; font-size: var(--font-size-sm);">
            <tbody>
              ${operateursArray.map(op => `
                <tr>
                  <td>${op.nom}</td>
                  <td style="text-align: right;"><strong>${op.count}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        
        <div class="quality-detail-section">
          <h5>Retours Archi associés</h5>
          <table style="width: 100%; font-size: var(--font-size-sm);">
            <tbody>
              ${retourArchiArray.map(([niveau, count]) => `
                <tr>
                  <td>${niveau}</td>
                  <td style="text-align: right;"><strong>${count}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
      
      <div style="margin-top: var(--space-20);">
        <h5 style="margin-bottom: var(--space-12);">Historique récent (10 derniers CD)</h5>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Machine</th>
                <th>CAI</th>
                <th>Opérateurs</th>
                <th>Retour Archi</th>
                <th>D1 Réel</th>
              </tr>
            </thead>
            <tbody>
              ${derniersCD.map(cd => {
                const machine = dbData.machines.find(m => m.id === cd.numMachine);
                const op1 = dbData.operateurs.find(o => o.id === cd.conf1);
                const op2 = dbData.operateurs.find(o => o.id === cd.conf2);
                const qualiteLabel = cd.qualite === '1' ? 'NIV 1' : (cd.qualite === '2' ? 'NIV 2' : (cd.qualite === '2_cc' ? 'NIV 2 CC' : 'NIV 3'));
                return `
                  <tr>
                    <td>${cd.date}</td>
                    <td>${machine ? machine.numero : 'N/A'}</td>
                    <td>${cd.cai}</td>
                    <td>${op1 ? op1.nom : 'N/A'} / ${op2 ? op2.nom : 'N/A'}</td>
                    <td>${qualiteLabel}</td>
                    <td>${cd.d1Reel}h</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
  
  document.getElementById('qualiteDetailSection').innerHTML = html;
}
// === ANALYSE ===
function afficherAnalyse() {
  afficherAnalyseIncidents();
  afficherAnalyseCQ();
  afficherAnalyseRetourArchi();
}

function afficherAnalyseIncidents() {
  const cdActifs = getFilteredCD({ excludeCached: true });
  const cdAvecIncident = cdActifs.filter(cd => cd.incident === 'Oui');
  
  if (cdAvecIncident.length === 0) {
    document.getElementById('analyseIncidentsContent').innerHTML = '<div class="empty-state"><p>Aucun incident enregistré</p></div>';
    return;
  }

  // Statistiques globales
  const nbIncidents = cdAvecIncident.length;
  const tauxIncidents = ((nbIncidents / cdActifs.length) * 100).toFixed(1);
  
  // Calcul temps d'impact total
  let tempsImpactTotal = 0;
  cdAvecIncident.forEach(cd => {
    if (cd.tempsImpact) {
      // Ancien système : temps global
      tempsImpactTotal += cd.tempsImpact;
    } else if (cd.tempsImpactIncident) {
      // Nouveau système : temps individuels par incident
      // Additionner tous les temps individuels
      Object.values(cd.tempsImpactIncident).forEach(temps => {
        if (typeof temps === 'number') {
          tempsImpactTotal += temps;
        }
      });
    }
  });
  
  const tempsImpactMoyen = nbIncidents > 0 ? (tempsImpactTotal / nbIncidents).toFixed(1) : 0;

  // Analyse par code incident
  const incidentsParCode = {};
  cdAvecIncident.forEach(cd => {
    // Gérer causes multiples
    if (cd.codesIncident && Array.isArray(cd.codesIncident)) {
      cd.codesIncident.forEach(codeId => {
        if (!incidentsParCode[codeId]) {
          incidentsParCode[codeId] = { count: 0, cds: [], tempsImpact: 0 };
        }
        incidentsParCode[codeId].count++;
        incidentsParCode[codeId].cds.push(cd);
      });
    } else if (cd.codeIncident) {
      // Ancien système
      if (!incidentsParCode[cd.codeIncident]) {
        incidentsParCode[cd.codeIncident] = { count: 0, cds: [], tempsImpact: 0 };
      }
      incidentsParCode[cd.codeIncident].count++;
      incidentsParCode[cd.codeIncident].cds.push(cd);
    }
    
    // Temps d'impact par code incident
    if (cd.codesIncident && Array.isArray(cd.codesIncident)) {
      // Nouveau système : temps individuels par incident
      cd.codesIncident.forEach(codeId => {
        if (incidentsParCode[codeId]) {
          const tempsIndividuel = (cd.tempsImpactIncident && cd.tempsImpactIncident[codeId]) || 0;
          incidentsParCode[codeId].tempsImpact += tempsIndividuel;
        }
      });
    } else if (cd.codeIncident && incidentsParCode[cd.codeIncident]) {
      // Ancien système : temps global
      const impact = cd.tempsImpact || 0;
      incidentsParCode[cd.codeIncident].tempsImpact += impact;
    }
  });

  // Top incidents
  const topIncidents = Object.entries(incidentsParCode)
    .map(([codeId, data]) => {
      const code = dbData.codesIncident.find(c => c.id === codeId);
      return {
        code: code ? code.code : 'N/A',
        description: code ? code.description : 'N/A',
        count: data.count,
        tempsImpact: data.tempsImpact,
        pct: ((data.count / nbIncidents) * 100).toFixed(1)
      };
    })
    .sort((a, b) => b.count - a.count);

  // Analyse par machine
  const incidentsParMachine = {};
  cdAvecIncident.forEach(cd => {
    if (!incidentsParMachine[cd.numMachine]) {
      incidentsParMachine[cd.numMachine] = 0;
    }
    incidentsParMachine[cd.numMachine]++;
  });

  const topMachines = Object.entries(incidentsParMachine)
    .map(([machineId, count]) => {
      const machine = dbData.machines.find(m => m.id === machineId);
      return {
        machine: machine ? machine.numero : 'N/A',
        type: machine ? machine.type : 'N/A',
        count: count
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // HTML
  let html = `
    <div class="stats-overview" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-16); margin-bottom: var(--space-24);">
      <div class="stat-card" style="background: linear-gradient(135deg, #D32F2F 0%, #B71C1C 100%); color: white;">
        <h4 style="color: white;">Total Incidents</h4>
        <div class="value" style="color: white;">${nbIncidents}</div>
      </div>
      <div class="stat-card" style="background: linear-gradient(135deg, #F57C00 0%, #E65100 100%); color: white;">
        <h4 style="color: white;">Taux d'Incidents</h4>
        <div class="value" style="color: white;">${tauxIncidents}<span class="unit">%</span></div>
      </div>
      <div class="stat-card" style="background: linear-gradient(135deg, #7B1FA2 0%, #4A148C 100%); color: white;">
        <h4 style="color: white;">Temps Impact Total</h4>
        <div class="value" style="color: white;">${tempsImpactTotal}<span class="unit">min</span></div>
      </div>
      <div class="stat-card" style="background: linear-gradient(135deg, #1976D2 0%, #0D47A1 100%); color: white;">
        <h4 style="color: white;">Temps Impact Moyen</h4>
        <div class="value" style="color: white;">${tempsImpactMoyen}<span class="unit">min</span></div>
      </div>
    </div>

    <div class="section-content" style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-24);">
      <div>
        <h4 style="margin-bottom: var(--space-16);">Top Codes Incidents</h4>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Description</th>
                <th>Occurrences</th>
                <th>Impact (min)</th>
                <th>%</th>
              </tr>
            </thead>
            <tbody>
              ${topIncidents.map(inc => `
                <tr>
                  <td><strong>${inc.code}</strong></td>
                  <td>${inc.description}</td>
                  <td>${inc.count}</td>
                  <td>${inc.tempsImpact}</td>
                  <td>${inc.pct}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h4 style="margin-bottom: var(--space-16);">Top 10 Machines avec Incidents</h4>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Machine</th>
                <th>Type</th>
                <th>Nb Incidents</th>
              </tr>
            </thead>
            <tbody>
              ${topMachines.map(m => `
                <tr>
                  <td><strong>${m.machine}</strong></td>
                  <td>${m.type}</td>
                  <td>${m.count}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  document.getElementById('analyseIncidentsContent').innerHTML = html;
}

function afficherAnalyseCQ() {
  const cdActifs = getFilteredCD({ excludeCached: true });
  const cdAvecCQ = cdActifs.filter(cd => cd.cqApres === 'Oui');
  
  if (cdAvecCQ.length === 0) {
    document.getElementById('analyseCQContent').innerHTML = '<div class="empty-state"><p>Aucun CQ après CD enregistré</p></div>';
    return;
  }

  const nbCQ = cdAvecCQ.length;
  const tauxCQ = ((nbCQ / cdActifs.length) * 100).toFixed(1);
  
  // Performance moyenne des CD avec CQ
  const perfMoyenne = (cdAvecCQ.reduce((sum, cd) => sum + cd.performance, 0) / nbCQ).toFixed(1);
  
  // Analyse par code CQ
  const cqParCode = {};
  cdAvecCQ.forEach(cd => {
    // Gérer causes multiples
    if (cd.codesCQ && Array.isArray(cd.codesCQ)) {
      cd.codesCQ.forEach(codeId => {
        if (!cqParCode[codeId]) {
          cqParCode[codeId] = { count: 0, cds: [] };
        }
        cqParCode[codeId].count++;
        cqParCode[codeId].cds.push(cd);
      });
    } else if (cd.codeCQ) {
      // Ancien système
      if (!cqParCode[cd.codeCQ]) {
        cqParCode[cd.codeCQ] = { count: 0, cds: [] };
      }
      cqParCode[cd.codeCQ].count++;
      cqParCode[cd.codeCQ].cds.push(cd);
    }
  });

  const topCQ = Object.entries(cqParCode)
    .map(([codeId, data]) => {
      const code = dbData.codesCQ.find(c => c.id === codeId);
      return {
        code: code ? code.code : 'N/A',
        description: code ? code.description : 'N/A',
        count: data.count,
        pct: ((data.count / nbCQ) * 100).toFixed(1)
      };
    })
    .sort((a, b) => b.count - a.count);

  // Analyse par machine
  const cqParMachine = {};
  cdAvecCQ.forEach(cd => {
    if (!cqParMachine[cd.numMachine]) {
      cqParMachine[cd.numMachine] = 0;
    }
    cqParMachine[cd.numMachine]++;
  });

  const topMachinesCQ = Object.entries(cqParMachine)
    .map(([machineId, count]) => {
      const machine = dbData.machines.find(m => m.id === machineId);
      return {
        machine: machine ? machine.numero : 'N/A',
        type: machine ? machine.type : 'N/A',
        count: count
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  let html = `
    <div class="stats-overview" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-16); margin-bottom: var(--space-24);">
      <div class="stat-card" style="background: linear-gradient(135deg, #EF6C00 0%, #E65100 100%); color: white;">
        <h4 style="color: white;">Total CQ</h4>
        <div class="value" style="color: white;">${nbCQ}</div>
      </div>
      <div class="stat-card" style="background: linear-gradient(135deg, #F57C00 0%, #EF6C00 100%); color: white;">
        <h4 style="color: white;">Taux de CQ</h4>
        <div class="value" style="color: white;">${tauxCQ}<span class="unit">%</span></div>
      </div>
      <div class="stat-card" style="background: linear-gradient(135deg, #FFA726 0%, #FB8C00 100%); color: white;">
        <h4 style="color: white;">Performance Moyenne</h4>
        <div class="value" style="color: white;">${perfMoyenne}<span class="unit">%</span></div>
      </div>
    </div>

    <div class="section-content" style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-24);">
      <div>
        <h4 style="margin-bottom: var(--space-16);">Top Codes CQ</h4>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Description</th>
                <th>Occurrences</th>
                <th>%</th>
              </tr>
            </thead>
            <tbody>
              ${topCQ.map(cq => `
                <tr>
                  <td><strong>${cq.code}</strong></td>
                  <td>${cq.description}</td>
                  <td>${cq.count}</td>
                  <td>${cq.pct}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h4 style="margin-bottom: var(--space-16);">Top 10 Machines avec CQ</h4>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Machine</th>
                <th>Type</th>
                <th>Nb CQ</th>
              </tr>
            </thead>
            <tbody>
              ${topMachinesCQ.map(m => `
                <tr>
                  <td><strong>${m.machine}</strong></td>
                  <td>${m.type}</td>
                  <td>${m.count}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  document.getElementById('analyseCQContent').innerHTML = html;
}

function afficherAnalyseRetourArchi() {
  const cdActifs = getFilteredCD({ excludeCached: true });
  const cdNonNiv1 = cdActifs.filter(cd => cd.qualite !== '1');
  
  if (cdNonNiv1.length === 0) {
    document.getElementById('analyseRetourArchiContent').innerHTML = '<div class="empty-state"><p>Tous les CD sont en NIV 1 🎉</p></div>';
    return;
  }

  // Répartition par niveau
  const niv2 = cdActifs.filter(cd => cd.qualite === '2').length;
  const niv2CC = cdActifs.filter(cd => cd.qualite === '2_cc').length;
  const niv3 = cdActifs.filter(cd => cd.qualite === '3').length;
  
  const tauxNiv2 = ((niv2 / cdActifs.length) * 100).toFixed(1);
  const tauxNiv2CC = ((niv2CC / cdActifs.length) * 100).toFixed(1);
  const tauxNiv3 = ((niv3 / cdActifs.length) * 100).toFixed(1);

  // Performance moyenne par niveau
  const perfNiv2 = niv2 > 0 ? (cdActifs.filter(cd => cd.qualite === '2').reduce((sum, cd) => sum + cd.performance, 0) / niv2).toFixed(1) : 0;
  const perfNiv2CC = niv2CC > 0 ? (cdActifs.filter(cd => cd.qualite === '2_cc').reduce((sum, cd) => sum + cd.performance, 0) / niv2CC).toFixed(1) : 0;
  const perfNiv3 = niv3 > 0 ? (cdActifs.filter(cd => cd.qualite === '3').reduce((sum, cd) => sum + cd.performance, 0) / niv3).toFixed(1) : 0;

  // Analyse par code retour archi
  const codesParType = {};
  cdNonNiv1.forEach(cd => {
    // Gérer causes multiples
    if (cd.codesQualite && Array.isArray(cd.codesQualite)) {
      cd.codesQualite.forEach(codeId => {
        if (!codesParType[codeId]) {
          codesParType[codeId] = { count: 0, cds: [] };
        }
        codesParType[codeId].count++;
        codesParType[codeId].cds.push(cd);
      });
    } else if (cd.codeQualite) {
      // Ancien système
      if (!codesParType[cd.codeQualite]) {
        codesParType[cd.codeQualite] = { count: 0, cds: [] };
      }
      codesParType[cd.codeQualite].count++;
      codesParType[cd.codeQualite].cds.push(cd);
    }
  });

  const topCodes = Object.entries(codesParType)
    .map(([codeId, data]) => {
      const code = dbData.codesQualite.find(c => c.id === codeId);
      return {
        code: code ? code.code : 'N/A',
        description: code ? code.description : 'N/A',
        count: data.count,
        pct: ((data.count / cdNonNiv1.length) * 100).toFixed(1)
      };
    })
    .sort((a, b) => b.count - a.count);

  let html = `
    <div class="stats-overview" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: var(--space-16); margin-bottom: var(--space-24);">
      <div class="stat-card" style="background: linear-gradient(135deg, #FBC02D 0%, #F9A825 100%); color: white;">
        <h4 style="color: white;">NIV 2</h4>
        <div class="value" style="color: white;">${niv2} <span class="unit">(${tauxNiv2}%)</span></div>
        <div style="font-size: 14px; margin-top: 8px;">Perf: ${perfNiv2}%</div>
      </div>
      <div class="stat-card" style="background: linear-gradient(135deg, #FB8C00 0%, #F57C00 100%); color: white;">
        <h4 style="color: white;">NIV 2 CC</h4>
        <div class="value" style="color: white;">${niv2CC} <span class="unit">(${tauxNiv2CC}%)</span></div>
        <div style="font-size: 14px; margin-top: 8px;">Perf: ${perfNiv2CC}%</div>
      </div>
      <div class="stat-card" style="background: linear-gradient(135deg, #E53935 0%, #C62828 100%); color: white;">
        <h4 style="color: white;">NIV 3</h4>
        <div class="value" style="color: white;">${niv3} <span class="unit">(${tauxNiv3}%)</span></div>
        <div style="font-size: 14px; margin-top: 8px;">Perf: ${perfNiv3}%</div>
      </div>
    </div>

    <div class="section-content">
      <h4 style="margin-bottom: var(--space-16);">Top Codes Retour Archi</h4>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Description</th>
              <th>Occurrences</th>
              <th>%</th>
            </tr>
          </thead>
          <tbody>
            ${topCodes.map(code => `
              <tr>
                <td><strong>${code.code}</strong></td>
                <td>${code.description}</td>
                <td>${code.count}</td>
                <td>${code.pct}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById('analyseRetourArchiContent').innerHTML = html;
}
