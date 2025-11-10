// === ADVANCED ANALYTICS MODULE ===

class AnalyticsEngine {
  constructor() {
    this.cache = {};
    this.cacheTimeout = 60000; // 1 minute
  }

  // === GET CACHED OR COMPUTE ===
  getCachedOrCompute(key, computeFn) {
    const cached = this.cache[key];
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      return cached.data;
    }

    const data = computeFn();
    this.cache[key] = { data, timestamp: Date.now() };
    return data;
  }

  // === CLEAR CACHE ===
  clearCache() {
    this.cache = {};
  }

  // === PREDICT NEXT MONTH D1 ===
  predictNextMonthD1(cdData) {
    const monthlyAvg = this.getMonthlyAverages(cdData);
    if (monthlyAvg.length < 3) {
      return { prediction: null, confidence: 'low', message: 'Pas assez de données historiques' };
    }

    // Calculer la tendance (régression linéaire simple)
    const last3Months = monthlyAvg.slice(-3);
    const avgD1 = last3Months.reduce((sum, m) => sum + m.avgD1, 0) / last3Months.length;

    // Calculer la pente
    const slope = (last3Months[2].avgD1 - last3Months[0].avgD1) / 2;

    const prediction = avgD1 + slope;
    const variance = this.calculateVariance(last3Months.map(m => m.avgD1));

    let confidence = 'low';
    if (variance < 1) confidence = 'high';
    else if (variance < 2) confidence = 'medium';

    return {
      prediction: Math.max(0, prediction.toFixed(2)),
      trend: slope > 0 ? 'increasing' : slope < 0 ? 'decreasing' : 'stable',
      confidence: confidence,
      variance: variance.toFixed(2),
      message: this.getTrendMessage(slope, confidence)
    };
  }

  getTrendMessage(slope, confidence) {
    let message = '';
    if (slope > 0.5) message = '📈 Tendance à la hausse';
    else if (slope < -0.5) message = '📉 Tendance à la baisse';
    else message = '➡️ Tendance stable';

    message += ` (confiance: ${confidence === 'high' ? 'élevée' : confidence === 'medium' ? 'moyenne' : 'faible'})`;
    return message;
  }

  // === GET MONTHLY AVERAGES ===
  getMonthlyAverages(cdData) {
    const monthlyData = {};

    cdData.forEach(cd => {
      const date = new Date(cd.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { d1Total: 0, perfTotal: 0, effTotal: 0, count: 0 };
      }

      monthlyData[monthKey].d1Total += cd.d1Reel;
      monthlyData[monthKey].perfTotal += cd.performance;
      monthlyData[monthKey].effTotal += cd.efficacite;
      monthlyData[monthKey].count++;
    });

    return Object.entries(monthlyData)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, data]) => ({
        month: month,
        avgD1: data.d1Total / data.count,
        avgPerf: data.perfTotal / data.count,
        avgEff: data.effTotal / data.count,
        count: data.count
      }));
  }

  // === CALCULATE VARIANCE ===
  calculateVariance(values) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return variance;
  }

  // === GET BEST TEAMS (BINOMES) ===
  getBestTeams(cdData, limit = 5) {
    const teams = {};

    cdData.forEach(cd => {
      const key = [cd.conf1, cd.conf2].sort().join('-');
      if (!teams[key]) {
        teams[key] = {
          conf1: cd.conf1,
          conf2: cd.conf2,
          performances: [],
          count: 0,
          niv1Count: 0
        };
      }
      teams[key].performances.push(cd.performance);
      teams[key].count++;
      if (cd.qualite === '1') teams[key].niv1Count++;
    });

    return Object.values(teams)
      .map(team => {
        const op1 = dbData.operateurs.find(o => o.id === team.conf1);
        const op2 = dbData.operateurs.find(o => o.id === team.conf2);
        const avgPerf = team.performances.reduce((a, b) => a + b, 0) / team.count;
        const tauxNiv1 = (team.niv1Count / team.count) * 100;

        return {
          team: `${op1?.nom || 'N/A'} & ${op2?.nom || 'N/A'}`,
          avgPerformance: avgPerf.toFixed(2),
          count: team.count,
          tauxNiv1: tauxNiv1.toFixed(1),
          score: avgPerf * 0.7 + tauxNiv1 * 0.3 // Score pondéré
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  // === IDENTIFY PROBLEMATIC MACHINES ===
  getProblematicMachines(cdData, threshold = 70) {
    const machineStats = {};

    cdData.forEach(cd => {
      if (!machineStats[cd.numMachine]) {
        machineStats[cd.numMachine] = {
          performances: [],
          anomalies: 0,
          niv2CCCount: 0,
          niv3Count: 0,
          count: 0
        };
      }

      machineStats[cd.numMachine].performances.push(cd.performance);
      machineStats[cd.numMachine].count++;
      if (cd.anomalie) machineStats[cd.numMachine].anomalies++;
      if (cd.qualite === '2_cc') machineStats[cd.numMachine].niv2CCCount++;
      if (cd.qualite === '3') machineStats[cd.numMachine].niv3Count++;
    });

    return Object.entries(machineStats)
      .map(([machineId, stats]) => {
        const machine = dbData.machines.find(m => m.id === machineId);
        const avgPerf = stats.performances.reduce((a, b) => a + b, 0) / stats.count;

        return {
          machineId: machineId,
          machine: machine?.numero || 'N/A',
          type: machine?.type || 'N/A',
          avgPerformance: avgPerf.toFixed(2),
          anomalies: stats.anomalies,
          qualityIssues: stats.niv2CCCount + stats.niv3Count,
          count: stats.count,
          problemScore: (100 - avgPerf) + (stats.anomalies * 5) + (stats.qualityIssues * 3)
        };
      })
      .filter(m => m.avgPerformance < threshold || m.anomalies > 0 || m.qualityIssues > 0)
      .sort((a, b) => b.problemScore - a.problemScore);
  }

  // === GET OPERATOR INSIGHTS ===
  getOperatorInsights(opId, cdData) {
    const opCD = cdData.filter(cd => cd.conf1 === opId || cd.conf2 === opId);

    if (opCD.length === 0) {
      return null;
    }

    // Statistiques de base
    const avgPerf = opCD.reduce((sum, cd) => sum + cd.performance, 0) / opCD.length;
    const avgEff = opCD.reduce((sum, cd) => sum + cd.efficacite, 0) / opCD.length;
    const avgD1 = opCD.reduce((sum, cd) => sum + cd.d1Reel, 0) / opCD.length;

    // Qualité
    const niv1Count = opCD.filter(cd => cd.qualite === '1').length;
    const tauxNiv1 = (niv1Count / opCD.length) * 100;

    // Partenaires préférés
    const partners = {};
    opCD.forEach(cd => {
      const partnerId = cd.conf1 === opId ? cd.conf2 : cd.conf1;
      if (!partners[partnerId]) partners[partnerId] = { count: 0, performances: [] };
      partners[partnerId].count++;
      partners[partnerId].performances.push(cd.performance);
    });

    const bestPartner = Object.entries(partners)
      .map(([id, data]) => {
        const partner = dbData.operateurs.find(o => o.id === id);
        const avgPerf = data.performances.reduce((a, b) => a + b, 0) / data.count;
        return { name: partner?.nom || 'N/A', count: data.count, avgPerf: avgPerf.toFixed(2) };
      })
      .sort((a, b) => parseFloat(b.avgPerf) - parseFloat(a.avgPerf))[0];

    // Machines préférées
    const machines = {};
    opCD.forEach(cd => {
      if (!machines[cd.numMachine]) machines[cd.numMachine] = { count: 0, performances: [] };
      machines[cd.numMachine].count++;
      machines[cd.numMachine].performances.push(cd.performance);
    });

    const bestMachine = Object.entries(machines)
      .map(([id, data]) => {
        const machine = dbData.machines.find(m => m.id === id);
        const avgPerf = data.performances.reduce((a, b) => a + b, 0) / data.count;
        return { name: machine?.numero || 'N/A', count: data.count, avgPerf: avgPerf.toFixed(2) };
      })
      .sort((a, b) => parseFloat(b.avgPerf) - parseFloat(a.avgPerf))[0];

    // Points forts / Points faibles
    const strengths = [];
    const weaknesses = [];

    if (avgPerf > 85) strengths.push('Performance excellente');
    else if (avgPerf < 70) weaknesses.push('Performance à améliorer');

    if (tauxNiv1 > 85) strengths.push('Excellente qualité (NIV 1)');
    else if (tauxNiv1 < 70) weaknesses.push('Taux de qualité NIV 1 faible');

    if (avgD1 < 10) strengths.push('Temps de changement optimal');
    else if (avgD1 > 12) weaknesses.push('Temps de changement élevé');

    const anomalies = opCD.filter(cd => cd.anomalie).length;
    if (anomalies === 0) strengths.push('Aucune anomalie');
    else if (anomalies > 3) weaknesses.push(`${anomalies} anomalies détectées`);

    return {
      operator: dbData.operateurs.find(o => o.id === opId)?.nom || 'N/A',
      totalCD: opCD.length,
      avgPerformance: avgPerf.toFixed(2),
      avgEfficacite: avgEff.toFixed(2),
      avgD1: avgD1.toFixed(2),
      tauxNiv1: tauxNiv1.toFixed(1),
      bestPartner: bestPartner,
      bestMachine: bestMachine,
      strengths: strengths,
      weaknesses: weaknesses,
      grade: this.calculateGrade(avgPerf, tauxNiv1)
    };
  }

  // === CALCULATE GRADE ===
  calculateGrade(avgPerf, tauxNiv1) {
    const score = (avgPerf * 0.6) + (tauxNiv1 * 0.4);

    if (score >= 90) return { grade: 'A+', color: '#2E7D32', label: 'Excellent' };
    if (score >= 85) return { grade: 'A', color: '#388E3C', label: 'Très bien' };
    if (score >= 80) return { grade: 'B+', color: '#689F38', label: 'Bien' };
    if (score >= 75) return { grade: 'B', color: '#AFB42B', label: 'Assez bien' };
    if (score >= 70) return { grade: 'C+', color: '#F57C00', label: 'Passable' };
    if (score >= 65) return { grade: 'C', color: '#FF6F00', label: 'Insuffisant' };
    return { grade: 'D', color: '#C62828', label: 'Faible' };
  }

  // === GET WEEKLY TRENDS ===
  getWeeklyTrends(cdData) {
    const weeklyData = {};

    cdData.forEach(cd => {
      const date = new Date(cd.date);
      const weekNumber = this.getWeekNumber(date);
      const weekKey = `${date.getFullYear()}-W${weekNumber}`;

      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = {
          d1Total: 0,
          perfTotal: 0,
          count: 0,
          niv1: 0,
          anomalies: 0
        };
      }

      weeklyData[weekKey].d1Total += cd.d1Reel;
      weeklyData[weekKey].perfTotal += cd.performance;
      weeklyData[weekKey].count++;
      if (cd.qualite === '1') weeklyData[weekKey].niv1++;
      if (cd.anomalie) weeklyData[weekKey].anomalies++;
    });

    return Object.entries(weeklyData)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([week, data]) => ({
        week: week,
        avgD1: (data.d1Total / data.count).toFixed(2),
        avgPerf: (data.perfTotal / data.count).toFixed(2),
        tauxNiv1: ((data.niv1 / data.count) * 100).toFixed(1),
        anomalies: data.anomalies,
        count: data.count
      }));
  }

  // === GET WEEK NUMBER ===
  getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }

  // === GENERATE RECOMMENDATIONS ===
  generateRecommendations(cdData) {
    const recommendations = [];

    // Analyser les machines problématiques
    const problematicMachines = this.getProblematicMachines(cdData, 75);
    if (problematicMachines.length > 0) {
      recommendations.push({
        type: 'warning',
        category: 'Machines',
        title: `${problematicMachines.length} machine(s) nécessitent attention`,
        message: `Machines concernées: ${problematicMachines.slice(0, 3).map(m => m.machine).join(', ')}`,
        action: 'Vérifier maintenance et formation opérateurs'
      });
    }

    // Analyser la tendance globale
    const prediction = this.predictNextMonthD1(cdData);
    if (prediction.trend === 'increasing' && prediction.confidence !== 'low') {
      recommendations.push({
        type: 'info',
        category: 'Tendance',
        title: 'Augmentation du D1 prévue',
        message: prediction.message,
        action: 'Prévoir actions correctives pour le mois prochain'
      });
    }

    // Analyser les meilleurs binômes
    const bestTeams = this.getBestTeams(cdData, 3);
    if (bestTeams.length > 0) {
      recommendations.push({
        type: 'success',
        category: 'Équipes',
        title: 'Binômes performants identifiés',
        message: `Meilleur binôme: ${bestTeams[0].team} (${bestTeams[0].avgPerformance}% perf)`,
        action: 'Capitaliser sur ces binômes et partager les bonnes pratiques'
      });
    }

    // Vérifier le taux global de NIV 1
    const niv1Count = cdData.filter(cd => cd.qualite === '1').length;
    const tauxNiv1Global = (niv1Count / cdData.length) * 100;

    if (tauxNiv1Global < 70) {
      recommendations.push({
        type: 'error',
        category: 'Qualité',
        title: 'Taux NIV 1 faible',
        message: `Taux actuel: ${tauxNiv1Global.toFixed(1)}% (objectif: >70%)`,
        action: 'Formation qualité et analyse des causes racines'
      });
    } else if (tauxNiv1Global > 85) {
      recommendations.push({
        type: 'success',
        category: 'Qualité',
        title: 'Excellente qualité',
        message: `Taux NIV 1: ${tauxNiv1Global.toFixed(1)}%`,
        action: 'Maintenir ce niveau et documenter les bonnes pratiques'
      });
    }

    return recommendations;
  }
}

// Instance globale
const analyticsEngine = new AnalyticsEngine();

console.log('✅ Analytics Engine initialisé');
