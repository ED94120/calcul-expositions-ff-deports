import { VITRAGE_ATT_DB } from "./constants.js";
import { dbwToW, formatNumberForDisplay } from "./utils.js";
import {
  normalizeAzimuthInputTo360,
  getAzimuthInterpolationData,
  getElevationInterpolationData,
  interpolateLinear
} from "./angles.js";

function getVitrageAttenuationDB(vitrageKey) {
  return VITRAGE_ATT_DB[vitrageKey] ?? 0;
}

export function interpolateDiagramLoss(valuesArray, interpolationData) {
  if (!Array.isArray(valuesArray) || valuesArray.length !== 360) {
    throw new Error("Tableau de diagramme invalide.");
  }

  const valueLow = valuesArray[interpolationData.lowerIndex];
  const valueHigh = valuesArray[interpolationData.upperIndex];

  if (!Number.isFinite(valueLow) || !Number.isFinite(valueHigh)) {
    throw new Error("Valeurs de diagramme invalides pour l’interpolation.");
  }

  return interpolateLinear(valueLow, valueHigh, interpolationData.interpolationWeight);
}

export function computeAzimuthLoss(bandDiagram, deportAzimutDeg) {
  const azimuth360Deg = normalizeAzimuthInputTo360(deportAzimutDeg);
  const interpolationData = getAzimuthInterpolationData(azimuth360Deg);

  const attenuationAzimutaleDB = interpolateDiagramLoss(
    bandDiagram.azimuthValuesDB,
    interpolationData
  );

  return {
    azimuth360Deg,
    attenuationAzimutaleDB
  };
}

export function computeElevationLoss(bandDiagram, deportElevationDeg) {
  const interpolationData = getElevationInterpolationData(deportElevationDeg);

  const attenuationElevationDB = interpolateDiagramLoss(
    bandDiagram.elevationValuesDB,
    interpolationData
  );

  return {
    elevationDeg: deportElevationDeg,
    attenuationElevationDB
  };
}

export function computeAngularLosses(bandDiagram, deportAzimutDeg, deportElevationDeg) {
  const azimuthLoss = computeAzimuthLoss(bandDiagram, deportAzimutDeg);
  const elevationLoss = computeElevationLoss(bandDiagram, deportElevationDeg);

  return {
    azimuth360Deg: azimuthLoss.azimuth360Deg,
    elevationDeg: elevationLoss.elevationDeg,
    attenuationAzimutaleDB: azimuthLoss.attenuationAzimutaleDB,
    attenuationElevationDB: elevationLoss.attenuationElevationDB,
    attenuationAngulaireTotaleDB:
      azimuthLoss.attenuationAzimutaleDB + elevationLoss.attenuationElevationDB
  };
}

export function computeBandTotalAttenuationDB(commonInputs, parsedBandInputs, angularLosses) {
  const attenuationVitrageDB = getVitrageAttenuationDB(commonInputs.vitrageKey);
  const attenuationSupplementaireAppliqueeDB = parsedBandInputs.attenuationSupplementaireDB;
  const attenuationAnfrAppliqueeDB = commonInputs.attenuationAnfrDB;

  const attenuationTotaleDB =
    angularLosses.attenuationAngulaireTotaleDB +
    attenuationVitrageDB +
    attenuationSupplementaireAppliqueeDB +
    attenuationAnfrAppliqueeDB;

  return {
    attenuationVitrageDB,
    attenuationSupplementaireAppliqueeDB,
    attenuationAnfrAppliqueeDB,
    attenuationTotaleDB
  };
}

export function computeBandPireFinaleDBW(pireInitialeDBW, attenuationTotaleDB) {
  if (!Number.isFinite(pireInitialeDBW) || !Number.isFinite(attenuationTotaleDB)) {
    throw new Error("Calcul de la PIRE finale impossible.");
  }

  return pireInitialeDBW - attenuationTotaleDB;
}

export function computeBandPireFinaleW(pireFinaleDBW) {
  if (!Number.isFinite(pireFinaleDBW)) {
    throw new Error("Conversion de la PIRE finale en watts impossible.");
  }

  return dbwToW(pireFinaleDBW);
}

export function computeBandExposureVM(pireFinaleW, distance3DMetres) {
  if (!Number.isFinite(pireFinaleW) || !Number.isFinite(distance3DMetres) || distance3DMetres <= 0) {
    throw new Error("Calcul de l’exposition impossible.");
  }

  return Math.sqrt(30 * pireFinaleW) / distance3DMetres;
}

export function computeBandResult(commonInputs, bandState) {
  const angularLosses = computeAngularLosses(
    bandState.diagram,
    bandState.parsed.deportAzimutDeg,
    bandState.parsed.deportElevationDeg
  );

  const totalAttenuation = computeBandTotalAttenuationDB(
    commonInputs,
    bandState.parsed,
    angularLosses
  );

  const pireFinaleDBW = computeBandPireFinaleDBW(
    bandState.parsed.pireInitialeDBW,
    totalAttenuation.attenuationTotaleDB
  );

  const pireFinaleW = computeBandPireFinaleW(pireFinaleDBW);

  const expositionVM = computeBandExposureVM(
    pireFinaleW,
    commonInputs.distance3DMetres
  );

  return {
    attenuationAzimutaleDB: angularLosses.attenuationAzimutaleDB,
    attenuationElevationDB: angularLosses.attenuationElevationDB,
    attenuationAngulaireTotaleDB: angularLosses.attenuationAngulaireTotaleDB,
    attenuationVitrageDB: totalAttenuation.attenuationVitrageDB,
    attenuationSupplementaireAppliqueeDB: totalAttenuation.attenuationSupplementaireAppliqueeDB,
    attenuationAnfrAppliqueeDB: totalAttenuation.attenuationAnfrAppliqueeDB,
    attenuationTotaleDB: totalAttenuation.attenuationTotaleDB,
    pireFinaleDBW,
    pireFinaleW,
    expositionVM
  };
}

export function computeTotalExposureVM(bandResults) {
  const values = (Array.isArray(bandResults) ? bandResults : [])
    .map((bandResult) => bandResult?.expositionVM)
    .filter((value) => Number.isFinite(value));

  if (values.length === 0) {
    return null;
  }

  return Math.sqrt(values.reduce((sum, value) => sum + value ** 2, 0));
}

export function buildDynamicExposureText(vitrageLabel, expositionTotaleVM) {
  if (!Number.isFinite(expositionTotaleVM)) {
    return "";
  }

  return `L’exposition totale au POI ${vitrageLabel} est de ${formatNumberForDisplay(expositionTotaleVM, 2)} V/m.`;
}
