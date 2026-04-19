import { DEFAULT_ANFR_ATTENUATION_DB, DEFAULT_VITRAGE_KEY } from "./config.js";
import { BAND_STATUS } from "./constants.js";

export function createInitialState() {
  return {
    settings: {
      selectedAntennaId: "",
      distance3DText: "",
      vitrageKey: DEFAULT_VITRAGE_KEY,
      expertMode: false,
      attenuationAnfrText: String(DEFAULT_ANFR_ATTENUATION_DB)
    },

    antennaCatalog: [],
    selectedAntennaMeta: null,
    selectedDiagram: null,

    bands: [],

    results: {
      expositionTotaleVM: null,
      expositionTotaleCopiable: "",
      texteDynamique: ""
    },

    errors: {
      selectedAntenna: "",
      distance3D: "",
      vitrage: "",
      attenuationAnfr: "",
      diagramLoading: "",
      global: ""
    },

    ui: {
      isLoadingCatalog: false,
      isLoadingDiagram: false
    }
  };
}

export function createEmptyBandState(diagramBand) {
  return {
    key: diagramBand.key,
    label: diagramBand.label,

    inputs: {
      pireInitialeText: "",
      deportAzimutText: "",
      deportElevationText: "",
      attenuationSupplementaireText: ""
    },

    parsed: {
      pireInitialeDBW: null,
      deportAzimutDeg: null,
      deportElevationDeg: null,
      attenuationSupplementaireDB: 0
    },

    diagram: {
      azimuthValuesDB: Array.isArray(diagramBand.azimuthValuesDB)
        ? [...diagramBand.azimuthValuesDB]
        : [],
      elevationValuesDB: Array.isArray(diagramBand.elevationValuesDB)
        ? [...diagramBand.elevationValuesDB]
        : []
    },

    computed: {
      attenuationAzimutaleDB: null,
      attenuationElevationDB: null,
      attenuationAngulaireTotaleDB: null,
      attenuationVitrageDB: null,
      attenuationSupplementaireAppliqueeDB: null,
      attenuationAnfrAppliqueeDB: null,
      attenuationTotaleDB: null,
      pireFinaleDBW: null,
      pireFinaleW: null,
      expositionVM: null
    },

    errors: {
      pireInitiale: "",
      deportAzimut: "",
      deportElevation: "",
      attenuationSupplementaire: "",
      band: ""
    },

    status: BAND_STATUS.VIDE
  };
}

export function createBandsStateFromDiagram(selectedDiagram) {
  if (!selectedDiagram || !Array.isArray(selectedDiagram.bands)) {
    return [];
  }

  return selectedDiagram.bands.map((diagramBand) => createEmptyBandState(diagramBand));
}

export function resetComputedBandState(bandState) {
  bandState.parsed = {
    pireInitialeDBW: null,
    deportAzimutDeg: null,
    deportElevationDeg: null,
    attenuationSupplementaireDB: 0
  };

  bandState.computed = {
    attenuationAzimutaleDB: null,
    attenuationElevationDB: null,
    attenuationAngulaireTotaleDB: null,
    attenuationVitrageDB: null,
    attenuationSupplementaireAppliqueeDB: null,
    attenuationAnfrAppliqueeDB: null,
    attenuationTotaleDB: null,
    pireFinaleDBW: null,
    pireFinaleW: null,
    expositionVM: null
  };

  bandState.errors = {
    pireInitiale: "",
    deportAzimut: "",
    deportElevation: "",
    attenuationSupplementaire: "",
    band: ""
  };

  bandState.status = BAND_STATUS.VIDE;

  return bandState;
}

export function resetAllBandsComputedState(state) {
  state.bands.forEach((band) => resetComputedBandState(band));
  return state;
}
