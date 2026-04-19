import {
  DEFAULT_ANFR_ATTENUATION_DB,
  DISPLAY_DECIMALS_DB,
  DISPLAY_DECIMALS_VM,
  DISPLAY_DECIMALS_W
} from "./config.js";
import { formatNumberForDisplay } from "./utils.js";

export function cacheDom() {
  return {
    antennaSelect: document.getElementById("antennaSelect"),
    antennaError: document.getElementById("antennaError"),

    distance3DInput: document.getElementById("distance3D"),
    distance3DError: document.getElementById("distance3DError"),

    deportAzimutInput: document.getElementById("deportAzimut"),
    deportAzimutError: document.getElementById("deportAzimutError"),

    vitrageSelect: document.getElementById("vitrageType"),
    vitrageError: document.getElementById("vitrageTypeError"),

    expertModeCheckbox: document.getElementById("modeExpertActif"),

    attenuationAnfrInput: document.getElementById("attenuationAnfrDB"),
    attenuationAnfrError: document.getElementById("attenuationAnfrDBError"),

    diagramFileNameInput: document.getElementById("nomFichierDiagramme"),
    bandCountInput: document.getElementById("nombreBandesDetectees"),

    antennaRemarksContainer: document.getElementById("antennaRemarks"),

    bandsContainer: document.getElementById("bandsContainer"),

    expositionTotaleInput: document.getElementById("expositionTotaleVM"),
    expositionCopiableInput: document.getElementById("expositionTotaleCopiable"),
    dynamicExposureText: document.getElementById("dynamicExposureText"),

    copyExposureButton: document.getElementById("copyExposureButton"),
    clearButton: document.getElementById("clearButton"),

    statusBox: document.getElementById("statusBox"),
    statusTitle: document.getElementById("statusTitle"),
    statusMessage: document.getElementById("statusMessage")
  };
}

function createUnitSpan(unitText) {
  const span = document.createElement("span");
  span.className = "unit";
  span.textContent = unitText;
  return span;
}

function createInputWithUnit({ id, className, value = "", readOnly = false, unit = "", inputMode = "decimal", placeholder = "" }) {
  const wrapper = document.createElement("div");
  wrapper.className = "input-wrap";

  const input = document.createElement("input");
  input.type = "text";
  input.id = id;
  input.className = className;
  input.inputMode = inputMode;
  input.autocomplete = "off";
  input.value = value;
  input.readOnly = readOnly;
  input.placeholder = placeholder;

  wrapper.appendChild(input);

  if (unit) {
    wrapper.appendChild(createUnitSpan(unit));
  }

  return { wrapper, input };
}

function createField({ labelText, inputId, inputClassName, value = "", readOnly = false, unit = "", inputMode = "decimal", placeholder = "" }) {
  const field = document.createElement("div");
  field.className = "field";

  const label = document.createElement("label");
  label.setAttribute("for", inputId);
  label.textContent = labelText;

  const { wrapper } = createInputWithUnit({
    id: inputId,
    className: inputClassName,
    value,
    readOnly,
    unit,
    inputMode,
    placeholder
  });

  const error = document.createElement("div");
  error.className = "error";
  error.id = `${inputId}Error`;

  field.append(label, wrapper, error);
  return field;
}

function createBandSectionTitle(text) {
  const title = document.createElement("h4");
  title.className = "band-section-title";
  title.textContent = text;
  return title;
}

function createBandColumn() {
  const div = document.createElement("div");
  div.className = "band-column";
  return div;
}

export function renderAntennaOptions(dom, antennaCatalog) {
  if (!dom.antennaSelect) return;

  dom.antennaSelect.innerHTML = "";

  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "Sélectionner une antenne à faisceau fixe";
  dom.antennaSelect.appendChild(defaultOption);

  (Array.isArray(antennaCatalog) ? antennaCatalog : []).forEach((antenna) => {
    const option = document.createElement("option");
    option.value = antenna.id;
    option.textContent = antenna.id;
    dom.antennaSelect.appendChild(option);
  });
}

export function renderCommonInputs(dom, state) {
  if (dom.antennaSelect) dom.antennaSelect.value = state.settings.selectedAntennaId ?? "";
  if (dom.distance3DInput) dom.distance3DInput.value = state.settings.distance3DText ?? "";
  if (dom.deportAzimutInput) dom.deportAzimutInput.value = state.settings.deportAzimutText ?? "";
  if (dom.vitrageSelect) dom.vitrageSelect.value = state.settings.vitrageKey ?? "";
  if (dom.expertModeCheckbox) dom.expertModeCheckbox.checked = !!state.settings.expertMode;
  updateExpertModeUI(dom, state.settings.expertMode, state.settings.attenuationAnfrText);
}

