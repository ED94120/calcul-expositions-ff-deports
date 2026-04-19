function isFiniteNumber(value) {
  return Number.isFinite(value);
}

export function normalizeAzimuthInputTo360(deg) {
  if (!isFiniteNumber(deg)) {
    throw new Error("Azimut invalide.");
  }

  let normalized = deg % 360;

  if (normalized < 0) {
    normalized += 360;
  }

  if (normalized === 360) {
    normalized = 0;
  }

  return normalized;
}

export function convertElevationAngleToIndex(deg) {
  if (!isFiniteNumber(deg)) {
    throw new Error("Élévation invalide.");
  }

  if (deg >= 0 && deg <= 180) {
    return deg;
  }

  if (deg >= -179 && deg < 0) {
    return 360 + deg;
  }

  throw new Error("Élévation hors domaine du diagramme.");
}

export function getAzimuthInterpolationData(azimuth360Deg) {
  if (!isFiniteNumber(azimuth360Deg) || azimuth360Deg < 0 || azimuth360Deg >= 360) {
    throw new Error("Azimut normalisé invalide.");
  }

  const lowerAngleDeg = Math.floor(azimuth360Deg);
  const upperAngleDeg = (lowerAngleDeg + 1) % 360;
  const interpolationWeight = azimuth360Deg - lowerAngleDeg;

  return {
    lowerAngleDeg,
    upperAngleDeg,
    lowerIndex: lowerAngleDeg,
    upperIndex: upperAngleDeg,
    interpolationWeight
  };
}

export function getElevationInterpolationData(elevationDeg) {
  if (!isFiniteNumber(elevationDeg) || elevationDeg < -90 || elevationDeg > 90) {
    throw new Error("Élévation invalide pour l’interpolation.");
  }

  const lowerAngleDeg = Math.floor(elevationDeg);
  const upperAngleDeg = Math.ceil(elevationDeg);

  if (lowerAngleDeg === upperAngleDeg) {
    const exactIndex = convertElevationAngleToIndex(lowerAngleDeg);

    return {
      lowerAngleDeg,
      upperAngleDeg,
      lowerIndex: exactIndex,
      upperIndex: exactIndex,
      interpolationWeight: 0
    };
  }

  const lowerIndex = convertElevationAngleToIndex(lowerAngleDeg);
  const upperIndex = convertElevationAngleToIndex(upperAngleDeg);
  const interpolationWeight = elevationDeg - lowerAngleDeg;

  return {
    lowerAngleDeg,
    upperAngleDeg,
    lowerIndex,
    upperIndex,
    interpolationWeight
  };
}

export function interpolateLinear(valueLow, valueHigh, weight) {
  if (!isFiniteNumber(valueLow) || !isFiniteNumber(valueHigh) || !isFiniteNumber(weight)) {
    throw new Error("Interpolation impossible : paramètres invalides.");
  }

  return valueLow + (valueHigh - valueLow) * weight;
}
