// === MODULE DE GÉNÉRATION DE RAPPORTS D'IMPRESSION ===
// Analyse des performances J-1

class PrintReportsManager {
  constructor() {
    this.printWindow = null;
  }

  // === RAPPORT J-1 (ANALYSE QUOTIDIENNE) ===
  async generateDailyReport(dateParam) {
    console.log('🔍 generateDailyReport appelé avec:', dateParam);

    // Vérifier que dbData est chargé
    if (!window.dbData || !window.dbData.cd) {
      alert('Erreur : Les données ne sont pas encore chargées.');
      return;
    }

    // Calculer la date J-1
    const today = new Date();
    const targetDate = dateParam ? new Date(dateParam) : new Date(today);
    targetDate.setDate(targetDate.getDate() - 1);
    const dateStr = targetDate.toISOString().split('T')[0];

    console.log('📅 Date J-1:', dateStr);

    // Filtrer les CD de la date J-1
    const cdsFiltered = dbData.cd.filter(cd => {
      const cdDate = new Date(cd.date).toISOString().split('T')[0];
      return cdDate === dateStr;
    });

    console.log('✅ CD trouvés:', cdsFiltered.length);

    if (cdsFiltered.length === 0) {
      alert('Aucun CD trouvé pour la date J-1 (' + this.formatDate(targetDate) + ')');
      return;
    }

    // Calculer les statistiques
    const globalStats = this.calculateGlobalStats(cdsFiltered);
    const machineStats = this.calculateMachineStats(cdsFiltered);

    // Générer le HTML
    const html = this.generateReportHTML(targetDate, globalStats, machineStats);

    // Ouvrir la fenêtre d'impression
    this.openPrintWindow(html);
  }

