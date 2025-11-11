// === MODULE DE STATISTIQUES COMPARATIVES ===

class ComparativeStats {
  constructor() {
    this.periods = {
      thisWeek: this.getThisWeek(),
      lastWeek: this.getLastWeek(),
      thisMonth: this.getThisMonth(),
      lastMonth: this.getLastMonth()
    };
  }

  // === CALCUL DES PÉRIODES ===
  getThisWeek() {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    return { start: monday, end: sunday };
  }

  getLastWeek() {
    const thisWeek = this.getThisWeek();
    const lastWeekStart = new Date(thisWeek.start);
    lastWeekStart.setDate(thisWeek.start.getDate() - 7);

    const lastWeekEnd = new Date(thisWeek.end);
    lastWeekEnd.setDate(thisWeek.end.getDate() - 7);

    return { start: lastWeekStart, end: lastWeekEnd };
  }

  getThisMonth() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end };
  }

  getLastMonth() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    return { start, end };
  }

  // === FILTRER LES CD PAR PÉRIODE ===
  getCDInPeriod(period) {
    return dbData.cd.filter(cd => {
      const cdDate = new Date(cd.date + 'T00:00:00');
      return cdDate >= period.start && cdDate <= period.end;
    });
  }

  // === CALCULER LES STATS D'UNE PÉRIODE ===
  calculateStats(cdList) {
    if (cdList.length === 0) {
      return {
        totalCD: 0,
        d1Moyen: 0,
        tauxNiv1: 0,
        tauxIncidents: 0,
        performanceMoyenne: 0
      };
    }

    const totalCD = cdList.length;
    const d1Total = cdList.reduce((sum, cd) => sum + (cd.d1Reel || 0), 0);
    const d1Moyen = d1Total / totalCD;

    const cdNiv1 = cdList.filter(cd => cd.qualite === '1').length;
    const tauxNiv1 = (cdNiv1 / totalCD) * 100;

    const incidents = cdList.filter(cd => cd.incident === 'Oui').length;
    const tauxIncidents = (incidents / totalCD) * 100;

    const perfTotal = cdList.reduce((sum, cd) => sum + (cd.performance || 0), 0);
    const performanceMoyenne = perfTotal / totalCD;

    return {
      totalCD,
      d1Moyen: parseFloat(d1Moyen.toFixed(1)),
      tauxNiv1: parseFloat(tauxNiv1.toFixed(1)),
      tauxIncidents: parseFloat(tauxIncidents.toFixed(1)),
      performanceMoyenne: parseFloat(performanceMoyenne.toFixed(1))
    };
  }

  // === COMPARER DEUX PÉRIODES ===
  comparePeriods(currentPeriod, previousPeriod) {
    const currentCD = this.getCDInPeriod(currentPeriod);
    const previousCD = this.getCDInPeriod(previousPeriod);

    const current = this.calculateStats(currentCD);
    const previous = this.calculateStats(previousCD);

    return {
      current,
      previous,
      trends: {
        totalCD: this.calculateTrend(current.totalCD, previous.totalCD),
        d1Moyen: this.calculateTrend(current.d1Moyen, previous.d1Moyen, true), // inverse car moins = mieux
        tauxNiv1: this.calculateTrend(current.tauxNiv1, previous.tauxNiv1),
        tauxIncidents: this.calculateTrend(current.tauxIncidents, previous.tauxIncidents, true),
        performanceMoyenne: this.calculateTrend(current.performanceMoyenne, previous.performanceMoyenne)
      }
    };
  }

  // === CALCULER LA TENDANCE ===
  calculateTrend(current, previous, inverse = false) {
    if (previous === 0) {
      return { value: 0, percentage: 0, direction: 'neutral', icon: '→' };
    }

    const difference = current - previous;
    const percentage = (difference / previous) * 100;

    let direction = 'neutral';
    let icon = '→';

    if (Math.abs(percentage) < 1) {
      direction = 'neutral';
      icon = '→';
    } else if (difference > 0) {
      direction = inverse ? 'down' : 'up';
      icon = inverse ? '↘️' : '↗️';
    } else {
      direction = inverse ? 'up' : 'down';
      icon = inverse ? '↗️' : '↘️';
    }

    return {
      value: parseFloat(difference.toFixed(1)),
      percentage: parseFloat(percentage.toFixed(1)),
      direction,
      icon
    };
  }

  // === GÉNÉRER LE HTML DES STATS COMPARATIVES ===
  generateComparisonHTML(comparison, title) {
    const { current, previous, trends } = comparison;

    const getTrendClass = (direction) => {
      if (direction === 'up') return 'trend-up';
      if (direction === 'down') return 'trend-down';
      return 'trend-neutral';
    };

    const getTrendHTML = (trend) => {
      return `
        <span class="trend ${getTrendClass(trend.direction)}">
          ${trend.icon} ${trend.percentage > 0 ? '+' : ''}${trend.percentage}%
        </span>
      `;
    };

    return `
      <div class="comparison-card">
        <h3 class="comparison-title">${title}</h3>

        <div class="comparison-grid">
          <div class="comparison-item">
            <div class="comparison-label">Total CD</div>
            <div class="comparison-value">
              ${current.totalCD}
              ${getTrendHTML(trends.totalCD)}
            </div>
            <div class="comparison-previous">vs ${previous.totalCD}</div>
          </div>

          <div class="comparison-item">
            <div class="comparison-label">D1 Moyen</div>
            <div class="comparison-value">
              ${current.d1Moyen}h
              ${getTrendHTML(trends.d1Moyen)}
            </div>
            <div class="comparison-previous">vs ${previous.d1Moyen}h</div>
          </div>

          <div class="comparison-item">
            <div class="comparison-label">Taux NIV 1</div>
            <div class="comparison-value">
              ${current.tauxNiv1}%
              ${getTrendHTML(trends.tauxNiv1)}
            </div>
            <div class="comparison-previous">vs ${previous.tauxNiv1}%</div>
          </div>

          <div class="comparison-item">
            <div class="comparison-label">Taux Pannes</div>
            <div class="comparison-value">
              ${current.tauxIncidents}%
              ${getTrendHTML(trends.tauxIncidents)}
            </div>
            <div class="comparison-previous">vs ${previous.tauxIncidents}%</div>
          </div>

          <div class="comparison-item">
            <div class="comparison-label">Performance Moyenne</div>
            <div class="comparison-value">
              ${current.performanceMoyenne}%
              ${getTrendHTML(trends.performanceMoyenne)}
            </div>
            <div class="comparison-previous">vs ${previous.performanceMoyenne}%</div>
          </div>
        </div>
      </div>
    `;
  }

  // === AFFICHER LES COMPARAISONS ===
  displayComparisons(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const weekComparison = this.comparePeriods(this.periods.thisWeek, this.periods.lastWeek);
    const monthComparison = this.comparePeriods(this.periods.thisMonth, this.periods.lastMonth);

    const html = `
      <div class="comparisons-container">
        ${this.generateComparisonHTML(weekComparison, '📅 Cette semaine vs Semaine dernière')}
        ${this.generateComparisonHTML(monthComparison, '📅 Ce mois vs Mois dernier')}
      </div>
    `;

    container.innerHTML = html;
  }
}

// Instance globale
const comparativeStats = new ComparativeStats();

// Fonction helper pour rafraîchir les stats comparatives
function afficherStatsComparatives() {
  comparativeStats.displayComparisons('comparativeStatsContainer');
}
