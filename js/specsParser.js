function normalizeLine(line) {
  return String(line ?? "").replace(/\r/g, "").trim();
}

function normalizeComparableText(text) {
  return normalizeLine(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.:;]+$/g, "")
    .trim();
}

function isFixedBeamCategory(line) {
  const normalized = normalizeComparableText(line)
    .replace(/^type\s*:\s*/, "")
    .trim();

  return normalized === "antenne a faisceau fixe";
}

function buildAntennaFileName(antennaId) {
  return `${antennaId}.txt`;
}

export function splitSpecsBlocks(rawText) {
  const text = String(rawText ?? "").replace(/\r/g, "");

  return text
    .split(/\[ANTENNA\]/g)
    .map((part) => part.trim())
    .filter((part) => part !== "")
    .filter((part) => {
      const firstMeaningfulLine = part
        .split("\n")
        .map((line) => line.trim())
        .find((line) => line !== "" && !line.startsWith("#"));

      return !!firstMeaningfulLine;
    });
}

export function parseAntennaSpecsBlock(blockText) {
  const lines = String(blockText ?? "")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("#"));

  if (lines.length === 0) {
    throw new Error("Bloc antenne vide.");
  }

  let antennaId = lines[0];

  if (!antennaId) {
    throw new Error("Identifiant d’antenne introuvable.");
  }

  antennaId = antennaId.trim();

  const typeLine = lines.find((line) =>
    normalizeComparableText(line).startsWith("type")
  ) ?? "";

  const categoryLabel = typeLine;

  const remarksLines = lines.slice(1);
  const remarksText = remarksLines.join("\n");

  return {
    id: antennaId,
    fileName: buildAntennaFileName(antennaId),
    isFixedBeam: isFixedBeamCategory(typeLine),
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