export function renderAntennaRemarks(dom, selectedAntennaMeta) {
  if (!dom.antennaRemarksContainer) return;

  dom.antennaRemarksContainer.innerHTML = "";

  if (!selectedAntennaMeta) {
    return;
  }

  const lines = [
    selectedAntennaMeta.categoryLabel,
    ...(Array.isArray(selectedAntennaMeta.remarksLines) ? selectedAntennaMeta.remarksLines : [])
  ].filter((line) => String(line ?? "").trim() !== "");

  lines.forEach((line) => {
    const p = document.createElement("div");
    p.className = "remark-line";
    p.textContent = line;
    dom.antennaRemarksContainer.appendChild(p);
  });
}

export function clearAntennaRemarks(dom) {
  if (!dom.antennaRemarksContainer) return;
  dom.antennaRemarksContainer.innerHTML = "";
}

export function renderDiagramInfo(dom, selectedDiagram) {
  if (dom.diagramFileNameInput) {
    dom.diagramFileNameInput.value = selectedDiagram?.fileName ?? "";
  }

  if (dom.bandCountInput) {
    dom.bandCountInput.value = selectedDiagram?.bandCount != null ? String(selectedDiagram.bandCount) : "";
  }
}

export function clearDiagramInfo(dom) {
  if (dom.diagramFileNameInput) dom.diagramFileNameInput.value = "";
  if (dom.bandCountInput) dom.bandCountInput.value = "";
}

export function clearBandsStructure(dom) {
  if (!dom.bandsContainer) return;
  dom.bandsContainer.innerHTML = "";
}

function createCopyRow(bandState) {
  const row = document.createElement("div");
  row.className = "copy-row";

  const field = createField({
    labelText: "Exposition à copier",
    inputId: `expositionCopiable_${bandState.key}`,
    inputClassName: "output blue copy-output",
    value: "",
    unit: "V/m",
    readOnly: true
  });

  const button = document.createElement("button");
  button.type = "button";
  button.className = "copy-band-button";
  button.dataset.bandKey = bandState.key;
  button.textContent = "Copier";

  row.append(field, button);
  return row;
}

function createDetailsBlock(bandState) {
  const details = document.createElement("details");
  details.className = "band-details";

  const summary = document.createElement("summary");
  summary.textContent = "Afficher les détails";

  details.addEventListener("toggle", () => {
    summary.textContent = details.open ? "Masquer les détails" : "Afficher les détails";
  });

  const grid = document.createElement("div");
  grid.className = "band-details-grid";

  grid.appendChild(
    createField({
      labelText: "Atténuation angulaire totale",
      inputId: `attenuationAngulaireTotale_${bandState.key}`,
      inputClassName: "output blue",
      value: "",
      unit: "dB",
      readOnly: true
    })
  );

  grid.appendChild(
    createField({
      labelText: "Atténuation vitrage appliquée",
      inputId: `attenuationVitrage_${bandState.key}`,
      inputClassName: "output blue",
      value: "",
      unit: "dB",
      readOnly: true
    })
  );

  grid.appendChild(
    createField({
      labelText: "Atténuation supplémentaire appliquée",
      inputId: `attenuationSupplementaireAppliquee_${bandState.key}`,
      inputClassName: "output blue",
      value: "",
      unit: "dB",
      readOnly: true
    })
  );

  grid.appendChild(
    createField({
      labelText: "Atténuation ANFR appliquée",
      inputId: `attenuationAnfrAppliquee_${bandState.key}`,
      inputClassName: "output blue",
      value: "",
      unit: "dB",
      readOnly: true
    })
  );

  grid.appendChild(
    createField({
      labelText: "Atténuation totale",
      inputId: `attenuationTotale_${bandState.key}`,
      inputClassName: "output blue",
      value: "",
      unit: "dB",
      readOnly: true
    })
  );

  grid.appendChild(
    createField({
      labelText: "PIRE finale",
      inputId: `pireFinaleDBW_${bandState.key}`,
      inputClassName: "output blue",
      value: "",
      unit: "dBW",
      readOnly: true
    })
  );

  grid.appendChild(
    createField({
      labelText: "PIRE finale",
      inputId: `pireFinaleW_${bandState.key}`,
      inputClassName: "output blue",
      value: "",
      unit: "W",
      readOnly: true
    })
  );

  details.append(summary, grid);
  return details;
}

