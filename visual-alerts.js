// === MODULE D'ALERTES VISUELLES ===

class VisualAlerts {
  constructor() {
    this.minCDForMachineAlert = 5; // Minimum 5 CD pour considérer une machine
  }

  // === DÉTECTER LES CD CRITIQUES (D1 > 18h) ===
  getCriticalCD() {
    return dbData.cd.filter(cd => cd.d1Reel > 18);
  }

  // === DÉTECTER LES MACHINES PROBLÉMATIQUES ===
  getProblematicMachines() {
    // Grouper les CD par machine
    const machineStats = {};

    dbData.cd.forEach(cd => {
      if (!machineStats[cd.numMachine]) {
        machineStats[cd.numMachine] = {
          machineId: cd.numMachine,
          cdList: [],
          totalCD: 0,
          performanceMoyenne: 0,
          tauxNiv1: 0,
          anomalies: 0
        };
      }

      machineStats[cd.numMachine].cdList.push(cd);
      machineStats[cd.numMachine].totalCD++;
    });

    // Calculer les stats et identifier les machines problématiques
    const problematicMachines = [];

    Object.values(machineStats).forEach(stats => {
      // Ignorer si moins de 5 CD
      if (stats.totalCD < this.minCDForMachineAlert) return;

      // Calculer la performance moyenne
      const perfTotal = stats.cdList.reduce((sum, cd) => sum + (cd.performance || 0), 0);
      stats.performanceMoyenne = perfTotal / stats.totalCD;

      // Calculer le taux NIV 1
      const cdNiv1 = stats.cdList.filter(cd => cd.qualite === '1').length;
      stats.tauxNiv1 = (cdNiv1 / stats.totalCD) * 100;

      // Compter les anomalies
      stats.anomalies = stats.cdList.filter(cd => cd.d1Reel > 18).length;

      // Machine problématique si :
      // - Performance moyenne < 70% OU
      // - Taux NIV 1 < 50% OU
      // - Plus de 2 anomalies
      if (stats.performanceMoyenne < 70 || stats.tauxNiv1 < 50 || stats.anomalies > 2) {
        problematicMachines.push(stats);
      }
    });

    // Trier par performance (pire en premier)
    problematicMachines.sort((a, b) => a.performanceMoyenne - b.performanceMoyenne);

    return problematicMachines;
  }

  // === APPLIQUER LES ALERTES VISUELLES DANS L'HISTORIQUE ===
  applyAlertsToHistorique() {
    const criticalCD = this.getCriticalCD();
    const problematicMachines = this.getProblematicMachines();
    const problematicMachineIds = problematicMachines.map(m => m.machineId);

    // Attendre que le tableau soit rendu
    setTimeout(() => {
      const tableRows = document.querySelectorAll('#tableHistorique tr');

      tableRows.forEach(row => {
        const cdId = row.dataset.cdId;
        if (!cdId) return;

        const cd = dbData.cd.find(c => c.id === cdId);
        if (!cd) return;

        // Alert: D1 > 18h (ligne en rouge clignotant)
        if (cd.d1Reel > 18) {
          row.classList.add('alert-critical-d1');
        }

        // Alert: Machine problématique (surlignée en orange)
        if (problematicMachineIds.includes(cd.numMachine)) {
          row.classList.add('alert-problematic-machine');
        }
      });
    }, 100);
  }

  // === AFFICHER LE PANNEAU D'ALERTES ===
  displayAlertsPanel() {
    const criticalCD = this.getCriticalCD();
    const problematicMachines = this.getProblematicMachines();

    let html = '<div class="alerts-panel">';

    // Alertes D1 > 18h
    if (criticalCD.length > 0) {
      html += `
        <div class="alert-section alert-section-critical">
          <div class="alert-header">
            <span class="alert-icon">🚨</span>
            <h4>CD Critiques (D1 > 18h)</h4>
            <span class="alert-badge">${criticalCD.length}</span>
          </div>
          <div class="alert-list">
      `;

      criticalCD.slice(0, 5).forEach(cd => {
        const machine = dbData.machines.find(m => m.id === cd.numMachine);
        html += `
          <div class="alert-item" onclick="voirDetailsCD('${cd.id}')">
            <div class="alert-item-title">
              ${cd.date} - ${machine ? machine.numero : 'N/A'}
            </div>
            <div class="alert-item-detail">
              D1 Réel: <strong>${cd.d1Reel}h</strong> | CAI: ${cd.cai}
            </div>
          </div>
        `;
      });

      if (criticalCD.length > 5) {
        html += `
          <div class="alert-item-more">
            + ${criticalCD.length - 5} autres CD critiques
          </div>
        `;
      }

      html += `
          </div>
        </div>
      `;
    }

    // Alertes Machines problématiques
    if (problematicMachines.length > 0) {
      html += `
        <div class="alert-section alert-section-warning">
          <div class="alert-header">
            <span class="alert-icon">⚠️</span>
            <h4>Machines à Surveiller (≥5 CD)</h4>
            <span class="alert-badge">${problematicMachines.length}</span>
          </div>
          <div class="alert-list">
      `;

      problematicMachines.slice(0, 5).forEach(stats => {
        const machine = dbData.machines.find(m => m.id === stats.machineId);
        const machineNumero = machine ? machine.numero : 'N/A';
        const machineType = machine ? machine.type : '';

        html += `
          <div class="alert-item">
            <div class="alert-item-title">
              ${machineNumero} ${machineType ? `(${machineType})` : ''}
            </div>
            <div class="alert-item-detail">
              Performance: <strong class="text-danger">${stats.performanceMoyenne.toFixed(1)}%</strong> |
              NIV 1: ${stats.tauxNiv1.toFixed(1)}% |
              Anomalies: ${stats.anomalies} |
              CD: ${stats.totalCD}
            </div>
          </div>
        `;
      });

      if (problematicMachines.length > 5) {
        html += `
          <div class="alert-item-more">
            + ${problematicMachines.length - 5} autres machines
          </div>
        `;
      }

      html += `
          </div>
        </div>
      `;
    }

    // Si aucune alerte
    if (criticalCD.length === 0 && problematicMachines.length === 0) {
      html += `
        <div class="alert-section alert-section-success">
          <div class="alert-header">
            <span class="alert-icon">✅</span>
            <h4>Aucune alerte</h4>
          </div>
          <div class="alert-list">
            <div class="alert-item">
              Toutes les machines fonctionnent correctement et aucun CD critique détecté.
            </div>
          </div>
        </div>
      `;
    }

    html += '</div>';

    return html;
  }

  // === AFFICHER LES ALERTES DANS LE DASHBOARD ===
  showAlertsInDashboard(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = this.displayAlertsPanel();
  }

  // === INITIALISER LES ALERTES ===
  init() {
    // Observer les changements dans l'historique
    const observer = new MutationObserver(() => {
      if (document.getElementById('historique')?.classList.contains('active')) {
        this.applyAlertsToHistorique();
      }
    });

    const historiqueTable = document.getElementById('tableHistorique');
    if (historiqueTable) {
      observer.observe(historiqueTable, { childList: true, subtree: true });
    }
  }
}

// Instance globale
const visualAlerts = new VisualAlerts();

// Initialiser au chargement
window.addEventListener('load', () => {
  visualAlerts.init();
});
