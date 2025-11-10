// === UNDO/REDO SYSTEM ===

class UndoManager {
  constructor() {
    this.undoStack = [];
    this.redoStack = [];
    this.maxStack = 50;
    this.enabled = true;
  }

  // === RECORD ACTION ===
  recordAction(action) {
    if (!this.enabled) return;

    this.undoStack.push(action);
    this.redoStack = []; // Clear redo stack

    // Limiter la taille du stack
    if (this.undoStack.length > this.maxStack) {
      this.undoStack.shift();
    }

    this.updateUI();
  }

  // === UNDO ===
  undo() {
    if (this.undoStack.length === 0) {
      showInfo('Aucune action à annuler', '');
      return false;
    }

    const action = this.undoStack.pop();

    try {
      // Exécuter l'undo
      action.undo();

      // Ajouter à la pile redo
      this.redoStack.push(action);

      showSuccess('Action annulée', action.description);
      this.updateUI();

      // Marquer comme modifié
      storageManager.markAsModified();

      return true;
    } catch (error) {
      console.error('❌ Erreur undo:', error);
      showError('Erreur lors de l\'annulation', error.message);
      return false;
    }
  }

  // === REDO ===
  redo() {
    if (this.redoStack.length === 0) {
      showInfo('Aucune action à refaire', '');
      return false;
    }

    const action = this.redoStack.pop();

    try {
      // Exécuter le redo
      action.redo();

      // Ajouter à la pile undo
      this.undoStack.push(action);

      showSuccess('Action refaite', action.description);
      this.updateUI();

      // Marquer comme modifié
      storageManager.markAsModified();

      return true;
    } catch (error) {
      console.error('❌ Erreur redo:', error);
      showError('Erreur lors du refaire', error.message);
      return false;
    }
  }

  // === CLEAR ===
  clear() {
    this.undoStack = [];
    this.redoStack = [];
    this.updateUI();
  }

  // === UPDATE UI ===
  updateUI() {
    // Mettre à jour les boutons undo/redo si ils existent
    const undoBtn = document.getElementById('undoButton');
    const redoBtn = document.getElementById('redoButton');

    if (undoBtn) {
      undoBtn.disabled = this.undoStack.length === 0;
      undoBtn.title = this.undoStack.length > 0
        ? `Annuler: ${this.undoStack[this.undoStack.length - 1].description}`
        : 'Aucune action à annuler';
    }

    if (redoBtn) {
      redoBtn.disabled = this.redoStack.length === 0;
      redoBtn.title = this.redoStack.length > 0
        ? `Refaire: ${this.redoStack[this.redoStack.length - 1].description}`
        : 'Aucune action à refaire';
    }
  }

  // === CREATE ACTION ===
  createAction(description, undoFn, redoFn) {
    return {
      description: description,
      undo: undoFn,
      redo: redoFn,
      timestamp: new Date()
    };
  }
}

// Instance globale
const undoManager = new UndoManager();

// === WRAPPERS FOR COMMON ACTIONS ===

// Wrapper pour ajout CD
function ajouterCDWithUndo(cd) {
  dbData.cd.push(cd);

  undoManager.recordAction(
    undoManager.createAction(
      `Ajout CD: ${cd.cai}`,
      () => {
        // Undo: supprimer le CD
        dbData.cd = dbData.cd.filter(c => c.id !== cd.id);
        if (typeof afficherHistorique === 'function') afficherHistorique();
      },
      () => {
        // Redo: rajouter le CD
        dbData.cd.push(cd);
        if (typeof afficherHistorique === 'function') afficherHistorique();
      }
    )
  );
}

