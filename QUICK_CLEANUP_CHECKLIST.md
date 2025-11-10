# CHECKLIST RAPIDE DE NETTOYAGE

## Phase 1 - Nettoyage Immédiat (30 min)

### 1. Supprimer fichier orphelin
- [ ] `rm insights-tab.html`

### 2. Supprimer console.log() initialisations

**indexeddb-storage.js**
- [ ] Ligne 26: `console.log('✅ IndexedDB initialisé');`
- [ ] Ligne 37: `console.log('✅ Object store créé');`
- [ ] Ligne 76: `console.log('💾 Sauvegarde IndexedDB réussie');`
- [ ] Ligne 127: `console.log('✅ Données chargées depuis IndexedDB');`
- [ ] Ligne 130: `console.log('ℹ️ Aucune donnée trouvée dans IndexedDB');`
- [ ] Ligne 187: `console.log(...)`
- [ ] Ligne 194: `console.log('🔄 Tentative de migration...')`
- [ ] Ligne 199: `console.log('ℹ️ Aucune donnée localStorage...')`
- [ ] Ligne 214: `console.log('✅ Migration localStorage → IndexedDB...')`
- [ ] Ligne 239: `console.log('✅ Auto-save IndexedDB démarré...')`
- [ ] Ligne 246: `console.log('🛑 Auto-save IndexedDB arrêté');`
- [ ] Ligne 392: `console.log('✅ IndexedDB Storage initialisé');`

**storage.js**
- [ ] Ligne 19: `console.log('✅ Auto-save démarré...')`
- [ ] Ligne 26: `console.log('🛑 Auto-save arrêté')`
- [ ] Ligne 76: `console.log('ℹ️ Aucune donnée sauvegardée...')`
- [ ] Ligne 84: `console.log(📦 Chargement...)`
- [ ] Lignes 296-302: Bloc console.log('📊 STATS STOCKAGE:') + 6 logs
- [ ] Ligne 319: `console.log('✅ Storage Manager initialisé')`

**Autres fichiers**
- [ ] analytics.js:394 - `console.log('✅ Analytics Engine...')`
- [ ] charts.js:382 - `console.log('✅ Chart Manager...')`
- [ ] undo-redo.js:313 - `console.log('✅ Undo/Redo Manager...')`
- [ ] ui-enhancements.js:323 - `console.log('✨ UI Enhancements...')`
- [ ] insights-ui.js:211 - `console.log('✅ Insights UI...')`
- [ ] loading.js:269 - `console.log('✅ Loading Manager...')`
- [ ] shortcuts.js:16 - `console.log('⌨️ Shortcuts...')`
- [ ] service-worker.js - Supprimer ~14 instances de console.log()

### 3. Supprimer code commenté

**undo-redo.js (Lignes 297-311)**
```
Supprimer:
// const navContainer = document.querySelector('.nav-container');
// if (navContainer && !document.getElementById('undoRedoButtons')) {
//   const undoRedoDiv = document.createElement('div');
//   undoRedoDiv.id = 'undoRedoButtons';
//   undoRedoDiv.style.cssText = '...';
//   undoRedoDiv.innerHTML = `...`;
//   navContainer.appendChild(undoRedoDiv);
// }
```
- [ ] Supprimer ces 15 lignes

### 4. Supprimer fonction vide

**app.js (Lignes 2083-2086)**
```javascript
// À SUPPRIMER
function toggleShowHiddenCD() {
  // Fonction conservée pour compatibilité mais ne fait plus rien
  // Les CD cachés sont toujours affichés (grisés)
}
```
- [ ] Supprimer ces 4 lignes

### 5. Convertir alert() vers showToast()

**app.js:565**
```javascript
// AVANT:
alert(`Score du ${niveau.label} mis à jour à ${newScore} pts. Tous les calculs ont été recalculés.`);

// APRÈS:
showToast(`✅ Score du ${niveau.label} mis à jour à ${newScore} pts. Tous les calculs ont été recalculés.`);
```
- [ ] Remplacer l'alert() par showToast()

---

## Phase 2 - Refactoring Optionnel (2-3 heures)

### 6. Vérifier variables temporelles

**app.js (Lignes 94-99)**
```javascript
let tempCodeQualite = null;
let tempCodeCQ = null;
let tempCodeIncident = null;
let tempCommentaireIncident = null;
let tempTempsImpact = null;
let currentEditingCD = null;
```
- [ ] Chercher `grep "tempCode\|tempCommentaire\|tempTemps\|currentEditing" app.js`
- [ ] Si non utilisées, supprimer

### 7. Refactorer Undo Wrappers

**undo-redo.js**
Les 7 fonctions (lignes 131-292) suivent le même pattern:
```javascript
ajouterCDWithUndo()
supprimerCDWithUndo()
editerCDWithUndo()
ajouterOperateurWithUndo()
supprimerOperateurWithUndo()
ajouterMachineWithUndo()
supprimerMachineWithUndo()
```
- [ ] Créer fonction générique `withUndo(action, description, undoFn, redoFn)`
- [ ] Remplacer les 7 fonctions par appels à cette générique

### 8. Auditer CSS doublons

- [ ] Chercher `.stat-card`, `.card`, `.section-header` dans tous les CSS
- [ ] Fusionner style.css + design-enhancements.css
- [ ] Vérifier comparative-stats.css pour doublons
- [ ] Potentiel gain: 200-300 lignes CSS

---

## Phase 3 - Long Terme

### 9. Implémenter logging conditionnel
- [ ] Créer `DEBUG` flag global
- [ ] Wrappez tous les console.log() avec `if (DEBUG) { console.log(...) }`
- [ ] ou supprimer complètement en prod

### 10. Vérifier console.log('🐛 DEBUG INFO') - shortcuts.js:340
- [ ] Décider si cette fonction de debug est intentionnelle
- [ ] Supprimer si non utilisée

### 11. Refactorer service-worker.js
- [ ] Générer CACHE_NAME dynamiquement (avec version)
- [ ] Implémenter ou supprimer `syncCDData()` (ligne 264)
- [ ] Réduire les console.log()

---

## Résumé Gains

| Action | Lignes | Temps |
|--------|--------|-------|
| Supprimer insights-tab.html | - | 1 min |
| Supprimer console.log() | ~44 | 5 min |
| Supprimer code commenté | 15 | 2 min |
| Supprimer toggleShowHiddenCD() | 4 | 1 min |
| Convertir alert() → showToast() | 1 | 1 min |
| **TOTAL PHASE 1** | **64 lignes** | **~30 min** |
| Refactorer undo wrappers | ~140 | 1h |
| Auditer CSS | ~300 | 1.5h |
| Vérifier variables | 6 | 30min |
| **TOTAL PHASE 2** | **~446 lignes** | **~3h** |

**TOTAL:** ~510 lignes nettoyées + 40% de code dupliqué réduit

