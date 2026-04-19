import {
  ANTENNA_SPECS_URL,
  DATA_BASE_URL,
  DEFAULT_ANFR_ATTENUATION_DB,
  COPY_DECIMALS_VM,
  INPUT_DEBOUNCE_MS
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
  renderCommonInputs,
  renderAntennaRemarks,
  clearAntennaRemarks,
  renderDiagramInfo,
  clearDiagramInfo,
  renderBandsStructure,
  clearBandsStructure,
  renderBandComputedValues,
  renderGlobalResults,
  clearGlobalResults,
  readCommonInputsFromDom,
  readBandInputsFromDom,
  resetVisualErrors,
  renderErrors,
  updateExpertModeUI,
  showStatus,
  hideStatus,
  setCopyButtonEnabled
} from "./ui.js";

let state = createInitialState();
let dom = null;
let debounceTimer = null;

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
    deportAzimut: "",
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
  state.errors.deportAzimut = commonValidation.errors.deportAzimut;
  state.errors.vitrage = commonValidation.errors.vitrage;
  state.errors.attenuationAnfr = commonValidation.errors.attenuationAnfr;
}

function updateViewOnly() {
  renderCommonInputs(dom, state);
  renderDiagramInfo(dom, state.selectedDiagram);
  renderAntennaRemarks(dom, state.selectedAntennaMeta);
  renderBandComputedValues(state.bands);
  clearGlobalResults(dom);
  renderGlobalResults(dom, state.results);
  resetVisualErrors(state, dom);
  renderErrors(state, dom);
  setCopyButtonEnabled(dom, !!state.results?.expositionTotaleCopiable);
}

