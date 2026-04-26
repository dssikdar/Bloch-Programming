const MIN_SLOT_COUNT = 4;
const APP_BUILD = "github-pages-static-simulator-2026-04-25";
const ROW_HEIGHT =
  Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--row-height")) || 116;
const SLOT_BOX_HEIGHT = 98;

function rowCenter(rowIndex) {
  return rowIndex * ROW_HEIGHT + ROW_HEIGHT / 2;
}

function boxTopForRow(rowIndex) {
  return rowCenter(rowIndex) - SLOT_BOX_HEIGHT / 2;
}

const state = {
  config: null,
  numQubits: 2,
  initialBits: [0, 0],
  slots: Array.from({ length: MIN_SLOT_COUNT }, () => []),
  result: null,
  selectedStep: 0,
  nextGateId: 1,
  activeEditorGateId: null,
  isAnimating: false,
  animationTimer: null,
};

const LOCAL_CONFIG = {
  maxQubits: 5,
  gates: [
    {
      id: "h",
      label: "Hadamard",
      category: "Superposition",
      description: "Turns a qubit with a definitive state into a superposition of red |0> and blue |1>.",
      fields: [{ key: "target", label: "Target", kind: "qubit" }],
    },
    {
      id: "x",
      label: "Pauli-X",
      category: "Single-Qubit",
      description: "Rotates around the X axis, flipping red |0> to blue |1> and blue |1> to red |0>.",
      fields: [{ key: "target", label: "Target", kind: "qubit" }],
    },
    {
      id: "y",
      label: "Pauli-Y",
      category: "Single-Qubit",
      description: "Rotates around the Y axis with a phase twist.",
      fields: [{ key: "target", label: "Target", kind: "qubit" }],
    },
    {
      id: "z",
      label: "Pauli-Z",
      category: "Single-Qubit",
      description: "Rotates around the Z axis, changing the phase of the blue |1> component.",
      fields: [{ key: "target", label: "Target", kind: "qubit" }],
    },
    {
      id: "s",
      label: "Phase-S",
      category: "Phase",
      description: "Adds a quarter-turn phase to the blue |1> part.",
      fields: [{ key: "target", label: "Target", kind: "qubit" }],
    },
    {
      id: "t",
      label: "Phase-T",
      category: "Phase",
      description: "Adds an eighth-turn phase to the blue |1> part.",
      fields: [{ key: "target", label: "Target", kind: "qubit" }],
    },
    {
      id: "rx",
      label: "Rotate-X",
      category: "Rotation",
      description: "Turns the quantum state vector around the X axis.",
      fields: [
        { key: "target", label: "Target", kind: "qubit" },
        { key: "angle", label: "Angle", kind: "angle", default: 90 },
      ],
    },
    {
      id: "ry",
      label: "Rotate-Y",
      category: "Rotation",
      description: "Turns the quantum state vector around the Y axis.",
      fields: [
        { key: "target", label: "Target", kind: "qubit" },
        { key: "angle", label: "Angle", kind: "angle", default: 90 },
      ],
    },
    {
      id: "rz",
      label: "Rotate-Z",
      category: "Rotation",
      description: "Turns the quantum state vector around the Z axis.",
      fields: [
        { key: "target", label: "Target", kind: "qubit" },
        { key: "angle", label: "Angle", kind: "angle", default: 90 },
      ],
    },
    {
      id: "cx",
      label: "Controlled-X",
      category: "Entangling",
      description: "Flips the target only when the control is |1>.",
      fields: [
        { key: "control", label: "Control", kind: "qubit" },
        { key: "target", label: "Target", kind: "qubit" },
      ],
    },
    {
      id: "cz",
      label: "Controlled-Z",
      category: "Entangling",
      description: "Adds phase when both qubits are |1>.",
      fields: [
        { key: "control", label: "Control", kind: "qubit" },
        { key: "target", label: "Target", kind: "qubit" },
      ],
    },
    {
      id: "swap",
      label: "Swap",
      category: "Two-Qubit",
      description: "Exchanges the states of two qubits.",
      fields: [
        { key: "target", label: "Qubit A", kind: "qubit" },
        { key: "target2", label: "Qubit B", kind: "qubit" },
      ],
    },
    {
      id: "cswap",
      label: "Controlled-Swap",
      category: "Entangling",
      description: "Swaps two target qubits only when the control qubit is |1>.",
      fields: [
        { key: "control", label: "Control", kind: "qubit" },
        { key: "target", label: "Target A", kind: "qubit" },
        { key: "target2", label: "Target B", kind: "qubit" },
      ],
    },
    {
      id: "measure",
      label: "Measure",
      category: "Measurement",
      description: "Measures a qubit along the chosen axis and collapses it to an outcome.",
      fields: [
        { key: "target", label: "Target", kind: "qubit" },
        { key: "axis", label: "Axis", kind: "choice", default: "Z", options: ["X", "Y", "Z"] },
      ],
    },
  ],
};

const gateGuide = {
  h: {
    purpose: "Creates a balanced split between red |0> and blue |1>.",
    function: "Often used to introduce superposition before interference or entanglement.",
    inputs: "One target qubit.",
  },
  x: {
    purpose: "Flips the qubit from |0> to |1> or back again.",
    function: "Commonly used as a NOT gate or to prepare a qubit in |1>.",
    inputs: "One target qubit.",
  },
  y: {
    purpose: "Rotates the qubit with both a flip and phase shift.",
    function: "Useful when teaching axis-specific Bloch sphere motion.",
    inputs: "One target qubit.",
  },
  z: {
    purpose: "Changes phase without swapping measurement probabilities.",
    function: "Shows that phase matters even when 0/1 odds stay the same.",
    inputs: "One target qubit.",
  },
  s: {
    purpose: "Applies a quarter-turn phase to the |1> part.",
    function: "Useful in phase-based circuits and controlled phase stories.",
    inputs: "One target qubit.",
  },
  t: {
    purpose: "Applies a smaller eighth-turn phase to the |1> part.",
    function: "Used in more advanced gate sets and phase demonstrations.",
    inputs: "One target qubit.",
  },
  rx: {
    purpose: "Rotates the Bloch arrow around the X axis.",
    function: "Shows smooth state changes instead of fixed jumps.",
    inputs: "One target qubit and an angle.",
  },
  ry: {
    purpose: "Rotates the Bloch arrow around the Y axis.",
    function: "Shows movement between |0> and |1> on the sphere.",
    inputs: "One target qubit and an angle.",
  },
  rz: {
    purpose: "Rotates the Bloch arrow around the Z axis.",
    function: "Highlights phase rotations that may not change direct measurement odds.",
    inputs: "One target qubit and an angle.",
  },
  cx: {
    purpose: "Lets one qubit control whether another flips.",
    function: "A standard way to create entanglement and Bell states.",
    inputs: "One control qubit and one target qubit.",
  },
  cz: {
    purpose: "Lets one qubit control a phase change on another.",
    function: "Useful for entanglement and phase-kickback stories.",
    inputs: "One control qubit and one target qubit.",
  },
  swap: {
    purpose: "Exchanges the states of two qubits.",
    function: "Helpful when routing or reorganizing information in a circuit.",
    inputs: "Two target qubits.",
  },
  cswap: {
    purpose: "Uses one qubit to decide whether two others trade places.",
    function: "Useful for showing conditional routing and the Fredkin gate.",
    inputs: "One control qubit and two target qubits.",
  },
  measure: {
    purpose: "Reads a qubit along an X, Y, or Z measurement axis.",
    function: "Collapses the qubit to an outcome in the chosen basis.",
    inputs: "One target qubit and a measurement axis. Default is Z.",
  },
};

