// === INDEXEDDB STORAGE MANAGER ===
// Migration de localStorage vers IndexedDB pour plus de capacité (50+ MB)

class IndexedDBStorage {
  constructor() {
    this.dbName = 'MichelinCDDB';
    this.dbVersion = 1;
    this.db = null;
    this.storeName = 'cdData';
    this.autoSaveInterval = null;
    this.hasUnsavedChanges = false;
  }

  // === INITIALISER LA BASE DE DONNÉES ===
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('❌ Erreur ouverture IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ IndexedDB initialisé');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Créer l'object store si nécessaire
        if (!db.objectStoreNames.contains(this.storeName)) {
          const objectStore = db.createObjectStore(this.storeName, { keyPath: 'id' });
          objectStore.createIndex('timestamp', 'timestamp', { unique: false });
          console.log('✅ Object store créé');
        }
      };
    });
  }

  // === SAUVEGARDER LES DONNÉES ===
  async save(showNotification = false) {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const objectStore = transaction.objectStore(this.storeName);

      const data = {
        id: 'main',
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        data: dbData
      };

      const request = objectStore.put(data);

      request.onsuccess = () => {
        this.hasUnsavedChanges = false;

        // Aussi sauvegarder dans localStorage comme backup
        try {
          localStorage.setItem('michelin_cd_last_save', data.timestamp);
        } catch (e) {
          // Ignorer les erreurs localStorage
        }

        if (showNotification) {
          showSuccess('Données sauvegardées', 'Sauvegarde IndexedDB réussie');
        }

        console.log('💾 Sauvegarde IndexedDB réussie');
        resolve(true);
      };

      request.onerror = () => {
        console.error('❌ Erreur sauvegarde IndexedDB:', request.error);
        showError('Erreur sauvegarde', request.error.message);
        reject(request.error);
      };
    });
  }

  // === CHARGER LES DONNÉES ===
  async load() {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const objectStore = transaction.objectStore(this.storeName);
      const request = objectStore.get('main');

      request.onsuccess = () => {
        const result = request.result;

        if (result && result.data) {
          Object.assign(dbData, result.data);

          // S'assurer que les opérateurs protégés sont présents
          const operateursProtegés = [
            { id: 'op_harel_protected', nom: 'Harel', dateAjout: '2025-01-01', protected: true },
            { id: 'op_kyndt_protected', nom: 'Kyndt', dateAjout: '2025-01-01', protected: true }
          ];

          operateursProtegés.forEach(opProtegé => {
            if (!dbData.operateurs.find(o => o.id === opProtegé.id)) {
              dbData.operateurs.push(opProtegé);
            }
          });

          // Mettre à jour les vues
          if (typeof chargerToutesLesVues === 'function') {
            chargerToutesLesVues();
          }

          const date = new Date(result.timestamp);
          showSuccess('Données restaurées', `Dernière sauvegarde: ${date.toLocaleString('fr-FR')}`);
          console.log('✅ Données chargées depuis IndexedDB');
          resolve(true);
        } else {
          console.log('ℹ️ Aucune donnée trouvée dans IndexedDB');
          // Tenter de charger depuis localStorage comme fallback
          this.migrateFromLocalStorage();
          resolve(false);
        }
      };

      request.onerror = () => {
        console.error('❌ Erreur chargement IndexedDB:', request.error);
        reject(request.error);
      };
    });
  }

  // === MIGRATION DEPUIS LOCALSTORAGE ===
  async migrateFromLocalStorage() {
    console.log('🔄 Tentative de migration depuis localStorage...');

    try {
      const saved = localStorage.getItem('michelin_cd_data');
      if (!saved) {
        console.log('ℹ️ Aucune donnée localStorage à migrer');
        return false;
      }

      const parsed = JSON.parse(saved);
      if (parsed.data) {
        Object.assign(dbData, parsed.data);

        // Sauvegarder dans IndexedDB
        await this.save(false);

        showSuccess('Migration réussie', 'Données migrées de localStorage vers IndexedDB');
        console.log('✅ Migration localStorage → IndexedDB réussie');

        // Optionnel: nettoyer localStorage
        // localStorage.removeItem('michelin_cd_data');

        if (typeof chargerToutesLesVues === 'function') {
          chargerToutesLesVues();
        }

        return true;
      }
    } catch (error) {
      console.error('❌ Erreur migration:', error);
      return false;
    }
  }

  // === AUTO-SAVE ===
  startAutoSave(intervalMs = 30000) {
    this.autoSaveInterval = setInterval(async () => {
      if (this.hasUnsavedChanges) {
        await this.save();
        showToast('💾 Sauvegarde automatique', 'info');
      }
    }, intervalMs);
    console.log('✅ Auto-save IndexedDB démarré (toutes les 30s)');
  }

  stopAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
      console.log('🛑 Auto-save IndexedDB arrêté');
    }
  }

  markAsModified() {
    this.hasUnsavedChanges = true;
  }

  // === EXPORT VERS FICHIER ===
  async exportToFile() {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-');
    const fileName = `michelin_cd_data_${dateStr}_${timeStr}.json`;

    const dataToExport = {
      version: '2.0.0',
      exportDate: now.toISOString(),
      data: dbData
    };

    const dataStr = JSON.stringify(dataToExport, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);

    showSuccess('Export réussi', `Fichier: ${fileName} (${(dataStr.length / 1024).toFixed(2)} KB)`);
    return true;
  }

  // === IMPORT DEPUIS FICHIER ===
  async importFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const data = JSON.parse(e.target.result);

          if (!data.data || !data.data.operateurs || !data.data.machines || !data.data.cd) {
            throw new Error('Structure de fichier invalide');
          }

          const msg = `📊 Importer ces données ?\n\n` +
                      `• ${data.data.cd.length} CD\n` +
                      `• ${data.data.operateurs.length} opérateurs\n` +
                      `• ${data.data.machines.length} machines\n\n` +
                      `⚠️ Les données actuelles seront écrasées !`;

          if (!window.confirm(msg)) {
            reject(new Error('Import annulé par l\'utilisateur'));
            return;
          }

          Object.assign(dbData, data.data);

          // S'assurer que les opérateurs protégés sont présents
          const operateursProtegés = [
            { id: 'op_harel_protected', nom: 'Harel', dateAjout: '2025-01-01', protected: true },
            { id: 'op_kyndt_protected', nom: 'Kyndt', dateAjout: '2025-01-01', protected: true }
          ];

          operateursProtegés.forEach(opProtegé => {
            if (!dbData.operateurs.find(o => o.id === opProtegé.id)) {
              dbData.operateurs.push(opProtegé);
            }
          });

          await this.save(false);

          if (typeof chargerToutesLesVues === 'function') {
            chargerToutesLesVues();
          }

          showSuccess('Import réussi', `${data.data.cd.length} CD importés`);
          resolve(data);
        } catch (error) {
          console.error('❌ Erreur import:', error);
          showError('Erreur lors de l\'import', error.message);
          reject(error);
        }
      };

      reader.onerror = () => {
        showError('Erreur de lecture', 'Impossible de lire le fichier');
        reject(reader.error);
      };

      reader.readAsText(file);
    });
  }

  // === STATISTIQUES ===
  async getStats() {
    return {
      cdCount: dbData.cd.length,
      operateursCount: dbData.operateurs.length,
      machinesCount: dbData.machines.length,
      storageType: 'IndexedDB',
      estimatedSize: new Blob([JSON.stringify(dbData)]).size
    };
  }

  // === NETTOYER ===
  async clear() {
    if (!window.confirm('⚠️ ATTENTION: Supprimer toutes les données IndexedDB ?')) {
      return false;
    }

    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const objectStore = transaction.objectStore(this.storeName);
      const request = objectStore.clear();

      request.onsuccess = () => {
        showSuccess('Données supprimées', 'IndexedDB nettoyée');
        console.log('✅ IndexedDB nettoyée');
        resolve(true);
      };

      request.onerror = () => {
        console.error('❌ Erreur clear IndexedDB:', request.error);
        showError('Erreur lors du nettoyage', request.error.message);
        reject(request.error);
      };
    });
  }
}

// Instance globale
const indexedDBStorage = new IndexedDBStorage();

// Initialiser au chargement
window.addEventListener('load', async () => {
  try {
    await indexedDBStorage.init();
    await indexedDBStorage.load();
    indexedDBStorage.startAutoSave(30000);
    console.log('✅ IndexedDB Storage initialisé');
  } catch (error) {
    console.error('❌ Erreur initialisation IndexedDB:', error);
    showError('Erreur IndexedDB', 'Utilisation de localStorage en fallback');
    // Fallback vers localStorage si IndexedDB échoue
    if (typeof storageManager !== 'undefined') {
      storageManager.load();
      storageManager.startAutoSave(30000);
    }
  }

  // Sauvegarder avant de quitter
  window.addEventListener('beforeunload', async (e) => {
    if (indexedDBStorage.hasUnsavedChanges) {
      await indexedDBStorage.save(false);
      e.preventDefault();
      e.returnValue = 'Vous avez des modifications non sauvegardées.';
    }
  });
});
