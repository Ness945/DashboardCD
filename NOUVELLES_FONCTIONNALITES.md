# 🚀 Nouvelles Fonctionnalités - Michelin CD Dashboard

## ✅ Fonctionnalités Implémentées

### 1. 📊 **Statistiques Comparatives**

Comparez les performances entre différentes périodes :

- **Cette semaine vs Semaine dernière**
- **Ce mois vs Mois dernier**

**Indicateurs suivis :**
- Total CD
- D1 Moyen
- Taux NIV 1
- Taux Incidents
- Performance Moyenne

**Tendances visuelles :**
- ↗️ **Vert** : Amélioration
- ↘️ **Rouge** : Détérioration
- → **Gris** : Stable

**Où voir ?**
→ Onglet **Accueil**, section "📊 Statistiques Comparatives"

---

### 2. 🚨 **Alertes Visuelles**

Identification automatique des problèmes :

#### A. CD Critiques (D1 > 18h)
- **Affichage :** Rouge clignotant dans l'historique
- **Panneau d'alertes :** Liste des 5 derniers CD critiques
- **Action :** Cliquer pour voir les détails

#### B. Machines Problématiques (≥5 CD minimum)
- **Critères :**
  - Performance moyenne < 70% OU
  - Taux NIV 1 < 50% OU
  - Plus de 2 anomalies

- **Affichage :** Surlignage orange dans l'historique
- **Panneau d'alertes :** Top machines à surveiller

**Où voir ?**
→ Onglet **Accueil**, section "🚨 Alertes & Surveillance"
→ Onglet **Historique** : Lignes colorées selon les alertes

---

### 3. 💾 **Migration vers IndexedDB**

**Avant :** localStorage (5-10 MB max)
**Maintenant :** IndexedDB (50+ MB)

**Avantages :**
- ✅ Capacité de stockage 10x plus grande
- ✅ Performances améliorées
- ✅ Support de milliers de CD
- ✅ Migration automatique depuis localStorage

**Fonctionnement :**
- Les données sont automatiquement migrées au premier chargement
- Sauvegarde automatique toutes les 30 secondes
- localStorage conservé comme backup

---

### 4. 📱 **PWA (Progressive Web App)**

Transformez le dashboard en application installable !

#### Installation Windows/Mac :
1. Ouvrez le dashboard dans Chrome/Edge
2. Cliquez sur l'icône d'installation (➕) dans la barre d'adresse
3. Cliquez sur "Installer"

#### Installation Android/iOS :
1. Ouvrez dans Safari/Chrome mobile
2. Menu → "Ajouter à l'écran d'accueil"
3. L'icône apparaît sur votre écran

#### Fonctionnalités PWA :
- ✅ Fonctionne hors ligne
- ✅ Icône sur le bureau
- ✅ Mode plein écran
- ✅ Chargement instantané (cache)
- ✅ Notifications (futur)

**Raccourcis d'application :**
- Saisir CD
- Voir Historique
- Voir Stats

---

## 🎯 Utilisation

### Dashboard Principal (Accueil)

1. **KPI Cards** : Vue d'ensemble rapide
2. **Alertes** : Problèmes détectés automatiquement
3. **Stats Comparatives** : Tendances hebdo/mensuelles
4. **Graphiques** : Visualisations

### Alertes dans l'Historique

**Légende des couleurs :**
- 🟥 **Rouge clignotant** : CD avec D1 > 18h (critique)
- 🟧 **Orange** : Machine problématique (≥5 CD)
- 🟩 **Vert** : Performance ≥ 80%
- 🟨 **Jaune** : Performance 50-79%

### Mode Hors Ligne

L'application fonctionne sans connexion internet :
- Toutes les données sont en local (IndexedDB)
- Les fichiers sont mis en cache (Service Worker)
- Les graphiques et calculs se font en local

**⚠️ Important :** Exportez régulièrement vos données (JSON) comme backup !

---

## 📝 Notes Techniques

### Fichiers Ajoutés

**CSS :**
- `comparative-stats.css` - Styles stats comparatives
- `visual-alerts.css` - Styles alertes visuelles

**JavaScript :**
- `comparative-stats.js` - Calculs et affichage comparatifs
- `visual-alerts.js` - Détection et affichage des alertes
- `indexeddb-storage.js` - Gestion IndexedDB

**PWA :**
- `manifest.json` - Configuration PWA
- `service-worker.js` - Cache hors ligne

### Compatibilité

**Navigateurs supportés :**
- ✅ Chrome 80+
- ✅ Edge 80+
- ✅ Firefox 75+
- ✅ Safari 13+
- ✅ Chrome Android
- ✅ Safari iOS

**Fonctionnalités requises :**
- IndexedDB (supporté par tous les navigateurs modernes)
- Service Worker (PWA nécessite HTTPS ou localhost)

---

## 🔧 Configuration

### Personnaliser le Seuil des Machines Problématiques

Par défaut : **5 CD minimum**

Pour modifier dans `visual-alerts.js` :

```javascript
constructor() {
  this.minCDForMachineAlert = 5; // Changer ici
}
```

### Désactiver les Alertes Visuelles

Dans `app.js`, commenter les lignes :

```javascript
// if (typeof visualAlerts !== 'undefined') {
//   visualAlerts.showAlertsInDashboard('alertsContainer');
// }
```

---

## 📦 Export/Import Données

**Export :**
- Onglet **Sauvegarde** → "💾 Exporter les données"
- Fichier généré : `michelin_cd_data_YYYY-MM-DD_HH-MM-SS.json`

**Import :**
- Onglet **Sauvegarde** → "📤 Importer les données"
- Sélectionner un fichier JSON précédemment exporté

---

## 🎨 Icônes PWA

Pour personnaliser les icônes de l'application :

1. Créer `icon-192.png` (192x192 px)
2. Créer `icon-512.png` (512x512 px)
3. Placer dans le répertoire racine

**Recommandation :** Logo Michelin sur fond #21808D (couleur Michelin)

---

## 🐛 Dépannage

### L'application ne se charge pas
→ Vider le cache du navigateur (Ctrl+Shift+Del)
→ Recharger (Ctrl+F5)

### Les alertes ne s'affichent pas
→ Vérifier la console JavaScript (F12)
→ S'assurer que `visual-alerts.js` est chargé

### PWA ne s'installe pas
→ Nécessite HTTPS ou localhost
→ Vérifier que `manifest.json` est accessible
→ Redémarrer le navigateur

### Données perdues
→ Restaurer depuis un export JSON
→ Vérifier IndexedDB dans les DevTools (F12 → Application)

---

## 📞 Support

Pour toute question ou problème :
1. Consulter la console JavaScript (F12)
2. Exporter vos données avant toute manipulation
3. Tester sur un autre navigateur

---

**Version :** 2.0.0 avec PWA + IndexedDB + Alertes + Stats Comparatives
**Date :** Novembre 2025
**Auteur :** Claude AI pour Michelin Gravanches
