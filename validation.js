// === VALIDATION & DUPLICATE DETECTION MODULE ===

class ValidationManager {
  constructor() {
    this.validators = {};
    this.initValidators();
  }

  // === INIT VALIDATORS ===
  initValidators() {
    this.validators = {
      date: this.validateDate.bind(this),
      time: this.validateTime.bind(this),
      d1: this.validateD1.bind(this),
      operators: this.validateOperators.bind(this),
      duplicate: this.checkDuplicate.bind(this),
      anomaly: this.checkAnomaly.bind(this)
    };
  }

  // === VALIDATE DATE ===
  validateDate(date) {
    if (!date) {
      return { valid: false, message: 'La date est obligatoire' };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cdDate = new Date(date + 'T00:00:00');

    if (cdDate > today) {
      return {
        valid: false,
        message: '❌ Impossible de saisir un CD dans le futur',
        details: `Date sélectionnée: ${cdDate.toLocaleDateString('fr-FR')}`
      };
    }

    // Avertissement si date trop ancienne (>6 mois)
    const sixMonthsAgo = new Date(today);
    sixMonthsAgo.setMonth(today.getMonth() - 6);

    if (cdDate < sixMonthsAgo) {
      return {
        valid: true,
        warning: true,
        message: '⚠️ La date est ancienne (>6 mois)',
        details: 'Confirmez-vous cette date ?'
      };
    }

    return { valid: true };
  }

  // === VALIDATE TIME ===
  validateTime(heure) {
    if (!heure) {
      return { valid: false, message: 'L\'heure est obligatoire' };
    }

    // Valider le format HH:MM
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(heure)) {
      return {
        valid: false,
        message: '❌ Format d\'heure invalide',
        details: 'Format attendu: HH:MM (ex: 14:30)'
      };
    }

    return { valid: true };
  }

  // === VALIDATE D1 ===
  validateD1(d1Reel, d1Net) {
    const errors = [];

    if (!d1Reel || d1Reel <= 0) {
      errors.push('D1 Réel doit être supérieur à 0');
    }

    if (!d1Net || d1Net <= 0) {
      errors.push('D1 Net doit être supérieur à 0');
    }

    if (d1Reel && d1Net && d1Net > d1Reel) {
      errors.push('D1 Net ne peut pas être supérieur à D1 Réel');
    }

    // Avertissement si D1 > 18h (anomalie)
    if (d1Reel > 18) {
      return {
        valid: errors.length === 0,
        warning: true,
        message: '⚠️ ANOMALIE: D1 Réel > 18 heures',
        details: `D1 Réel: ${d1Reel}h - Une anomalie sera automatiquement signalée`,
        errors: errors
      };
    }

    // Avertissement si temps perdu > 2h
    if (d1Reel && d1Net && (d1Reel - d1Net) > 2) {
      return {
        valid: errors.length === 0,
        warning: true,
        message: '⚠️ Temps perdu important',
        details: `Différence: ${(d1Reel - d1Net).toFixed(1)}h`,
        errors: errors
      };
    }

    if (errors.length > 0) {
      return {
        valid: false,
        message: '❌ Erreurs de validation D1',
        errors: errors
      };
    }

    return { valid: true };
  }

  // === VALIDATE OPERATORS ===
  validateOperators(conf1, conf2) {
    const errors = [];

    if (!conf1) {
      errors.push('Opérateur CONF1 (PNC) est obligatoire');
    }

    if (!conf2) {
      errors.push('Opérateur CONF2 (PNS) est obligatoire');
    }

    if (conf1 && conf2 && conf1 === conf2) {
      errors.push('Les opérateurs CONF1 et CONF2 doivent être différents');
    }

    if (errors.length > 0) {
      return {
        valid: false,
        message: '❌ Erreurs de validation opérateurs',
        errors: errors
      };
    }

    return { valid: true };
  }

  // === CHECK DUPLICATE ===
  checkDuplicate(newCD) {
    // Chercher un CD similaire (même date, heure, machine)
    const duplicate = dbData.cd.find(cd =>
      cd.id !== newCD.id &&
      cd.date === newCD.date &&
      cd.heure === newCD.heure &&
      cd.numMachine === newCD.numMachine
    );

    if (duplicate) {
      const machine = dbData.machines.find(m => m.id === duplicate.numMachine);
      return {
        valid: false,
        isDuplicate: true,
        message: '⚠️ CD potentiellement en double',
        details: `Un CD existe déjà pour:\n• Date: ${duplicate.date}\n• Heure: ${duplicate.heure}\n• Machine: ${machine ? machine.numero : 'N/A'}\n• CAI: ${duplicate.cai}`,
        duplicate: duplicate
      };
    }

    return { valid: true, isDuplicate: false };
  }