const paletteElement = document.querySelector("#palette");
const workspaceElement = document.querySelector("#workspace");
const dropzoneElement = document.querySelector("#workspace-dropzone");
const workspaceHelpElement = document.querySelector("#workspace-help");
const timelineElement = document.querySelector("#timeline");
const transitionElement = document.querySelector("#transition");
const globalStateElement = document.querySelector("#global-state");
const spheresElement = document.querySelector("#qubit-spheres");
const qubitCountElement = document.querySelector("#qubit-count");
const initialBitsElement = document.querySelector("#initial-bits");
const statusMessageElement = document.querySelector("#status-message");
const animateButtonElement = document.querySelector("#animate-button");
const paletteTemplate = document.querySelector("#palette-block-template");
const sphereTemplate = document.querySelector("#sphere-card-template");

console.info(`Quantum Blocks Lab build: ${APP_BUILD}`);

function shortGateLabel(label) {
  return label
    .split("-")
    .map((part) => part[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

function categoryClass(category) {
  return `category-${category.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

function definitionForGate(gateType) {
  return state.config.gates.find((gate) => gate.id === gateType);
}

function requiredSlotCount() {
  let lastOccupied = -1;
  state.slots.forEach((gates, index) => {
    if (gates.length > 0) {
      lastOccupied = index;
    }
  });
  return Math.max(MIN_SLOT_COUNT, lastOccupied + 2);
}

function ensureSlotCount(minimum) {
  while (state.slots.length < minimum) {
    state.slots.push([]);
  }
}

function orderedRows(rowHint) {
  if (state.numQubits <= 0) {
    return [0];
  }
  const rows = [];
  for (let offset = 0; offset < state.numQubits; offset += 1) {
    rows.push((rowHint + offset) % state.numQubits);
  }
  return rows;
}

function createGate(gateId, rowHint = 0, overrides = {}, finalized = false) {
  const definition = definitionForGate(gateId);
  const gate = {
    id: `gate-${state.nextGateId++}`,
    type: definition.id,
    finalized,
  };

  definition.fields.forEach((field) => {
    if (field.kind === "qubit") {
      gate[field.key] = rowHint;
    } else if (field.kind === "angle") {
      gate[field.key] = field.default ?? 90;
    } else if (field.kind === "choice") {
      gate[field.key] = field.default ?? field.options[0];
    }
  });

  const defaultRows = orderedRows(rowHint);
  if (gate.type === "cx" || gate.type === "cz") {
    gate.control = defaultRows[0];
    gate.target = defaultRows[1] ?? defaultRows[0];
  }
  if (gate.type === "swap") {
    gate.target = defaultRows[0];
    gate.target2 = defaultRows[1] ?? defaultRows[0];
  }
  if (gate.type === "cswap") {
    gate.control = defaultRows[0];
    gate.target = defaultRows[1] ?? defaultRows[0];
    gate.target2 = defaultRows[2] ?? defaultRows[0];
  }

  Object.assign(gate, overrides);
  return sanitizeGate(gate);
}

function sanitizeGate(gate) {
  const definition = definitionForGate(gate.type);
  const nextGate = {
    id: gate.id,
    type: gate.type,
    finalized: Boolean(gate.finalized),
  };

  definition.fields.forEach((field) => {
    const fallback =
      field.kind === "angle" ? field.default ?? 90 : field.kind === "choice" ? field.default ?? field.options[0] : 0;
    let value = gate[field.key] ?? fallback;
    if (field.kind === "qubit") {
      value = Math.max(0, Math.min(state.numQubits - 1, Number(value)));
    } else if (field.kind === "angle") {
      value = Number(value);
      if (Number.isNaN(value)) {
        value = fallback;
      }
    } else if (field.kind === "choice") {
      if (!field.options.includes(value)) {
        value = fallback;
      }
    }
    nextGate[field.key] = value;
  });

  if (!isGateConfigValid(nextGate)) {
    nextGate.finalized = false;
  }
  return nextGate;
}

function isGateConfigValid(gate) {
  const definition = definitionForGate(gate.type);
  const qubitValues = definition.fields
    .filter((field) => field.kind === "qubit")
    .map((field) => gate[field.key]);

  const inBounds = qubitValues.every(
    (value) => Number.isInteger(value) && value >= 0 && value < state.numQubits,
  );
  if (!inBounds) {
    return false;
  }
  if ((gate.type === "cx" || gate.type === "cz") && gate.control === gate.target) {
    return false;
  }
  if (gate.type === "swap" && gate.target === gate.target2) {
    return false;
  }
  if (gate.type === "cswap" && new Set([gate.control, gate.target, gate.target2]).size < 3) {
    return false;
  }
  return true;
}

function slotHasConflict(slotIndex, candidateGate, ignoreGateId = null) {
  const candidateRows = gateCoveredRows(candidateGate);
  return state.slots[slotIndex].some((existingGate) => {
    if (existingGate.id === ignoreGateId) {
      return false;
    }
    return gateCoveredRows(existingGate).some((row) => candidateRows.includes(row));
  });
}

function activeGateInSlot(slotIndex) {
  if (!state.activeEditorGateId) {
    return null;
  }
  return state.slots[slotIndex].find((gate) => gate.id === state.activeEditorGateId) ?? null;
}

function finalizedGates() {
  return state.slots
    .flatMap((slotGates) =>
      slotGates
        .filter((gate) => gate.finalized && isGateConfigValid(gate))
        .map((gate) => {
          const definition = definitionForGate(gate.type);
          const serialized = { type: gate.type };
          definition.fields.forEach((field) => {
            serialized[field.key] = gate[field.key];
          });
          return serialized;
        }),
    );
}

function gateRows(gate) {
  if (!gate) {
    return [];
  }
  if (gate.type === "cx" || gate.type === "cz") {
    return [gate.control, gate.target].sort((left, right) => left - right);
  }
  if (gate.type === "swap") {
    return [gate.target, gate.target2].sort((left, right) => left - right);
  }
  if (gate.type === "cswap") {
    return [gate.control, gate.target, gate.target2].sort((left, right) => left - right);
  }
  return [gate.target];
}

function gateCoveredRows(gate) {
  const rows = gateRows(gate);
  if (rows.length <= 1) {
    return rows;
  }
  const start = rows[0];
  const end = rows[rows.length - 1];
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function gateTouchesRow(gate, rowIndex) {
  return gateCoveredRows(gate).includes(rowIndex);
}

function gateAnchorRow(gate) {
  const rows = gateRows(gate);
  return rows[0];
}

function gateStepMap() {
  const stepMap = new Map();
  let step = 1;
  state.slots.forEach((slotGates) => {
    slotGates.forEach((gate) => {
      if (gate.finalized && isGateConfigValid(gate)) {
        stepMap.set(gate.id, step);
        step += 1;
      }
    });
  });
  return stepMap;
}

function stopAnimation() {
  if (state.animationTimer) {
    window.clearTimeout(state.animationTimer);
  }
  state.animationTimer = null;
  state.isAnimating = false;
}

function syncSelectedStep(stepIndex) {
  state.selectedStep = stepIndex;
  renderWorkspace();
  renderResult();
}

function updateAnimateButton() {
  const canAnimate = Boolean(state.result && state.result.snapshots.length > 1);
  animateButtonElement.disabled = !canAnimate;
  animateButtonElement.textContent = state.isAnimating ? "Stop Animation" : "Animate Circuit";
}

function queueAnimationAdvance() {
  if (!state.isAnimating || !state.result) {
    return;
  }
  if (state.selectedStep >= state.result.snapshots.length - 1) {
    stopAnimation();
    updateAnimateButton();
    return;
  }
  state.animationTimer = window.setTimeout(() => {
    syncSelectedStep(state.selectedStep + 1);
    queueAnimationAdvance();
  }, 1500);
}

function startAnimation() {
  if (!state.result || state.result.snapshots.length <= 1) {
    return;
  }
  stopAnimation();
  state.isAnimating = true;
  syncSelectedStep(0);
  updateAnimateButton();
  queueAnimationAdvance();
}

function syncQubitCount() {
  state.initialBits = Array.from({ length: state.numQubits }, (_, index) => state.initialBits[index] ?? 0);
  state.slots = state.slots.map((slotGates) => slotGates.map((gate) => sanitizeGate(gate)));
  state.slots = state.slots.map((slotGates) => {
    const kept = [];
    slotGates.forEach((gate) => {
      if (!slotHasConflictForList(kept, gate)) {
        kept.push(gate);
      }
    });
    return kept;
  });
  if (
    state.activeEditorGateId &&
    !state.slots.some((slotGates) => slotGates.some((gate) => gate.id === state.activeEditorGateId))
  ) {
    state.activeEditorGateId = null;
  }
  ensureSlotCount(requiredSlotCount());
}

function firstEmptySlotIndex() {
  const index = state.slots.findIndex((slotGates) => slotGates.length === 0);
  if (index !== -1) {
    return index;
  }
  ensureSlotCount(state.slots.length + 1);
  return state.slots.length - 1;
}

function addGateFromPalette(gateId) {
  const slotIndex = firstEmptySlotIndex();
  const gate = createGate(gateId, 0);
  state.slots[slotIndex].push(gate);
  state.activeEditorGateId = gate.id;
  ensureSlotCount(requiredSlotCount());
  renderWorkspace();
  runSimulation();
}

function placeGateInSlot(slotIndex, rowIndex, gateId) {
  ensureSlotCount(slotIndex + 1);
  const gate = createGate(gateId, rowIndex);
  if (slotHasConflict(slotIndex, gate)) {
    return;
  }
  state.slots[slotIndex].push(gate);
  state.activeEditorGateId = gate.id;
  ensureSlotCount(requiredSlotCount());
  renderWorkspace();
  runSimulation();
}

function removeGate(slotIndex, gateId) {
  state.slots[slotIndex] = state.slots[slotIndex].filter((gate) => gate.id !== gateId);
  if (state.activeEditorGateId === gateId) {
    state.activeEditorGateId = null;
  }
  ensureSlotCount(requiredSlotCount());
  renderWorkspace();
  runSimulation();
}

function slotHasConflictForList(gates, candidateGate, ignoreGateId = null) {
  const candidateRows = gateCoveredRows(candidateGate);
  return gates.some((existingGate) => {
    if (existingGate.id === ignoreGateId) {
      return false;
    }
    return gateCoveredRows(existingGate).some((row) => candidateRows.includes(row));
  });
}

function renderPalette() {
  paletteElement.innerHTML = "";
  state.config.gates.forEach((gate) => {
    const node = paletteTemplate.content.firstElementChild.cloneNode(true);
    const guide = gateGuide[gate.id];
    node.dataset.gateId = gate.id;
    node.dataset.category = gate.category;
    node.querySelector(".palette-code").textContent = gate.id === "measure" ? "M" : shortGateLabel(gate.label);
    node.querySelector(".palette-name").textContent = gate.label;
    node.querySelector(".palette-category").textContent = gate.category;
    node.querySelector(".palette-tooltip-title").textContent = gate.label;
    node.querySelector(".palette-tooltip-purpose").textContent = guide.purpose;
    node.querySelector(".palette-tooltip-function").textContent = `Use: ${guide.inputs}`;
    node.querySelector(".palette-tooltip-inputs").textContent = "";
    node.title = gate.label;
    node.addEventListener("click", () => addGateFromPalette(gate.id));
    node.addEventListener("dragstart", (event) => {
      node.classList.add("is-dragging");
      event.dataTransfer.setData("text/palette-gate", gate.id);
      event.dataTransfer.effectAllowed = "copy";
      const dragPreview = document.createElement("div");
      dragPreview.className = `palette-drag-preview ${categoryClass(gate.category)}`;
      dragPreview.textContent = gate.id === "measure" ? "M" : shortGateLabel(gate.label);
      dragPreview.style.position = "absolute";
      dragPreview.style.top = "-1000px";
      dragPreview.style.left = "-1000px";
      document.body.append(dragPreview);
      event.dataTransfer.setDragImage(dragPreview, 24, 24);
      node.dataset.dragPreviewId = "active";
      node._dragPreview = dragPreview;
      dropzoneElement.classList.add("is-dragging");
    });
    node.addEventListener("dragend", () => {
      node.classList.remove("is-dragging");
      if (node._dragPreview) {
        node._dragPreview.remove();
        delete node._dragPreview;
      }
      dropzoneElement.classList.remove("is-dragging");
    });
    paletteElement.append(node);
  });
}

function renderControls() {
  initialBitsElement.innerHTML = "";
  state.initialBits.forEach((bit, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `bit-toggle ${bit === 0 ? "bit-zero" : "bit-one"}`;
    button.textContent = `q${index}: |${bit}>`;
    button.addEventListener("click", () => {
      state.initialBits[index] = bit === 0 ? 1 : 0;
      renderControls();
      renderWorkspace();
      runSimulation();
    });
    initialBitsElement.append(button);
  });
  qubitCountElement.value = String(state.numQubits);
}

function renderRegisterColumn() {
  const column = document.createElement("section");
  column.className = "register-column";
  for (let qubit = 0; qubit < state.numQubits; qubit += 1) {
    const lane = document.createElement("div");
    lane.className = "slot-lane register-lane";
    const pill = document.createElement("div");
    pill.className = `register-pill ${state.initialBits[qubit] === 0 ? "bit-zero" : "bit-one"}`;
    pill.textContent = `q${qubit} |${state.initialBits[qubit]}>`;
    lane.append(pill);
    column.append(lane);
  }
  return column;
}

function renderSlotBox(slotIndex, rowIndex, slotGates) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "slot-box";
  button.innerHTML = "Add<br>Gate";
  if (slotGates.some((gate) => gateTouchesRow(gate, rowIndex))) {
    button.classList.add("is-covered");
  }
  if (!slotGates.some((gate) => gateTouchesRow(gate, rowIndex))) {
    button.addEventListener("dragover", (event) => event.preventDefault());
    button.addEventListener("drop", (event) => {
      event.preventDefault();
      const gateId = event.dataTransfer.getData("text/palette-gate");
      dropzoneElement.classList.remove("is-dragging");
      if (gateId) {
        placeGateInSlot(slotIndex, rowIndex, gateId);
      }
    });
  }
  return button;
}

function renderGateField(field, gate, slotIndex) {
  const row = document.createElement("div");
  row.className = "gate-field";

  const label = document.createElement("label");
  label.textContent = field.label;
  row.append(label);

  let input;
  if (field.kind === "qubit" || field.kind === "choice") {
    input = document.createElement("select");
    const options = field.kind === "choice" ? field.options : Array.from({ length: state.numQubits }, (_, index) => index);
    options.forEach((optionValue) => {
      const option = document.createElement("option");
      option.value = String(optionValue);
      option.textContent = field.kind === "choice" ? optionValue : `q${optionValue}`;
      if (gate[field.key] === optionValue) {
        option.selected = true;
      }
      input.append(option);
    });
  } else {
    input = document.createElement("input");
    input.type = "number";
    input.step = "15";
    input.value = String(gate[field.key]);
  }

  input.addEventListener("change", () => {
    const gateIndex = state.slots[slotIndex].findIndex((candidate) => candidate.id === gate.id);
    if (gateIndex === -1) {
      return;
    }
    if (field.kind === "qubit") {
      state.slots[slotIndex][gateIndex][field.key] = Number(input.value);
    } else if (field.kind === "angle") {
      state.slots[slotIndex][gateIndex][field.key] = Number.parseFloat(input.value);
    } else {
      state.slots[slotIndex][gateIndex][field.key] = input.value;
    }
    state.slots[slotIndex][gateIndex] = sanitizeGate(state.slots[slotIndex][gateIndex]);
    renderWorkspace();
    runSimulation();
  });

  row.append(input);
  return row;
}

function renderGateEditor(gate, slotIndex) {
  const definition = definitionForGate(gate.type);
  const guide = gateGuide[gate.type];
  const editor = document.createElement("article");
  editor.className = "gate-editor";
  editor.style.top = `${boxTopForRow(gateAnchorRow(gate))}px`;

  const title = document.createElement("h3");
  title.className = "editor-title";
  title.textContent = definition.label;

  const description = document.createElement("p");
  description.className = "editor-description";
  description.textContent = guide.purpose;

  const note = document.createElement("p");
  note.className = "editor-note";
  note.textContent = "Pick the qubits, then close the gate.";

  const form = document.createElement("div");
  form.className = "editor-form";
  definition.fields.forEach((field) => {
    form.append(renderGateField(field, gate, slotIndex));
  });

  const footer = document.createElement("div");
  footer.className = "editor-footer";

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "editor-button editor-button-primary";
  closeButton.textContent = "Close gate";
  closeButton.disabled = !isGateConfigValid(gate) || slotHasConflict(slotIndex, gate, gate.id);
  closeButton.addEventListener("click", () => {
    const gateIndex = state.slots[slotIndex].findIndex((candidate) => candidate.id === gate.id);
    if (gateIndex === -1) {
      return;
    }
    state.slots[slotIndex][gateIndex].finalized = true;
    state.activeEditorGateId = null;
    renderWorkspace();
    runSimulation();
  });
  footer.append(closeButton);

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "editor-button";
  removeButton.textContent = "Remove gate";
  removeButton.addEventListener("click", () => removeGate(slotIndex, gate.id));
  footer.append(removeButton);

  if (!isGateConfigValid(gate) || slotHasConflict(slotIndex, gate, gate.id)) {
    const warning = document.createElement("span");
    warning.className = "editor-warning";
    warning.textContent = "Pick qubits that do not overlap with other gates in this slot before closing.";
    footer.append(warning);
  }

  editor.append(title, description, note, form, footer);
  return editor;
}

function renderSingleGateVisual(gate, stepNumber) {
  const definition = definitionForGate(gate.type);
  const button = document.createElement("button");
  button.type = "button";
  button.className = `compact-gate ${categoryClass(definition.category)}`;
  if (stepNumber === state.selectedStep) {
    button.classList.add("is-story-active");
  }
  button.style.top = `${rowCenter(gate.target) - 28}px`;
  button.textContent =
    gate.type === "measure" ? `M${gate.axis}` : definition.id.toUpperCase().slice(0, 2);
  button.title = stepNumber ? `${definition.label}. Step ${stepNumber}. Click to edit.` : `${definition.label}. Click to edit.`;
  return button;
}

function renderMultiGateVisual(gate, stepNumber) {
  const definition = definitionForGate(gate.type);
  const rows = gateRows(gate);
  const start = rows[0];
  const end = rows[rows.length - 1];
  const wrapper = document.createElement("div");
  wrapper.className = `multi-gate ${categoryClass(definition.category)}`;
  if (stepNumber === state.selectedStep) {
    wrapper.classList.add("is-story-active");
  }
  wrapper.style.top = `${start * ROW_HEIGHT}px`;
  wrapper.style.height = `${(end - start + 1) * ROW_HEIGHT}px`;

  const connector = document.createElement("div");
  connector.className = "multi-connector";
  connector.style.top = `${ROW_HEIGHT / 2}px`;
  connector.style.bottom = `${ROW_HEIGHT / 2}px`;
  wrapper.append(connector);

  if (gate.type === "cx" || gate.type === "cz") {
    const controlNode = document.createElement("div");
    controlNode.className = "multi-node control-node";
    controlNode.style.top = `${(gate.control - start) * ROW_HEIGHT + ROW_HEIGHT / 2 - 12}px`;
    controlNode.textContent = "C";

    const targetNode = document.createElement("div");
    targetNode.className = `multi-node ${categoryClass(definition.category)}`;
    targetNode.style.top = `${(gate.target - start) * ROW_HEIGHT + ROW_HEIGHT / 2 - 26}px`;
    targetNode.textContent = gate.type === "cx" ? "X" : "Z";

    wrapper.append(controlNode, targetNode);
  } else if (gate.type === "cswap") {
    const controlNode = document.createElement("div");
    controlNode.className = "multi-node control-node";
    controlNode.style.top = `${(gate.control - start) * ROW_HEIGHT + ROW_HEIGHT / 2 - 12}px`;
    controlNode.textContent = "C";

    const firstNode = document.createElement("div");
    firstNode.className = `multi-node ${categoryClass(definition.category)}`;
    firstNode.style.top = `${(gate.target - start) * ROW_HEIGHT + ROW_HEIGHT / 2 - 26}px`;
    firstNode.textContent = "SW";

    const secondNode = document.createElement("div");
    secondNode.className = `multi-node ${categoryClass(definition.category)}`;
    secondNode.style.top = `${(gate.target2 - start) * ROW_HEIGHT + ROW_HEIGHT / 2 - 26}px`;
    secondNode.textContent = "SW";

    wrapper.append(controlNode, firstNode, secondNode);
  } else {
    const firstNode = document.createElement("div");
    firstNode.className = `multi-node ${categoryClass(definition.category)}`;
    firstNode.style.top = `${(gate.target - start) * ROW_HEIGHT + ROW_HEIGHT / 2 - 26}px`;
    firstNode.textContent = "SW";

    const secondNode = document.createElement("div");
    secondNode.className = `multi-node ${categoryClass(definition.category)}`;
    secondNode.style.top = `${(gate.target2 - start) * ROW_HEIGHT + ROW_HEIGHT / 2 - 26}px`;
    secondNode.textContent = "SW";

    wrapper.append(firstNode, secondNode);
  }

  return wrapper;
}

function renderSlotColumn(slotIndex) {
  const slotGates = state.slots[slotIndex];
  const stepMap = gateStepMap();
  const column = document.createElement("section");
  column.className = `slot-column ${slotGates.length > 0 ? "has-gates" : "is-empty"}`;

  const body = document.createElement("div");
  body.className = "slot-body";

  for (let rowIndex = 0; rowIndex < state.numQubits; rowIndex += 1) {
    const lane = document.createElement("div");
    lane.className = "slot-lane";
    lane.append(renderSlotBox(slotIndex, rowIndex, slotGates));
    body.append(lane);
  }

  slotGates.forEach((gate) => {
    if (gate.id === state.activeEditorGateId) {
      return;
    }
    const stepNumber = stepMap.get(gate.id) ?? null;
    const visual =
      gate.type === "cx" || gate.type === "cz" || gate.type === "swap" || gate.type === "cswap"
        ? renderMultiGateVisual(gate, stepNumber)
        : renderSingleGateVisual(gate, stepNumber);
    visual.addEventListener("click", () => {
      stopAnimation();
      const gateIndex = state.slots[slotIndex].findIndex((candidate) => candidate.id === gate.id);
      if (gateIndex === -1) {
        return;
      }
      state.slots[slotIndex][gateIndex].finalized = false;
      state.activeEditorGateId = gate.id;
      renderWorkspace();
      runSimulation();
    });
    body.append(visual);
  });

  const activeGate = activeGateInSlot(slotIndex);
  if (activeGate) {
    body.append(renderGateEditor(activeGate, slotIndex));
  }

  column.append(body);
  return column;
}

function renderWorkspace() {
  const slotCount = requiredSlotCount();
  ensureSlotCount(slotCount);
  workspaceElement.style.setProperty("--slot-count", slotCount);
  workspaceElement.innerHTML = "";
  workspaceElement.append(renderRegisterColumn());
  state.slots.slice(0, slotCount).forEach((_, slotIndex) => {
    workspaceElement.append(renderSlotColumn(slotIndex));
  });

  const finalizedCount = finalizedGates().length;
  const draftCount = state.slots.flat().filter((gate) => !gate.finalized).length;
  workspaceHelpElement.textContent =
    draftCount > 0
      ? `${finalizedCount} closed gate(s), ${draftCount} open gate(s).`
      : `${finalizedCount} closed gate(s). Drag a gate into any empty slot.`;
}

function renderTimeline() {
  timelineElement.innerHTML = "";
  if (!state.result) {
    return;
  }
  state.result.snapshots.forEach((snapshot, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `timeline-chip ${index === state.selectedStep ? "is-active" : ""}`;
    const label = index === 0 ? "Input" : `Step ${index}`;
    const extra = snapshot.gate
      ? snapshot.gate.type === "measure"
        ? `M-${snapshot.gate.axis}`
        : snapshot.gate.type.toUpperCase()
      : "START";
    button.innerHTML = `<div class="timeline-card"><strong>${label}</strong><span>${extra}</span></div>`;
    button.addEventListener("click", () => {
      stopAnimation();
      syncSelectedStep(index);
      updateAnimateButton();
    });
    timelineElement.append(button);
  });
}

function renderQubitSummaryList(qubits) {
  return qubits
    .map(
      (qubit) => `
        <div class="stat-pill">
          <span>q${qubit.index}</span>
          <span>${qubit.summary}</span>
        </div>
      `,
    )
    .join("");
}

function renderTransition() {
  transitionElement.innerHTML = "";
  if (!state.result) {
    return;
  }

  const currentSnapshot = state.result.snapshots[state.selectedStep];
  const previousSnapshot = state.result.snapshots[Math.max(0, state.selectedStep - 1)];
  const card = document.createElement("article");
  card.className = "story-card";

  const heading = state.selectedStep === 0 ? "Start" : `Step ${state.selectedStep}`;
  const note = state.selectedStep === 0 ? "Before the circuit runs." : currentSnapshot.machineNote;

  const measurementNote = currentSnapshot.measurement
    ? `
      <div class="measurement-note">
        q${currentSnapshot.measurement.target} measured <strong>${currentSnapshot.measurement.outcome}</strong>
        on the ${currentSnapshot.measurement.axis}-axis.
      </div>
    `
    : "";

  card.innerHTML = `
    <div class="story-header">
      <div>
        <h3>${heading}</h3>
        <p class="story-note">${note}</p>
        ${measurementNote}
      </div>
      <strong>${currentSnapshot.label}</strong>
    </div>
    <div class="story-summary-grid">
      <section class="story-box">
        <h4>${state.selectedStep === 0 ? "Current" : "Before"}</h4>
        ${renderQubitSummaryList(previousSnapshot.qubits)}
      </section>
      <section class="story-box">
        <h4>${state.selectedStep === 0 ? "Same state" : "After"}</h4>
        ${renderQubitSummaryList(currentSnapshot.qubits)}
      </section>
    </div>
  `;
  transitionElement.append(card);
}

function formatComplex(real, imag) {
  const sign = imag >= 0 ? "+" : "-";
  return `${real.toFixed(3)} ${sign} ${Math.abs(imag).toFixed(3)}i`;
}

function renderGlobalState() {
  globalStateElement.innerHTML = "";
  if (!state.result) {
    return;
  }

  const snapshot = state.result.snapshots[state.selectedStep];
  const card = document.createElement("article");
  card.className = "global-card";
  card.innerHTML = `
    <h3>Top basis states</h3>
    <p class="amplitude-note">Shown in q0, q1, q2 order.</p>
  `;

  const list = document.createElement("div");
  list.className = "amplitude-list";
  snapshot.amplitudes.slice(0, 4).forEach((item) => {
    const amplitude = document.createElement("div");
    amplitude.className = "amplitude-item";
    amplitude.innerHTML = `
      <div class="amplitude-head">
        <span>|${item.basis}></span>
        <span>${(item.magnitude * item.magnitude).toFixed(3)}</span>
      </div>
      <div class="amplitude-bar">
        <div class="amplitude-fill" style="width:${item.magnitude * 100}%"></div>
      </div>
      <div class="amplitude-note">${formatComplex(item.real, item.imag)} at ${item.phaseDegrees.toFixed(1)}°</div>
    `;
    list.append(amplitude);
  });
  card.append(list);
  globalStateElement.append(card);
}

function drawBlochSphere(canvas, qubit) {
  const context = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  context.clearRect(0, 0, width, height);

  const centerX = width / 2;
  const centerY = height / 2 + 6;
  const radius = 68;

  const fill = context.createLinearGradient(0, centerY - radius, 0, centerY + radius);
  fill.addColorStop(0, "#ff5b70");
  fill.addColorStop(0.48, "#ffc5cc");
  fill.addColorStop(0.52, "#b8cfff");
  fill.addColorStop(1, "#4e86ff");
  context.fillStyle = fill;
  context.strokeStyle = "rgba(25, 50, 73, 0.28)";
  context.lineWidth = 2;
  context.beginPath();
  context.arc(centerX, centerY, radius, 0, Math.PI * 2);
  context.fill();
  context.stroke();

  context.strokeStyle = "rgba(25, 50, 73, 0.16)";
  context.beginPath();
  context.ellipse(centerX, centerY, radius, radius * 0.36, 0, 0, Math.PI * 2);
  context.stroke();
  context.beginPath();
  context.moveTo(centerX, centerY - radius);
  context.lineTo(centerX, centerY + radius);
  context.stroke();

  context.font = '600 15px "Avenir Next", "Trebuchet MS", sans-serif';
  context.fillStyle = "#193249";
  context.fillText("|0>", centerX - 14, centerY - radius - 10);
  context.fillText("|1>", centerX - 12, centerY + radius + 22);

  if (qubit.entangled || !qubit.blochVector) {
    context.strokeStyle = "rgba(25, 50, 73, 0.55)";
    context.setLineDash([8, 8]);
    context.beginPath();
    context.arc(centerX, centerY, radius - 10, 0, Math.PI * 2);
    context.stroke();
    context.setLineDash([]);
    context.fillStyle = "#193249";
    context.font = '700 18px "Avenir Next Condensed", "Trebuchet MS", sans-serif';
    context.textAlign = "center";
    context.fillText("Entangled", centerX, centerY + 2);
    context.font = '500 12px "Avenir Next", "Trebuchet MS", sans-serif';
    context.fillText("local vector hidden", centerX, centerY + 22);
    context.textAlign = "start";
    return;
  }

  const { x, y, z } = qubit.blochVector;
  const projectedX = centerX + x * radius * 0.72;
  const projectedY = centerY - z * radius * 0.72;
  const depthShade = 0.25 + (y + 1) * 0.25;

  context.strokeStyle = `rgba(25, 50, 73, ${depthShade.toFixed(3)})`;
  context.lineWidth = 4;
  context.beginPath();
  context.moveTo(centerX, centerY);
  context.lineTo(projectedX, projectedY);
  context.stroke();

  context.fillStyle = y >= 0 ? "#173857" : "#2a638e";
  context.beginPath();
  context.arc(projectedX, projectedY, 8, 0, Math.PI * 2);
  context.fill();
}

function renderSpheres() {
  spheresElement.innerHTML = "";
  if (!state.result) {
    return;
  }

  const snapshot = state.result.snapshots[state.selectedStep];
  snapshot.qubits.forEach((qubit) => {
    const card = sphereTemplate.content.firstElementChild.cloneNode(true);
    card.querySelector(".sphere-title").textContent = `q${qubit.index}`;
    card.querySelector(".sphere-summary").textContent = qubit.summary;

    const stats = card.querySelector(".sphere-stats");
    stats.innerHTML = `
      <div class="stat-pill"><span>|0&gt;</span><strong>${qubit.zeroProbability.toFixed(3)}</strong></div>
      <div class="stat-pill"><span>|1&gt;</span><strong>${qubit.oneProbability.toFixed(3)}</strong></div>
      <div class="stat-pill"><span>Purity</span><strong>${qubit.purity.toFixed(3)}</strong></div>
      <div class="stat-pill"><span>Vector</span><strong>${qubit.entangled ? "hidden" : "shown"}</strong></div>
    `;

    drawBlochSphere(card.querySelector(".sphere-canvas"), qubit);
    spheresElement.append(card);
  });
}

function renderResult() {
  const finalizedCount = finalizedGates().length;
  const openCount = state.slots.flat().filter((gate) => !gate.finalized).length;
  statusMessageElement.textContent = state.result
    ? `Viewing ${state.result.snapshots[state.selectedStep].label}. ${finalizedCount} closed gate(s)${openCount > 0 ? `, ${openCount} still open.` : "."}`
    : "No simulation results yet.";
  renderTimeline();
  renderTransition();
  renderGlobalState();
  renderSpheres();
  updateAnimateButton();
}

function complex(real = 0, imag = 0) {
  return { real, imag };
}

function complexAdd(left, right) {
  return complex(left.real + right.real, left.imag + right.imag);
}

function complexMultiply(left, right) {
  return complex(left.real * right.real - left.imag * right.imag, left.real * right.imag + left.imag * right.real);
}

function complexConjugate(value) {
  return complex(value.real, -value.imag);
}

function complexScale(value, scalar) {
  return complex(value.real * scalar, value.imag * scalar);
}

function complexMagnitude(value) {
  return Math.hypot(value.real, value.imag);
}

function complexMagnitudeSquared(value) {
  return value.real * value.real + value.imag * value.imag;
}

function roundForPayload(value, digits = 6) {
  const rounded = Number(value.toFixed(digits));
  return Object.is(rounded, -0) ? 0 : rounded;
}

function angleToRadians(angleDegrees) {
  return (angleDegrees * Math.PI) / 180;
}

function formatBasisLabel(index, numQubits) {
  return Array.from({ length: numQubits }, (_, qubit) => ((index >> qubit) & 1).toString()).join("");
}

function validateQubit(index, numQubits, label) {
  if (!Number.isInteger(index)) {
    throw new Error(`${label} must be an integer.`);
  }
  if (index < 0 || index >= numQubits) {
    throw new Error(`${label} must be between 0 and ${numQubits - 1}.`);
  }
  return index;
}

function validateSimulationGate(gate, numQubits) {
  const definition = definitionForGate(gate.type);
  if (!definition) {
    throw new Error(`Unsupported gate type: ${gate.type}.`);
  }

  const normalized = { type: gate.type };
  definition.fields.forEach((field) => {
    const value = gate[field.key] ?? field.default;
    if (field.kind === "qubit") {
      normalized[field.key] = validateQubit(value, numQubits, field.key);
    } else if (field.kind === "angle") {
      if (typeof value !== "number" || Number.isNaN(value)) {
        throw new Error(`${field.key} must be numeric.`);
      }
      normalized[field.key] = value;
    } else if (field.kind === "choice") {
      if (!field.options.includes(value)) {
        throw new Error(`${field.key} must be one of ${field.options.join(", ")}.`);
      }
      normalized[field.key] = value;
    }
  });

  if ((gate.type === "cx" || gate.type === "cz") && normalized.control === normalized.target) {
    throw new Error("Control and target must be different qubits.");
  }
  if (gate.type === "swap" && normalized.target === normalized.target2) {
    throw new Error("Swap needs two different qubits.");
  }
  if (gate.type === "cswap" && new Set([normalized.control, normalized.target, normalized.target2]).size < 3) {
    throw new Error("Controlled-Swap needs three different qubits.");
  }

  return normalized;
}

function applySingleQubitMatrix(vector, numQubits, target, matrix) {
  const next = vector.map((amplitude) => complex(amplitude.real, amplitude.imag));
  const mask = 1 << target;
  const dimension = 1 << numQubits;

  for (let index = 0; index < dimension; index += 1) {
    if ((index & mask) !== 0) {
      continue;
    }
    const zeroIndex = index;
    const oneIndex = index | mask;
    const zeroAmplitude = vector[zeroIndex];
    const oneAmplitude = vector[oneIndex];

    next[zeroIndex] = complexAdd(
      complexMultiply(matrix[0][0], zeroAmplitude),
      complexMultiply(matrix[0][1], oneAmplitude),
    );
    next[oneIndex] = complexAdd(
      complexMultiply(matrix[1][0], zeroAmplitude),
      complexMultiply(matrix[1][1], oneAmplitude),
    );
  }

  return next;
}

function singleQubitMatrix(gate) {
  const sqrtHalf = Math.SQRT1_2;
  if (gate.type === "h") {
    return [
      [complex(sqrtHalf), complex(sqrtHalf)],
      [complex(sqrtHalf), complex(-sqrtHalf)],
    ];
  }
  if (gate.type === "x") {
    return [
      [complex(0), complex(1)],
      [complex(1), complex(0)],
    ];
  }
  if (gate.type === "y") {
    return [
      [complex(0), complex(0, -1)],
      [complex(0, 1), complex(0)],
    ];
  }
  if (gate.type === "z") {
    return [
      [complex(1), complex(0)],
      [complex(0), complex(-1)],
    ];
  }
  if (gate.type === "s") {
    return [
      [complex(1), complex(0)],
      [complex(0), complex(0, 1)],
    ];
  }
  if (gate.type === "sdg") {
    return [
      [complex(1), complex(0)],
      [complex(0), complex(0, -1)],
    ];
  }
  if (gate.type === "t") {
    return [
      [complex(1), complex(0)],
      [complex(0), complex(Math.SQRT1_2, Math.SQRT1_2)],
    ];
  }
  if (gate.type === "rx") {
    const halfAngle = angleToRadians(gate.angle) / 2;
    return [
      [complex(Math.cos(halfAngle)), complex(0, -Math.sin(halfAngle))],
      [complex(0, -Math.sin(halfAngle)), complex(Math.cos(halfAngle))],
    ];
  }
  if (gate.type === "ry") {
    const halfAngle = angleToRadians(gate.angle) / 2;
    return [
      [complex(Math.cos(halfAngle)), complex(-Math.sin(halfAngle))],
      [complex(Math.sin(halfAngle)), complex(Math.cos(halfAngle))],
    ];
  }
  if (gate.type === "rz") {
    const halfAngle = angleToRadians(gate.angle) / 2;
    return [
      [complex(Math.cos(-halfAngle), Math.sin(-halfAngle)), complex(0)],
      [complex(0), complex(Math.cos(halfAngle), Math.sin(halfAngle))],
    ];
  }
  throw new Error(`Unsupported single-qubit gate: ${gate.type}.`);
}

function applyControlledX(vector, numQubits, control, target) {
  const next = vector.map((amplitude) => complex(amplitude.real, amplitude.imag));
  const controlMask = 1 << control;
  const targetMask = 1 << target;
  const dimension = 1 << numQubits;

  for (let index = 0; index < dimension; index += 1) {
    if ((index & controlMask) === 0 || (index & targetMask) !== 0) {
      continue;
    }
    const pairedIndex = index | targetMask;
    next[index] = vector[pairedIndex];
    next[pairedIndex] = vector[index];
  }

  return next;
}

function applyControlledZ(vector, numQubits, control, target) {
  const controlMask = 1 << control;
  const targetMask = 1 << target;
  return vector.map((amplitude, index) =>
    (index & controlMask) !== 0 && (index & targetMask) !== 0
      ? complexScale(amplitude, -1)
      : complex(amplitude.real, amplitude.imag),
  );
}

function applySwap(vector, numQubits, firstTarget, secondTarget) {
  const next = vector.map((amplitude) => complex(amplitude.real, amplitude.imag));
  const firstMask = 1 << firstTarget;
  const secondMask = 1 << secondTarget;
  const dimension = 1 << numQubits;

  for (let index = 0; index < dimension; index += 1) {
    const firstBit = (index & firstMask) !== 0;
    const secondBit = (index & secondMask) !== 0;
    if (firstBit || !secondBit) {
      continue;
    }
    const pairedIndex = index ^ firstMask ^ secondMask;
    next[index] = vector[pairedIndex];
    next[pairedIndex] = vector[index];
  }

  return next;
}

function applyControlledSwap(vector, numQubits, control, firstTarget, secondTarget) {
  const next = vector.map((amplitude) => complex(amplitude.real, amplitude.imag));
  const controlMask = 1 << control;
  const firstMask = 1 << firstTarget;
  const secondMask = 1 << secondTarget;
  const dimension = 1 << numQubits;

  for (let index = 0; index < dimension; index += 1) {
    const controlBit = (index & controlMask) !== 0;
    const firstBit = (index & firstMask) !== 0;
    const secondBit = (index & secondMask) !== 0;
    if (!controlBit || firstBit || !secondBit) {
      continue;
    }
    const pairedIndex = index ^ firstMask ^ secondMask;
    next[index] = vector[pairedIndex];
    next[pairedIndex] = vector[index];
  }

  return next;
}

function applyGateInstruction(vector, gate, numQubits) {
  if (["h", "x", "y", "z", "s", "sdg", "t", "rx", "ry", "rz"].includes(gate.type)) {
    return applySingleQubitMatrix(vector, numQubits, gate.target, singleQubitMatrix(gate));
  }
  if (gate.type === "cx") {
    return applyControlledX(vector, numQubits, gate.control, gate.target);
  }
  if (gate.type === "cz") {
    return applyControlledZ(vector, numQubits, gate.control, gate.target);
  }
  if (gate.type === "swap") {
    return applySwap(vector, numQubits, gate.target, gate.target2);
  }
  if (gate.type === "cswap") {
    return applyControlledSwap(vector, numQubits, gate.control, gate.target, gate.target2);
  }
  throw new Error(`Unsupported gate type: ${gate.type}.`);
}

function collapseInZBasis(vector, target, numQubits, preferredOutcome) {
  let probability = 0;
  vector.forEach((amplitude, index) => {
    const bit = (index >> target) & 1;
    if (String(bit) === preferredOutcome) {
      probability += complexMagnitudeSquared(amplitude);
    }
  });

  if (probability < 1e-9) {
    return vector.map((amplitude) => complex(amplitude.real, amplitude.imag));
  }

  const scale = Math.sqrt(probability);
  return vector.map((amplitude, index) => {
    const bit = (index >> target) & 1;
    return String(bit) === preferredOutcome ? complexScale(amplitude, 1 / scale) : complex(0);
  });
}

function rotateForMeasurement(vector, axis, target, numQubits) {
  if (axis === "X") {
    return applyGateInstruction(vector, { type: "h", target }, numQubits);
  }
  if (axis === "Y") {
    const afterSdg = applyGateInstruction(vector, { type: "sdg", target }, numQubits);
    return applyGateInstruction(afterSdg, { type: "h", target }, numQubits);
  }
  return vector.map((amplitude) => complex(amplitude.real, amplitude.imag));
}

function undoMeasurementRotation(vector, axis, target, numQubits) {
  if (axis === "X") {
    return applyGateInstruction(vector, { type: "h", target }, numQubits);
  }
  if (axis === "Y") {
    const afterH = applyGateInstruction(vector, { type: "h", target }, numQubits);
    return applyGateInstruction(afterH, { type: "s", target }, numQubits);
  }
  return vector.map((amplitude) => complex(amplitude.real, amplitude.imag));
}

function measureGate(vector, gate, numQubits) {
  const rotatedState = rotateForMeasurement(vector, gate.axis, gate.target, numQubits);
  const probabilities = [0, 0];

  rotatedState.forEach((amplitude, index) => {
    const bit = (index >> gate.target) & 1;
    probabilities[bit] += complexMagnitudeSquared(amplitude);
  });

  const outcome = probabilities[0] >= probabilities[1] ? "0" : "1";
  const collapsedRotated = collapseInZBasis(rotatedState, gate.target, numQubits, outcome);
  const postMeasurement = undoMeasurementRotation(collapsedRotated, gate.axis, gate.target, numQubits);

  return {
    statevector: postMeasurement,
    measurement: {
      axis: gate.axis,
      target: gate.target,
      probabilities: {
        0: roundForPayload(probabilities[0]),
        1: roundForPayload(probabilities[1]),
      },
      outcome,
      rule: "The app collapses to the more likely outcome. Exact ties resolve to 0.",
    },
  };
}

function summarizeQubitState(qubitState) {
  const redPercentage = Math.round(qubitState.zeroProbability * 100);
  const bluePercentage = Math.round(qubitState.oneProbability * 100);
  if (qubitState.entangled) {
    return `${redPercentage}% Red, ${bluePercentage}% Blue, entangled.`;
  }
  return `${redPercentage}% Red, ${bluePercentage}% Blue.`;
}

function singleQubitReport(vector, qubitIndex, numQubits) {
  const mask = 1 << qubitIndex;
  let zeroProbability = 0;
  let oneProbability = 0;
  let coherence = complex(0);

  for (let index = 0; index < 1 << numQubits; index += 1) {
    if ((index & mask) !== 0) {
      continue;
    }
    const zeroAmplitude = vector[index];
    const oneAmplitude = vector[index | mask];
    zeroProbability += complexMagnitudeSquared(zeroAmplitude);
    oneProbability += complexMagnitudeSquared(oneAmplitude);
    coherence = complexAdd(coherence, complexMultiply(zeroAmplitude, complexConjugate(oneAmplitude)));
  }

  const xAxis = 2 * coherence.real;
  const yAxis = -2 * coherence.imag;
  const zAxis = zeroProbability - oneProbability;
  const purity = zeroProbability * zeroProbability + oneProbability * oneProbability + 2 * complexMagnitudeSquared(coherence);
  const entangled = purity < 0.999999;
  const report = {
    index: qubitIndex,
    zeroProbability: roundForPayload(zeroProbability),
    oneProbability: roundForPayload(oneProbability),
    blochVector: entangled
      ? null
      : {
          x: roundForPayload(xAxis),
          y: roundForPayload(yAxis),
          z: roundForPayload(zAxis),
        },
    purity: roundForPayload(Math.min(1, Math.max(0, purity))),
    entangled,
    coherenceMagnitude: roundForPayload(complexMagnitude(coherence)),
    summary: "",
  };
  report.summary = summarizeQubitState(report);
  return report;
}

function snapshotPayload({ label, machineNote, statevector, numQubits, gate, measurement = null }) {
  const amplitudes = [];
  statevector.forEach((amplitude, index) => {
    const magnitude = complexMagnitude(amplitude);
    if (magnitude < 1e-9) {
      return;
    }
    amplitudes.push({
      basis: formatBasisLabel(index, numQubits),
      real: roundForPayload(amplitude.real),
      imag: roundForPayload(amplitude.imag),
      magnitude: roundForPayload(magnitude),
      phaseDegrees: roundForPayload((Math.atan2(amplitude.imag, amplitude.real) * 180) / Math.PI, 3),
    });
  });

  amplitudes.sort((left, right) => right.magnitude - left.magnitude || left.basis.localeCompare(right.basis));

  return {
    label,
    machineNote,
    gate,
    measurement,
    amplitudes,
    qubits: Array.from({ length: numQubits }, (_, qubitIndex) => singleQubitReport(statevector, qubitIndex, numQubits)),
  };
}

function describeGate(gate) {
  const definition = definitionForGate(gate.type);
  if (["x", "y", "z", "h", "s", "t"].includes(gate.type)) {
    return `${definition.label} acts on q${gate.target}.`;
  }
  if (["rx", "ry", "rz"].includes(gate.type)) {
    return `${definition.label} turns q${gate.target} by ${gate.angle} degrees.`;
  }
  if (gate.type === "cx" || gate.type === "cz") {
    return `${definition.label} uses q${gate.control} to influence q${gate.target}.`;
  }
  if (gate.type === "swap") {
    return `Swap exchanges q${gate.target} and q${gate.target2}.`;
  }
  if (gate.type === "cswap") {
    return `Controlled-Swap uses q${gate.control} to swap q${gate.target} and q${gate.target2}.`;
  }
  if (gate.type === "measure") {
    return `Measure reads q${gate.target} along the ${gate.axis}-axis and collapses it.`;
  }
  return definition.description;
}

function buildSimulation(payload) {
  const numQubits = payload.numQubits ?? 2;
  if (!Number.isInteger(numQubits) || numQubits < 1 || numQubits > state.config.maxQubits) {
    throw new Error(`numQubits must be an integer between 1 and ${state.config.maxQubits}.`);
  }

  const initialBits = payload.initialBits ?? Array.from({ length: numQubits }, () => 0);
  if (!Array.isArray(initialBits) || initialBits.length !== numQubits) {
    throw new Error("initialBits must be a list matching the number of qubits.");
  }

  const normalizedBits = initialBits.map((bit, index) => {
    if (bit !== 0 && bit !== 1) {
      throw new Error(`Initial bit q${index} must be 0 or 1.`);
    }
    return bit;
  });

  const rawGates = payload.gates ?? [];
  if (!Array.isArray(rawGates)) {
    throw new Error("gates must be a list.");
  }
  const gates = rawGates.map((gate) => validateSimulationGate(gate, numQubits));

  let initialIndex = 0;
  normalizedBits.forEach((bit, qubitIndex) => {
    if (bit === 1) {
      initialIndex |= 1 << qubitIndex;
    }
  });

  let statevector = Array.from({ length: 1 << numQubits }, (_, index) => (index === initialIndex ? complex(1) : complex(0)));
  const snapshots = [
    snapshotPayload({
      label: "Initial state",
      machineNote: "The qubits start here before entering the first machine block.",
      statevector,
      numQubits,
      gate: null,
    }),
  ];

  gates.forEach((gate, index) => {
    let measurement = null;
    if (gate.type === "measure") {
      const result = measureGate(statevector, gate, numQubits);
      statevector = result.statevector;
      measurement = result.measurement;
    } else {
      statevector = applyGateInstruction(statevector, gate, numQubits);
    }
    snapshots.push(
      snapshotPayload({
        label: `After step ${index + 1}`,
        machineNote: describeGate(gate),
        statevector,
        numQubits,
        gate,
        measurement,
      }),
    );
  });

  return {
    numQubits,
    initialBits: normalizedBits,
    gates,
    snapshots,
    bitOrder: "The displayed basis labels follow q0, q1, q2 ... from left to right.",
  };
}

function runSimulation() {
  stopAnimation();
  animateButtonElement.disabled = true;
  animateButtonElement.textContent = "Animate Circuit";
  statusMessageElement.textContent = "Running browser simulation...";
  try {
    const result = buildSimulation({
      numQubits: state.numQubits,
      initialBits: state.initialBits,
      gates: finalizedGates(),
    });
    state.result = result;
    state.selectedStep = Math.min(state.selectedStep, state.result.snapshots.length - 1);
    renderResult();
  } catch (error) {
    state.result = null;
    timelineElement.innerHTML = "";
    transitionElement.innerHTML = "";
    globalStateElement.innerHTML = "";
    spheresElement.innerHTML = "";
    statusMessageElement.textContent = error.message;
    updateAnimateButton();
  }
}

function presetBellPair() {
  state.numQubits = 2;
  state.initialBits = [0, 0];
  state.slots = Array.from({ length: MIN_SLOT_COUNT }, () => []);
  state.slots[0].push(createGate("h", 0, { target: 0 }, true));
  state.slots[1].push(createGate("cx", 0, { control: 0, target: 1 }, true));
  state.selectedStep = 0;
  state.activeEditorGateId = null;
  renderControls();
  renderWorkspace();
  runSimulation();
}

function loadConfig() {
  state.config = LOCAL_CONFIG;
  for (let qubits = 1; qubits <= state.config.maxQubits; qubits += 1) {
    const option = document.createElement("option");
    option.value = String(qubits);
    option.textContent = `${qubits}`;
    qubitCountElement.append(option);
  }
  qubitCountElement.value = String(state.numQubits);
  renderPalette();
  renderControls();
  renderWorkspace();
  runSimulation();
}

qubitCountElement.addEventListener("change", () => {
  state.numQubits = Number(qubitCountElement.value);
  syncQubitCount();
  renderControls();
  renderWorkspace();
  runSimulation();
});

dropzoneElement.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropzoneElement.classList.add("is-dragging");
});

dropzoneElement.addEventListener("dragleave", () => {
  dropzoneElement.classList.remove("is-dragging");
});

dropzoneElement.addEventListener("drop", (event) => {
  event.preventDefault();
  dropzoneElement.classList.remove("is-dragging");
});

animateButtonElement.addEventListener("click", () => {
  if (state.isAnimating) {
    stopAnimation();
    updateAnimateButton();
    return;
  }
  startAnimation();
});

document.querySelector("#clear-button").addEventListener("click", () => {
  state.slots = Array.from({ length: MIN_SLOT_COUNT }, () => []);
  state.selectedStep = 0;
  state.activeEditorGateId = null;
  renderWorkspace();
  runSimulation();
});
document.querySelector("#preset-button").addEventListener("click", presetBellPair);

updateAnimateButton();
loadConfig();
