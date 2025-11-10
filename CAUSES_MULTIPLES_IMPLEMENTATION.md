# 🔄 Implémentation des Causes Multiples

## 📋 Vue d'ensemble

Cette mise à jour permet de saisir **plusieurs causes pour un même CD** :
- ✅ **Plusieurs Retours Archi** (NIV 2, NIV 2 CC, NIV 3)
- ✅ **Plusieurs CQ Après CD**
- ✅ **Plusieurs Incidents**

## 🎯 Changements dans les données

### Ancienne structure (version unique)
```javascript
{
  codeQualite: "cq_001",          // UN seul
  codeCQ: "code_cq_012",          // UN seul
  codeIncident: "inc_003",        // UN seul
  commentaireIncident: "Panne..."
}
```

### Nouvelle structure (version multiple)
```javascript
{
  codes

Qualite: ["cq_001", "cq_005", "cq_012"],  // PLUSIEURS
  codesCQ: ["code_cq_012", "code_cq_034"],     // PLUSIEURS
  codesIncident: ["inc_003", "inc_007"],       // PLUSIEURS
  commentsIncident: {
    global: "Plusieurs problèmes survenus..."
  }
}
```

## 📊 Calcul de la performance adapté

### Logique du pire score

Quand plusieurs Retours Archi sont sélectionnés, **on prend le PIRE score** :

```javascript
Exemple :
- Code 1 (NIV 2)    → 70 points
- Code 2 (NIV 2 CC) → 50 points
- Code 3 (NIV 3)    → 30 points

Performance = 30 points (le pire)
```

**Pourquoi ?**
Si un CD a plusieurs problèmes, la qualité globale est celle du défaut le plus grave.

## 🖥️ Interface utilisateur

### Saisie d'un CD

#### 1. Retour Archi

**Avant :**
```
[NIV 1] [NIV 2] [NIV 2 CC] [NIV 3]
→ Cliquer sur un badge
→ Modal avec 1 seul code
```

**Après :**
```
[NIV 1] [NIV 2] [NIV 2 CC] [NIV 3]
→ Cliquer sur NIV 2/3
→ Modal avec GRILLE de tous les codes disponibles
→ Sélectionner PLUSIEURS codes
→ Valider

Affichage :
┌──────────────────────────────────────┐
│ Codes sélectionnés :                 │
│ [RA-001 ✕] [RA-012 ✕] [RA-034 ✕]   │
└──────────────────────────────────────┘
```

#### 2. CQ Après CD

**Avant :**
```
[Oui] [Non]
→ Si Oui : modal avec 1 code
```

**Après :**
```
[Oui] [Non]
→ Si Oui : modal avec GRILLE
→ Sélectionner PLUSIEURS codes CQ
→ Valider

Affichage :
┌──────────────────────────────────────┐
│ Codes CQ sélectionnés :              │
│ [CQ-012 ✕] [CQ-045 ✕]              │
└──────────────────────────────────────┘
```

#### 3. Incidents

**Avant :**
```
[Oui] [Non]
→ Si Oui : modal avec 1 code + commentaire
```

**Après :**
```
[Oui] [Non]
→ Si Oui : modal avec GRILLE
→ Sélectionner PLUSIEURS incidents
→ Commentaire global
→ Valider

Affichage :
┌──────────────────────────────────────┐
│ Incidents sélectionnés :             │
│ [INC-003 ✕] [INC-019 ✕] [INC-027 ✕]│
└──────────────────────────────────────┘
```

### Édition d'un CD

**Comportement :**
- Les codes déjà sélectionnés sont pré-cochés
- Possibilité d'ajouter/retirer des codes
- Bouton ✕ pour retirer rapidement un code

### Historique

**Affichage des codes multiples :**

**Avant :**
```
Retour Archi : NIV 2
CQ : CQ-012
```

**Après :**
```
Retour Archi : NIV 2 (3 codes) 🔍
                ↓ Au survol
        Tooltip: RA-001, RA-012, RA-034

CQ : CQ (2 codes) 🔍
     ↓ Au survol
     Tooltip: CQ-012, CQ-045
```

## 🔄 Migration automatique des données

Au premier chargement, les anciennes données sont **automatiquement converties** :

```javascript
// Fonction de migration dans indexeddb-storage.js
function migrateOldData(cd) {
  // Convertir codeQualite → codesQualite[]
  if (cd.codeQualite && !cd.codesQualite) {
    cd.codesQualite = [cd.codeQualite];
    delete cd.codeQualite;
  }

  // Convertir codeCQ → codesCQ[]
  if (cd.codeCQ && !cd.codesCQ) {
    cd.codesCQ = [cd.codeCQ];
    delete cd.codeCQ;
  }

  // Convertir codeIncident → codesIncident[]
  if (cd.codeIncident && !cd.codesIncident) {
    cd.codesIncident = [cd.codeIncident];
    delete cd.codeIncident;
  }

  // Convertir commentaireIncident → commentsIncident{}
  if (cd.commentaireIncident && !cd.commentsIncident) {
    cd.commentsIncident = { global: cd.commentaireIncident };
    delete cd.commentaireIncident;
  }

  return cd;
}
```

**Résultat :**
- ✅ Aucune perte de données
- ✅ Migration transparente
- ✅ Compatibilité ascendante

## 📝 Fichiers modifiés

### Nouveaux fichiers

1. **`multiple-causes.js`** (533 lignes)
   - Gestion de la sélection multiple
   - Modales de sélection
   - Calcul du pire score
   - Chargement pour édition

2. **`multiple-causes.css`** (227 lignes)
   - Grille de sélection
   - Badges de codes sélectionnés
   - Animations

