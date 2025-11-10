# RÉFÉRENCES - LIGNE PAR LIGNE DES ÉLÉMENTS À NETTOYER

## 1. FICHIERS À SUPPRIMER

```
/home/user/DashboardCD/insights-tab.html
```

---

## 2. CONSOLE.LOG() PAR FICHIER

### analytics.js
| Ligne | Code | Action |
|-------|------|--------|
| 394 | `console.log('✅ Analytics Engine initialisé');` | SUPPRIMER |

### charts.js
| Ligne | Code | Action |
|-------|------|--------|
| 382 | `console.log('✅ Chart Manager initialisé');` | SUPPRIMER |

### undo-redo.js
| Ligne | Code | Action |
|-------|------|--------|
| 313 | `console.log('✅ Undo/Redo Manager initialisé (boutons masqués)');` | SUPPRIMER |

### ui-enhancements.js
| Ligne | Code | Action |
|-------|------|--------|
| 323 | `console.log('✨ UI Enhancements loaded');` | SUPPRIMER |

### insights-ui.js
| Ligne | Code | Action |
|-------|------|--------|
| 211 | `console.log('✅ Insights UI initialisé');` | SUPPRIMER |

### loading.js
| Ligne | Code | Action |
|-------|------|--------|
| 269 | `console.log('✅ Loading Manager initialisé');` | SUPPRIMER |

### shortcuts.js
| Ligne | Code | Action |
|-------|------|--------|
| 16 | `console.log('⌨️ Shortcuts activés');` | SUPPRIMER |
| 340 | `console.log('🐛 DEBUG INFO:', debugInfo);` | VÉRIFIER (fonction debug?) |

### storage.js
| Ligne | Code | Action |
|-------|------|--------|
| 19 | `console.log('✅ Auto-save démarré (toutes les 30s)');` | SUPPRIMER |
| 26 | `console.log('🛑 Auto-save arrêté');` | SUPPRIMER |
| 76 | `console.log('ℹ️ Aucune donnée sauvegardée trouvée');` | SUPPRIMER |
| 84 | `console.log(\`📦 Chargement des données v${parsed.version}\`);` | SUPPRIMER |
| 296-302 | Bloc de 7 console.log() - "📊 STATS STOCKAGE:" | SUPPRIMER BLOC |
| 319 | `console.log('✅ Storage Manager initialisé');` | SUPPRIMER |

### indexeddb-storage.js
| Ligne | Code | Action |
|-------|------|--------|
| 26 | `console.log('✅ IndexedDB initialisé');` | SUPPRIMER |
| 37 | `console.log('✅ Object store créé');` | SUPPRIMER |
| 76 | `console.log('💾 Sauvegarde IndexedDB réussie');` | SUPPRIMER |
| 127 | `console.log('✅ Données chargées depuis IndexedDB');` | SUPPRIMER |
| 130 | `console.log('ℹ️ Aucune donnée trouvée dans IndexedDB');` | SUPPRIMER |
| 187 | `console.log(\`🔄 Migration de ${migrationCount} CD...\`);` | SUPPRIMER |
| 194 | `console.log('🔄 Tentative de migration depuis localStorage...');` | SUPPRIMER |
| 199 | `console.log('ℹ️ Aucune donnée localStorage à migrer');` | SUPPRIMER |
| 214 | `console.log('✅ Migration localStorage → IndexedDB réussie');` | SUPPRIMER |
| 239 | `console.log('✅ Auto-save IndexedDB démarré (toutes les 30s)');` | SUPPRIMER |
| 246 | `console.log('🛑 Auto-save IndexedDB arrêté');` | SUPPRIMER |
| 392 | `console.log('✅ IndexedDB Storage initialisé');` | SUPPRIMER |

### service-worker.js
| Ligne | Code | Action |
|-------|------|--------|
| 43 | `console.log('[Service Worker] Installation...');` | SUPPRIMER |
| 48 | `console.log('[Service Worker] Mise en cache des fichiers');` | SUPPRIMER |
| 52 | `console.warn('[Service Worker] Erreur cache fichiers locaux:', err);` | SUPPRIMER |
| 62 | `console.warn('[Service Worker] CDN non disponible:', url);` | SUPPRIMER |
| 69 | `console.log('[Service Worker] Installation terminée');` | SUPPRIMER |
| 78 | `console.log('[Service Worker] Activation...');` | SUPPRIMER |
| 87 | `console.log('[Service Worker] Suppression ancien cache:', cacheName);` | SUPPRIMER |
| 94 | `console.log('[Service Worker] Activation terminée');` | SUPPRIMER |
| 144 | `console.log('[Service Worker] Cache hit:', request.url);` | SUPPRIMER |
| 153 | `console.log('[Service Worker] Cache miss, fetching:', request.url);` | SUPPRIMER |
| 171 | `console.log('[Service Worker] Network failed, trying cache:', request.url);` | SUPPRIMER |
| 214 | `console.log('[Service Worker] Cache updated:', request.url);` | SUPPRIMER |
| 218 | `console.warn('[Service Worker] Background update failed:', request.url);` | SUPPRIMER |
| 269 | `console.log('[Service Worker] Chargé - Version:', CACHE_VERSION);` | SUPPRIMER |

---

## 3. CODE COMMENTÉ À SUPPRIMER

### undo-redo.js (Lignes 297-311)

