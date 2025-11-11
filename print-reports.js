// === MODULE DE GÉNÉRATION DE RAPPORTS D'IMPRESSION ===

class PrintReportsManager {
  constructor() {
    this.printWindow = null;
  }

  // === RAPPORT J-1 (ANALYSE QUOTIDIENNE) ===
  async generateDailyReport(dateParam) {
    console.log('🔍 generateDailyReport appelé avec:', dateParam);

    // Vérifier que dbData est chargé
    if (!window.dbData || !window.dbData.cd) {
      alert('Erreur : Les données ne sont pas encore chargées. Veuillez patienter quelques instants et réessayer.');
      console.error('❌ dbData non disponible:', window.dbData);
      return;
    }

    console.log('📊 Nombre total de CD dans la base:', dbData.cd.length);

    // Si aucune date fournie, prendre la date du PC actuelle
    const today = new Date();
    const targetDate = dateParam ? new Date(dateParam) : new Date(today);

    // Soustraire 1 jour pour avoir J-1
    targetDate.setDate(targetDate.getDate() - 1);

    const dateStr = targetDate.toISOString().split('T')[0];
    console.log('📅 Date J-1 calculée:', dateStr, '(', this.formatDate(targetDate), ')');

    const cdsFiltered = dbData.cd.filter(cd => {
      const cdDate = new Date(cd.date).toISOString().split('T')[0];
      return cdDate === dateStr;
    });

    console.log('✅ CD trouvés pour cette date:', cdsFiltered.length);

    if (cdsFiltered.length === 0) {
      alert('Aucun CD trouvé pour la date J-1 (' + this.formatDate(targetDate) + ')\n\n' +
            'Date recherchée : ' + dateStr + '\n' +
            'Total CD dans la base : ' + dbData.cd.length);
      return;
    }

    // Calculer les statistiques globales
    const globalStats = this.calculateGlobalStats(cdsFiltered);

    // Calculer les statistiques par machine
    const machineStats = this.calculateMachineStats(cdsFiltered);

    // Générer le HTML du rapport
    const html = this.generateDailyReportHTML(targetDate, globalStats, machineStats, 'J-1');

    // Ouvrir la fenêtre d'impression
    this.openPrintWindow(html, 'Rapport J-1 - ' + this.formatDate(targetDate));
  }

