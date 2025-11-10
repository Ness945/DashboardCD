// === SYSTÈME DE TAGS ===

function initialiserTags() {
  if (!dbData.tags || dbData.tags.length === 0) {
    dbData.tags = [
      { id: 'tag_formation', nom: 'Formation', couleur: '#2196F3' },
      { id: 'tag_nouveau_produit', nom: 'Nouveau Produit', couleur: '#9C27B0' },
      { id: 'tag_probleme_resolu', nom: 'Problème Résolu', couleur: '#4CAF50' },
      { id: 'tag_urgent', nom: 'Urgent', couleur: '#F44336' },
      { id: 'tag_a_revoir', nom: 'À Revoir', couleur: '#FF9800' }
    ];
  }
}

function ajouterTag() {
  const nom = document.getElementById('newTagNom').value.trim();
  const couleur = document.getElementById('newTagCouleur').value;

  if (!nom) {
    alert('Veuillez saisir un nom pour le tag');
    return;
  }

  const newTag = {
    id: 'tag_' + Date.now(),
    nom: nom,
    couleur: couleur
  };

  dbData.tags.push(newTag);
  document.getElementById('newTagNom').value = '';
  afficherListeTags();
  rafraichirSelecteursTags();

  // Rafraîchir aussi le formulaire de saisie CD
  if (typeof afficherTagsFormCD !== 'undefined') {
    afficherTagsFormCD();
  }

  if (typeof storageManager !== 'undefined') {
    storageManager.markAsModified();
  }

  showToast(`✅ Tag "${nom}" ajouté avec succès !`);
}

function supprimerTag(tagId) {
  if (!confirm('Supprimer ce tag ?')) return;

  dbData.tags = dbData.tags.filter(t => t.id !== tagId);

  // Retirer ce tag de tous les CD
  dbData.cd.forEach(cd => {
    if (cd.tags && cd.tags.includes(tagId)) {
      cd.tags = cd.tags.filter(t => t !== tagId);
    }
  });

  afficherListeTags();
  rafraichirSelecteursTags();
  afficherHistorique();

  // Rafraîchir aussi le formulaire de saisie CD
  if (typeof afficherTagsFormCD !== 'undefined') {
    afficherTagsFormCD();
  }

  if (typeof storageManager !== 'undefined') {
    storageManager.markAsModified();
  }

  showToast('✅ Tag supprimé');
}