export function createBandCard(bandState, index) {
  const article = document.createElement("article");
  article.className = "band-card";
  article.id = `bandCard_${bandState.key}`;
  article.dataset.bandKey = bandState.key;

  const header = document.createElement("div");
  header.className = "band-card-header";

  const title = document.createElement("h3");
  title.className = "band-card-title";
  title.textContent = `Bande ${index + 1} — ${bandState.label}`;

  const status = document.createElement("div");
  status.className = "band-status";
  status.id = `bandStatus_${bandState.key}`;

  header.append(title, status);

  const mainGrid = document.createElement("div");
  mainGrid.className = "band-main-grid";

  const leftCol = createBandColumn();
  const rightCol = createBandColumn();

  leftCol.appendChild(createBandSectionTitle("Paramètres de saisie"));
  leftCol.appendChild(
    createField({
      labelText: "PIRE de la bande",
      inputId: `pireInitiale_${bandState.key}`,
      inputClassName: "control red band-input",
      value: bandState.inputs.pireInitialeText ?? "",
      unit: "dBW",
      placeholder: "Exemple : 47,6"
    })
  );
  leftCol.appendChild(
    createField({
      labelText: "Déport angulaire en élévation",
      inputId: `deportElevation_${bandState.key}`,
      inputClassName: "control red band-input",
      value: bandState.inputs.deportElevationText ?? "",
      unit: "°",
      placeholder: "Exemple : 4"
    })
  );
  leftCol.appendChild(
    createField({
      labelText: "Atténuation supplémentaire",
      inputId: `attenuationSupplementaire_${bandState.key}`,
      inputClassName: "control red band-input",
      value: bandState.inputs.attenuationSupplementaireText ?? "",
      unit: "dB",
      placeholder: "Exemple : 0"
    })
  );

  rightCol.appendChild(createBandSectionTitle("Résultats visibles"));
  rightCol.appendChild(
    createField({
      labelText: "Atténuation azimutale",
      inputId: `attenuationAzimutale_${bandState.key}`,
      inputClassName: "output blue",
      value: "",
      unit: "dB",
      readOnly: true
    })
  );
  rightCol.appendChild(
    createField({
      labelText: "Atténuation en élévation",
      inputId: `attenuationElevation_${bandState.key}`,
      inputClassName: "output blue",
      value: "",
      unit: "dB",
      readOnly: true
    })
  );
  rightCol.appendChild(
    createField({
      labelText: "Exposition de la bande",
      inputId: `expositionVM_${bandState.key}`,
      inputClassName: "output blue",
      value: "",
      unit: "V/m",
      readOnly: true
    })
  );
  rightCol.appendChild(createCopyRow(bandState));

  mainGrid.append(leftCol, rightCol);
  article.append(header, mainGrid, createDetailsBlock(bandState));

  return article;
}

export function renderBandsStructure(dom, bands) {
  if (!dom.bandsContainer) return;

  dom.bandsContainer.innerHTML = "";

  (Array.isArray(bands) ? bands : []).forEach((bandState, index) => {
    dom.bandsContainer.appendChild(createBandCard(bandState, index));
  });
}

export function renderBandComputedValues(bands) {
  (Array.isArray(bands) ? bands : []).forEach((band) => {
    const c = band.computed ?? {};

    const setValue = (id, value, decimals = null) => {
      const input = document.getElementById(id);
      if (!input) return;

      if (typeof value === "string") {
        input.value = value;
        return;
      }

      input.value = formatNumberForDisplay(value, decimals);
    };

    setValue(`attenuationAzimutale_${band.key}`, c.attenuationAzimutaleDB, DISPLAY_DECIMALS_DB);
    setValue(`attenuationElevation_${band.key}`, c.attenuationElevationDB, DISPLAY_DECIMALS_DB);
    setValue(`expositionVM_${band.key}`, c.expositionVM, DISPLAY_DECIMALS_VM);
    setValue(`expositionCopiable_${band.key}`, c.expositionCopiable);

    setValue(`attenuationAngulaireTotale_${band.key}`, c.attenuationAngulaireTotaleDB, DISPLAY_DECIMALS_DB);
    setValue(`attenuationVitrage_${band.key}`, c.attenuationVitrageDB, DISPLAY_DECIMALS_DB);
    setValue(`attenuationSupplementaireAppliquee_${band.key}`, c.attenuationSupplementaireAppliqueeDB, DISPLAY_DECIMALS_DB);
    setValue(`attenuationAnfrAppliquee_${band.key}`, c.attenuationAnfrAppliqueeDB, DISPLAY_DECIMALS_DB);
    setValue(`attenuationTotale_${band.key}`, c.attenuationTotaleDB, DISPLAY_DECIMALS_DB);
    setValue(`pireFinaleDBW_${band.key}`, c.pireFinaleDBW, DISPLAY_DECIMALS_DB);
    setValue(`pireFinaleW_${band.key}`, c.pireFinaleW, DISPLAY_DECIMALS_W);
  });
}