function recomputeApplicationState() {
  clearGlobalErrors();
  clearResultsState();
  resetAllBandsComputedState(state);

  const commonValidation = validateCommonInputs(state.settings);
  applyCommonValidation(commonValidation);

  let hasInvalidBand = false;
  let hasAtLeastOneValidBand = false;

  state.bands.forEach((band) => {
    const validation = validateBandInputs(band);

    band.errors = { ...validation.errors };
    band.status = validation.status;
    band.parsed = { ...band.parsed, ...validation.parsedBandInputs };

    if (validation.status === BAND_STATUS.VIDE) {
      return;
    }

    if (!validation.valid) {
      hasInvalidBand = true;
      return;
    }

    if (!commonValidation.valid) {
      return;
    }

    try {
      band.computed = computeBandResult(commonValidation.parsedCommonInputs, band);
      band.status = BAND_STATUS.VALIDE;
      hasAtLeastOneValidBand = true;
    } catch {
      band.status = BAND_STATUS.INVALIDE;
      band.errors.band = "Le calcul de cette bande est impossible.";
      hasInvalidBand = true;
    }
  });

  if (
    commonValidation.valid &&
    !hasInvalidBand &&
    hasAtLeastOneValidBand
  ) {
    const totalExposureVM = computeTotalExposureVM(
      state.bands
        .filter((band) => band.status === BAND_STATUS.VALIDE)
        .map((band) => band.computed)
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
  }

  updateViewOnly();
}

function scheduleRecompute() {
  window.clearTimeout(debounceTimer);
  debounceTimer = window.setTimeout(() => {
    syncInputsToState();

    if (!state.settings.expertMode) {
      state.settings.attenuationAnfrText = String(DEFAULT_ANFR_ATTENUATION_DB);
      updateExpertModeUI(dom, false, state.settings.attenuationAnfrText);
    }

    recomputeApplicationState();
  }, INPUT_DEBOUNCE_MS);
}

function findSelectedAntennaMeta(antennaId) {
  return state.antennaCatalog.find((antenna) => antenna.id === antennaId) ?? null;
}

async function handleAntennaSelectionChange() {
  window.clearTimeout(debounceTimer);
  syncInputsToState();
  clearGlobalErrors();
  clearResultsState();

  const selectedAntennaMeta = findSelectedAntennaMeta(state.settings.selectedAntennaId);
  state.selectedAntennaMeta = selectedAntennaMeta;
  state.selectedDiagram = null;
  state.bands = [];

  clearBandsStructure(dom);
  clearDiagramInfo(dom);
  clearGlobalResults(dom);
  renderAntennaRemarks(dom, state.selectedAntennaMeta);
  updateViewOnly();

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

    renderBandsStructure(dom, state.bands);
    renderDiagramInfo(dom, state.selectedDiagram);
    renderAntennaRemarks(dom, state.selectedAntennaMeta);
    hideStatus(dom);

    recomputeApplicationState();
  } catch (error) {
    state.ui.isLoadingDiagram = false;
    state.selectedDiagram = null;
    state.bands = [];
    clearBandsStructure(dom);

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

    updateViewOnly();
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
  } catch {
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

async function handleCopyBandExposure(bandKey) {
  const band = state.bands.find((item) => item.key === bandKey);
  const valueToCopy = band?.computed?.expositionCopiable?.trim();

  if (!valueToCopy) {
    showStatus(dom, "Copie impossible", "Aucune exposition de bande à copier.", true);
    return;
  }

  try {
    await copyTextToClipboard(valueToCopy);
    showStatus(dom, "Copie réussie", `Exposition de la ${band.label} copiée dans le presse-papiers.`, false);
  } catch {
    showStatus(dom, "Copie impossible", "Impossible de copier l’exposition de la bande.", true);
  }
}

function handleReset() {
  window.clearTimeout(debounceTimer);

  const savedCatalog = state.antennaCatalog;
  state = createInitialState();
  state.antennaCatalog = savedCatalog;
  state.settings.attenuationAnfrText = String(DEFAULT_ANFR_ATTENUATION_DB);

  renderAntennaOptions(dom, state.antennaCatalog);
  renderCommonInputs(dom, state);
  clearDiagramInfo(dom);
  clearAntennaRemarks(dom);
  clearBandsStructure(dom);
  clearGlobalResults(dom);
  resetVisualErrors(state, dom);
  setCopyButtonEnabled(dom, false);
  hideStatus(dom);
}

function handleImmediateCommonChange() {
  window.clearTimeout(debounceTimer);
  syncInputsToState();

  if (!state.settings.expertMode) {
    state.settings.attenuationAnfrText = String(DEFAULT_ANFR_ATTENUATION_DB);
  }

  recomputeApplicationState();
}

function bindEvents() {
  dom.antennaSelect.addEventListener("change", handleAntennaSelectionChange);

  dom.distance3DInput.addEventListener("input", scheduleRecompute);
  dom.deportAzimutInput.addEventListener("input", scheduleRecompute);
  dom.attenuationAnfrInput.addEventListener("input", scheduleRecompute);

  dom.distance3DInput.addEventListener("change", handleImmediateCommonChange);
  dom.deportAzimutInput.addEventListener("change", handleImmediateCommonChange);
  dom.attenuationAnfrInput.addEventListener("change", handleImmediateCommonChange);

  dom.vitrageSelect.addEventListener("change", handleImmediateCommonChange);

  dom.expertModeCheckbox.addEventListener("change", () => {
    window.clearTimeout(debounceTimer);
    syncInputsToState();

    if (!state.settings.expertMode) {
      state.settings.attenuationAnfrText = String(DEFAULT_ANFR_ATTENUATION_DB);
    }

    renderCommonInputs(dom, state);
    recomputeApplicationState();
  });

  dom.bandsContainer.addEventListener("input", (event) => {
    if (event.target.classList.contains("band-input")) {
      scheduleRecompute();
    }
  });

  dom.bandsContainer.addEventListener("change", (event) => {
    if (event.target.classList.contains("band-input")) {
      handleImmediateCommonChange();
    }
  });

  dom.bandsContainer.addEventListener("click", (event) => {
    const button = event.target.closest(".copy-band-button");
    if (!button) return;

    const bandKey = button.dataset.bandKey;
    if (!bandKey) return;

    handleCopyBandExposure(bandKey);
  });

  dom.copyExposureButton.addEventListener("click", handleCopyTotalExposure);

  if (dom.copyTotalExposureButton) {
    dom.copyTotalExposureButton.addEventListener("click", handleCopyTotalExposure);
  }
  
  dom.clearButton.addEventListener("click", handleReset);
}

async function initializeApplication() {
  dom = cacheDom();

  state.settings.attenuationAnfrText = String(DEFAULT_ANFR_ATTENUATION_DB);
  renderCommonInputs(dom, state);
  clearDiagramInfo(dom);
  clearAntennaRemarks(dom);
  clearBandsStructure(dom);
  clearGlobalResults(dom);
  setCopyButtonEnabled(dom, false);

  await loadAndRenderAntennaCatalog();
  bindEvents();
}

window.addEventListener("DOMContentLoaded", initializeApplication);