  // === RAPPORT PÉRIODE ===
  async generatePeriodReport(period) {
    console.log('🔍 generatePeriodReport:', period);

    if (!window.dbData || !window.dbData.cd) {
      alert('Erreur : Les données ne sont pas encore chargées.');
      return;
    }

    const today = new Date();
    let startDate, endDate, periodLabel;

    if (period === 'week') {
      endDate = new Date(today);
      endDate.setDate(endDate.getDate() - 1);
      startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 6);
      periodLabel = 'Semaine';
    } else if (period === 'month') {
      endDate = new Date(today);
      endDate.setDate(endDate.getDate() - 1);
      startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 29);
      periodLabel = 'Mois';
    }

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    const cdsFiltered = dbData.cd.filter(cd => {
      const cdDate = new Date(cd.date).toISOString().split('T')[0];
      return cdDate >= startDateStr && cdDate <= endDateStr;
    });

    if (cdsFiltered.length === 0) {
      alert('Aucun CD trouvé pour la période sélectionnée');
      return;
    }

    const globalStats = this.calculateGlobalStats(cdsFiltered);
    const machineStats = this.calculateMachineStats(cdsFiltered);

    const html = this.generatePeriodReportHTML(startDate, endDate, globalStats, machineStats, periodLabel);
    this.openPrintWindow(html);
  }

  // === CALCUL DES STATISTIQUES GLOBALES ===
  calculateGlobalStats(cds) {
    const stats = {
      totalCD: cds.length,
      totalD1Heures: 0, // Somme des D1 en heures
      moyenneD1: 0, // Moyenne D1 en heures
      totalRetoursArchi: 0, // CD avec qualite != "1"
      totalCQApres: 0, // CD avec cqApres = "Oui"
      totalPannes: 0, // CD avec incident = "Oui"
      detailRetoursArchi: {}, // Par niveau de qualité
      detailCQ: {}, // Par code CQ
      detailPannes: {} // Par code panne
    };

    cds.forEach(cd => {
      // D1 - Utiliser d1Net (temps net)
      if (cd.d1Net && !isNaN(cd.d1Net)) {
        stats.totalD1Heures += parseFloat(cd.d1Net);
      } else if (cd.d1Reel && !isNaN(cd.d1Reel)) {
        stats.totalD1Heures += parseFloat(cd.d1Reel);
      }

      // Retours Archi - qualite différente de "1"
      if (cd.qualite && cd.qualite !== "1") {
        stats.totalRetoursArchi++;

        const niveau = cd.qualite;
        if (!stats.detailRetoursArchi[niveau]) {
          stats.detailRetoursArchi[niveau] = 0;
        }
        stats.detailRetoursArchi[niveau]++;
      }

      // CQ après CD
      if (cd.cqApres === "Oui") {
        stats.totalCQApres++;

        // Détail par code CQ
        if (cd.codeCQ) {
          const codeCQ = dbData.codesCQ.find(c => c.id === cd.codeCQ);
          if (codeCQ) {
            if (!stats.detailCQ[codeCQ.code]) {
              stats.detailCQ[codeCQ.code] = {
                description: codeCQ.description,
                count: 0
              };
            }
            stats.detailCQ[codeCQ.code].count++;
          }
        }
      }

      // Pannes
      if (cd.incident === "Oui") {
        stats.totalPannes++;

        // Détail par code panne
        if (cd.codeIncident) {
          const codePanne = dbData.codesIncident.find(c => c.id === cd.codeIncident);
          if (codePanne) {
            if (!stats.detailPannes[codePanne.code]) {
              stats.detailPannes[codePanne.code] = {
                description: codePanne.description,
                count: 0
              };
            }
            stats.detailPannes[codePanne.code].count++;
          }
        }
      }
    });

    // Calculer la moyenne D1
    stats.moyenneD1 = stats.totalCD > 0 ? (stats.totalD1Heures / stats.totalCD).toFixed(2) : 0;

    return stats;
  }

  // === CALCUL DES STATISTIQUES PAR MACHINE ===
  calculateMachineStats(cds) {
    const machineStats = {};

    cds.forEach(cd => {
      // Trouver la machine
      const machine = dbData.machines.find(m => m.id === cd.numMachine);
      if (!machine) return;

      const machineKey = machine.numero + ' (' + machine.type + ')';

      if (!machineStats[machineKey]) {
        machineStats[machineKey] = {
          numero: machine.numero,
          type: machine.type,
          totalCD: 0,
          totalD1Heures: 0,
          moyenneD1: 0,
          totalRetoursArchi: 0,
          totalCQApres: 0,
          totalPannes: 0,
          detailPannes: {},
          cdList: [] // Liste détaillée des CD
        };
      }

      const stats = machineStats[machineKey];
      stats.totalCD++;

      // D1
      let d1Value = 0;
      if (cd.d1Net && !isNaN(cd.d1Net)) {
        d1Value = parseFloat(cd.d1Net);
      } else if (cd.d1Reel && !isNaN(cd.d1Reel)) {
        d1Value = parseFloat(cd.d1Reel);
      }
      stats.totalD1Heures += d1Value;

      // Retours Archi
      if (cd.qualite && cd.qualite !== "1") {
        stats.totalRetoursArchi++;
      }

      // CQ après CD
      if (cd.cqApres === "Oui") {
        stats.totalCQApres++;
      }

      // Pannes
      let panneInfo = '-';
      if (cd.incident === "Oui") {
        stats.totalPannes++;

        if (cd.codeIncident) {
          const codePanne = dbData.codesIncident.find(c => c.id === cd.codeIncident);
          if (codePanne) {
            panneInfo = codePanne.code;

            if (!stats.detailPannes[codePanne.code]) {
              stats.detailPannes[codePanne.code] = {
                description: codePanne.description,
                count: 0
              };
            }
            stats.detailPannes[codePanne.code].count++;
          }
        }
      }

      // Détails du CD
      const conf1 = dbData.operateurs.find(op => op.id === cd.conf1);
      const conf2 = dbData.operateurs.find(op => op.id === cd.conf2);

      stats.cdList.push({
        heure: cd.heure || '-',
        cai: cd.cai || '-',
        dimension: cd.dimension || '-',
        conf1: conf1 ? conf1.nom : '-',
        conf2: conf2 ? conf2.nom : '-',
        d1: d1Value.toFixed(2) + 'h',
        qualite: cd.qualite || '-',
        cqApres: cd.cqApres === "Oui" ? 'Oui' : 'Non',
        panne: panneInfo,
        commentaire: cd.commentaire || '-'
      });
    });

    // Calculer les moyennes D1 par machine
    Object.values(machineStats).forEach(stats => {
      stats.moyenneD1 = stats.totalCD > 0 ? (stats.totalD1Heures / stats.totalCD).toFixed(2) : 0;
    });

    return machineStats;
  }

  // === GÉNÉRATION DU HTML ===
  generateReportHTML(date, globalStats, machineStats) {
    const dateFormatted = this.formatDate(date);

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Rapport J-1 - ${dateFormatted}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 15mm;
            background: #fff;
            color: #000;
            font-size: 10pt;
          }

          .header {
            text-align: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 3px solid #000;
          }
          .header h1 {
            font-size: 20pt;
            font-weight: 600;
            margin-bottom: 5px;
          }
          .header .date {
            font-size: 12pt;
            color: #333;
          }

          .section-title {
            font-size: 14pt;
            font-weight: 600;
            margin: 20px 0 10px 0;
            padding-bottom: 5px;
            border-bottom: 2px solid #000;
            text-transform: uppercase;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0 20px 0;
          }

          th {
            background: #e0e0e0;
            padding: 8px;
            text-align: left;
            font-weight: 600;
            font-size: 9pt;
            border: 1px solid #666;
          }

          td {
            padding: 6px 8px;
            border: 1px solid #999;
            font-size: 9pt;
          }

          tbody tr:nth-child(even) {
            background: #f5f5f5;
          }

          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .bold { font-weight: 600; }

          .machine-block {
            margin: 20px 0;
            padding: 15px;
            border: 2px solid #666;
            background: #fafafa;
            page-break-inside: avoid;
          }

          .machine-header {
            font-size: 12pt;
            font-weight: 600;
            margin-bottom: 10px;
            padding: 8px;
            background: #d0d0d0;
            border-left: 5px solid #000;
          }

          .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            margin: 10px 0;
          }

          .stat-box {
            padding: 10px;
            background: #fff;
            border: 1px solid #999;
            text-align: center;
          }

          .stat-value {
            font-size: 18pt;
            font-weight: 600;
            color: #000;
          }

          .stat-label {
            font-size: 8pt;
            color: #666;
            margin-top: 3px;
          }

          .footer {
            margin-top: 30px;
            padding-top: 10px;
            border-top: 1px solid #999;
            text-align: center;
            font-size: 8pt;
            color: #666;
          }

          @media print {
            body { margin: 10mm; }
            .machine-block { page-break-inside: avoid; }
            @page { size: A4 landscape; margin: 10mm; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>RAPPORT D'ANALYSE J-1</h1>
          <div class="date">${dateFormatted}</div>
        </div>

        <!-- VUE D'ENSEMBLE GLOBALE -->
        <div class="section-title">Vue d'Ensemble</div>

        <div class="stats-grid">
          <div class="stat-box">
            <div class="stat-value">${globalStats.totalCD}</div>
            <div class="stat-label">Total CD</div>
          </div>
          <div class="stat-box">
            <div class="stat-value">${globalStats.moyenneD1}h</div>
            <div class="stat-label">D1 Moyen</div>
          </div>
          <div class="stat-box">
            <div class="stat-value">${globalStats.totalRetoursArchi}</div>
            <div class="stat-label">Retours Archi</div>
          </div>
          <div class="stat-box">
            <div class="stat-value">${globalStats.totalCQApres}</div>
            <div class="stat-label">CQ Après CD</div>
          </div>
        </div>

        <!-- DÉTAIL RETOURS ARCHI -->
        ${Object.keys(globalStats.detailRetoursArchi).length > 0 ? `
          <table style="width: 50%; margin-top: 15px;">
            <thead>
              <tr>
                <th>Niveau Qualité</th>
                <th class="text-center" style="width: 100px;">Nombre</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(globalStats.detailRetoursArchi).map(([niveau, count]) => `
                <tr>
                  <td class="bold">Niveau ${niveau}</td>
                  <td class="text-center bold">${count}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}

        <!-- DÉTAIL CQ APRÈS CD -->
        ${Object.keys(globalStats.detailCQ).length > 0 ? `
          <div style="margin-top: 15px; font-weight: 600;">CQ Après CD - Détail :</div>
          <table style="width: 60%;">
            <thead>
              <tr>
                <th>Code CQ</th>
                <th>Description</th>
                <th class="text-center" style="width: 100px;">Nombre</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(globalStats.detailCQ).map(([code, data]) => `
                <tr>
                  <td class="bold">${code}</td>
                  <td>${data.description}</td>
                  <td class="text-center bold">${data.count}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}

        <!-- DÉTAIL PANNES GLOBALES -->
        ${Object.keys(globalStats.detailPannes).length > 0 ? `
          <div style="margin-top: 15px; font-weight: 600;">Pannes - Total ${globalStats.totalPannes} :</div>
          <table style="width: 60%;">
            <thead>
              <tr>
                <th>Code Panne</th>
                <th>Description</th>
                <th class="text-center" style="width: 100px;">Nombre</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(globalStats.detailPannes).sort((a, b) => b[1].count - a[1].count).map(([code, data]) => `
                <tr>
                  <td class="bold">${code}</td>
                  <td>${data.description}</td>
                  <td class="text-center bold">${data.count}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}

        <!-- ANALYSE PAR MACHINE -->
        <div class="section-title" style="page-break-before: always; margin-top: 30px;">Analyse Détaillée par Machine</div>
    `;

    // Trier les machines par numéro
    const sortedMachines = Object.entries(machineStats).sort((a, b) => {
      const numA = parseInt(a[1].numero);
      const numB = parseInt(b[1].numero);
      return numA - numB;
    });

    sortedMachines.forEach(([machineName, stats]) => {
      html += `
        <div class="machine-block">
          <div class="machine-header">Machine ${stats.numero} - ${stats.type}</div>

          <!-- Stats machine -->
          <div class="stats-grid" style="grid-template-columns: repeat(5, 1fr); margin-bottom: 15px;">
            <div class="stat-box">
              <div class="stat-value">${stats.totalCD}</div>
              <div class="stat-label">CD</div>
            </div>
            <div class="stat-box">
              <div class="stat-value">${stats.moyenneD1}h</div>
              <div class="stat-label">D1 Moyen</div>
            </div>
            <div class="stat-box">
              <div class="stat-value">${stats.totalRetoursArchi}</div>
              <div class="stat-label">Retours Archi</div>
            </div>
            <div class="stat-box">
              <div class="stat-value">${stats.totalCQApres}</div>
              <div class="stat-label">CQ Après</div>
            </div>
            <div class="stat-box">
              <div class="stat-value">${stats.totalPannes}</div>
              <div class="stat-label">Pannes</div>
            </div>
          </div>

          <!-- Détail pannes machine -->
          ${Object.keys(stats.detailPannes).length > 0 ? `
            <div style="margin: 10px 0; padding: 8px; background: #fff; border: 1px solid #999;">
              <div style="font-weight: 600; margin-bottom: 5px;">Pannes de cette machine :</div>
              ${Object.entries(stats.detailPannes).map(([code, data]) =>
                `<span style="margin-right: 15px;"><strong>${code}</strong>: ${data.count}x</span>`
              ).join('')}
            </div>
          ` : ''}

          <!-- Liste des CD -->
          <table style="font-size: 8pt; margin-top: 10px;">
            <thead>
              <tr>
                <th>Heure</th>
                <th>CAI</th>
                <th>Dimension</th>
                <th>Conf 1</th>
                <th>Conf 2</th>
                <th class="text-center">D1</th>
                <th class="text-center">Qualité</th>
                <th class="text-center">CQ</th>
                <th class="text-center">Panne</th>
                <th>Commentaire</th>
              </tr>
            </thead>
            <tbody>
              ${stats.cdList.map(cd => `
                <tr>
                  <td>${cd.heure}</td>
                  <td>${cd.cai}</td>
                  <td>${cd.dimension}</td>
                  <td>${cd.conf1}</td>
                  <td>${cd.conf2}</td>
                  <td class="text-center bold">${cd.d1}</td>
                  <td class="text-center">${cd.qualite}</td>
                  <td class="text-center">${cd.cqApres}</td>
                  <td class="text-center">${cd.panne}</td>
                  <td>${cd.commentaire}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    });

    html += `
        <div class="footer">
          Rapport généré le ${new Date().toLocaleString('fr-FR')} - Michelin Gravanches Dashboard CD
        </div>
      </body>
      </html>
    `;

    return html;
  }

  // === RAPPORT PÉRIODE ===
  generatePeriodReportHTML(startDate, endDate, globalStats, machineStats, periodLabel) {
    // Utiliser le même template que le rapport quotidien
    const html = this.generateReportHTML(startDate, globalStats, machineStats);
    return html.replace('J-1', periodLabel).replace(this.formatDate(startDate),
      `Du ${this.formatDate(startDate)} au ${this.formatDate(endDate)}`);
  }

  // === RAPPORT PERFORMANCE INDIVIDUEL ===
  async generatePerformanceReport(operateurId, startDate, endDate) {
    if (!window.dbData || !window.dbData.cd || !window.dbData.operateurs) {
      alert('Erreur : Les données ne sont pas encore chargées.');
      return;
    }

    if (!operateurId) {
      alert('Veuillez sélectionner un opérateur.');
      return;
    }

    const operateur = dbData.operateurs.find(op => op.id === operateurId);
    if (!operateur) {
      alert('Opérateur non trouvé.');
      return;
    }

    // Filtrer les CD où l'opérateur est conf1 OU conf2
    const cdsFiltered = dbData.cd.filter(cd => {
      // Vérifier l'opérateur
      if (cd.conf1 !== operateurId && cd.conf2 !== operateurId) return false;

      // Vérifier la période
      const cdDate = new Date(cd.date);
      const start = startDate ? new Date(startDate) : new Date(0);
      const end = endDate ? new Date(endDate) : new Date();

      return cdDate >= start && cdDate <= end;
    });

    if (cdsFiltered.length === 0) {
      alert('Aucun CD trouvé pour cet opérateur sur cette période.');
      return;
    }

    const perfStats = this.calculateGlobalStats(cdsFiltered);
    const html = this.generatePerformanceReportHTML(operateur, perfStats, startDate, endDate);
    this.openPrintWindow(html);
  }

  generatePerformanceReportHTML(operateur, stats, startDate, endDate) {
    const periodStr = this.getPeriodString(startDate, endDate);

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Rapport Performance - ${operateur.nom}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 15mm;
            background: #fff;
            color: #000;
            font-size: 10pt;
          }

          .header {
            text-align: center;
            margin-bottom: 20px;
            padding: 20px;
            border: 3px solid #000;
          }
          .header h1 {
            font-size: 20pt;
            font-weight: 600;
            margin-bottom: 8px;
          }
          .header .operator {
            font-size: 16pt;
            font-weight: 600;
            margin: 8px 0;
          }
          .header .period {
            font-size: 11pt;
            color: #333;
          }

          .section-title {
            font-size: 14pt;
            font-weight: 600;
            margin: 20px 0 10px 0;
            padding-bottom: 5px;
            border-bottom: 2px solid #000;
            text-transform: uppercase;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0 20px 0;
          }

          th {
            background: #e0e0e0;
            padding: 10px;
            text-align: center;
            font-weight: 600;
            font-size: 10pt;
            border: 1px solid #666;
          }

          td {
            padding: 8px;
            border: 1px solid #999;
            font-size: 10pt;
            text-align: center;
          }

          .stat-value {
            font-size: 16pt;
            font-weight: 600;
            color: #000;
          }

          .footer {
            margin-top: 30px;
            padding-top: 10px;
            border-top: 1px solid #999;
            text-align: center;
            font-size: 8pt;
            color: #666;
          }

          @media print {
            body { margin: 10mm; }
            @page { size: A4; margin: 10mm; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>RAPPORT DE PERFORMANCE</h1>
          <div class="operator">${operateur.nom}</div>
          <div class="period">${periodStr}</div>
        </div>

        <div class="section-title">Indicateurs de Performance</div>

        <table style="width: 80%; margin: 20px auto;">
          <thead>
            <tr>
              <th>Total CD</th>
              <th>D1 Moyen</th>
              <th>Retours Archi</th>
              <th>CQ Après CD</th>
              <th>Pannes</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="stat-value">${stats.totalCD}</td>
              <td class="stat-value">${stats.moyenneD1}h</td>
              <td class="stat-value">${stats.totalRetoursArchi}</td>
              <td class="stat-value">${stats.totalCQApres}</td>
              <td class="stat-value">${stats.totalPannes}</td>
            </tr>
          </tbody>
        </table>

        ${Object.keys(stats.detailRetoursArchi).length > 0 ? `
          <div class="section-title">Détail Retours Archi</div>
          <table style="width: 50%;">
            <thead>
              <tr>
                <th>Niveau</th>
                <th>Nombre</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(stats.detailRetoursArchi).map(([niveau, count]) => `
                <tr>
                  <td>Niveau ${niveau}</td>
                  <td class="stat-value">${count}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}

        ${Object.keys(stats.detailCQ).length > 0 ? `
          <div class="section-title">Détail CQ Après CD</div>
          <table style="width: 70%;">
            <thead>
              <tr>
                <th style="text-align: left;">Code</th>
                <th style="text-align: left;">Description</th>
                <th style="width: 100px;">Nombre</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(stats.detailCQ).map(([code, data]) => `
                <tr>
                  <td style="text-align: left; font-weight: 600;">${code}</td>
                  <td style="text-align: left;">${data.description}</td>
                  <td class="stat-value">${data.count}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}

        <div class="footer">
          Rapport généré le ${new Date().toLocaleString('fr-FR')} - Michelin Gravanches Dashboard CD
        </div>
      </body>
      </html>
    `;

    return html;
  }

  // === UTILITAIRES ===
  openPrintWindow(html) {
    this.printWindow = window.open('', '_blank', 'width=1200,height=800');
    this.printWindow.document.write(html);
    this.printWindow.document.close();
    this.printWindow.onload = function() {
      setTimeout(() => {
        this.print();
      }, 500);
    };
  }

  formatDate(date) {
    return new Date(date).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getPeriodString(startDate, endDate) {
    if (!startDate && !endDate) return 'Toute la période';
    if (!startDate) return `Jusqu'au ${this.formatDate(endDate)}`;
    if (!endDate) return `Depuis le ${this.formatDate(startDate)}`;
    return `Du ${this.formatDate(startDate)} au ${this.formatDate(endDate)}`;
  }
}

// Instance globale
const printReportsManager = new PrintReportsManager();

// === FONCTIONS HELPER POUR LES MODALES ===

function openCustomDateReportModal() {
  const today = new Date().toISOString().split('T')[0];

  const html = `
    <div class="modal" id="modalCustomDateReport" style="display: flex;">
      <div class="modal-content">
        <h3>Sélectionner une date pour le rapport</h3>
        <p style="color: var(--color-text-secondary); margin-bottom: 20px;">
          Le rapport J-1 sera généré pour la veille de la date sélectionnée
        </p>
        <div class="form-group">
          <label class="form-label">Date</label>
          <input type="date" id="customReportDate" class="form-control" value="${today}" max="${today}">
        </div>
        <div class="modal-actions" style="margin-top: 20px;">
          <button class="btn btn--primary" onclick="generateCustomDateReport()">
            Générer le rapport
          </button>
          <button class="btn btn--secondary" onclick="closeCustomDateReportModal()">
            Annuler
          </button>
        </div>
      </div>
    </div>
  `;

  const existingModal = document.getElementById('modalCustomDateReport');
  if (existingModal) existingModal.remove();
  document.body.insertAdjacentHTML('beforeend', html);
}

function generateCustomDateReport() {
  const dateInput = document.getElementById('customReportDate');
  if (!dateInput || !dateInput.value) {
    alert('Veuillez sélectionner une date');
    return;
  }

  const selectedDate = new Date(dateInput.value);
  closeCustomDateReportModal();
  printReportsManager.generateDailyReport(selectedDate);
}

function closeCustomDateReportModal() {
  const modal = document.getElementById('modalCustomDateReport');
  if (modal) modal.remove();
}

function openPerformanceReportModal() {
  if (!window.dbData || !window.dbData.operateurs) {
    alert('Erreur : Les données ne sont pas encore chargées.');
    return;
  }

  if (dbData.operateurs.length === 0) {
    alert('Aucun opérateur disponible.');
    return;
  }

  const today = new Date().toISOString().split('T')[0];
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const oneMonthAgoStr = oneMonthAgo.toISOString().split('T')[0];

  let operateursOptions = '<option value="">-- Sélectionner un opérateur --</option>';
  dbData.operateurs.forEach(op => {
    operateursOptions += `<option value="${op.id}">${op.nom}</option>`;
  });

  const html = `
    <div class="modal" id="modalPerformanceReport" style="display: flex;">
      <div class="modal-content modal-large">
        <h3>Rapport de Performance Individuel</h3>
        <p style="color: var(--color-text-secondary); margin-bottom: 20px;">
          Générer un rapport de performance pour un opérateur
        </p>

        <div class="form-group">
          <label class="form-label">Opérateur *</label>
          <select id="perfReportOperateur" class="form-control">
            ${operateursOptions}
          </select>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-16); margin-top: var(--space-16);">
          <div class="form-group">
            <label class="form-label">Date de début</label>
            <input type="date" id="perfReportStartDate" class="form-control" value="${oneMonthAgoStr}">
          </div>
          <div class="form-group">
            <label class="form-label">Date de fin</label>
            <input type="date" id="perfReportEndDate" class="form-control" value="${today}" max="${today}">
          </div>
        </div>

        <div class="modal-actions" style="margin-top: var(--space-20);">
          <button class="btn btn--primary" onclick="generatePerformanceReportFromModal()">
            Générer le rapport
          </button>
          <button class="btn btn--secondary" onclick="closePerformanceReportModal()">
            Annuler
          </button>
        </div>
      </div>
    </div>
  `;

  const existingModal = document.getElementById('modalPerformanceReport');
  if (existingModal) existingModal.remove();
  document.body.insertAdjacentHTML('beforeend', html);
}

function generatePerformanceReportFromModal() {
  const operateurSelect = document.getElementById('perfReportOperateur');
  const startDateInput = document.getElementById('perfReportStartDate');
  const endDateInput = document.getElementById('perfReportEndDate');

  if (!operateurSelect || !operateurSelect.value) {
    alert('Veuillez sélectionner un opérateur');
    return;
  }

  const operateurId = operateurSelect.value;
  const startDate = startDateInput && startDateInput.value ? startDateInput.value : null;
  const endDate = endDateInput && endDateInput.value ? endDateInput.value : null;

  closePerformanceReportModal();
  printReportsManager.generatePerformanceReport(operateurId, startDate, endDate);
}

function closePerformanceReportModal() {
  const modal = document.getElementById('modalPerformanceReport');
  if (modal) modal.remove();
}