function afficherListeTags() {
  const tbody = document.getElementById('tableTagsList');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (!dbData.tags || dbData.tags.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" class="empty-state">Aucun tag créé</td></tr>';
    return;
  }

  dbData.tags.forEach(tag => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <span class="tag-badge" style="background-color: ${tag.couleur}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold;">
          ${tag.nom}
        </span>
      </td>
      <td>
        <input type="color" value="${tag.couleur}" onchange="modifierCouleurTag('${tag.id}', this.value)" style="cursor: pointer; border: none; width: 40px; height: 30px;">
      </td>
      <td>
        <button class="btn btn--small btn--danger" onclick="supprimerTag('${tag.id}')">Supprimer</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function modifierCouleurTag(tagId, nouvelleCouleur) {
  const tag = dbData.tags.find(t => t.id === tagId);
  if (tag) {
    tag.couleur = nouvelleCouleur;
    afficherListeTags();
    rafraichirSelecteursTags();
    afficherHistorique();

    // Rafraîchir aussi le formulaire de saisie CD
    if (typeof afficherTagsFormCD !== 'undefined') {
      afficherTagsFormCD();
    }

    if (typeof storageManager !== 'undefined') {
      storageManager.markAsModified();
    }
  }
}

function rafraichirSelecteursTags() {
  // Rafraîchir le sélecteur de tags dans les filtres rapides
  const container = document.getElementById('quickTagsFilter');
  if (container) {
    container.innerHTML = '';

    if (dbData.tags && dbData.tags.length > 0) {
      dbData.tags.forEach(tag => {
        const btn = document.createElement('button');
        btn.className = 'tag-filter-btn';
        btn.style.backgroundColor = advancedFilters.selectedTags.includes(tag.id) ? tag.couleur : '#f0f0f0';
        btn.style.color = advancedFilters.selectedTags.includes(tag.id) ? 'white' : '#333';
        btn.textContent = tag.nom;
        btn.onclick = () => toggleTagFilter(tag.id);
        container.appendChild(btn);
      });
    }
  }
}

function toggleTagFilter(tagId) {
  const index = advancedFilters.selectedTags.indexOf(tagId);
  if (index > -1) {
    advancedFilters.selectedTags.splice(index, 1);
  } else {
    advancedFilters.selectedTags.push(tagId);
  }

  rafraichirSelecteursTags();
  appliquerFiltresAvances();
}

function ajouterTagAuCD(cdId, tagId) {
  const cd = dbData.cd.find(c => c.id === cdId);
  if (!cd) return;

  if (!cd.tags) cd.tags = [];

  if (!cd.tags.includes(tagId)) {
    cd.tags.push(tagId);
    afficherHistorique();

    if (typeof storageManager !== 'undefined') {
      storageManager.markAsModified();
    }
  }
}

function retirerTagDuCD(cdId, tagId) {
  const cd = dbData.cd.find(c => c.id === cdId);
  if (!cd) return;

  if (cd.tags) {
    cd.tags = cd.tags.filter(t => t !== tagId);
    afficherHistorique();

    if (typeof storageManager !== 'undefined') {
      storageManager.markAsModified();
    }
  }
}

// === RECHERCHE AVANCÉE ===

function rechercheAvancee(query) {
  advancedFilters.searchQuery = query.toLowerCase();
  appliquerFiltresAvances();
}

function matchRecherche(cd, query) {
  if (!query) return true;

  const searchFields = [
    cd.cai,
    cd.dimension,
    cd.date,
    cd.typeProd
  ];

  // Ajouter les noms d'opérateurs
  const op1 = dbData.operateurs.find(o => o.id === cd.conf1);
  const op2 = dbData.operateurs.find(o => o.id === cd.conf2);
  if (op1) searchFields.push(op1.nom);
  if (op2) searchFields.push(op2.nom);

  // Ajouter le numéro de machine
  const machine = dbData.machines.find(m => m.id === cd.numMachine);
  if (machine) searchFields.push(machine.numero);

  return searchFields.some(field =>
    field && field.toString().toLowerCase().includes(query)
  );
}

// === FILTRES RAPIDES ===

function toggleQuickFilter(filterName) {
  advancedFilters.quickFilters[filterName] = !advancedFilters.quickFilters[filterName];

  // Mettre à jour l'apparence du bouton
  const btn = document.getElementById(`filter-${filterName}`);
  if (btn) {
    if (advancedFilters.quickFilters[filterName]) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  }

  appliquerFiltresAvances();
}

function matchFiltresRapides(cd) {
  const filters = advancedFilters.quickFilters;

  // Filtre: Anomalies uniquement
  if (filters.anomaliesOnly && !cd.anomalie) {
    return false;
  }

  // Filtre: CQ cette semaine
  if (filters.cqThisWeek) {
    if (cd.cqApres !== 'Oui') return false;

    const cdDate = new Date(cd.date);
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    if (cdDate < weekAgo) return false;
  }

  // Filtre: Performance < 80%
  if (filters.lowPerformance && cd.performance >= 80) {
    return false;
  }

  return true;
}

function matchTags(cd) {
  if (advancedFilters.selectedTags.length === 0) return true;

  if (!cd.tags || cd.tags.length === 0) return false;

  // Le CD doit avoir au moins un des tags sélectionnés
  return advancedFilters.selectedTags.some(tagId => cd.tags.includes(tagId));
}

// === APPLICATION DES FILTRES ===

function appliquerFiltresAvances() {
  const base = getFilteredCD({ excludeCached: false });

  const filtered = base.filter(cd => {
    return matchRecherche(cd, advancedFilters.searchQuery) &&
           matchFiltresRapides(cd) &&
           matchTags(cd);
  });

  afficherHistorique(filtered);

  // Mettre à jour le compteur de résultats
  const counter = document.getElementById('filterResultsCount');
  if (counter) {
    counter.textContent = `${filtered.length} résultat${filtered.length > 1 ? 's' : ''}`;
  }
}

function resetFiltresAvances() {
  advancedFilters.searchQuery = '';
  advancedFilters.quickFilters = {
    anomaliesOnly: false,
    cqThisWeek: false,
    lowPerformance: false
  };
  advancedFilters.selectedTags = [];

  // Réinitialiser l'UI
  document.getElementById('advancedSearch').value = '';

  const quickFilterBtns = document.querySelectorAll('.quick-filter-btn');
  quickFilterBtns.forEach(btn => btn.classList.remove('active'));

  rafraichirSelecteursTags();
  afficherHistorique();

  const counter = document.getElementById('filterResultsCount');
  if (counter) {
    counter.textContent = '';
  }
}

// Initialiser au chargement
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', function() {
    initialiserTags();
    afficherListeTags();
    rafraichirSelecteursTags();
  });
}
