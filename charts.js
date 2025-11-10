// === CHART.JS INTEGRATION - INTERACTIVE CHARTS ===
// Nécessite: <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>

class ChartManager {
  constructor() {
    this.charts = {};
    this.colors = {
      primary: '#27509B',
      success: '#2E7D32',
      warning: '#F57C00',
      error: '#C62828',
      info: '#626C71',
      yellow: '#FCE500'
    };
  }

  // === DESTROY CHART ===
  destroyChart(chartId) {
    if (this.charts[chartId]) {
      this.charts[chartId].destroy();
      delete this.charts[chartId];
    }
  }

  // === PIE CHART: RETOUR ARCHI ===
  renderRetourArchiPie(canvasId, cdData) {
    this.destroyChart(canvasId);

    const niv1 = cdData.filter(cd => cd.qualite === '1').length;
    const niv2 = cdData.filter(cd => cd.qualite === '2').length;
    const niv2CC = cdData.filter(cd => cd.qualite === '2_cc').length;
    const niv3 = cdData.filter(cd => cd.qualite === '3').length;

    const ctx = document.getElementById(canvasId).getContext('2d');
    this.charts[canvasId] = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['NIV 1', 'NIV 2', 'NIV 2 CC', 'NIV 3'],
        datasets: [{
          data: [niv1, niv2, niv2CC, niv3],
          backgroundColor: [
            this.colors.success,
            this.colors.warning,
            this.colors.error,
            '#8B0000'
          ],
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 15,
              font: { size: 13 }
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const value = context.parsed;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                return `${label}: ${value} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  }

  // === BAR CHART: MONTHLY D1 ===
  renderMonthlyD1Bar(canvasId, cdData) {
    this.destroyChart(canvasId);

    // Grouper par mois
    const monthlyData = {};
    cdData.forEach(cd => {
      const date = new Date(cd.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('fr-FR', { year: 'numeric', month: 'short' });

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { label: monthLabel, d1Total: 0, count: 0 };
      }
      monthlyData[monthKey].d1Total += cd.d1Reel;
      monthlyData[monthKey].count++;
    });

    const sortedMonths = Object.entries(monthlyData).sort((a, b) => a[0].localeCompare(b[0]));
    const labels = sortedMonths.map(([_, data]) => data.label);
    const avgD1 = sortedMonths.map(([_, data]) => (data.d1Total / data.count).toFixed(2));

    const ctx = document.getElementById(canvasId).getContext('2d');
    this.charts[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'D1 Moyen (heures)',
          data: avgD1,
          backgroundColor: this.colors.primary,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => `D1 Moyen: ${context.parsed.y}h`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: 'Heures' }
          }
        }
      }
    });
  }

  // === LINE CHART: PERFORMANCE EVOLUTION ===
  renderPerformanceLine(canvasId, cdData) {
    this.destroyChart(canvasId);

    // Grouper par mois
    const monthlyData = {};
    cdData.forEach(cd => {
      const date = new Date(cd.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('fr-FR', { year: 'numeric', month: 'short' });

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          label: monthLabel,
          perfTotal: 0,
          effTotal: 0,
          count: 0
        };
      }
      monthlyData[monthKey].perfTotal += cd.performance;
      monthlyData[monthKey].effTotal += cd.efficacite;
      monthlyData[monthKey].count++;
    });

    const sortedMonths = Object.entries(monthlyData).sort((a, b) => a[0].localeCompare(b[0]));
    const labels = sortedMonths.map(([_, data]) => data.label);
    const avgPerf = sortedMonths.map(([_, data]) => (data.perfTotal / data.count).toFixed(2));
    const avgEff = sortedMonths.map(([_, data]) => (data.effTotal / data.count).toFixed(2));

    const ctx = document.getElementById(canvasId).getContext('2d');
    this.charts[canvasId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Performance Moyenne (%)',
            data: avgPerf,
            borderColor: this.colors.primary,
            backgroundColor: this.colors.primary + '20',
            tension: 0.4,
            fill: true
          },
          {
            label: 'Efficacité Moyenne (%)',
            data: avgEff,
            borderColor: this.colors.success,
            backgroundColor: this.colors.success + '20',
            tension: 0.4,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'top'
          },
          tooltip: {
            mode: 'index',
            intersect: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            title: { display: true, text: 'Pourcentage (%)' }
          }
        }
      }
    });
  }

  // === DOUGHNUT CHART: INCIDENTS ===
  renderIncidentsDoughnut(canvasId, cdData) {
    this.destroyChart(canvasId);

    const withIncident = cdData.filter(cd => cd.incident === 'Oui').length;
    const withoutIncident = cdData.length - withIncident;

    const ctx = document.getElementById(canvasId).getContext('2d');
    this.charts[canvasId] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Sans Incident', 'Avec Incident'],
        datasets: [{
          data: [withoutIncident, withIncident],
          backgroundColor: [this.colors.success, this.colors.error],
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'bottom'
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const value = context.parsed;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                return `${label}: ${value} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  }

  // === BAR CHART: TOP OPERATORS ===
  renderTopOperators(canvasId, cdData, limit = 10) {
    this.destroyChart(canvasId);

    const opStats = {};
    dbData.operateurs.forEach(op => {
      const cdOp = cdData.filter(cd => cd.conf1 === op.id || cd.conf2 === op.id);
      if (cdOp.length > 0) {
        const perfMoyenne = cdOp.reduce((sum, cd) => sum + cd.performance, 0) / cdOp.length;
        opStats[op.id] = { nom: op.nom, perf: perfMoyenne, count: cdOp.length };
      }
    });

    const sorted = Object.values(opStats)
      .sort((a, b) => b.perf - a.perf)
      .slice(0, limit);

    const labels = sorted.map(op => op.nom);
    const data = sorted.map(op => op.perf.toFixed(2));

    const ctx = document.getElementById(canvasId).getContext('2d');
    this.charts[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Performance Moyenne (%)',
          data: data,
          backgroundColor: this.colors.primary,
          borderRadius: 6
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => `Performance: ${context.parsed.x}%`
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            max: 100,
            title: { display: true, text: 'Performance (%)' }
          }
        }
      }
    });
  }

  // === MIXED CHART: QUALITY TREND ===
  renderQualityTrend(canvasId, cdData) {
    this.destroyChart(canvasId);

    // Grouper par mois
    const monthlyData = {};
    cdData.forEach(cd => {
      const date = new Date(cd.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('fr-FR', { year: 'numeric', month: 'short' });

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { label: monthLabel, niv1: 0, niv2: 0, niv2CC: 0, niv3: 0, total: 0 };
      }

      if (cd.qualite === '1') monthlyData[monthKey].niv1++;
      else if (cd.qualite === '2') monthlyData[monthKey].niv2++;
      else if (cd.qualite === '2_cc') monthlyData[monthKey].niv2CC++;
      else monthlyData[monthKey].niv3++;

      monthlyData[monthKey].total++;
    });

    const sortedMonths = Object.entries(monthlyData).sort((a, b) => a[0].localeCompare(b[0]));
    const labels = sortedMonths.map(([_, data]) => data.label);
    const pctNiv1 = sortedMonths.map(([_, data]) => ((data.niv1 / data.total) * 100).toFixed(1));

    const ctx = document.getElementById(canvasId).getContext('2d');
    this.charts[canvasId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Taux NIV 1 (%)',
          data: pctNiv1,
          borderColor: this.colors.success,
          backgroundColor: this.colors.success + '40',
          tension: 0.4,
          fill: true,
          pointRadius: 5,
          pointHoverRadius: 7
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { position: 'top' },
          tooltip: {
            callbacks: {
              label: (context) => `Taux NIV 1: ${context.parsed.y}%`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            title: { display: true, text: 'Pourcentage (%)' }
          }
        }
      }
    });
  }

  // === DESTROY ALL CHARTS ===
  destroyAll() {
    Object.keys(this.charts).forEach(chartId => this.destroyChart(chartId));
  }
}

// Instance globale
const chartManager = new ChartManager();

// Initialiser les graphiques au chargement
document.addEventListener('DOMContentLoaded', () => {
  // Chart Manager ready
});
