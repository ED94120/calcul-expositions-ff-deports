import { parseLocalizedNumber } from "./utils.js";

function normalizeLine(line) {
  return String(line ?? "").replace(/\r/g, "").trim();
}

function isAzimuthHeader(line) {
  return normalizeLine(line).toLowerCase() === "azimut";
}

function isElevationHeader(line) {
  return normalizeLine(line).toLowerCase() === "elevation";
}

export function isBandLabelLine(line) {
  const text = normalizeLine(line);
  return /^\d+(?:[.,]\d+)?\s*MHz\s*,\s*\d+(?:[.,]\d+)?\s*MHz$/i.test(text);
}

export function convertRawDiagramValueToLossDB(rawValue) {
  if (!Number.isFinite(rawValue)) {
    throw new Error("Valeur de diagramme non numérique.");
  }

  return Math.abs(rawValue);
}

function isStructuralLine(line) {
  return (
    isAzimuthHeader(line) ||
    isElevationHeader(line) ||
    isBandLabelLine(line)
  );
}

function readDiagramValues(lines, startIndex) {
  const values = [];
  let index = startIndex;

  while (index < lines.length) {
    const line = normalizeLine(lines[index]);

    if (line === "") {
      index += 1;
      continue;
    }

    if (isStructuralLine(line)) {
      break;
    }

    const parsedValue = parseLocalizedNumber(line);

    if (parsedValue === null || Number.isNaN(parsedValue)) {
      throw new Error(`Valeur non numérique rencontrée dans le diagramme : "${line}".`);
    }

    values.push(convertRawDiagramValueToLossDB(parsedValue));
    index += 1;
  }

  return {
    values,
    nextIndex: index
  };
}

export function validateBandDiagramStructure(band) {
  if (!Array.isArray(band.azimuthValuesDB) || band.azimuthValuesDB.length !== 360) {
    throw new Error(`Le bloc Azimut de la bande "${band.label}" ne contient pas 360 valeurs.`);
  }

  if (!Array.isArray(band.elevationValuesDB) || band.elevationValuesDB.length !== 360) {
    throw new Error(`Le bloc Elevation de la bande "${band.label}" ne contient pas 360 valeurs.`);
  }

  if (!band.azimuthValuesDB.every(Number.isFinite)) {
    throw new Error(`Le bloc Azimut de la bande "${band.label}" contient une valeur invalide.`);
  }

  if (!band.elevationValuesDB.every(Number.isFinite)) {
    throw new Error(`Le bloc Elevation de la bande "${band.label}" contient une valeur invalide.`);
  }
}

function readBandSection(lines, startIndex, bandIndex) {
  let index = startIndex;

  while (index < lines.length && normalizeLine(lines[index]) === "") {
    index += 1;
  }

  if (index >= lines.length || !isBandLabelLine(lines[index])) {
    throw new Error("Libellé de bande introuvable.");
  }

  const bandLabel = normalizeLine(lines[index]);
  index += 1;

  while (index < lines.length && normalizeLine(lines[index]) === "") {
    index += 1;
  }

  if (index >= lines.length || !isAzimuthHeader(lines[index])) {
    throw new Error(`Bloc Azimut introuvable pour la bande "${bandLabel}".`);
  }

  index += 1;
  const azimuthReadResult = readDiagramValues(lines, index);
  const azimuthValuesDB = azimuthReadResult.values;
  index = azimuthReadResult.nextIndex;

  if (index >= lines.length || !isElevationHeader(lines[index])) {
    throw new Error(`Bloc Elevation introuvable pour la bande "${bandLabel}".`);
  }

  index += 1;
  const elevationReadResult = readDiagramValues(lines, index);
  const elevationValuesDB = elevationReadResult.values;
  index = elevationReadResult.nextIndex;

  const band = {
    key: `BAND_${bandIndex + 1}`,
    label: bandLabel,
    azimuthValuesDB,
    elevationValuesDB
  };

  validateBandDiagramStructure(band);

  return {
    band,
    nextIndex: index
  };
}

export function parseDiagramFile(rawText, fileName = "") {
  const lines = String(rawText ?? "")
    .replace(/\r/g, "")
    .split("\n");

  const nonEmptyLines = lines.map(normalizeLine).filter((line) => line !== "");
  if (nonEmptyLines.length === 0) {
    throw new Error("Le fichier diagramme est vide.");
  }

  const antennaNameFromFile = nonEmptyLines[0];
  if (!antennaNameFromFile) {
    throw new Error("Le nom de l’antenne est introuvable dans le fichier diagramme.");
  }

  let index = 0;

  while (index < lines.length && normalizeLine(lines[index]) === "") {
    index += 1;
  }

  index += 1;

  const bands = [];

  while (index < lines.length) {
    while (index < lines.length && normalizeLine(lines[index]) === "") {
      index += 1;
    }

    if (index >= lines.length) {
      break;
    }

    if (!isBandLabelLine(lines[index])) {
      throw new Error(`Structure inattendue dans le fichier diagramme près de la ligne : "${normalizeLine(lines[index])}".`);
    }

    const bandReadResult = readBandSection(lines, index, bands.length);
    bands.push(bandReadResult.band);
    index = bandReadResult.nextIndex;
  }

  if (bands.length === 0) {
    throw new Error("Aucune bande valide n’a été détectée dans le fichier diagramme.");
  }

  if (![2, 3].includes(bands.length)) {
    throw new Error(`Le fichier diagramme contient ${bands.length} bandes. Seules les antennes à 2 ou 3 bandes sont acceptées.`);
  }

  return {
    antennaNameFromFile,
    fileName,
    bandCount: bands.length,
    bands
  };
}

export async function loadDiagramFile(url, fileName = "") {
  const response = await fetch(url, { cache: "no-cache" });

  if (!response.ok) {
    throw new Error(`Impossible de lire le fichier diagramme (${response.status}).`);
  }

  const rawText = await response.text();
  return parseDiagramFile(rawText, fileName);
}