  // === CHECK ANOMALY ===
  checkAnomaly(cd) {
    const anomalies = [];

    // Anomalie: D1 > 18h
    if (cd.d1Reel > 18) {
      anomalies.push({
        type: 'critical',
        message: 'D1 Réel supérieur à 18 heures',
        value: `${cd.d1Reel}h`
      });
    }

    // Anomalie: Temps perdu > 3h
    if ((cd.d1Reel - cd.d1Net) > 3) {
      anomalies.push({
        type: 'warning',
        message: 'Temps perdu important',
        value: `${(cd.d1Reel - cd.d1Net).toFixed(1)}h`
      });
    }

    // Anomalie: Performance < 50%
    if (cd.performance < 50) {
      anomalies.push({
        type: 'warning',
        message: 'Performance très faible',
        value: `${cd.performance}%`
      });
    }

    // Anomalie: NIV 2 CC ou NIV 3
    if (cd.qualite === '2_cc' || cd.qualite === '3') {
      anomalies.push({
        type: 'quality',
        message: cd.qualite === '2_cc' ? 'Niveau 2 CC (critique)' : 'Niveau 3 (critique)',
        value: cd.qualite === '2_cc' ? 'NIV 2 CC' : 'NIV 3'
      });
    }

    if (anomalies.length > 0) {
      return {
        hasAnomalies: true,
        anomalies: anomalies,
        count: anomalies.length
      };
    }

    return { hasAnomalies: false, anomalies: [], count: 0 };
  }

  // === VALIDATE CD COMPLETE ===
  validateCD(cdData) {
    const results = {
      valid: true,
      errors: [],
      warnings: [],
      anomalies: []
    };

    // Valider date
    const dateValidation = this.validateDate(cdData.date);
    if (!dateValidation.valid) {
      results.valid = false;
      results.errors.push(dateValidation);
    } else if (dateValidation.warning) {
      results.warnings.push(dateValidation);
    }

    // Valider heure
    const timeValidation = this.validateTime(cdData.heure);
    if (!timeValidation.valid) {
      results.valid = false;
      results.errors.push(timeValidation);
    }

    // Valider D1
    const d1Validation = this.validateD1(cdData.d1Reel, cdData.d1Net);
    if (!d1Validation.valid) {
      results.valid = false;
      results.errors.push(d1Validation);
    } else if (d1Validation.warning) {
      results.warnings.push(d1Validation);
    }

    // Valider opérateurs
    const opValidation = this.validateOperators(cdData.conf1, cdData.conf2);
    if (!opValidation.valid) {
      results.valid = false;
      results.errors.push(opValidation);
    }

    // Vérifier les doublons
    const duplicateCheck = this.checkDuplicate(cdData);
    if (duplicateCheck.isDuplicate) {
      results.warnings.push(duplicateCheck);
    }

    // Vérifier les anomalies
    const anomalyCheck = this.checkAnomaly(cdData);
    if (anomalyCheck.hasAnomalies) {
      results.anomalies = anomalyCheck.anomalies;
    }

    return results;
  }

  // === SHOW VALIDATION RESULTS ===
  showValidationResults(results, onConfirm = null) {
    // Afficher les erreurs critiques
    if (results.errors.length > 0) {
      let errorMsg = '❌ ERREURS DE VALIDATION:\n\n';
      results.errors.forEach(err => {
        errorMsg += `• ${err.message}\n`;
        if (err.errors && err.errors.length > 0) {
          err.errors.forEach(e => errorMsg += `  - ${e}\n`);
        }
        if (err.details) {
          errorMsg += `  ${err.details}\n`;
        }
        errorMsg += '\n';
      });

      showError('Validation échouée', errorMsg);
      return false;
    }

    // Afficher les avertissements et demander confirmation
    if (results.warnings.length > 0 || results.anomalies.length > 0) {
      let warningMsg = '';

      if (results.warnings.length > 0) {
        warningMsg += '⚠️ AVERTISSEMENTS:\n\n';
        results.warnings.forEach(warn => {
          warningMsg += `• ${warn.message}\n`;
          if (warn.details) {
            warningMsg += `  ${warn.details}\n`;
          }
          warningMsg += '\n';
        });
      }

      if (results.anomalies.length > 0) {
        warningMsg += '\n🔍 ANOMALIES DÉTECTÉES:\n\n';
        results.anomalies.forEach(anomaly => {
          warningMsg += `• ${anomaly.message}: ${anomaly.value}\n`;
        });
        warningMsg += '\n';
      }

      warningMsg += '\nVoulez-vous continuer ?';

      if (onConfirm) {
        toastManager.showWithAction({
          type: 'warning',
          title: 'Avertissements détectés',
          message: 'Cliquez pour voir les détails',
          actionText: 'Voir',
          onAction: () => {
            if (window.confirm(warningMsg)) {
              onConfirm();
            }
          }
        });
      } else {
        return window.confirm(warningMsg);
      }
    }

    return true;
  }
}

// Instance globale
const validationManager = new ValidationManager();

// === HELPERS ===
function validateCDBeforeSave(cdData, onSuccess) {
  const results = validationManager.validateCD(cdData);

  if (!results.valid) {
    validationManager.showValidationResults(results);
    return false;
  }

  if (results.warnings.length > 0 || results.anomalies.length > 0) {
    validationManager.showValidationResults(results, onSuccess);
    return false; // Attendre confirmation
  }

  // Validation OK, continuer
  if (onSuccess) onSuccess();
  return true;
}