export function renderGlobalResults(dom, results) {
  if (dom.expositionTotaleInput) {
    dom.expositionTotaleInput.value = formatNumberForDisplay(results?.expositionTotaleVM, DISPLAY_DECIMALS_VM);
  }

  if (dom.expositionCopiableInput) {
    dom.expositionCopiableInput.value = results?.expositionTotaleCopiable ?? "";
  }

  if (dom.dynamicExposureText) {
    const text = results?.texteDynamique ?? "";
    dom.dynamicExposureText.textContent = text;
    dom.dynamicExposureText.style.display = text ? "block" : "none";
  }
}

export function clearGlobalResults(dom) {
  if (dom.expositionTotaleInput) dom.expositionTotaleInput.value = "";
  if (dom.expositionCopiableInput) dom.expositionCopiableInput.value = "";
  if (dom.dynamicExposureText) {
    dom.dynamicExposureText.textContent = "";
    dom.dynamicExposureText.style.display = "none";
  }
}

function clearFieldErrorById(inputId) {
  const input = document.getElementById(inputId);
  const error = document.getElementById(`${inputId}Error`);

  if (input) input.classList.remove("invalid");
  if (error) error.textContent = "";
}

function setFieldErrorById(inputId, message) {
  const input = document.getElementById(inputId);
  const error = document.getElementById(`${inputId}Error`);

  if (input) input.classList.add("invalid");
  if (error) error.textContent = message ?? "";
}

function clearBandStatus(bandKey) {
  const status = document.getElementById(`bandStatus_${bandKey}`);
  if (status) status.textContent = "";

  const card = document.getElementById(`bandCard_${bandKey}`);
  if (card) card.classList.remove("band-card-error");
}

function setBandStatus(bandKey, message) {
  const status = document.getElementById(`bandStatus_${bandKey}`);
  if (status) status.textContent = message ?? "";

  const card = document.getElementById(`bandCard_${bandKey}`);
  if (card) card.classList.add("band-card-error");
}

export function resetVisualErrors(state, dom) {
  if (dom.antennaSelect) dom.antennaSelect.classList.remove("invalid");
  if (dom.antennaError) dom.antennaError.textContent = "";

  if (dom.distance3DInput) dom.distance3DInput.classList.remove("invalid");
  if (dom.distance3DError) dom.distance3DError.textContent = "";

  if (dom.deportAzimutInput) dom.deportAzimutInput.classList.remove("invalid");
  if (dom.deportAzimutError) dom.deportAzimutError.textContent = "";

  if (dom.vitrageSelect) dom.vitrageSelect.classList.remove("invalid");
  if (dom.vitrageError) dom.vitrageError.textContent = "";

  if (dom.attenuationAnfrInput) dom.attenuationAnfrInput.classList.remove("invalid");
  if (dom.attenuationAnfrError) dom.attenuationAnfrError.textContent = "";

  (Array.isArray(state?.bands) ? state.bands : []).forEach((band) => {
    clearFieldErrorById(`pireInitiale_${band.key}`);
    clearFieldErrorById(`deportElevation_${band.key}`);
    clearFieldErrorById(`attenuationSupplementaire_${band.key}`);
    clearBandStatus(band.key);
  });
}

