import {
  ANTENNA_SPECS_URL,
  DATA_BASE_URL,
  DEFAULT_ANFR_ATTENUATION_DB,
  COPY_DECIMALS_VM
} from "./config.js";
import { BAND_STATUS, VITRAGE_KEYS } from "./constants.js";
import { copyTextToClipboard, formatNumberForCopy } from "./utils.js";
import { loadAntennaSpecs, getFixedBeamAntennas } from "./specsParser.js";
import { loadDiagramFile } from "./diagramParser.js";
import {
  createInitialState,
  createBandsStateFromDiagram,
  resetAllBandsComputedState
} from "./model.js";
import { validateCommonInputs, validateBandInputs } from "./validation.js";
import {
  computeBandResult,
  computeTotalExposureVM,
  buildDynamicExposureText
} from "./calculations.js";
import {
  cacheDom,
  renderAntennaOptions,
  renderApp,
  readCommonInputsFromDom,
  readBandInputsFromDom,
  showStatus,
  hideStatus
} from "./ui.js";

let state = createInitialState();
let dom = null;
let isProgrammaticUpdate = false;

function getVitrageDynamicLabel(vitrageKey) {
  switch (vitrageKey) {
    case VITRAGE_KEYS.SIMPLE:
      return "derrière un simple vitrage";
    case VITRAGE_KEYS.DOUBLE:
      return "derrière un double vitrage";
    case VITRAGE_KEYS.FAIBLE_EMISSIVITE:
      return "derrière un vitrage à faible émissivité";
    case VITRAGE_KEYS.EXTERIEUR:
    default:
      return "en extérieur";
  }
}

function clearGlobalErrors() {
  state.errors = {
    selectedAntenna: "",
    distance3D: "",
    vitrage: "",
    attenuationAnfr: "",
    diagramLoading: "",
    global: ""
  };
}

function clearResultsState() {
  state.results = {
    expositionTotaleVM: null,
    expositionTotaleCopiable: "",
    texteDynamique: ""
  };
}

function syncInputsToState() {
  readCommonInputsFromDom(dom, state);
  readBandInputsFromDom(state);
}

function applyCommonValidation(commonValidation) {
  state.errors.selectedAntenna = commonValidation.errors.selectedAntenna;
  state.errors.distance3D = commonValidation.errors.distance3D;
  state.errors.vitrage = commonValidation.errors.vitrage;
  state.errors.attenuationAnfr = commonValidation.errors.attenuationAnfr;
}

function recomputeApplicationState() {
  clearGlobalErrors();
  clearResultsState();
  resetAllBandsComputedState(state);

  const commonValidation = validateCommonInputs(state.settings);
  applyCommonValidation(commonValidation);

  if (!commonValidation.valid) {
    renderApp(state, dom);
    return;
  }

  let hasInvalidBand = false;

  state.bands.forEach((band) => {
    const validation = validateBandInputs(band);

    band.errors = { ...validation.errors };
    band.status = validation.status;
    band.parsed = { ...band.parsed, ...validation.parsedBandInputs };

    if (!validation.valid) {
      hasInvalidBand = true;
      return;
    }

    try {
      band.computed = computeBandResult(commonValidation.parsedCommonInputs, band);
      band.status = BAND_STATUS.VALIDE;
    } catch (error) {
      band.status = BAND_STATUS.INVALIDE;
      band.errors.band = "Le calcul de cette bande est impossible.";
      hasInvalidBand = true;
    }
  });

  if (hasInvalidBand || state.bands.length === 0) {
    renderApp(state, dom);
    return;
  }

  const totalExposureVM = computeTotalExposureVM(
    state.bands.map((band) => band.computed)
  );

  state.results.expositionTotaleVM = totalExposureVM;
  state.results.expositionTotaleCopiable = formatNumberForCopy(
    totalExposureVM,
    COPY_DECIMALS_VM
  );
  state.results.texteDynamique = buildDynamicExposureText(
    getVitrageDynamicLabel(commonValidation.parsedCommonInputs.vitrageKey),
    totalExposureVM
  );

  renderApp(state, dom);
}

function findSelectedAntennaMeta(antennaId) {
  return state.antennaCatalog.find((antenna) => antenna.id === antennaId) ?? null;
}

