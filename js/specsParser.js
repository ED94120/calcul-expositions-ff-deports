function normalizeLine(line) {
  return String(line ?? "").replace(/\r/g, "").trim();
}

function isFixedBeamCategory(line) {
  return normalizeLine(line).toLowerCase() === "antenne à faisceau fixe.";
}

function buildAntennaFileName(antennaId) {
  return `${antennaId}.txt`;
}

export function splitSpecsBlocks(rawText) {
  const text = String(rawText ?? "").replace(/\r/g, "");
  const parts = text.split(/\[ANTENNA\]/g);

  return parts
    .map((part) => part.trim())
    .filter((part) => part !== "");
}

export function parseAntennaSpecsBlock(blockText) {
  const lines = String(blockText ?? "")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");

  if (lines.length === 0) {
    throw new Error("Bloc antenne vide.");
  }

  const antennaId = lines[0];
  if (!antennaId) {
    throw new Error("Identifiant d’antenne introuvable.");
  }

  const categoryLabel = lines[1] ?? "";
  const remarksLines = lines.slice(2);
  const remarksText = remarksLines.join("\n");

  return {
    id: antennaId,
    fileName: buildAntennaFileName(antennaId),
    isFixedBeam: isFixedBeamCategory(categoryLabel),
    categoryLabel,
    remarksLines,
    remarksText
  };
}

export function parseAntennaSpecs(rawText) {
  const blocks = splitSpecsBlocks(rawText);

  return blocks.map((blockText) => parseAntennaSpecsBlock(blockText));
}

export function getFixedBeamAntennas(antennaCatalog) {
  return (Array.isArray(antennaCatalog) ? antennaCatalog : []).filter(
    (antenna) => antenna.isFixedBeam
  );
}

export async function loadAntennaSpecs(url) {
  const response = await fetch(url, { cache: "no-cache" });

  if (!response.ok) {
    throw new Error(`Impossible de lire antenna-specs.txt (${response.status}).`);
  }

  const rawText = await response.text();
  return parseAntennaSpecs(rawText);
}
