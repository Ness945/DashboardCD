// === INSIGHTS UI MODULE ===

function afficherInsights() {
  const cdData = getFilteredCD({ excludeCached: true });

  if (cdData.length === 0) {
    const recommendationsContent = document.getElementById('recommendationsContent');
    if (recommendationsContent) {
      recommendationsContent.innerHTML = '<p style="color: var(--color-text-secondary);">Aucune donnée disponible</p>';
    }
    return;
  }

  // Afficher les recommandations
  afficherRecommendations(cdData);

  // Afficher les meilleurs binômes
  afficherMeilleursBinomes(cdData);

  // Afficher les machines problématiques
  afficherMachinesProblematiques(cdData);

  // Afficher le graphique des tendances hebdomadaires
  afficherTendancesHebdomadaires(cdData);
}

function afficherRecommendations(cdData) {
  const recommendations = analyticsEngine.generateRecommendations(cdData);

  if (recommendations.length === 0) {
    document.getElementById('recommendationsContent').innerHTML = '<p style="color: var(--color-text-secondary);">Aucune recommandation pour le moment. Tout va bien! 👍</p>';
    return;
  }

  let html = '<div style="display: flex; flex-direction: column; gap: var(--space-16);">';

  recommendations.forEach(rec => {
    let iconColor = 'var(--color-info)';
    let borderColor = 'var(--color-info)';
    let icon = 'ℹ️';

    if (rec.type === 'success') {
      iconColor = 'var(--color-success)';
      borderColor = 'var(--color-success)';
      icon = '✅';
    } else if (rec.type === 'warning') {
      iconColor = 'var(--color-warning)';
      borderColor = 'var(--color-warning)';
      icon = '⚠️';
    } else if (rec.type === 'error') {
      iconColor = 'var(--color-error)';
      borderColor = 'var(--color-error)';
      icon = '❌';
    }

    html += `
      <div style="padding: var(--space-16); background: var(--color-surface); border-left: 4px solid ${borderColor}; border-radius: var(--radius-base); box-shadow: var(--shadow-sm);">
        <div style="display: flex; gap: var(--space-12); align-items: start;">
          <div style="font-size: var(--font-size-2xl);">${icon}</div>
          <div style="flex: 1;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-8);">
              <h4 style="margin: 0; color: ${iconColor};">${rec.title}</h4>
              <span style="padding: var(--space-4) var(--space-12); background: var(--color-bg-1); border-radius: var(--radius-full); font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold);">
                ${rec.category}
              </span>
            </div>
            <p style="margin: 0 0 var(--space-8) 0; color: var(--color-text);">${rec.message}</p>
            <p style="margin: 0; color: var(--color-text-secondary); font-size: var(--font-size-sm); font-style: italic;">
              💡 Action suggérée: ${rec.action}
            </p>
          </div>
        </div>
      </div>
    `;
  });

  html += '</div>';

  document.getElementById('recommendationsContent').innerHTML = html;
}

function afficherMeilleursBinomes(cdData) {
  const bestTeams = analyticsEngine.getBestTeams(cdData, 10);

  const tbody = document.querySelector('#tableBestTeams tbody');
  tbody.innerHTML = '';

  if (bestTeams.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--color-text-secondary);">Aucun binôme trouvé</td></tr>';
    return;
  }

  bestTeams.forEach((team, index) => {
    const tr = document.createElement('tr');
    const rankClass = index === 0 ? 'rank-1' : index === 1 ? 'rank-2' : index === 2 ? 'rank-3' : '';
    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';

    tr.className = rankClass;
    tr.innerHTML = `
      <td>${medal} ${index + 1}</td>
      <td><strong>${team.team}</strong></td>
      <td>${team.avgPerformance}%</td>
      <td>${team.tauxNiv1}%</td>
      <td>${team.count}</td>
    `;
    tbody.appendChild(tr);
  });
}

function afficherMachinesProblematiques(cdData) {
  const problematicMachines = analyticsEngine.getProblematicMachines(cdData, 75);

  const tbody = document.querySelector('#tableProblematicMachines tbody');
  tbody.innerHTML = '';

  if (problematicMachines.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--color-success);">✅ Aucune machine problématique détectée</td></tr>';
    return;
  }

  problematicMachines.forEach(machine => {
    const tr = document.createElement('tr');
    tr.style.cursor = 'pointer';
    tr.onclick = () => voirDetailsMachine(machine.machineId);
    tr.innerHTML = `
      <td><strong>${machine.machine}</strong></td>
      <td>${machine.type}</td>
      <td>${machine.avgPerformance}%</td>
      <td>${machine.anomalies > 0 ? `<span class="status status--error">${machine.anomalies}</span>` : '0'}</td>
      <td>${machine.qualityIssues > 0 ? `<span class="status status--warning">${machine.qualityIssues}</span>` : '0'}</td>
      <td>${machine.count}</td>
    `;
    tbody.appendChild(tr);
  });
}

function afficherTendancesHebdomadaires(cdData) {
  const weeklyTrends = analyticsEngine.getWeeklyTrends(cdData);

  if (weeklyTrends.length < 2) {
    document.getElementById('weeklyTrendsChart').parentElement.innerHTML = '<p style="color: var(--color-text-secondary); text-align: center;">Pas assez de données pour afficher les tendances hebdomadaires</p>';
    return;
  }

  const labels = weeklyTrends.map(w => w.week);
  const avgPerf = weeklyTrends.map(w => parseFloat(w.avgPerf));
  const tauxNiv1 = weeklyTrends.map(w => parseFloat(w.tauxNiv1));

  chartManager.destroyChart('weeklyTrendsChart');

  const ctx = document.getElementById('weeklyTrendsChart').getContext('2d');
  chartManager.charts['weeklyTrendsChart'] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Performance Moyenne (%)',
          data: avgPerf,
          borderColor: '#27509B',
          backgroundColor: 'rgba(39, 80, 155, 0.1)',
          tension: 0.4,
          fill: true
        },
        {
          label: 'Taux NIV 1 (%)',
          data: tauxNiv1,
          borderColor: '#2E7D32',
          backgroundColor: 'rgba(46, 125, 50, 0.1)',
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

// Ajouter l'onglet Insights à la navigation
document.addEventListener('DOMContentLoaded', () => {
  // Mettre à jour activerOnglet pour inclure Insights
  const originalActiverOnglet = window.activerOnglet;
  if (originalActiverOnglet) {
    window.activerOnglet = function(tabName) {
      originalActiverOnglet(tabName);
      if (tabName === 'insights') {
        afficherInsights();
      }
    };
  }

});
