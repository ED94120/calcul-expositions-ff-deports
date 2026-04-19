import { BAND_STATUS } from "./constants.js";
import { parseLocalizedNumber } from "./utils.js";

function isFiniteNumber(value) {
  return Number.isFinite(value);
}

function validatePositiveOrZero(value) {
  return isFiniteNumber(value) && value >= 0;
}

function validateStrictlyPositive(value) {
  return isFiniteNumber(value) && value > 0;
}

function validateAzimuth(value) {
  if (!isFiniteNumber(value)) return false;

  return (
    (value >= -180 && value <= 180) ||
    (value >= 0 && value <= 360)
  );
}

function validateElevation(value) {
  return isFiniteNumber(value) && value >= -90 && value <= 90;
}

export function validateCommonInputs(settings) {
  const errors = {
    selectedAntenna: "",
    distance3D: "",
    deportAzimut: "",
    vitrage: "",
    attenuationAnfr: ""
  };

  const parsedCommonInputs = {
    selectedAntennaId: settings.selectedAntennaId,
    distance3DMetres: null,
    deportAzimutDeg: null,
    vitrageKey: settings.vitrageKey,
    attenuationAnfrDB: null,
    expertMode: !!settings.expertMode
  };

  let valid = true;

  if (!settings.selectedAntennaId) {
    errors.selectedAntenna = "Valeur requise.";
    valid = false;
  }

  const distance3DMetres = parseLocalizedNumber(settings.distance3DText);

  if (distance3DMetres === null) {
    errors.distance3D = "Valeur requise.";
    valid = false;
  } else if (!validateStrictlyPositive(distance3DMetres)) {
    errors.distance3D = "La distance doit être strictement positive.";
    valid = false;
  } else {
    parsedCommonInputs.distance3DMetres = distance3DMetres;
  }

  const deportAzimutDeg = parseLocalizedNumber(settings.deportAzimutText);

  if (deportAzimutDeg === null) {
    errors.deportAzimut = "Valeur requise.";
    valid = false;
  } else if (!validateAzimuth(deportAzimutDeg)) {
    errors.deportAzimut = "L’azimut doit être compris entre -180° et +180°, ou entre 0° et 360°.";
    valid = false;
  } else {
    parsedCommonInputs.deportAzimutDeg = deportAzimutDeg;
  }

  if (!settings.vitrageKey) {
    errors.vitrage = "Valeur requise.";
    valid = false;
  }

  const attenuationAnfrDB = parseLocalizedNumber(settings.attenuationAnfrText);

  if (settings.expertMode) {
    if (attenuationAnfrDB === null) {
      errors.attenuationAnfr = "Valeur requise en mode expert.";
      valid = false;
    } else if (!validatePositiveOrZero(attenuationAnfrDB)) {
      errors.attenuationAnfr = "L’atténuation ANFR doit avoir une valeur positive ou nulle.";
      valid = false;
    } else {
      parsedCommonInputs.attenuationAnfrDB = attenuationAnfrDB;
    }
  } else {
    if (!validatePositiveOrZero(attenuationAnfrDB)) {
      errors.attenuationAnfr = "Valeur ANFR invalide.";
      valid = false;
    } else {
      parsedCommonInputs.attenuationAnfrDB = attenuationAnfrDB;
    }
  }

  return {
    valid,
    parsedCommonInputs,
    errors
  };
}

export function validateBandInputs(bandState) {
  const errors = {
    pireInitiale: "",
    deportElevation: "",
    attenuationSupplementaire: "",
    band: ""
  };

  const parsedBandInputs = {
    pireInitialeDBW: null,
    deportElevationDeg: null,
    attenuationSupplementaireDB: 0
  };

  const pireText = String(bandState.inputs.pireInitialeText ?? "").trim();
  const elevationText = String(bandState.inputs.deportElevationText ?? "").trim();
  const suppText = String(bandState.inputs.attenuationSupplementaireText ?? "").trim();

  const isCompletelyEmpty =
    pireText === "" &&
    elevationText === "" &&
    suppText === "";

  if (isCompletelyEmpty) {
    return {
      valid: false,
      parsedBandInputs,
      errors,
      status: BAND_STATUS.VIDE
    };
  }

  let valid = true;

  const pireInitialeDBW = parseLocalizedNumber(pireText);
  const deportElevationDeg = parseLocalizedNumber(elevationText);
  const attenuationSupplementaireDB =
    suppText === "" ? 0 : parseLocalizedNumber(suppText);

  if (pireInitialeDBW === null) {
    errors.pireInitiale = "Valeur requise.";
    valid = false;
  } else if (!isFiniteNumber(pireInitialeDBW)) {
    errors.pireInitiale = "Nombre invalide.";
    valid = false;
  } else {
    parsedBandInputs.pireInitialeDBW = pireInitialeDBW;
  }

  if (deportElevationDeg === null) {
    errors.deportElevation = "Valeur requise.";
    valid = false;
  } else if (!validateElevation(deportElevationDeg)) {
    errors.deportElevation = "L’élévation doit être comprise entre -90° et +90°.";
    valid = false;
  } else {
    parsedBandInputs.deportElevationDeg = deportElevationDeg;
  }

  if (!isFiniteNumber(attenuationSupplementaireDB)) {
    errors.attenuationSupplementaire = "Nombre invalide.";
    valid = false;
  } else if (!validatePositiveOrZero(attenuationSupplementaireDB)) {
    errors.attenuationSupplementaire = "L’atténuation supplémentaire doit avoir une valeur positive ou nulle.";
    valid = false;
  } else {
    parsedBandInputs.attenuationSupplementaireDB = attenuationSupplementaireDB;
  }

  if (!valid) {
    errors.band = "Corriger les champs en erreur.";
  }

  return {
    valid,
    parsedBandInputs,
    errors,
    status: valid ? BAND_STATUS.VALIDE : BAND_STATUS.INVALIDE
  };
}
