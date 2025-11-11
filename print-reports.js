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
      totalNiv1: 0, // CD sans retour archi (NIV 1)
      totalArchi: 0,
      totalCQ: 0,
      totalPannes: 0,
      tempsPannesTotal: 0,
      tauxD1: 0, // Taux D1 en %
      tauxNiv1: 0,
      pannesDetail: {},
      archiByLevel: {} // Compteur par niveau d'archi
    };

    cds.forEach(cd => {
      // D1 = conformité premier essai
      if (cd.conformiteD1 === 'ok') stats.totalD1++;

      // Retours Archi et NIV 1
      if (cd.codesQualite && cd.codesQualite.length > 0) {
        stats.totalArchi += cd.codesQualite.length;

        // Compter par niveau
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
      } else {
        // Pas de retour archi = NIV 1
        stats.totalNiv1++;
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

    // Calculer le taux D1 en %
    stats.tauxD1 = stats.totalCD > 0 ? ((stats.totalD1 / stats.totalCD) * 100).toFixed(1) : 0;
    stats.tauxNiv1 = stats.totalCD > 0 ? ((stats.totalNiv1 / stats.totalCD) * 100).toFixed(1) : 0;

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
          pannesDetail: {}, // Détail par code panne
          cdDetails: [] // Stocker tous les CD
        };
      }

      const stats = machineStats[machine.nom];
      stats.totalCD++;

      // Stocker les détails du CD
      const cdDetail = {
        id: cd.id,
        date: cd.date,
        operateur: dbData.operateurs.find(op => op.id === cd.operateurId)?.nom || 'N/A',
        typeCD: cd.typeCD || 'N/A',
        conformiteD1: cd.conformiteD1,
        nbArchi: cd.codesQualite ? cd.codesQualite.length : 0,
        nbCQ: cd.codesCQ ? cd.codesCQ.length : 0,
        nbPannes: cd.codesIncident ? cd.codesIncident.length : 0,
        tempsTotal: 0,
        pannes: [] // Liste des pannes pour ce CD
      };

      if (cd.conformiteD1 === 'ok') stats.totalD1++;

      if (cd.codesQualite && cd.codesQualite.length > 0) {
        stats.totalArchi += cd.codesQualite.length;
      }

      if (cd.codesCQ && cd.codesCQ.length > 0) {
        stats.totalCQ += cd.codesCQ.length;
      }

      // Pannes détaillées
      if (cd.codesIncident && cd.codesIncident.length > 0) {
        stats.totalPannes += cd.codesIncident.length;

        cd.codesIncident.forEach(codeId => {
          const code = dbData.codesIncident.find(c => c.id === codeId);
          if (code) {
            const temps = (cd.tempsImpactIncident && cd.tempsImpactIncident[codeId]) ? cd.tempsImpactIncident[codeId] : 0;

            // Ajouter au détail global de la machine
            if (!stats.pannesDetail[code.code]) {
              stats.pannesDetail[code.code] = {
                description: code.description,
                count: 0,
                temps: 0
              };
            }
            stats.pannesDetail[code.code].count++;
            stats.pannesDetail[code.code].temps += temps;
            stats.tempsPannes += temps;
            cdDetail.tempsTotal += temps;

            // Ajouter au détail du CD
            cdDetail.pannes.push({
              code: code.code,
              description: code.description,
              temps: temps
            });
          }
        });
      }

      stats.cdDetails.push(cdDetail);
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
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 20px;
            background: #fff;
            color: #333;
            font-size: 10pt;
          }
          .report-header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 15px;
            border-bottom: 2px solid #000;
          }
          .report-header h1 {
            font-size: 18pt;
            font-weight: 600;
            color: #000;
            margin-bottom: 8px;
          }
          .report-header .date {
            font-size: 11pt;
            color: #555;
            margin: 5px 0;
          }
          .report-header .subtitle {
            font-size: 9pt;
            color: #777;
          }

          .section-title {
            font-size: 12pt;
            font-weight: 600;
            color: #000;
            margin: 20px 0 8px 0;
            padding-bottom: 5px;
            border-bottom: 1px solid #666;
            text-transform: uppercase;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
            background: #fff;
          }

          th {
            background: #e8e8e8;
            padding: 8px;
            text-align: left;
            font-weight: 600;
            font-size: 9pt;
            border: 1px solid #999;
            color: #000;
          }

          td {
            padding: 6px 8px;
            border: 1px solid #ccc;
            font-size: 9pt;
            color: #333;
          }

          tbody tr:nth-child(even) {
            background: #fafafa;
          }

          .stats-table th {
            text-align: center;
            background: #d0d0d0;
          }

          .stats-table td {
            text-align: center;
            font-weight: 500;
          }

          .number-cell {
            font-weight: 600;
            color: #000;
          }

          .machine-section {
            margin: 20px 0;
            page-break-inside: avoid;
            border: 1px solid #999;
            padding: 10px;
            background: #fafafa;
          }

          .machine-title {
            font-size: 11pt;
            font-weight: 600;
            color: #000;
            margin: 0 0 10px 0;
            padding: 6px 10px;
            background: #d8d8d8;
            border-left: 4px solid #000;
          }

          .pannes-section {
            margin: 10px 0;
            padding: 8px;
            background: #fff;
            border: 1px solid #ddd;
          }

          .pannes-title {
            font-weight: 600;
            font-size: 9pt;
            margin-bottom: 5px;
            color: #000;
          }

          .footer {
            margin-top: 30px;
            padding-top: 10px;
            border-top: 1px solid #999;
            text-align: center;
            font-size: 8pt;
            color: #777;
          }

          @media print {
            body { margin: 10mm; font-size: 9pt; }
            .machine-section { page-break-inside: avoid; }
            @page { size: A4; margin: 12mm; }
          }
        </style>
      </head>
      <body>
        <div class="report-header">
          <h1>RAPPORT D'ANALYSE QUOTIDIEN</h1>
          <div class="date">J-1 : ${dateFormatted}</div>
          <div class="subtitle">Michelin Gravanches - Dashboard CD</div>
        </div>

        <div class="section-title">Vue d'ensemble</div>
        <table class="stats-table">
          <thead>
            <tr>
              <th>Total CD</th>
              <th>Taux D1 (%)</th>
              <th>NIV 1 (%)</th>
              <th>Retours Archi</th>
              <th>CQ après CD</th>
              <th>Pannes</th>
              <th>Temps Pannes</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="number-cell">${globalStats.totalCD}</td>
              <td class="number-cell">${globalStats.tauxD1}% (${globalStats.totalD1}/${globalStats.totalCD})</td>
              <td class="number-cell">${globalStats.tauxNiv1}% (${globalStats.totalNiv1})</td>
              <td class="number-cell">${globalStats.totalArchi}</td>
              <td class="number-cell">${globalStats.totalCQ}</td>
              <td class="number-cell">${globalStats.totalPannes}</td>
              <td class="number-cell">${this.formatMinutes(globalStats.tempsPannesTotal)}</td>
            </tr>
          </tbody>
        </table>

        ${Object.keys(globalStats.archiByLevel).length > 0 ? `
          <div class="section-title">Détail Retours Archi par Niveau</div>
          <table class="stats-table">
            <thead>
              <tr>
                ${Object.entries(globalStats.archiByLevel).map(([niveau]) => {
                  const niveauLabel = niveau === '2_grave' || niveau === '2_cc' ? 'Niveau 2 CC' : 'Niveau ' + niveau;
                  return '<th>' + niveauLabel + '</th>';
                }).join('')}
              </tr>
            </thead>
            <tbody>
              <tr>
                ${Object.entries(globalStats.archiByLevel).map(([, count]) => {
                  return '<td class="number-cell">' + count + '</td>';
                }).join('')}
              </tr>
            </tbody>
          </table>
        ` : ''}

        <div class="section-title">Analyse des Pannes Globales</div>
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Description</th>
              <th style="text-align: center; width: 80px;">Occurrences</th>
              <th style="text-align: center; width: 100px;">Temps Total</th>
            </tr>
          </thead>
          <tbody>
    `;

    // Pannes triées par occurrences
    const pannesArray = Object.entries(globalStats.pannesDetail).sort((a, b) => b[1].count - a[1].count);
    if (pannesArray.length > 0) {
      pannesArray.forEach(([code, data]) => {
        html += `
          <tr>
            <td style="font-weight: 600;">${code}</td>
            <td>${data.description}</td>
            <td style="text-align: center;">${data.count}</td>
            <td style="text-align: center;">${this.formatMinutes(data.tempsTotal)}</td>
          </tr>
        `;
      });
    } else {
      html += '<tr><td colspan="4" style="text-align: center; color: #999;">Aucune panne</td></tr>';
    }

    html += `
          </tbody>
        </table>

        <div class="section-title" style="page-break-before: always;">Analyse Détaillée par Machine</div>
    `;

    // Stats par machine
    Object.entries(machineStats).sort((a, b) => b[1].totalCD - a[1].totalCD).forEach(([machineName, stats]) => {
      const tauxD1 = stats.totalCD > 0 ? ((stats.totalD1 / stats.totalCD) * 100).toFixed(1) : 0;

      html += `
        <div class="machine-section">
          <div class="machine-title">${machineName} - ${stats.totalCD} CD effectués</div>

          <table class="stats-table">
            <thead>
              <tr>
                <th>Total CD</th>
                <th>Taux D1 (%)</th>
                <th>Retours Archi</th>
                <th>CQ après CD</th>
                <th>Pannes</th>
                <th>Temps Pannes</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="number-cell">${stats.totalCD}</td>
                <td class="number-cell">${tauxD1}% (${stats.totalD1}/${stats.totalCD})</td>
                <td class="number-cell">${stats.totalArchi}</td>
                <td class="number-cell">${stats.totalCQ}</td>
                <td class="number-cell">${stats.totalPannes}</td>
                <td class="number-cell">${this.formatMinutes(stats.tempsPannes)}</td>
              </tr>
            </tbody>
          </table>

          ${Object.keys(stats.pannesDetail).length > 0 ? `
            <div class="pannes-section">
              <div class="pannes-title">Détail des Pannes pour cette Machine</div>
              <table>
                <thead>
                  <tr>
                    <th>Code Panne</th>
                    <th>Description</th>
                    <th style="text-align: center; width: 80px;">Nb</th>
                    <th style="text-align: center; width: 100px;">Temps</th>
                  </tr>
                </thead>
                <tbody>
                  ${Object.entries(stats.pannesDetail).sort((a, b) => b[1].count - a[1].count).map(([code, data]) => `
                    <tr>
                      <td style="font-weight: 600;">${code}</td>
                      <td>${data.description}</td>
                      <td style="text-align: center;">${data.count}</td>
                      <td style="text-align: center;">${this.formatMinutes(data.temps)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}

          <div style="margin-top: 10px;">
            <div style="font-weight: 600; font-size: 9pt; margin-bottom: 5px;">Liste Détaillée des CD</div>
            <table style="font-size: 8pt;">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Opérateur</th>
                  <th>Type CD</th>
                  <th style="text-align: center;">D1</th>
                  <th style="text-align: center;">Archi</th>
                  <th style="text-align: center;">CQ</th>
                  <th style="text-align: center;">Pannes</th>
                  <th style="text-align: center;">Temps</th>
                  <th>Détail Pannes</th>
                </tr>
              </thead>
              <tbody>
                ${stats.cdDetails.map(cd => `
                  <tr>
                    <td>${new Date(cd.date).toLocaleDateString('fr-FR', {day: '2-digit', month: '2-digit'})}</td>
                    <td>${cd.operateur}</td>
                    <td>${cd.typeCD}</td>
                    <td style="text-align: center;">${cd.conformiteD1 === 'ok' ? 'OK' : 'NOK'}</td>
                    <td style="text-align: center;">${cd.nbArchi || '-'}</td>
                    <td style="text-align: center;">${cd.nbCQ || '-'}</td>
                    <td style="text-align: center;">${cd.nbPannes || '-'}</td>
                    <td style="text-align: center;">${cd.tempsTotal > 0 ? this.formatMinutes(cd.tempsTotal) : '-'}</td>
                    <td>${cd.pannes.length > 0 ? cd.pannes.map(p => p.code + ' (' + this.formatMinutes(p.temps) + ')').join(', ') : '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
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

  // === RAPPORT PERFORMANCE INDIVIDUEL ===
  async generatePerformanceReport(operateurId, startDate, endDate) {
    console.log('🔍 generatePerformanceReport appelé avec:', operateurId, startDate, endDate);

    // Vérifier que dbData est chargé
    if (!window.dbData || !window.dbData.cd || !window.dbData.operateurs) {
      alert('Erreur : Les données ne sont pas encore chargées. Veuillez patienter quelques instants et réessayer.');
      console.error('❌ dbData non disponible:', window.dbData);
      return;
    }

    // Vérifier que operateurId est valide
    if (!operateurId || operateurId === 'undefined' || operateurId === '') {
      alert('ID opérateur invalide. Veuillez sélectionner un opérateur valide.');
      return;
    }

    const operateur = dbData.operateurs.find(op => String(op.id) === String(operateurId));
    if (!operateur) {
      alert('Opérateur non trouvé (ID: ' + operateurId + ')');
      console.error('❌ Opérateur non trouvé. IDs disponibles:', dbData.operateurs.map(op => op.id + ' (' + op.nom + ')').join(', '));
      return;
    }

    console.log('👤 Opérateur trouvé:', operateur.nom, 'ID:', operateur.id);

    // Filtrer les CD de l'opérateur sur la période
    // IMPORTANT : Filtrer d'abord les CD qui ont un operateurId valide
    const cdsFiltered = dbData.cd.filter(cd => {
      // Ignorer les CD sans operateurId valide
      if (!cd.operateurId || cd.operateurId === 'undefined') {
        return false;
      }

      // Convertir les deux IDs en string pour comparaison
      const cdOperateurId = String(cd.operateurId);
      const searchOperateurId = String(operateurId);

      console.log('🔍 CD:', cd.id, 'operateurId:', cdOperateurId, 'recherché:', searchOperateurId, 'match:', cdOperateurId === searchOperateurId);

      if (cdOperateurId !== searchOperateurId) return false;

      const cdDate = new Date(cd.date);
      const start = startDate ? new Date(startDate) : new Date(0);
      const end = endDate ? new Date(endDate) : new Date();

      return cdDate >= start && cdDate <= end;
    });

    console.log('✅ CD trouvés pour cet opérateur:', cdsFiltered.length);

    if (cdsFiltered.length === 0) {
      // Afficher des détails pour diagnostiquer
      const allOperateurIds = [...new Set(dbData.cd
        .filter(cd => cd.operateurId && cd.operateurId !== 'undefined')
        .map(cd => String(cd.operateurId)))];

      alert('Aucun CD trouvé pour cet opérateur sur cette période\n\n' +
            'Opérateur recherché: ' + operateur.nom + ' (ID: ' + operateurId + ')\n' +
            'Période: ' + (startDate || 'début') + ' → ' + (endDate || 'fin') + '\n\n' +
            'IDs opérateurs valides trouvés dans les CD:\n' + allOperateurIds.join(', '));
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
    // Identique au rapport quotidien, juste avec une période différente
    const startFormatted = this.formatDate(startDate);
    const endFormatted = this.formatDate(endDate);

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Rapport ${periodLabel} - ${startFormatted} au ${endFormatted}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 20px;
            background: #fff;
            color: #333;
            font-size: 10pt;
          }
          .report-header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 15px;
            border-bottom: 2px solid #000;
          }
          .report-header h1 {
            font-size: 18pt;
            font-weight: 600;
            color: #000;
            margin-bottom: 8px;
          }
          .report-header .date {
            font-size: 11pt;
            color: #555;
            margin: 5px 0;
          }
          .report-header .subtitle {
            font-size: 9pt;
            color: #777;
          }

          .section-title {
            font-size: 12pt;
            font-weight: 600;
            color: #000;
            margin: 20px 0 8px 0;
            padding-bottom: 5px;
            border-bottom: 1px solid #666;
            text-transform: uppercase;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
            background: #fff;
          }

          th {
            background: #e8e8e8;
            padding: 8px;
            text-align: left;
            font-weight: 600;
            font-size: 9pt;
            border: 1px solid #999;
            color: #000;
          }

          td {
            padding: 6px 8px;
            border: 1px solid #ccc;
            font-size: 9pt;
            color: #333;
          }

          tbody tr:nth-child(even) {
            background: #fafafa;
          }

          .stats-table th {
            text-align: center;
            background: #d0d0d0;
          }

          .stats-table td {
            text-align: center;
            font-weight: 500;
          }

          .number-cell {
            font-weight: 600;
            color: #000;
          }

          .machine-section {
            margin: 20px 0;
            page-break-inside: avoid;
            border: 1px solid #999;
            padding: 10px;
            background: #fafafa;
          }

          .machine-title {
            font-size: 11pt;
            font-weight: 600;
            color: #000;
            margin: 0 0 10px 0;
            padding: 6px 10px;
            background: #d8d8d8;
            border-left: 4px solid #000;
          }

          .pannes-section {
            margin: 10px 0;
            padding: 8px;
            background: #fff;
            border: 1px solid #ddd;
          }

          .pannes-title {
            font-weight: 600;
            font-size: 9pt;
            margin-bottom: 5px;
            color: #000;
          }

          .footer {
            margin-top: 30px;
            padding-top: 10px;
            border-top: 1px solid #999;
            text-align: center;
            font-size: 8pt;
            color: #777;
          }

          @media print {
            body { margin: 10mm; font-size: 9pt; }
            .machine-section { page-break-inside: avoid; }
            @page { size: A4; margin: 12mm; }
          }
        </style>
      </head>
      <body>
        <div class="report-header">
          <h1>RAPPORT D'ANALYSE ${periodLabel.toUpperCase()}</h1>
          <div class="date">Du ${startFormatted} au ${endFormatted}</div>
          <div class="subtitle">Michelin Gravanches - Dashboard CD</div>
        </div>

        <div class="section-title">Vue d'ensemble</div>
        <table class="stats-table">
          <thead>
            <tr>
              <th>Total CD</th>
              <th>Taux D1 (%)</th>
              <th>NIV 1 (%)</th>
              <th>Retours Archi</th>
              <th>CQ après CD</th>
              <th>Pannes</th>
              <th>Temps Pannes</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="number-cell">${globalStats.totalCD}</td>
              <td class="number-cell">${globalStats.tauxD1}% (${globalStats.totalD1}/${globalStats.totalCD})</td>
              <td class="number-cell">${globalStats.tauxNiv1}% (${globalStats.totalNiv1})</td>
              <td class="number-cell">${globalStats.totalArchi}</td>
              <td class="number-cell">${globalStats.totalCQ}</td>
              <td class="number-cell">${globalStats.totalPannes}</td>
              <td class="number-cell">${this.formatMinutes(globalStats.tempsPannesTotal)}</td>
            </tr>
          </tbody>
        </table>

        ${Object.keys(globalStats.archiByLevel).length > 0 ? `
          <div class="section-title">Détail Retours Archi par Niveau</div>
          <table class="stats-table">
            <thead>
              <tr>
                ${Object.entries(globalStats.archiByLevel).map(([niveau]) => {
                  const niveauLabel = niveau === '2_grave' || niveau === '2_cc' ? 'Niveau 2 CC' : 'Niveau ' + niveau;
                  return '<th>' + niveauLabel + '</th>';
                }).join('')}
              </tr>
            </thead>
            <tbody>
              <tr>
                ${Object.entries(globalStats.archiByLevel).map(([, count]) => {
                  return '<td class="number-cell">' + count + '</td>';
                }).join('')}
              </tr>
            </tbody>
          </table>
        ` : ''}

        <div class="section-title">Analyse des Pannes Globales</div>
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Description</th>
              <th style="text-align: center; width: 80px;">Occurrences</th>
              <th style="text-align: center; width: 100px;">Temps Total</th>
            </tr>
          </thead>
          <tbody>
    `;

    // Pannes triées
    const pannesArray = Object.entries(globalStats.pannesDetail).sort((a, b) => b[1].count - a[1].count);
    if (pannesArray.length > 0) {
      pannesArray.forEach(([code, data]) => {
        html += `
          <tr>
            <td style="font-weight: 600;">${code}</td>
            <td>${data.description}</td>
            <td style="text-align: center;">${data.count}</td>
            <td style="text-align: center;">${this.formatMinutes(data.tempsTotal)}</td>
          </tr>
        `;
      });
    } else {
      html += '<tr><td colspan="4" style="text-align: center; color: #999;">Aucune panne</td></tr>';
    }

    html += `
          </tbody>
        </table>

        <div class="section-title" style="page-break-before: always;">Analyse Détaillée par Machine</div>
    `;

    // Stats par machine (identique au rapport quotidien)
    Object.entries(machineStats).sort((a, b) => b[1].totalCD - a[1].totalCD).forEach(([machineName, stats]) => {
      const tauxD1 = stats.totalCD > 0 ? ((stats.totalD1 / stats.totalCD) * 100).toFixed(1) : 0;

      html += `
        <div class="machine-section">
          <div class="machine-title">${machineName} - ${stats.totalCD} CD effectués</div>

          <table class="stats-table">
            <thead>
              <tr>
                <th>Total CD</th>
                <th>Taux D1 (%)</th>
                <th>Retours Archi</th>
                <th>CQ après CD</th>
                <th>Pannes</th>
                <th>Temps Pannes</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="number-cell">${stats.totalCD}</td>
                <td class="number-cell">${tauxD1}% (${stats.totalD1}/${stats.totalCD})</td>
                <td class="number-cell">${stats.totalArchi}</td>
                <td class="number-cell">${stats.totalCQ}</td>
                <td class="number-cell">${stats.totalPannes}</td>
                <td class="number-cell">${this.formatMinutes(stats.tempsPannes)}</td>
              </tr>
            </tbody>
          </table>

          ${Object.keys(stats.pannesDetail).length > 0 ? `
            <div class="pannes-section">
              <div class="pannes-title">Détail des Pannes pour cette Machine</div>
              <table>
                <thead>
                  <tr>
                    <th>Code Panne</th>
                    <th>Description</th>
                    <th style="text-align: center; width: 80px;">Nb</th>
                    <th style="text-align: center; width: 100px;">Temps</th>
                  </tr>
                </thead>
                <tbody>
                  ${Object.entries(stats.pannesDetail).sort((a, b) => b[1].count - a[1].count).map(([code, data]) => `
                    <tr>
                      <td style="font-weight: 600;">${code}</td>
                      <td>${data.description}</td>
                      <td style="text-align: center;">${data.count}</td>
                      <td style="text-align: center;">${this.formatMinutes(data.temps)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}

          <div style="margin-top: 10px;">
            <div style="font-weight: 600; font-size: 9pt; margin-bottom: 5px;">Liste Détaillée des CD</div>
            <table style="font-size: 8pt;">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Opérateur</th>
                  <th>Type CD</th>
                  <th style="text-align: center;">D1</th>
                  <th style="text-align: center;">Archi</th>
                  <th style="text-align: center;">CQ</th>
                  <th style="text-align: center;">Pannes</th>
                  <th style="text-align: center;">Temps</th>
                  <th>Détail Pannes</th>
                </tr>
              </thead>
              <tbody>
                ${stats.cdDetails.map(cd => `
                  <tr>
                    <td>${new Date(cd.date).toLocaleDateString('fr-FR', {day: '2-digit', month: '2-digit'})}</td>
                    <td>${cd.operateur}</td>
                    <td>${cd.typeCD}</td>
                    <td style="text-align: center;">${cd.conformiteD1 === 'ok' ? 'OK' : 'NOK'}</td>
                    <td style="text-align: center;">${cd.nbArchi || '-'}</td>
                    <td style="text-align: center;">${cd.nbCQ || '-'}</td>
                    <td style="text-align: center;">${cd.nbPannes || '-'}</td>
                    <td style="text-align: center;">${cd.tempsTotal > 0 ? this.formatMinutes(cd.tempsTotal) : '-'}</td>
                    <td>${cd.pannes.length > 0 ? cd.pannes.map(p => p.code + ' (' + this.formatMinutes(p.temps) + ')').join(', ') : '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
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

  calculatePerformanceStats(cds) {
    const stats = {
      totalCD: cds.length,
      totalD1: 0,
      totalArchi: 0,
      totalCQ: 0,
      tauxD1: 0,
      archiByLevel: {},
      cqDetail: {},
      pannesCount: 0,
      tempsPannesTotal: 0
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

        if (cd.tempsImpactIncident) {
          Object.values(cd.tempsImpactIncident).forEach(temps => {
            stats.tempsPannesTotal += temps;
          });
        }
      }
    });

    // Calculer le taux D1
    stats.tauxD1 = stats.totalCD > 0 ? ((stats.totalD1 / stats.totalCD) * 100).toFixed(1) : 0;

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
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 20px;
            background: #fff;
            color: #333;
            font-size: 10pt;
          }
          .report-header {
            text-align: center;
            margin-bottom: 30px;
            padding: 20px;
            border: 2px solid #000;
          }
          .report-header h1 {
            font-size: 18pt;
            font-weight: 600;
            color: #000;
            margin-bottom: 8px;
          }
          .report-header .operator {
            font-size: 14pt;
            font-weight: 600;
            color: #000;
            margin: 10px 0;
          }
          .report-header .period {
            font-size: 10pt;
            color: #555;
          }

          .section-title {
            font-size: 12pt;
            font-weight: 600;
            color: #000;
            margin: 20px 0 8px 0;
            padding-bottom: 5px;
            border-bottom: 1px solid #666;
            text-transform: uppercase;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
            background: #fff;
          }

          th {
            background: #e8e8e8;
            padding: 8px;
            text-align: center;
            font-weight: 600;
            font-size: 9pt;
            border: 1px solid #999;
            color: #000;
          }

          td {
            padding: 6px 8px;
            border: 1px solid #ccc;
            font-size: 9pt;
            color: #333;
            text-align: center;
          }

          tbody tr:nth-child(even) {
            background: #fafafa;
          }

          .number-cell {
            font-weight: 600;
            color: #000;
            font-size: 11pt;
          }

          .footer {
            margin-top: 30px;
            padding-top: 10px;
            border-top: 1px solid #999;
            text-align: center;
            font-size: 8pt;
            color: #777;
          }

          @media print {
            body { margin: 10mm; }
            @page { size: A4; margin: 12mm; }
          }
        </style>
      </head>
      <body>
        <div class="report-header">
          <h1>RAPPORT DE PERFORMANCE</h1>
          <div class="operator">${operateur.nom}</div>
          <div class="period">${periodStr}</div>
        </div>

        <div class="section-title">Indicateurs de Performance</div>
        <table>
          <thead>
            <tr>
              <th>Total CD</th>
              <th>Taux D1 (%)</th>
              <th>Retours Archi</th>
              <th>CQ après CD</th>
              <th>Pannes</th>
              <th>Temps Pannes</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="number-cell">${stats.totalCD}</td>
              <td class="number-cell">${stats.tauxD1}% (${stats.totalD1}/${stats.totalCD})</td>
              <td class="number-cell">${stats.totalArchi}</td>
              <td class="number-cell">${stats.totalCQ}</td>
              <td class="number-cell">${stats.pannesCount}</td>
              <td class="number-cell">${this.formatMinutes(stats.tempsPannesTotal)}</td>
            </tr>
          </tbody>
        </table>

        ${Object.keys(stats.archiByLevel).length > 0 ? `
          <div class="section-title">Détail Retours Archi par Niveau</div>
          <table>
            <thead>
              <tr>
                ${Object.entries(stats.archiByLevel).map(([niveau]) => {
                  const niveauLabel = niveau === '2_grave' || niveau === '2_cc' ? 'Niveau 2 CC' : 'Niveau ' + niveau;
                  return '<th>' + niveauLabel + '</th>';
                }).join('')}
              </tr>
            </thead>
            <tbody>
              <tr>
                ${Object.entries(stats.archiByLevel).map(([, count]) => {
                  return '<td class="number-cell">' + count + '</td>';
                }).join('')}
              </tr>
            </tbody>
          </table>
        ` : '<p style="text-align: center; color: #999; margin: 20px 0;">Aucun retour archi</p>'}

        ${Object.keys(stats.cqDetail).length > 0 ? `
          <div class="section-title">Détail CQ après CD</div>
          <table>
            <thead>
              <tr>
                <th style="text-align: left;">Code CQ</th>
                <th style="text-align: left;">Description</th>
                <th style="width: 120px;">Occurrences</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(stats.cqDetail).sort((a, b) => b[1].count - a[1].count).map(([code, data]) => `
                <tr>
                  <td style="text-align: left; font-weight: 600;">${code}</td>
                  <td style="text-align: left;">${data.description}</td>
                  <td class="number-cell">${data.count}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : '<p style="text-align: center; color: #999; margin: 20px 0;">Aucun CQ après CD</p>'}

        <div class="footer">
          Rapport généré le ${new Date().toLocaleString('fr-FR')} - Michelin Gravanches Dashboard CD
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
        <h3>Rapport de Performance Individuel</h3>
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
            Astuce : Laissez les dates vides pour générer un rapport sur toute la période disponible
          </p>
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
