// === EXCEL EXPORT MODULE (SheetJS) ===
// Nécessite: <script src="https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js"></script>

class ExcelExporter {
  constructor() {
    this.workbook = null;
  }

  // === EXPORT CD TO EXCEL ===
  exportCD(cdData = null) {
    try {
      const data = cdData || getFilteredCD({ excludeCached: false });

      if (data.length === 0) {
        showWarning('Aucune donnée à exporter', 'La liste des CD est vide');
        return false;
      }

      // Préparer les données
      const rows = data.map(cd => {
        const machine = dbData.machines.find(m => m.id === cd.numMachine);
        const op1 = dbData.operateurs.find(o => o.id === cd.conf1);
        const op2 = dbData.operateurs.find(o => o.id === cd.conf2);
        const codeQualite = cd.codeQualite ? dbData.codesQualite.find(c => c.id === cd.codeQualite) : null;
        const codeCQ = cd.codeCQ ? dbData.codesCQ.find(c => c.id === cd.codeCQ) : null;
        const codeIncident = cd.codeIncident ? dbData.codesIncident.find(c => c.id === cd.codeIncident) : null;

        let qualiteLabel = cd.qualite === '1' ? 'NIV 1' :
                          cd.qualite === '2' ? 'NIV 2' :
                          cd.qualite === '2_cc' ? 'NIV 2 CC' : 'NIV 3';

        return {
          'Date': cd.date,
          'Heure': cd.heure,
          'Type Production': cd.typeProd,
          'Machine': machine ? machine.numero : 'N/A',
          'Type Machine': cd.typeMachine,
          'CAI': cd.cai,
          'Dimension': cd.dimension,
          'CONF1 (PNC)': op1 ? op1.nom : 'N/A',
          'CONF2 (PNS)': op2 ? op2.nom : 'N/A',
          'D1 Réel (h)': cd.d1Reel,
          'D1 Net (h)': cd.d1Net,
          'Retour Archi': qualiteLabel,
          'Code Retour Archi': codeQualite ? `${codeQualite.code} - ${codeQualite.description}` : '',
          'Efficacité (%)': cd.efficacite,
          'Performance (%)': cd.performance,
          'CQ Après CD': cd.cqApres,
          'Code CQ': codeCQ ? `${codeCQ.code} - ${codeCQ.description}` : '',
          'Panne': cd.incident,
          'Code Panne': codeIncident ? `${codeIncident.code} - ${codeIncident.description}` : '',
          'Commentaire Panne': cd.commentaireIncident || '',
          'Commentaire': cd.commentaire || '',
          'Anomalie': cd.anomalie ? 'OUI' : 'NON',
          'Caché': cd.cache ? 'OUI' : 'NON'
        };
      });

      // Créer le workbook
      const wb = XLSX.utils.book_new();

      // Feuille 1: Liste CD
      const ws = XLSX.utils.json_to_sheet(rows);

      // Largeur des colonnes
      const colWidths = [
        { wch: 12 }, // Date
        { wch: 8 },  // Heure
        { wch: 15 }, // Type Production
        { wch: 10 }, // Machine
        { wch: 12 }, // Type Machine
        { wch: 15 }, // CAI
        { wch: 15 }, // Dimension
        { wch: 20 }, // CONF1
        { wch: 20 }, // CONF2
        { wch: 12 }, // D1 Réel
        { wch: 12 }, // D1 Net
        { wch: 12 }, // Retour Archi
        { wch: 40 }, // Code Retour Archi
        { wch: 12 }, // Efficacité
        { wch: 12 }, // Performance
        { wch: 12 }, // CQ Après CD
        { wch: 40 }, // Code CQ
        { wch: 10 }, // Panne
        { wch: 40 }, // Code Panne
        { wch: 30 }, // Commentaire Panne
        { wch: 40 }, // Commentaire
        { wch: 10 }, // Anomalie
        { wch: 10 }  // Caché
      ];
      ws['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, 'CD');

      // Feuille 2: Statistiques
      const stats = this.generateStats(data);
      const wsStats = XLSX.utils.json_to_sheet(stats);
      wsStats['!cols'] = [{ wch: 30 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, wsStats, 'Statistiques');

      // Feuille 3: Opérateurs
      const wsOp = XLSX.utils.json_to_sheet(
        dbData.operateurs.map(op => ({
          'Nom': op.nom,
          'Date Ajout': op.dateAjout
        }))
      );
      XLSX.utils.book_append_sheet(wb, wsOp, 'Opérateurs');

      // Feuille 4: Machines
      const wsMach = XLSX.utils.json_to_sheet(
        dbData.machines.map(m => ({
          'Numéro': m.numero,
          'Type': m.type,
          'Statut': m.statut
        }))
      );
      XLSX.utils.book_append_sheet(wb, wsMach, 'Machines');

      // Sauvegarder
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10);
      const fileName = `Michelin_CD_Export_${dateStr}.xlsx`;

      XLSX.writeFile(wb, fileName);

      showSuccess('Export Excel réussi', `${data.length} CD exportés dans ${fileName}`);
      return true;

    } catch (error) {
      console.error('❌ Erreur export Excel:', error);
      showError('Erreur lors de l\'export Excel', error.message);
      return false;
    }
  }

  // === GENERATE STATS FOR EXCEL ===
  generateStats(cdData) {
    const total = cdData.length;
    const niv1 = cdData.filter(cd => cd.qualite === '1').length;
    const niv2 = cdData.filter(cd => cd.qualite === '2').length;
    const niv2CC = cdData.filter(cd => cd.qualite === '2_cc').length;
    const niv3 = cdData.filter(cd => cd.qualite === '3').length;
    const anomalies = cdData.filter(cd => cd.anomalie).length;
    const incidents = cdData.filter(cd => cd.incident === 'Oui').length;
    const avgD1 = cdData.reduce((sum, cd) => sum + cd.d1Reel, 0) / total;
    const avgEff = cdData.reduce((sum, cd) => sum + cd.efficacite, 0) / total;
    const avgPerf = cdData.reduce((sum, cd) => sum + cd.performance, 0) / total;

    return [
      { 'Indicateur': 'Total CD', 'Valeur': total },
      { 'Indicateur': 'D1 Moyen (h)', 'Valeur': avgD1.toFixed(2) },
      { 'Indicateur': 'Efficacité Moyenne (%)', 'Valeur': avgEff.toFixed(2) },
      { 'Indicateur': 'Performance Moyenne (%)', 'Valeur': avgPerf.toFixed(2) },
      { 'Indicateur': '', 'Valeur': '' },
      { 'Indicateur': 'NIV 1', 'Valeur': niv1 },
      { 'Indicateur': 'NIV 2', 'Valeur': niv2 },
      { 'Indicateur': 'NIV 2 CC', 'Valeur': niv2CC },
      { 'Indicateur': 'NIV 3', 'Valeur': niv3 },
      { 'Indicateur': '', 'Valeur': '' },
      { 'Indicateur': 'Anomalies', 'Valeur': anomalies },
      { 'Indicateur': 'Pannes', 'Valeur': incidents },
      { 'Indicateur': '', 'Valeur': '' },
      { 'Indicateur': 'Date Export', 'Valeur': new Date().toISOString() }
    ];
  }

  // === EXPORT STATS ONLY ===
  exportStatsOnly() {
    try {
      const cdData = getFilteredCD({ excludeCached: true });
      const stats = this.generateStats(cdData);

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(stats);
      ws['!cols'] = [{ wch: 30 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, ws, 'Statistiques');

      const fileName = `Michelin_Stats_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fileName);

      showSuccess('Export statistiques réussi', fileName);
      return true;

    } catch (error) {
      console.error('❌ Erreur export stats:', error);
      showError('Erreur lors de l\'export', error.message);
      return false;
    }
  }

  // === EXPORT OPERATOR PERFORMANCE ===
  exportOperatorPerformance() {
    try {
      const cdData = getFilteredCD({ excludeCached: true });

      const opStats = {};
      dbData.operateurs.forEach(op => {
        const cdOp = cdData.filter(cd => cd.conf1 === op.id || cd.conf2 === op.id);
        if (cdOp.length > 0) {
          const nbCD = cdOp.length;
          const perfMoyenne = cdOp.reduce((sum, cd) => sum + cd.performance, 0) / nbCD;
          const efficaciteMoyenne = cdOp.reduce((sum, cd) => sum + cd.efficacite, 0) / nbCD;
          const d1Moyen = cdOp.reduce((sum, cd) => sum + cd.d1Reel, 0) / nbCD;
          const niv1 = cdOp.filter(cd => cd.qualite === '1').length;
          const incidents = cdOp.filter(cd => cd.incident === 'Oui').length;

          opStats[op.id] = {
            'Opérateur': op.nom,
            'Nombre CD': nbCD,
            'Performance Moyenne (%)': perfMoyenne.toFixed(2),
            'Efficacité Moyenne (%)': efficaciteMoyenne.toFixed(2),
            'D1 Moyen (h)': d1Moyen.toFixed(2),
            'Taux NIV 1 (%)': Math.round((niv1 / nbCD) * 100),
            'Taux Pannes (%)': Math.round((incidents / nbCD) * 100)
          };
        }
      });

      const rows = Object.values(opStats).sort((a, b) =>
        parseFloat(b['Performance Moyenne (%)']) - parseFloat(a['Performance Moyenne (%)'])
      );

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [
        { wch: 20 }, { wch: 12 }, { wch: 20 },
        { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 18 }
      ];
      XLSX.utils.book_append_sheet(wb, ws, 'Performance Opérateurs');

      const fileName = `Michelin_Operateurs_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fileName);

      showSuccess('Export opérateurs réussi', fileName);
      return true;

    } catch (error) {
      console.error('❌ Erreur export opérateurs:', error);
      showError('Erreur lors de l\'export', error.message);
      return false;
    }
  }
}

// Instance globale
const excelExporter = new ExcelExporter();

// Fonction helper
function exportToExcel() {
  if (typeof XLSX === 'undefined') {
    showError('SheetJS non chargé', 'Veuillez recharger la page');
    return false;
  }
  return excelExporter.exportCD();
}