// Wrapper pour suppression CD
function supprimerCDWithUndo(id) {
  const cd = dbData.cd.find(c => c.id === id);
  if (!cd) return false;

  const index = dbData.cd.indexOf(cd);
  dbData.cd.splice(index, 1);

  undoManager.recordAction(
    undoManager.createAction(
      `Suppression CD: ${cd.cai}`,
      () => {
        // Undo: restaurer le CD
        dbData.cd.splice(index, 0, cd);
        if (typeof afficherHistorique === 'function') afficherHistorique();
      },
      () => {
        // Redo: re-supprimer le CD
        dbData.cd = dbData.cd.filter(c => c.id !== id);
        if (typeof afficherHistorique === 'function') afficherHistorique();
      }
    )
  );

  return true;
}

// Wrapper pour édition CD
function editerCDWithUndo(id, newData) {
  const cd = dbData.cd.find(c => c.id === id);
  if (!cd) return false;

  const oldData = { ...cd };

  Object.assign(cd, newData);

  undoManager.recordAction(
    undoManager.createAction(
      `Édition CD: ${cd.cai}`,
      () => {
        // Undo: restaurer les anciennes données
        Object.assign(cd, oldData);
        if (typeof afficherHistorique === 'function') afficherHistorique();
      },
      () => {
        // Redo: ré-appliquer les nouvelles données
        Object.assign(cd, newData);
        if (typeof afficherHistorique === 'function') afficherHistorique();
      }
    )
  );

  return true;
}

// Wrapper pour ajout opérateur
function ajouterOperateurWithUndo(operateur) {
  dbData.operateurs.push(operateur);

  undoManager.recordAction(
    undoManager.createAction(
      `Ajout opérateur: ${operateur.nom}`,
      () => {
        dbData.operateurs = dbData.operateurs.filter(o => o.id !== operateur.id);
        if (typeof afficherOperateurs === 'function') afficherOperateurs();
      },
      () => {
        dbData.operateurs.push(operateur);
        if (typeof afficherOperateurs === 'function') afficherOperateurs();
      }
    )
  );
}

// Wrapper pour suppression opérateur
function supprimerOperateurWithUndo(id) {
  const operateur = dbData.operateurs.find(o => o.id === id);
  if (!operateur) return false;

  const index = dbData.operateurs.indexOf(operateur);
  dbData.operateurs.splice(index, 1);

  undoManager.recordAction(
    undoManager.createAction(
      `Suppression opérateur: ${operateur.nom}`,
      () => {
        dbData.operateurs.splice(index, 0, operateur);
        if (typeof afficherOperateurs === 'function') afficherOperateurs();
      },
      () => {
        dbData.operateurs = dbData.operateurs.filter(o => o.id !== id);
        if (typeof afficherOperateurs === 'function') afficherOperateurs();
      }
    )
  );

  return true;
}

// Wrapper pour ajout machine
function ajouterMachineWithUndo(machine) {
  dbData.machines.push(machine);

  undoManager.recordAction(
    undoManager.createAction(
      `Ajout machine: ${machine.numero}`,
      () => {
        dbData.machines = dbData.machines.filter(m => m.id !== machine.id);
        if (typeof afficherMachines === 'function') afficherMachines();
      },
      () => {
        dbData.machines.push(machine);
        if (typeof afficherMachines === 'function') afficherMachines();
      }
    )
  );
}

// Wrapper pour suppression machine
function supprimerMachineWithUndo(id) {
  const machine = dbData.machines.find(m => m.id === id);
  if (!machine) return false;

  const index = dbData.machines.indexOf(machine);
  dbData.machines.splice(index, 1);

  undoManager.recordAction(
    undoManager.createAction(
      `Suppression machine: ${machine.numero}`,
      () => {
        dbData.machines.splice(index, 0, machine);
        if (typeof afficherMachines === 'function') afficherMachines();
      },
      () => {
        dbData.machines = dbData.machines.filter(m => m.id !== id);
        if (typeof afficherMachines === 'function') afficherMachines();
      }
    )
  );

  return true;
}

// Créer les boutons Undo/Redo dans l'interface (DÉSACTIVÉ)
document.addEventListener('DOMContentLoaded', () => {
  // Boutons Undo/Redo masqués par demande utilisateur
  // Undo/Redo Manager initialisé
});
