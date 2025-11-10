// === STORAGE MANAGER - AUTO-SAVE & LOCALSTORAGE ===
class StorageManager {
  constructor() {
    this.STORAGE_KEY = 'michelin_cd_data';
    this.LAST_SAVE_KEY = 'michelin_cd_last_save';
    this.BACKUP_KEY = 'michelin_cd_backup';
    this.autoSaveInterval = null;
    this.hasUnsavedChanges = false;
  }

  // === AUTO-SAVE ===
  startAutoSave(intervalMs = 30000) {
    this.autoSaveInterval = setInterval(() => {
      if (this.hasUnsavedChanges) {
        this.save();
        showToast('💾 Sauvegarde automatique', 'info');
      }
    }, intervalMs);
  }

  stopAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  markAsModified() {
    this.hasUnsavedChanges = true;
  }

  // === SAVE ===
  save(showNotification = false) {
    try {
      const dataToSave = {
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        data: dbData
      };

      // Créer une backup avant d'écraser
      const existing = localStorage.getItem(this.STORAGE_KEY);
      if (existing) {
        localStorage.setItem(this.BACKUP_KEY, existing);
      }

      // Sauvegarder
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(dataToSave));
      localStorage.setItem(this.LAST_SAVE_KEY, new Date().toISOString());

      this.hasUnsavedChanges = false;

      if (showNotification) {
        showSuccess('Données sauvegardées', 'Sauvegarde locale réussie');
      }

      return true;
    } catch (error) {
      console.error('❌ Erreur sauvegarde:', error);
      if (error.name === 'QuotaExceededError') {
        showError('Espace de stockage insuffisant', 'Veuillez exporter vos données et nettoyer le cache');
      } else {
        showError('Erreur lors de la sauvegarde', error.message);
      }
      return false;
    }
  }

  // === LOAD ===
  load() {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (!saved) {
        return false;
      }

      const parsed = JSON.parse(saved);

      // Charger les données
      if (parsed.data) {
        Object.assign(dbData, parsed.data);

        // S'assurer que les opérateurs protégés sont toujours présents
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

        const lastSave = localStorage.getItem(this.LAST_SAVE_KEY);
        if (lastSave) {
          const date = new Date(lastSave);
          showSuccess('Données restaurées', `Dernière sauvegarde: ${date.toLocaleString('fr-FR')}`);
        } else {
          showSuccess('Données restaurées', 'Sauvegarde locale chargée');
        }

        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ Erreur chargement:', error);
      showError('Erreur lors du chargement', 'Impossible de restaurer les données locales');
      return false;
    }
  }

  // === RESTORE BACKUP ===
  restoreBackup() {
    try {
      const backup = localStorage.getItem(this.BACKUP_KEY);
      if (!backup) {
        showWarning('Aucune sauvegarde disponible', 'Pas de backup trouvé');
        return false;
      }

      localStorage.setItem(this.STORAGE_KEY, backup);
      this.load();
      showSuccess('Backup restauré', 'Données restaurées depuis la sauvegarde précédente');
      return true;
    } catch (error) {
      console.error('❌ Erreur restore backup:', error);
      showError('Erreur lors de la restauration', error.message);
      return false;
    }
  }

  // === CLEAR ===
  clear(confirm = true) {
    if (confirm && !window.confirm('⚠️ ATTENTION: Supprimer toutes les données locales ?')) {
      return false;
    }

    try {
      localStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem(this.LAST_SAVE_KEY);
      localStorage.removeItem(this.BACKUP_KEY);

      showSuccess('Données supprimées', 'Cache local nettoyé');
      return true;
    } catch (error) {
      console.error('❌ Erreur clear:', error);
      showError('Erreur lors du nettoyage', error.message);
      return false;
    }
  }

  // === EXPORT FILE ===
  exportToFile() {
    try {
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
    } catch (error) {
      console.error('❌ Erreur export:', error);
      showError('Erreur lors de l\'export', error.message);
      return false;
    }
  }

  // === IMPORT FILE ===
  importFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);

          // Valider la structure
          if (!data.data || !data.data.operateurs || !data.data.machines || !data.data.cd) {
            throw new Error('Structure de fichier invalide');
          }

          // Demander confirmation
          const msg = `📊 Importer ces données ?\n\n` +
                      `• ${data.data.cd.length} CD\n` +
                      `• ${data.data.operateurs.length} opérateurs\n` +
                      `• ${data.data.machines.length} machines\n\n` +
                      `⚠️ Les données actuelles seront écrasées !`;

          if (!window.confirm(msg)) {
            reject(new Error('Import annulé par l\'utilisateur'));
            return;
          }

          // Importer
          Object.assign(dbData, data.data);

          // S'assurer que les opérateurs protégés sont toujours présents
          const operateursProtegés = [
            { id: 'op_harel_protected', nom: 'Harel', dateAjout: '2025-01-01', protected: true },
            { id: 'op_kyndt_protected', nom: 'Kyndt', dateAjout: '2025-01-01', protected: true }
          ];

          operateursProtegés.forEach(opProtegé => {
            if (!dbData.operateurs.find(o => o.id === opProtegé.id)) {
              dbData.operateurs.push(opProtegé);
            }
          });

          this.save(false);

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

  // === GET STATS ===
  getStats() {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      const backup = localStorage.getItem(this.BACKUP_KEY);
      const lastSave = localStorage.getItem(this.LAST_SAVE_KEY);

      return {
        hasData: !!saved,
        hasBackup: !!backup,
        sizeKB: saved ? (saved.length / 1024).toFixed(2) : 0,
        backupSizeKB: backup ? (backup.length / 1024).toFixed(2) : 0,
        lastSave: lastSave ? new Date(lastSave) : null,
        cdCount: dbData.cd.length,
        operateursCount: dbData.operateurs.length,
        machinesCount: dbData.machines.length
      };
    } catch (error) {
      console.error('❌ Erreur stats:', error);
      return null;
    }
  }

  // === DISPLAY STATS ===
  displayStats() {
    const stats = this.getStats();
    if (!stats) return;

    const lastSaveStr = stats.lastSave
      ? stats.lastSave.toLocaleString('fr-FR')
      : 'Jamais';

    console.log('📊 STATS STOCKAGE:');
    console.log(`• Taille: ${stats.sizeKB} KB`);
    console.log(`• Backup: ${stats.backupSizeKB} KB`);
    console.log(`• Dernière sauvegarde: ${lastSaveStr}`);
    console.log(`• CD: ${stats.cdCount}`);
    console.log(`• Opérateurs: ${stats.operateursCount}`);
    console.log(`• Machines: ${stats.machinesCount}`);
  }
}

// Instance globale
const storageManager = new StorageManager();

// Démarrer l'auto-save au chargement de la page
window.addEventListener('load', () => {
  // Petit délai pour s'assurer que app.js est chargé
  setTimeout(() => {
    // Charger les données sauvegardées
    storageManager.load();

    // Démarrer l'auto-save (toutes les 30 secondes)
    storageManager.startAutoSave(30000);
  }, 100);

  // Sauvegarder avant de quitter la page
  window.addEventListener('beforeunload', (e) => {
    if (storageManager.hasUnsavedChanges) {
      storageManager.save(false);
      e.preventDefault();
      e.returnValue = 'Vous avez des modifications non sauvegardées.';
    }
  });
});