3. **`CAUSES_MULTIPLES_IMPLEMENTATION.md`**
   - Documentation complète

### Fichiers modifiés

4. **`index.html`**
   - Import de `multiple-causes.js` et `.css`
   - Modification du formulaire de saisie
   - Ajout des zones d'affichage des codes sélectionnés

5. **`app.js`**
   - `enregistrerCD()` : utilise les nouvelles données multiples
   - `editerCD()` : charge les codes multiples
   - `afficherHistorique()` : affiche les badges multiples
   - `getScoreQualite()` : adapté pour le pire score

6. **`indexeddb-storage.js`**
   - Fonction de migration automatique
   - Conversion des anciennes données

## 🎮 Utilisation

### Saisir un CD avec plusieurs causes

1. Remplir les champs normaux (date, machine, opérateurs...)

2. **Retour Archi :**
   - Cliquer sur [NIV 2], [NIV 2 CC] ou [NIV 3]
   - Une grille s'ouvre avec tous les codes disponibles
   - Cliquer sur chaque code à ajouter (✓ apparaît)
   - Cliquer "Valider la sélection"
   - Les codes apparaissent sous forme de badges

3. **CQ Après CD :**
   - Cliquer sur [Oui]
   - Grille des codes CQ
   - Sélectionner tous les codes CQ détectés
   - Valider

4. **Incident :**
   - Cliquer sur [Oui]
   - Grille des codes incident
   - Sélectionner tous les incidents survenus
   - Ajouter un commentaire global (optionnel)
   - Valider

5. **Enregistrer le CD**

### Éditer un CD existant

1. Cliquer sur ✏️ dans l'historique
2. Les codes déjà sélectionnés sont affichés
3. Cliquer sur le badge du niveau pour rouvrir la grille
4. Les codes déjà sélectionnés sont pré-cochés (✓)
5. Ajouter/retirer des codes
6. Valider et enregistrer

### Retirer rapidement un code

Dans le formulaire, cliquer sur le ✕ du badge :
```
[RA-001 ✕] [RA-012 ✕] [RA-034 ✕]
             ↑
         Cliquer ici pour retirer RA-012
```

## 🔍 Détails techniques

### Performance avec plusieurs retours archi

```javascript
// Dans app.js - fonction modifiée
function getScoreQualite(qualite) {
  if (qualite === '1') {
    return 100; // NIV 1 = parfait
  }

  // Si plusieurs codes, prendre le pire score
  if (multipleCausesManager.selectedCodesQualite.length > 0) {
    return multipleCausesManager.getWorstQualityScore();
  }

  // Fallback (ne devrait pas arriver)
  return dbData.niveauxQualite.find(n => n.niveau === qualite)?.scorePerformance || 70;
}
```

### Affichage dans l'historique

```javascript
// Badge avec compteur
if (cd.codesQualite && cd.codesQualite.length > 0) {
  const codesList = cd.codesQualite.map(id => {
    const code = dbData.codesQualite.find(c => c.id === id);
    return code ? code.code : '?';
  }).join(', ');

  qualiteContent = `
    <div class="multiple-codes-tooltip">
      <span class="status ${qualiteClass}">
        ${qualiteLabel} (${cd.codesQualite.length})
      </span>
      <span class="tooltip-content">${codesList}</span>
    </div>
  `;
}
```

## ⚙️ Configuration

### Modifier la taille de la grille

Dans `multiple-causes.css` (ligne 5) :

```css
.multiple-causes-grid {
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  /*                                         ↑
                                        Changer 280px pour des items plus larges/étroits */
}
```

### Modifier la hauteur max de la grille

Dans `multiple-causes.css` (ligne 8) :

```css
.multiple-causes-grid {
  max-height: 500px; /* Changer ici */
}
```

## 🐛 Dépannage

### Les codes ne se sélectionnent pas
→ Vérifier la console (F12)
→ S'assurer que `multiple-causes.js` est chargé

### Les anciennes données ne sont pas migrées
→ Exporter les données avant
→ Vider le cache (Ctrl+Shift+Del)
→ Recharger et importer

### L'affichage est cassé
→ Vérifier que `multiple-causes.css` est chargé
→ Vider le cache CSS

### La performance est incorrecte
→ Vérifier que `getWorstQualityScore()` est appelé
→ Console : `multipleCausesManager.getWorstQualityScore()`

## 📊 Exemples

### CD avec 3 retours archi

```javascript
{
  date: "2025-11-10",
  qualite: "2",
  codesQualite: ["cq_12", "cq_45", "cq_78"],
  // Score pris : min(70, 50, 30) = 30 points
  performance: 42.5
}
```

### CD avec 2 CQ + 3 incidents

```javascript
{
  cqApres: "Oui",
  codesCQ: ["cq_code_23", "cq_code_67"],
  incident: "Oui",
  codesIncident: ["inc_12", "inc_34", "inc_56"],
  commentsIncident: {
    global: "Panne électrique + problème qualité matière"
  }
}
```

## ✅ Checklist de migration

- [ ] Exporter les données actuelles (backup)
- [ ] Mettre à jour les fichiers
- [ ] Vider le cache navigateur
- [ ] Recharger l'application
- [ ] Vérifier la migration automatique
- [ ] Tester la saisie d'un nouveau CD
- [ ] Tester l'édition d'un ancien CD
- [ ] Vérifier l'affichage dans l'historique
- [ ] Vérifier les calculs de performance

---

**Version :** 2.1.0 - Causes Multiples
**Date :** Novembre 2025
**Compatibilité :** Rétrocompatible avec les données v2.0.0