export function renderErrors(state, dom) {
  if (state?.errors?.selectedAntenna) {
    if (dom.antennaSelect) dom.antennaSelect.classList.add("invalid");
    if (dom.antennaError) dom.antennaError.textContent = state.errors.selectedAntenna;
  }

  if (state?.errors?.distance3D) {
    if (dom.distance3DInput) dom.distance3DInput.classList.add("invalid");
    if (dom.distance3DError) dom.distance3DError.textContent = state.errors.distance3D;
  }

  if (state?.errors?.deportAzimut) {
    if (dom.deportAzimutInput) dom.deportAzimutInput.classList.add("invalid");
    if (dom.deportAzimutError) dom.deportAzimutError.textContent = state.errors.deportAzimut;
  }

  if (state?.errors?.vitrage) {
    if (dom.vitrageSelect) dom.vitrageSelect.classList.add("invalid");
    if (dom.vitrageError) dom.vitrageError.textContent = state.errors.vitrage;
  }

  if (state?.errors?.attenuationAnfr) {
    if (dom.attenuationAnfrInput) dom.attenuationAnfrInput.classList.add("invalid");
    if (dom.attenuationAnfrError) dom.attenuationAnfrError.textContent = state.errors.attenuationAnfr;
  }

  (Array.isArray(state?.bands) ? state.bands : []).forEach((band) => {
    if (band.errors?.pireInitiale) {
      setFieldErrorById(`pireInitiale_${band.key}`, band.errors.pireInitiale);
    }

    if (band.errors?.deportElevation) {
      setFieldErrorById(`deportElevation_${band.key}`, band.errors.deportElevation);
    }

    if (band.errors?.attenuationSupplementaire) {
      setFieldErrorById(`attenuationSupplementaire_${band.key}`, band.errors.attenuationSupplementaire);
    }

    if (band.errors?.band) {
      setBandStatus(band.key, band.errors.band);
    }
  });
}

export function readCommonInputsFromDom(dom, state) {
  state.settings.selectedAntennaId = dom.antennaSelect?.value ?? "";
  state.settings.distance3DText = dom.distance3DInput?.value ?? "";
  state.settings.deportAzimutText = dom.deportAzimutInput?.value ?? "";
  state.settings.vitrageKey = dom.vitrageSelect?.value ?? "";
  state.settings.expertMode = !!dom.expertModeCheckbox?.checked;
  state.settings.attenuationAnfrText = dom.attenuationAnfrInput?.value ?? "";
}

export function readBandInputsFromDom(state) {
  (Array.isArray(state?.bands) ? state.bands : []).forEach((band) => {
    const pireInput = document.getElementById(`pireInitiale_${band.key}`);
    const elInput = document.getElementById(`deportElevation_${band.key}`);
    const suppInput = document.getElementById(`attenuationSupplementaire_${band.key}`);

    band.inputs.pireInitialeText = pireInput?.value ?? "";
    band.inputs.deportElevationText = elInput?.value ?? "";
    band.inputs.attenuationSupplementaireText = suppInput?.value ?? "";
  });
}

export function updateExpertModeUI(dom, expertMode, attenuationValueText) {
  if (!dom.attenuationAnfrInput) return;

  const targetValue =
    attenuationValueText != null && attenuationValueText !== ""
      ? attenuationValueText
      : String(DEFAULT_ANFR_ATTENUATION_DB);

  dom.attenuationAnfrInput.value = targetValue;

  if (expertMode) {
    dom.attenuationAnfrInput.readOnly = false;
    dom.attenuationAnfrInput.classList.remove("output", "blue");
    dom.attenuationAnfrInput.classList.add("control", "red");
  } else {
    dom.attenuationAnfrInput.readOnly = true;
    dom.attenuationAnfrInput.value = String(DEFAULT_ANFR_ATTENUATION_DB);
    dom.attenuationAnfrInput.classList.remove("control", "red", "invalid");
    dom.attenuationAnfrInput.classList.add("output", "blue");

    if (dom.attenuationAnfrError) {
      dom.attenuationAnfrError.textContent = "";
    }
  }
}

export function showStatus(dom, title, message, isWarning = false) {
  if (!dom.statusBox) return;

  dom.statusBox.style.display = "block";
  dom.statusBox.classList.toggle("warning", !!isWarning);

  if (dom.statusTitle) dom.statusTitle.textContent = title ?? "";
  if (dom.statusMessage) dom.statusMessage.textContent = message ?? "";
}

export function hideStatus(dom) {
  if (!dom.statusBox) return;

  dom.statusBox.style.display = "none";
  dom.statusBox.classList.remove("warning");

  if (dom.statusTitle) dom.statusTitle.textContent = "";
  if (dom.statusMessage) dom.statusMessage.textContent = "";
}

export function setCopyButtonEnabled(dom, enabled) {
  if (!dom.copyExposureButton) return;
  dom.copyExposureButton.disabled = !enabled;
}