async function handleAntennaSelectionChange() {
  syncInputsToState();
  clearGlobalErrors();
  clearResultsState();

  const selectedAntennaMeta = findSelectedAntennaMeta(state.settings.selectedAntennaId);
  state.selectedAntennaMeta = selectedAntennaMeta;
  state.selectedDiagram = null;
  state.bands = [];

  renderApp(state, dom);

  if (!selectedAntennaMeta) {
    hideStatus(dom);
    return;
  }

  const diagramUrl = `${DATA_BASE_URL}/${selectedAntennaMeta.fileName}`;

  try {
    state.ui.isLoadingDiagram = true;
    showStatus(dom, "Chargement", "Chargement du diagramme antenne…", false);

    const selectedDiagram = await loadDiagramFile(diagramUrl, selectedAntennaMeta.fileName);

    state.selectedDiagram = selectedDiagram;
    state.bands = createBandsStateFromDiagram(selectedDiagram);
    state.ui.isLoadingDiagram = false;

    hideStatus(dom);
    renderApp(state, dom);
    recomputeApplicationState();
  } catch (error) {
    state.ui.isLoadingDiagram = false;
    state.selectedDiagram = null;
    state.bands = [];

    const errorMessage = String(error?.message ?? error);

    if (
      errorMessage.includes("Azimut") ||
      errorMessage.includes("Elevation") ||
      errorMessage.includes("360") ||
      errorMessage.includes("non numérique") ||
      errorMessage.includes("vide") ||
      errorMessage.includes("bandes")
    ) {
      showStatus(
        dom,
        "Fichier non conforme",
        "Le fichier de diagramme de l’antenne sélectionnée est non conforme.",
        true
      );
    } else {
      showStatus(
        dom,
        "Lecture impossible",
        "Impossible de lire le fichier de diagramme de l’antenne sélectionnée.",
        true
      );
    }

    renderApp(state, dom);
  }
}

async function loadAndRenderAntennaCatalog() {
  try {
    state.ui.isLoadingCatalog = true;
    showStatus(dom, "Chargement", "Chargement du catalogue des antennes…", false);

    const antennaCatalog = await loadAntennaSpecs(ANTENNA_SPECS_URL);
    state.antennaCatalog = getFixedBeamAntennas(antennaCatalog);

    renderAntennaOptions(dom, state.antennaCatalog);
    hideStatus(dom);
  } catch (error) {
    showStatus(
      dom,
      "Lecture impossible",
      "Impossible de lire le fichier de catalogue des antennes.",
      true
    );
  } finally {
    state.ui.isLoadingCatalog = false;
  }
}

async function handleCopyTotalExposure() {
  const valueToCopy = state.results.expositionTotaleCopiable?.trim();

  if (!valueToCopy) {
    showStatus(dom, "Copie impossible", "Aucune exposition totale à copier.", true);
    return;
  }

  try {
    await copyTextToClipboard(valueToCopy);
    showStatus(dom, "Copie réussie", "Exposition totale copiée dans le presse-papiers.", false);
  } catch {
    showStatus(dom, "Copie impossible", "Impossible de copier l’exposition totale.", true);
  }
}

function handleReset() {
  state = createInitialState();
  state.settings.attenuationAnfrText = String(DEFAULT_ANFR_ATTENUATION_DB);

  isProgrammaticUpdate = true;
  renderAntennaOptions(dom, state.antennaCatalog);
  renderApp(state, dom);
  isProgrammaticUpdate = false;

  hideStatus(dom);
}

function handleGenericInputChange() {
  if (isProgrammaticUpdate) return;

  syncInputsToState();

  if (!state.settings.expertMode) {
    state.settings.attenuationAnfrText = String(DEFAULT_ANFR_ATTENUATION_DB);
  }

  recomputeApplicationState();
}

function bindEvents() {
  dom.antennaSelect.addEventListener("change", handleAntennaSelectionChange);

  dom.distance3DInput.addEventListener("input", handleGenericInputChange);
  dom.distance3DInput.addEventListener("change", handleGenericInputChange);

  dom.vitrageSelect.addEventListener("change", handleGenericInputChange);

  dom.attenuationAnfrInput.addEventListener("input", handleGenericInputChange);
  dom.attenuationAnfrInput.addEventListener("change", handleGenericInputChange);

  dom.expertModeCheckbox.addEventListener("change", () => {
    syncInputsToState();

    if (!state.settings.expertMode) {
      state.settings.attenuationAnfrText = String(DEFAULT_ANFR_ATTENUATION_DB);
    }

    renderApp(state, dom);
    recomputeApplicationState();
  });

  dom.bandsContainer.addEventListener("input", (event) => {
    if (event.target.classList.contains("band-input")) {
      handleGenericInputChange();
    }
  });

  dom.bandsContainer.addEventListener("change", (event) => {
    if (event.target.classList.contains("band-input")) {
      handleGenericInputChange();
    }
  });

  dom.copyExposureButton.addEventListener("click", handleCopyTotalExposure);
  dom.clearButton.addEventListener("click", handleReset);
}

async function initializeApplication() {
  dom = cacheDom();

  state.settings.attenuationAnfrText = String(DEFAULT_ANFR_ATTENUATION_DB);
  renderApp(state, dom);

  await loadAndRenderAntennaCatalog();
  renderApp(state, dom);

  bindEvents();
}

window.addEventListener("DOMContentLoaded", initializeApplication);