  // === RAPPORT PÉRIODE (SEMAINE/MOIS) ===
  async generatePeriodReport(period) {
    console.log('🔍 generatePeriodReport appelé avec période:', period);

    // Vérifier que dbData est chargé
    if (!window.dbData || !window.dbData.cd) {
      alert('Erreur : Les données ne sont pas encore chargées. Veuillez patienter quelques instants et réessayer.');
      console.error('❌ dbData non disponible:', window.dbData);
      return;
    }

    console.log('📊 Nombre total de CD dans la base:', dbData.cd.length);

    const today = new Date();
    let startDate, endDate, periodLabel;

    if (period === 'week') {
      // Semaine dernière (7 jours)
      endDate = new Date(today);
      endDate.setDate(endDate.getDate() - 1); // Hier
      startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 6); // 7 jours avant hier
      periodLabel = 'Semaine';
    } else if (period === 'month') {
      // Mois dernier
      endDate = new Date(today);
      endDate.setDate(endDate.getDate() - 1); // Hier
      startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 29); // 30 jours avant hier
      periodLabel = 'Mois';
    }

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    console.log('📅 Période:', startDateStr, 'au', endDateStr);

    const cdsFiltered = dbData.cd.filter(cd => {
      const cdDate = new Date(cd.date).toISOString().split('T')[0];
      return cdDate >= startDateStr && cdDate <= endDateStr;
    });

    console.log('✅ CD trouvés pour cette période:', cdsFiltered.length);

    if (cdsFiltered.length === 0) {
      alert('Aucun CD trouvé pour la période du ' + this.formatDate(startDate) + ' au ' + this.formatDate(endDate) + '\n\n' +
            'Total CD dans la base : ' + dbData.cd.length);
      return;
    }

    // Calculer les statistiques globales
    const globalStats = this.calculateGlobalStats(cdsFiltered);

    // Calculer les statistiques par machine
    const machineStats = this.calculateMachineStats(cdsFiltered);

    // Générer le HTML du rapport
    const html = this.generatePeriodReportHTML(startDate, endDate, globalStats, machineStats, periodLabel);

    // Ouvrir la fenêtre d'impression
    this.openPrintWindow(html, 'Rapport ' + periodLabel + ' - ' + this.formatDate(startDate) + ' au ' + this.formatDate(endDate));
  }

  calculateGlobalStats(cds) {
    const stats = {
      totalCD: cds.length,
      totalD1: 0,
      totalArchi: 0,
      totalCQ: 0,
      totalPannes: 0,
      tempsPannesTotal: 0,
      tauxD1: 0,
      tauxArchi: 0,
      tauxCQ: 0,
      pannesDetail: {}
    };

    cds.forEach(cd => {
      // D1
      if (cd.conformiteD1 === 'ok') stats.totalD1++;

      // Retours Archi
      if (cd.codesQualite && cd.codesQualite.length > 0) {
        stats.totalArchi += cd.codesQualite.length;
      }

      // CQ après CD
      if (cd.codesCQ && cd.codesCQ.length > 0) {
        stats.totalCQ += cd.codesCQ.length;
      }

      // Pannes
      if (cd.codesIncident && cd.codesIncident.length > 0) {
        stats.totalPannes += cd.codesIncident.length;

        // Détail des pannes
        cd.codesIncident.forEach(codeId => {
          const code = dbData.codesIncident.find(c => c.id === codeId);
          if (code) {
            if (!stats.pannesDetail[code.code]) {
              stats.pannesDetail[code.code] = {
                description: code.description,
                count: 0,
                tempsTotal: 0
              };
            }
            stats.pannesDetail[code.code].count++;

            // Ajouter le temps d'impact
            if (cd.tempsImpactIncident && cd.tempsImpactIncident[codeId]) {
              stats.pannesDetail[code.code].tempsTotal += cd.tempsImpactIncident[codeId];
              stats.tempsPannesTotal += cd.tempsImpactIncident[codeId];
            }
          }
        });
      }
    });

    // Calculer les taux
    stats.tauxD1 = stats.totalCD > 0 ? ((stats.totalD1 / stats.totalCD) * 100).toFixed(1) : 0;
    stats.tauxArchi = stats.totalCD > 0 ? ((stats.totalArchi / stats.totalCD) * 100).toFixed(1) : 0;
    stats.tauxCQ = stats.totalCD > 0 ? ((stats.totalCQ / stats.totalCD) * 100).toFixed(1) : 0;

    return stats;
  }

  calculateMachineStats(cds) {
    const machineStats = {};

    cds.forEach(cd => {
      const machine = dbData.machines.find(m => m.id === cd.machineId);
      if (!machine) return;

      if (!machineStats[machine.nom]) {
        machineStats[machine.nom] = {
          totalCD: 0,
          totalD1: 0,
          totalArchi: 0,
          totalCQ: 0,
          totalPannes: 0,
          tempsPannes: 0,
          pannesDetail: {}
        };
      }

      const stats = machineStats[machine.nom];
      stats.totalCD++;

      if (cd.conformiteD1 === 'ok') stats.totalD1++;

      if (cd.codesQualite && cd.codesQualite.length > 0) {
        stats.totalArchi += cd.codesQualite.length;
      }

      if (cd.codesCQ && cd.codesCQ.length > 0) {
        stats.totalCQ += cd.codesCQ.length;
      }

      if (cd.codesIncident && cd.codesIncident.length > 0) {
        stats.totalPannes += cd.codesIncident.length;

        cd.codesIncident.forEach(codeId => {
          const code = dbData.codesIncident.find(c => c.id === codeId);
          if (code) {
            if (!stats.pannesDetail[code.code]) {
              stats.pannesDetail[code.code] = {
                description: code.description,
                count: 0,
                temps: 0
              };
            }
            stats.pannesDetail[code.code].count++;

            if (cd.tempsImpactIncident && cd.tempsImpactIncident[codeId]) {
              const temps = cd.tempsImpactIncident[codeId];
              stats.pannesDetail[code.code].temps += temps;
              stats.tempsPannes += temps;
            }
          }
        });
      }
    });

    return machineStats;
  }

  generateDailyReportHTML(date, globalStats, machineStats) {
    const dateFormatted = this.formatDate(date);

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Rapport J-1 - ${dateFormatted}</title>
        <link rel="stylesheet" href="print-reports.css">
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .print-header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #003d7a; padding-bottom: 15px; }
          .print-header h1 { color: #003d7a; margin: 5px 0; }
          .print-header .date { color: #666; font-size: 18px; }
          .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
          .stat-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .stat-card.green { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); }
          .stat-card.orange { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
          .stat-card.blue { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
          .stat-card.red { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); }
          .stat-card .value { font-size: 48px; font-weight: bold; margin: 10px 0; }
          .stat-card .label { font-size: 14px; opacity: 0.9; text-transform: uppercase; letter-spacing: 1px; }
          .stat-card .percentage { font-size: 20px; margin-top: 5px; opacity: 0.9; }
          .section-title { color: #003d7a; font-size: 24px; font-weight: bold; margin: 30px 0 15px 0; padding-bottom: 10px; border-bottom: 2px solid #003d7a; }
          .pannes-chart { margin: 20px 0; }
          .panne-bar { margin: 10px 0; }
          .panne-bar .panne-label { font-weight: bold; margin-bottom: 5px; display: flex; justify-content: space-between; }
          .panne-bar .bar-container { background: #e0e0e0; height: 30px; border-radius: 5px; position: relative; overflow: hidden; }
          .panne-bar .bar-fill { background: linear-gradient(90deg, #fa709a 0%, #fee140 100%); height: 100%; display: flex; align-items: center; padding-left: 10px; color: white; font-weight: bold; transition: width 0.3s; }
          .machines-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-top: 20px; page-break-inside: avoid; }
          .machine-card { border: 2px solid #ddd; border-radius: 10px; padding: 20px; background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1); page-break-inside: avoid; }
          .machine-card h3 { color: #003d7a; margin-top: 0; font-size: 20px; border-bottom: 2px solid #003d7a; padding-bottom: 10px; }
          .machine-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 15px 0; }
          .machine-stat { text-align: center; padding: 10px; background: #f5f5f5; border-radius: 5px; }
          .machine-stat .value { font-size: 24px; font-weight: bold; color: #003d7a; }
          .machine-stat .label { font-size: 12px; color: #666; margin-top: 5px; }
          .machine-pannes { margin-top: 15px; }
          .machine-panne-item { display: flex; justify-content: space-between; padding: 8px; background: #f9f9f9; margin: 5px 0; border-radius: 5px; border-left: 4px solid #fa709a; }
          .machine-panne-item .code { font-weight: bold; color: #003d7a; }
          .machine-panne-item .temps { color: #fa709a; font-weight: bold; }
          @media print {
            .machines-grid { page-break-inside: avoid; }
            .machine-card { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="print-header">
          <h1>📊 RAPPORT D'ANALYSE QUOTIDIEN</h1>
          <div class="date">J-1 : ${dateFormatted}</div>
          <div style="margin-top: 10px; color: #666; font-size: 14px;">Michelin Gravanches - Dashboard CD</div>
        </div>

        <div class="section-title">📈 Vue d'ensemble</div>
        <div class="stats-grid">
          <div class="stat-card blue">
            <div class="label">Total CD</div>
            <div class="value">${globalStats.totalCD}</div>
          </div>
          <div class="stat-card green">
            <div class="label">Taux D1</div>
            <div class="value">${globalStats.tauxD1}%</div>
            <div class="percentage">${globalStats.totalD1} / ${globalStats.totalCD}</div>
          </div>
          <div class="stat-card orange">
            <div class="label">Retours Archi</div>
            <div class="value">${globalStats.totalArchi}</div>
            <div class="percentage">${globalStats.tauxArchi}% des CD</div>
          </div>
          <div class="stat-card red">
            <div class="label">CQ Après CD</div>
            <div class="value">${globalStats.totalCQ}</div>
            <div class="percentage">${globalStats.tauxCQ}% des CD</div>
          </div>
        </div>

        <div class="section-title">⚠️ Analyse des Pannes (${globalStats.totalPannes} total - ${this.formatMinutes(globalStats.tempsPannesTotal)})</div>
        <div class="pannes-chart">
    `;

    // Graphique des pannes
    const pannesArray = Object.entries(globalStats.pannesDetail).sort((a, b) => b[1].count - a[1].count);
    const maxPanneCount = pannesArray.length > 0 ? pannesArray[0][1].count : 1;

    pannesArray.forEach(([code, data]) => {
      const percentage = (data.count / maxPanneCount) * 100;
      html += `
        <div class="panne-bar">
          <div class="panne-label">
            <span><strong>${code}</strong> - ${data.description}</span>
            <span>${data.count}x - ${this.formatMinutes(data.tempsTotal)}</span>
          </div>
          <div class="bar-container">
            <div class="bar-fill" style="width: ${percentage}%">${data.count}</div>
          </div>
        </div>
      `;
    });

    html += `
        </div>

        <div class="section-title" style="page-break-before: always;">🏭 Analyse par Machine</div>
        <div class="machines-grid">
    `;

    // Stats par machine
    Object.entries(machineStats).sort((a, b) => b[1].totalCD - a[1].totalCD).forEach(([machineName, stats]) => {
      const tauxD1 = stats.totalCD > 0 ? ((stats.totalD1 / stats.totalCD) * 100).toFixed(1) : 0;

      html += `
        <div class="machine-card">
          <h3>🏭 ${machineName}</h3>
          <div class="machine-stats">
            <div class="machine-stat">
              <div class="value">${stats.totalCD}</div>
              <div class="label">CD</div>
            </div>
            <div class="machine-stat">
              <div class="value">${tauxD1}%</div>
              <div class="label">D1</div>
            </div>
            <div class="machine-stat">
              <div class="value">${stats.totalArchi}</div>
              <div class="label">Archi</div>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 10px 0;">
            <div class="machine-stat">
              <div class="value">${stats.totalCQ}</div>
              <div class="label">CQ après CD</div>
            </div>
            <div class="machine-stat">
              <div class="value">${stats.totalPannes}</div>
              <div class="label">Pannes</div>
            </div>
          </div>
      `;

      if (stats.totalPannes > 0) {
        html += `<div class="machine-pannes"><strong style="color: #003d7a;">Détail Pannes :</strong>`;
        Object.entries(stats.pannesDetail).forEach(([code, data]) => {
          html += `
            <div class="machine-panne-item">
              <span class="code">${code}</span>
              <span>${data.count}x</span>
              <span class="temps">⏱️ ${this.formatMinutes(data.temps)}</span>
            </div>
          `;
        });
        html += `</div>`;
      }

      html += `</div>`;
    });

    html += `
        </div>
        <div style="margin-top: 50px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #ddd; padding-top: 20px;">
          Rapport généré le ${new Date().toLocaleString('fr-FR')} - Michelin Gravanches Dashboard CD
        </div>
      </body>
      </html>
    `;

    return html;
  }

  // === RAPPORT PERFORMANCE INDIVIDUEL ===
  async generatePerformanceReport(operateurId, startDate, endDate) {
    console.log('🔍 generatePerformanceReport appelé avec:', operateurId, startDate, endDate);

    // Vérifier que dbData est chargé
    if (!window.dbData || !window.dbData.cd || !window.dbData.operateurs) {
      alert('Erreur : Les données ne sont pas encore chargées. Veuillez patienter quelques instants et réessayer.');
      console.error('❌ dbData non disponible:', window.dbData);
      return;
    }

    const operateur = dbData.operateurs.find(op => op.id === operateurId);
    if (!operateur) {
      alert('Opérateur non trouvé');
      return;
    }

    // Filtrer les CD de l'opérateur sur la période
    const cdsFiltered = dbData.cd.filter(cd => {
      if (cd.operateurId !== operateurId) return false;

      const cdDate = new Date(cd.date);
      const start = startDate ? new Date(startDate) : new Date(0);
      const end = endDate ? new Date(endDate) : new Date();

      return cdDate >= start && cdDate <= end;
    });

    if (cdsFiltered.length === 0) {
      alert('Aucun CD trouvé pour cet opérateur sur cette période');
      return;
    }

    // Calculer les stats de performance
    const perfStats = this.calculatePerformanceStats(cdsFiltered);

    // Générer le HTML du rapport
    const html = this.generatePerformanceReportHTML(operateur, perfStats, startDate, endDate);

    // Ouvrir la fenêtre d'impression
    this.openPrintWindow(html, 'Rapport Performance - ' + operateur.nom);
  }

  generatePeriodReportHTML(startDate, endDate, globalStats, machineStats, periodLabel) {
    const startFormatted = this.formatDate(startDate);
    const endFormatted = this.formatDate(endDate);

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Rapport ${periodLabel} - ${startFormatted} au ${endFormatted}</title>
        <link rel="stylesheet" href="print-reports.css">
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .print-header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #003d7a; padding-bottom: 15px; }
          .print-header h1 { color: #003d7a; margin: 5px 0; }
          .print-header .date { color: #666; font-size: 18px; }
          .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
          .stat-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .stat-card.green { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); }
          .stat-card.orange { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
          .stat-card.blue { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
          .stat-card.red { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); }
          .stat-card .value { font-size: 48px; font-weight: bold; margin: 10px 0; }
          .stat-card .label { font-size: 14px; opacity: 0.9; text-transform: uppercase; letter-spacing: 1px; }
          .stat-card .percentage { font-size: 20px; margin-top: 5px; opacity: 0.9; }
          .section-title { color: #003d7a; font-size: 24px; font-weight: bold; margin: 30px 0 15px 0; padding-bottom: 10px; border-bottom: 2px solid #003d7a; }
          .pannes-chart { margin: 20px 0; }
          .panne-bar { margin: 10px 0; }
          .panne-bar .panne-label { font-weight: bold; margin-bottom: 5px; display: flex; justify-content: space-between; }
          .panne-bar .bar-container { background: #e0e0e0; height: 30px; border-radius: 5px; position: relative; overflow: hidden; }
          .panne-bar .bar-fill { background: linear-gradient(90deg, #fa709a 0%, #fee140 100%); height: 100%; display: flex; align-items: center; padding-left: 10px; color: white; font-weight: bold; transition: width 0.3s; }
          .machines-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-top: 20px; page-break-inside: avoid; }
          .machine-card { border: 2px solid #ddd; border-radius: 10px; padding: 20px; background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1); page-break-inside: avoid; }
          .machine-card h3 { color: #003d7a; margin-top: 0; font-size: 20px; border-bottom: 2px solid #003d7a; padding-bottom: 10px; }
          .machine-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 15px 0; }
          .machine-stat { text-align: center; padding: 10px; background: #f5f5f5; border-radius: 5px; }
          .machine-stat .value { font-size: 24px; font-weight: bold; color: #003d7a; }
          .machine-stat .label { font-size: 12px; color: #666; margin-top: 5px; }
          .machine-pannes { margin-top: 15px; }
          .machine-panne-item { display: flex; justify-content: space-between; padding: 8px; background: #f9f9f9; margin: 5px 0; border-radius: 5px; border-left: 4px solid #fa709a; }
          .machine-panne-item .code { font-weight: bold; color: #003d7a; }
          .machine-panne-item .temps { color: #fa709a; font-weight: bold; }
          @media print {
            .machines-grid { page-break-inside: avoid; }
            .machine-card { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="print-header">
          <h1>📊 RAPPORT D'ANALYSE ${periodLabel.toUpperCase()}</h1>
          <div class="date">Du ${startFormatted} au ${endFormatted}</div>
          <div style="margin-top: 10px; color: #666; font-size: 14px;">Michelin Gravanches - Dashboard CD</div>
        </div>

        <div class="section-title">📈 Vue d'ensemble</div>
        <div class="stats-grid">
          <div class="stat-card blue">
            <div class="label">Total CD</div>
            <div class="value">${globalStats.totalCD}</div>
          </div>
          <div class="stat-card green">
            <div class="label">Taux D1</div>
            <div class="value">${globalStats.tauxD1}%</div>
            <div class="percentage">${globalStats.totalD1} / ${globalStats.totalCD}</div>
          </div>
          <div class="stat-card orange">
            <div class="label">Retours Archi</div>
            <div class="value">${globalStats.totalArchi}</div>
            <div class="percentage">${globalStats.tauxArchi}% des CD</div>
          </div>
          <div class="stat-card red">
            <div class="label">CQ Après CD</div>
            <div class="value">${globalStats.totalCQ}</div>
            <div class="percentage">${globalStats.tauxCQ}% des CD</div>
          </div>
        </div>

        <div class="section-title">⚠️ Analyse des Pannes (${globalStats.totalPannes} total - ${this.formatMinutes(globalStats.tempsPannesTotal)})</div>
        <div class="pannes-chart">
    `;

    // Graphique des pannes
    const pannesArray = Object.entries(globalStats.pannesDetail).sort((a, b) => b[1].count - a[1].count);
    const maxPanneCount = pannesArray.length > 0 ? pannesArray[0][1].count : 1;

    pannesArray.forEach(([code, data]) => {
      const percentage = (data.count / maxPanneCount) * 100;
      html += `
        <div class="panne-bar">
          <div class="panne-label">
            <span><strong>${code}</strong> - ${data.description}</span>
            <span>${data.count}x - ${this.formatMinutes(data.tempsTotal)}</span>
          </div>
          <div class="bar-container">
            <div class="bar-fill" style="width: ${percentage}%">${data.count}</div>
          </div>
        </div>
      `;
    });

    html += `
        </div>

        <div class="section-title" style="page-break-before: always;">🏭 Analyse par Machine</div>
        <div class="machines-grid">
    `;

    // Stats par machine
    Object.entries(machineStats).sort((a, b) => b[1].totalCD - a[1].totalCD).forEach(([machineName, stats]) => {
      const tauxD1 = stats.totalCD > 0 ? ((stats.totalD1 / stats.totalCD) * 100).toFixed(1) : 0;

      html += `
        <div class="machine-card">
          <h3>🏭 ${machineName}</h3>
          <div class="machine-stats">
            <div class="machine-stat">
              <div class="value">${stats.totalCD}</div>
              <div class="label">CD</div>
            </div>
            <div class="machine-stat">
              <div class="value">${tauxD1}%</div>
              <div class="label">D1</div>
            </div>
            <div class="machine-stat">
              <div class="value">${stats.totalArchi}</div>
              <div class="label">Archi</div>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 10px 0;">
            <div class="machine-stat">
              <div class="value">${stats.totalCQ}</div>
              <div class="label">CQ après CD</div>
            </div>
            <div class="machine-stat">
              <div class="value">${stats.totalPannes}</div>
              <div class="label">Pannes</div>
            </div>
          </div>
      `;

      if (stats.totalPannes > 0) {
        html += `<div class="machine-pannes"><strong style="color: #003d7a;">Détail Pannes :</strong>`;
        Object.entries(stats.pannesDetail).forEach(([code, data]) => {
          html += `
            <div class="machine-panne-item">
              <span class="code">${code}</span>
              <span>${data.count}x</span>
              <span class="temps">⏱️ ${this.formatMinutes(data.temps)}</span>
            </div>
          `;
        });
        html += `</div>`;
      }

      html += `</div>`;
    });

    html += `
        </div>
        <div style="margin-top: 50px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #ddd; padding-top: 20px;">
          Rapport généré le ${new Date().toLocaleString('fr-FR')} - Michelin Gravanches Dashboard CD
        </div>
      </body>
      </html>
    `;

    return html;
  }

  calculatePerformanceStats(cds) {
    const stats = {
      totalCD: cds.length,
      totalD1: 0,
      totalArchi: 0,
      totalCQ: 0,
      tauxD1: 0,
      tauxArchi: 0,
      tauxCQ: 0,
      scorePerformance: 0,
      detailScore: {
        baseCD: 0,
        penaliteArchi: 0,
        penaliteCQ: 0,
        bonusD1: 0
      },
      archiByLevel: {},
      cqDetail: {},
      pannesCount: 0
    };

    cds.forEach(cd => {
      // D1
      if (cd.conformiteD1 === 'ok') stats.totalD1++;

      // Retours Archi
      if (cd.codesQualite && cd.codesQualite.length > 0) {
        stats.totalArchi += cd.codesQualite.length;

        cd.codesQualite.forEach(codeId => {
          const code = dbData.codesQualite.find(c => c.id === codeId);
          if (code) {
            const niveau = code.niveau;
            if (!stats.archiByLevel[niveau]) {
              stats.archiByLevel[niveau] = 0;
            }
            stats.archiByLevel[niveau]++;
          }
        });
      }

      // CQ après CD
      if (cd.codesCQ && cd.codesCQ.length > 0) {
        stats.totalCQ += cd.codesCQ.length;

        cd.codesCQ.forEach(codeId => {
          const code = dbData.codesCQ.find(c => c.id === codeId);
          if (code) {
            if (!stats.cqDetail[code.code]) {
              stats.cqDetail[code.code] = {
                description: code.description,
                count: 0
              };
            }
            stats.cqDetail[code.code].count++;
          }
        });
      }

      // Pannes
      if (cd.codesIncident && cd.codesIncident.length > 0) {
        stats.pannesCount += cd.codesIncident.length;
      }
    });

    // Calculer les taux
    stats.tauxD1 = stats.totalCD > 0 ? ((stats.totalD1 / stats.totalCD) * 100).toFixed(1) : 0;
    stats.tauxArchi = stats.totalCD > 0 ? ((stats.totalArchi / stats.totalCD) * 100).toFixed(1) : 0;
    stats.tauxCQ = stats.totalCD > 0 ? ((stats.totalCQ / stats.totalCD) * 100).toFixed(1) : 0;

    // Calculer le score de performance (formule simplifiée)
    // Base : nombre de CD
    stats.detailScore.baseCD = stats.totalCD * 10;

    // Pénalités pour retours archi (selon niveau)
    Object.entries(stats.archiByLevel).forEach(([niveau, count]) => {
      if (niveau === '2' || niveau === '2_grave' || niveau === '2_cc') {
        stats.detailScore.penaliteArchi += count * 5;
      } else if (niveau === '3') {
        stats.detailScore.penaliteArchi += count * 2;
      }
    });

    // Pénalités pour CQ
    stats.detailScore.penaliteCQ = stats.totalCQ * 3;

    // Bonus pour D1
    stats.detailScore.bonusD1 = stats.totalD1 * 5;

    // Score final
    stats.scorePerformance = stats.detailScore.baseCD
                            - stats.detailScore.penaliteArchi
                            - stats.detailScore.penaliteCQ
                            + stats.detailScore.bonusD1;

    return stats;
  }

  generatePerformanceReportHTML(operateur, stats, startDate, endDate) {
    const periodStr = this.getPeriodString(startDate, endDate);

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Rapport Performance - ${operateur.nom}</title>
        <link rel="stylesheet" href="print-reports.css">
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
          .print-header { text-align: center; margin-bottom: 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 15px; }
          .print-header h1 { margin: 5px 0; font-size: 32px; }
          .print-header .operator { font-size: 24px; margin: 10px 0; font-weight: bold; }
          .print-header .period { opacity: 0.9; font-size: 16px; }
          .score-banner { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; text-align: center; padding: 40px; border-radius: 15px; margin: 30px 0; box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
          .score-banner .score-value { font-size: 72px; font-weight: bold; margin: 10px 0; }
          .score-banner .score-label { font-size: 20px; text-transform: uppercase; letter-spacing: 2px; opacity: 0.9; }
          .metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin: 30px 0; }
          .metric-card { background: white; padding: 25px; border-radius: 10px; text-align: center; box-shadow: 0 4px 10px rgba(0,0,0,0.1); border-top: 5px solid #667eea; }
          .metric-card.green { border-top-color: #38ef7d; }
          .metric-card.orange { border-top-color: #f5576c; }
          .metric-card.blue { border-top-color: #00f2fe; }
          .metric-card .value { font-size: 48px; font-weight: bold; color: #003d7a; margin: 10px 0; }
          .metric-card .label { font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 1px; }
          .metric-card .percentage { font-size: 18px; color: #999; margin-top: 5px; }
          .section-title { color: #003d7a; font-size: 24px; font-weight: bold; margin: 30px 0 15px 0; padding-bottom: 10px; border-bottom: 3px solid #003d7a; }
          .score-detail { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); margin: 20px 0; }
          .score-calculation { margin: 15px 0; }
          .score-line { display: flex; justify-content: space-between; padding: 15px; margin: 10px 0; border-radius: 5px; font-size: 18px; }
          .score-line.base { background: #e3f2fd; border-left: 5px solid #2196f3; }
          .score-line.penalty { background: #ffebee; border-left: 5px solid #f44336; }
          .score-line.bonus { background: #e8f5e9; border-left: 5px solid #4caf50; }
          .score-line.total { background: #f3e5f5; border-left: 5px solid #9c27b0; font-weight: bold; font-size: 20px; }
          .score-line .label { font-weight: 600; }
          .score-line .value { font-weight: bold; font-size: 20px; }
          .score-line .formula { font-size: 14px; color: #666; margin-left: 10px; font-style: italic; }
          .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
          .detail-card { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
          .detail-card h3 { color: #003d7a; margin-top: 0; font-size: 18px; border-bottom: 2px solid #003d7a; padding-bottom: 10px; }
          .detail-item { display: flex; justify-content: space-between; padding: 10px; margin: 5px 0; background: #f9f9f9; border-radius: 5px; border-left: 4px solid #667eea; }
          .detail-item .item-label { font-weight: 500; color: #003d7a; }
          .detail-item .item-value { font-weight: bold; color: #f5576c; }
          .visual-bars { margin: 20px 0; }
          .visual-bar { margin: 15px 0; }
          .visual-bar .bar-label { font-weight: bold; margin-bottom: 8px; display: flex; justify-content: space-between; color: #003d7a; }
          .visual-bar .bar-container { background: #e0e0e0; height: 35px; border-radius: 8px; overflow: hidden; position: relative; }
          .visual-bar .bar-fill { height: 100%; display: flex; align-items: center; padding-left: 15px; color: white; font-weight: bold; font-size: 16px; transition: width 0.5s; }
          .visual-bar .bar-fill.green { background: linear-gradient(90deg, #11998e 0%, #38ef7d 100%); }
          .visual-bar .bar-fill.orange { background: linear-gradient(90deg, #f093fb 0%, #f5576c 100%); }
          .visual-bar .bar-fill.blue { background: linear-gradient(90deg, #4facfe 0%, #00f2fe 100%); }
          @media print {
            body { background: white; }
            .score-detail, .detail-card, .metric-card { box-shadow: none; border: 1px solid #ddd; }
          }
        </style>
      </head>
      <body>
        <div class="print-header">
          <h1>🎯 RAPPORT DE PERFORMANCE</h1>
          <div class="operator">${operateur.nom}</div>
          <div class="period">${periodStr}</div>
        </div>

        <div class="score-banner">
          <div class="score-label">Score de Performance</div>
          <div class="score-value">${stats.scorePerformance}</div>
          <div style="font-size: 16px; margin-top: 10px; opacity: 0.9;">points</div>
        </div>

        <div class="metrics-grid">
          <div class="metric-card blue">
            <div class="label">Total CD</div>
            <div class="value">${stats.totalCD}</div>
          </div>
          <div class="metric-card green">
            <div class="label">Taux D1</div>
            <div class="value">${stats.tauxD1}%</div>
            <div class="percentage">${stats.totalD1} / ${stats.totalCD}</div>
          </div>
          <div class="metric-card orange">
            <div class="label">Retours Archi</div>
            <div class="value">${stats.totalArchi}</div>
            <div class="percentage">${stats.tauxArchi}% des CD</div>
          </div>
          <div class="metric-card">
            <div class="label">CQ après CD</div>
            <div class="value">${stats.totalCQ}</div>
            <div class="percentage">${stats.tauxCQ}% des CD</div>
          </div>
        </div>

        <div class="section-title">📊 Détail du Calcul du Score</div>
        <div class="score-detail">
          <div class="score-calculation">
            <div class="score-line base">
              <span class="label">
                🏭 Base CD
                <span class="formula">(${stats.totalCD} CD × 10 points)</span>
              </span>
              <span class="value">+${stats.detailScore.baseCD}</span>
            </div>
            <div class="score-line bonus">
              <span class="label">
                ✅ Bonus D1
                <span class="formula">(${stats.totalD1} D1 × 5 points)</span>
              </span>
              <span class="value">+${stats.detailScore.bonusD1}</span>
            </div>
            <div class="score-line penalty">
              <span class="label">
                ⚠️ Pénalité Retours Archi
                <span class="formula">(Niv 2: ×5, Niv 3: ×2)</span>
              </span>
              <span class="value">-${stats.detailScore.penaliteArchi}</span>
            </div>
            <div class="score-line penalty">
              <span class="label">
                🔍 Pénalité CQ après CD
                <span class="formula">(${stats.totalCQ} CQ × 3 points)</span>
              </span>
              <span class="value">-${stats.detailScore.penaliteCQ}</span>
            </div>
            <div class="score-line total">
              <span class="label">🎯 SCORE FINAL</span>
              <span class="value">${stats.scorePerformance}</span>
            </div>
          </div>
        </div>

        <div class="section-title">📈 Indicateurs Visuels</div>
        <div class="visual-bars">
          <div class="visual-bar">
            <div class="bar-label">
              <span>Taux D1 (Conformité Premier Essai)</span>
              <span>${stats.tauxD1}%</span>
            </div>
            <div class="bar-container">
              <div class="bar-fill green" style="width: ${stats.tauxD1}%">${stats.totalD1} / ${stats.totalCD}</div>
            </div>
          </div>
          <div class="visual-bar">
            <div class="bar-label">
              <span>Retours Archi (à minimiser)</span>
              <span>${stats.tauxArchi}%</span>
            </div>
            <div class="bar-container">
              <div class="bar-fill orange" style="width: ${Math.min(stats.tauxArchi, 100)}%">${stats.totalArchi} retours</div>
            </div>
          </div>
          <div class="visual-bar">
            <div class="bar-label">
              <span>CQ après CD (à minimiser)</span>
              <span>${stats.tauxCQ}%</span>
            </div>
            <div class="bar-container">
              <div class="bar-fill blue" style="width: ${Math.min(stats.tauxCQ, 100)}%">${stats.totalCQ} CQ</div>
            </div>
          </div>
        </div>

        <div class="section-title">🔍 Détails par Catégorie</div>
        <div class="detail-grid">
          <div class="detail-card">
            <h3>Retours Archi par Niveau</h3>
    `;

    if (Object.keys(stats.archiByLevel).length > 0) {
      Object.entries(stats.archiByLevel).sort((a, b) => b[1] - a[1]).forEach(([niveau, count]) => {
        const niveauLabel = niveau === '2_grave' || niveau === '2_cc' ? 'Niveau 2 CC' : `Niveau ${niveau}`;
        html += `
          <div class="detail-item">
            <span class="item-label">${niveauLabel}</span>
            <span class="item-value">${count}</span>
          </div>
        `;
      });
    } else {
      html += `<div style="text-align: center; color: #999; padding: 20px;">Aucun retour archi</div>`;
    }

    html += `
          </div>
          <div class="detail-card">
            <h3>CQ après CD (Top)</h3>
    `;

    const cqArray = Object.entries(stats.cqDetail).sort((a, b) => b[1].count - a[1].count).slice(0, 5);
    if (cqArray.length > 0) {
      cqArray.forEach(([code, data]) => {
        html += `
          <div class="detail-item">
            <span class="item-label">${code}</span>
            <span class="item-value">${data.count}</span>
          </div>
        `;
      });
    } else {
      html += `<div style="text-align: center; color: #999; padding: 20px;">Aucun CQ après CD</div>`;
    }

    html += `
          </div>
        </div>

        <div style="margin-top: 50px; text-align: center; color: #666; font-size: 12px; border-top: 2px solid #ddd; padding-top: 20px;">
          <p><strong>Formule de calcul du score :</strong></p>
          <p>Score = (Nb CD × 10) + (Nb D1 × 5) - (Pénalités Archi) - (Nb CQ × 3)</p>
          <p style="margin-top: 20px;">Rapport généré le ${new Date().toLocaleString('fr-FR')} - Michelin Gravanches Dashboard CD</p>
        </div>
      </body>
      </html>
    `;

    return html;
  }

  // === UTILITAIRES ===
  openPrintWindow(html, title) {
    this.printWindow = window.open('', '_blank', 'width=1024,height=768');
    this.printWindow.document.write(html);
    this.printWindow.document.close();

    // Attendre que le contenu soit chargé avant d'imprimer
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

  formatMinutes(minutes) {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins > 0 ? mins.toString().padStart(2, '0') : ''}`;
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
        <h3>📅 Sélectionner une date pour le rapport</h3>
        <p style="color: var(--color-text-secondary); margin-bottom: 20px;">
          Le rapport J-1 sera généré pour la veille de la date sélectionnée
        </p>
        <div class="form-group">
          <label class="form-label">Date</label>
          <input type="date" id="customReportDate" class="form-control" value="${today}" max="${today}">
        </div>
        <div class="modal-actions" style="margin-top: 20px;">
          <button class="btn btn--primary" onclick="generateCustomDateReport()">
            🖨️ Générer le rapport
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
    alert('Erreur : Les données ne sont pas encore chargées. Veuillez patienter quelques instants et réessayer.');
    return;
  }

  if (dbData.operateurs.length === 0) {
    alert('Aucun opérateur disponible. Veuillez d\'abord créer des opérateurs dans la section Admin.');
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
        <h3>🎯 Rapport de Performance Individuel</h3>
        <p style="color: var(--color-text-secondary); margin-bottom: 20px;">
          Générer un rapport de performance détaillé pour un opérateur sur une période donnée
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

        <div style="margin-top: var(--space-12); padding: var(--space-12); background: var(--color-bg-1); border-radius: var(--radius-base); border-left: 4px solid var(--color-info);">
          <p style="margin: 0; color: var(--color-text-secondary); font-size: 14px;">
            💡 <strong>Astuce :</strong> Laissez les dates vides pour générer un rapport sur toute la période disponible
          </p>
        </div>

        <div class="modal-actions" style="margin-top: var(--space-20);">
          <button class="btn btn--primary" onclick="generatePerformanceReportFromModal()">
            🖨️ Générer le rapport
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