```javascript
// À SUPPRIMER COMPLÈTEMENT:
// === BOUTONS UNDO/REDO MASQUÉS PAR DEMANDE UTILISATEUR ===
// document.addEventListener('DOMContentLoaded', () => {
//   // const navContainer = document.querySelector('.nav-container');
//   // if (navContainer && !document.getElementById('undoRedoButtons')) {
//   //   const undoRedoDiv = document.createElement('div');
//   //   undoRedoDiv.id = 'undoRedoButtons';
//   //   undoRedoDiv.style.cssText = 'display: flex; gap: var(--space-8); margin-top: var(--space-12);';
//   //   undoRedoDiv.innerHTML = `
//   //     <button id="undoButton" class="btn btn--secondary btn--small" onclick="undoManager.undo()" disabled title="Annuler (Ctrl+Z)">
//   //       ↶ Annuler
//   //     </button>
//   //     <button id="redoButton" class="btn btn--secondary btn--small" onclick="undoManager.redo()" disabled title="Refaire (Ctrl+Shift+Z)">
//   //       ↷ Refaire
//   //     </button>
//   //   `;
//   //   navContainer.appendChild(undoRedoDiv);
//   // }
//
//   console.log('✅ Undo/Redo Manager initialisé (boutons masqués)');
// });
```

**Remplacer par:**
```javascript
document.addEventListener('DOMContentLoaded', () => {
  // Boutons Undo/Redo masqués par demande utilisateur
});
```

---

## 4. FONCTIONS VIDES À SUPPRIMER

### app.js (Lignes 2083-2086)

```javascript
// À SUPPRIMER COMPLÈTEMENT:
function toggleShowHiddenCD() {
  // Fonction conservée pour compatibilité mais ne fait plus rien
  // Les CD cachés sont toujours affichés (grisés)
}
```

**Action:** Supprimer ces 4 lignes

**Vérification d'appel:**
```bash
grep -n "toggleShowHiddenCD\|toggleShowHidden" /home/user/DashboardCD/*.js
grep -n "toggleShowHiddenCD\|toggleShowHidden" /home/user/DashboardCD/*.html
```
Résultat: AUCUN APPEL - Confirme que c'est du code mort

---

## 5. ALERT() À CONVERTIR EN SHOWTOAST()

### app.js (Ligne 565)

**AVANT:**
```javascript
alert(`Score du ${niveau.label} mis à jour à ${newScore} pts. Tous les calculs ont été recalculés.`);
```

**APRÈS:**
```javascript
showToast(`✅ Score du ${niveau.label} mis à jour à ${newScore} pts. Tous les calculs ont été recalculés.`);
```

**Raison:** Les alert() bloquent l'interface. showToast() est non-bloquant et meilleur UX.

---

## 6. VARIABLES À VÉRIFIER

### app.js (Lignes 94-99)

```javascript
// À VÉRIFIER SI UTILISÉES:
let tempCodeQualite = null;       // Ligne 94
let tempCodeCQ = null;             // Ligne 95
let tempCodeIncident = null;       // Ligne 96
let tempCommentaireIncident = null; // Ligne 97
let tempTempsImpact = null;        // Ligne 98
let currentEditingCD = null;       // Ligne 99
```

**Vérification:**
```bash
grep -n "tempCodeQualite\|tempCodeCQ\|tempCodeIncident\|tempCommentaire\|tempTemps\|currentEditingCD" /home/user/DashboardCD/app.js
```

**Si aucun appel trouvé → SUPPRIMER**

---

## 7. FONCTIONS À VÉRIFIER POUR DUPLICATION

### undo-redo.js (Lignes 131-292)

Fonctions redondantes qui pourraient être fusionnées:

1. **ajouterCDWithUndo()** - Ligne 131
2. **supprimerCDWithUndo()** - Ligne 152
3. **editerCDWithUndo()** - Ligne 179
4. **ajouterOperateurWithUndo()** - Ligne 207
5. **supprimerOperateurWithUndo()** - Ligne 226
6. **ajouterMachineWithUndo()** - Ligne 251
7. **supprimerMachineWithUndo()** - Ligne 270

**Pattern identique:**
```javascript
function action() {
  // Ajouter/modifier l'objet
  
  undoManager.recordAction(
    undoManager.createAction(
      `Description`,
      () => { /* undo */ },
      () => { /* redo */ }
    )
  );
}
```

**Refactoring suggéré:**
```javascript
function withUndo(action, description, undoFn, redoFn) {
  undoManager.recordAction(
    undoManager.createAction(description, undoFn, redoFn)
  );
}
```

---

## 8. CSS À FUSIONNER/OPTIMISER

### Doublons CSS potentiels

**Classes à rechercher:**
- `.stat-card` (design-enhancements.css + style.css ?)
- `.card` (design-enhancements.css + style.css ?)
- `.section-header` (multiple CSS ?)
- `.stats-section` (comparative-stats.css + style.css ?)
- `.stats-grid` (comparative-stats.css + style.css ?)

**Commande de recherche:**
```bash
grep -r "\.stat-card\|\.card\|\.section-header\|\.stats-section\|\.stats-grid" *.css
```

---

## 9. SERVICE WORKER À OPTIMISER

### service-worker.js

| Ligne | Problème | Action |
|-------|----------|--------|
| 3-4 | CACHE_NAME ne change jamais | Ajouter versionnage |
| 264-267 | `syncCDData()` est vide | Implémenter ou supprimer |
| Multiples | Trop de console.log() | Voir section 2 |

---

## COMMANDES GIT POUR VÉRIFIER

```bash
# Vérifier que toggleShowHiddenCD n'est jamais appelée
grep -r "toggleShowHiddenCD" .

# Vérifier variables temporelles
grep -r "tempCodeQualite\|tempCodeCQ" app.js

# Vérifier console.log
grep -r "console.log" *.js | wc -l

# Vérifier doublons CSS
grep -r "\.stat-card" *.css
```

