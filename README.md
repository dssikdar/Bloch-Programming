# Quantum Blocks Lab

Quantum Blocks Lab is an interactive teaching app for building and visualizing small quantum circuits. It presents gates as draggable blocks, runs the circuit step by step, and explains each qubit through probabilities, basis-state amplitudes, and simple Bloch-sphere visuals.

The main app is a static browser app, so it can run from `static/index.html` or be deployed directly to GitHub Pages. A Python/Qiskit server is also included for local comparison and API-based simulation experiments.

## Key Lab Features

- Block-programming circuit builder with click-to-add and drag-and-drop gate placement
- Configurable input register with 1 to 5 qubits
- Gate palette for Hadamard, Pauli X/Y/Z, S, T, RX/RY/RZ, CX, CZ, Swap, Controlled-Swap, and measurement
- Per-gate editors for target qubits, control qubits, rotation angles, and measurement axes
- Conflict checks so multi-qubit gates do not overlap invalidly inside the same circuit column
- Built-in Bell-state demo using `H` on `q0` followed by `CX q0 -> q1`
- Step timeline showing the initial state and every active gate result
- Animated circuit playback through each state snapshot
- Top basis-state display with probability bars, complex amplitudes, and phase angles
- Per-qubit probability summaries using red for `|0>` and blue for `|1>`
- Canvas Bloch-sphere cards for local single-qubit vectors
- Entanglement detection through reduced-state purity; entangled qubits hide the local Bloch vector
- Measurement along X, Y, or Z axes with deterministic collapse to the more likely outcome
- Static GitHub Pages deployment workflow

## Repository Structure

```text
.
├── app.py
├── requirements.txt
├── static/
│   ├── index.html
│   ├── app.js
│   └── styles.css
└── .github/
    └── workflows/
        └── pages.yml
```

### `static/index.html`

Defines the app shell: the header, qubit controls, block palette, circuit workspace, timeline, story panel, global state panel, and Bloch-sphere card templates.

### `static/app.js`

Contains the current production simulator and UI behavior. It manages app state, gate configuration, drag-and-drop placement, validation, timeline rendering, animation, complex-number math, statevector evolution, measurement collapse, amplitude reporting, and single-qubit reduced-state summaries.

### `static/styles.css`

Styles the lab interface, including the responsive page layout, gate palette categories, circuit slots, gate editor, story timeline, amplitude bars, and Bloch-sphere cards.

### `app.py`

Provides an optional local Python server on `127.0.0.1:8000`. It serves the static app and exposes:

- `GET /api/config` for gate metadata and max-qubit configuration
- `POST /api/simulate` for Qiskit-backed statevector simulation

The static app does not depend on this server for normal GitHub Pages use.

### `requirements.txt`

Lists the Python dependency needed by the optional backend:

```text
qiskit>=2.3,<3
```

### `.github/workflows/pages.yml`

Deploys the `static/` directory to GitHub Pages whenever changes are pushed to `main` or `master`, or when the workflow is run manually.

## Run the Static App Locally

The simplest path is to open:

```text
static/index.html
```

You can also serve the static folder from the repo root:

```bash
python3 -m http.server 8000 --directory static
```

Then open:

[http://127.0.0.1:8000](http://127.0.0.1:8000)

## Run the Optional Python/Qiskit Server

Use this mode when you want to compare the browser simulator with the Python implementation or call the local API routes.

1. Create and activate a virtual environment:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

2. Install dependencies:

```bash
python3 -m pip install -r requirements.txt
```

3. Start the server:

```bash
python3 app.py
```

4. Open:

[http://127.0.0.1:8000](http://127.0.0.1:8000)

## API Usage

When `app.py` is running, fetch the gate configuration:

```bash
curl -s http://127.0.0.1:8000/api/config
```

Run a Bell-state simulation:

```bash
curl -s -X POST http://127.0.0.1:8000/api/simulate \
  -H "Content-Type: application/json" \
  -d '{
    "numQubits": 2,
    "initialBits": [0, 0],
    "gates": [
      { "type": "h", "target": 0 },
      { "type": "cx", "control": 0, "target": 1 }
    ]
  }'
```

The response includes normalized gates, simulation snapshots, per-qubit reports, nonzero amplitudes, phase angles, and measurement details when applicable.

## Deploy to GitHub Pages

1. Push this project to a GitHub repository.
2. In the repository settings, open **Pages**.
3. Set **Source** to **GitHub Actions**.
4. Push to `main` or `master`, or manually run **Deploy static lab to GitHub Pages**.

The workflow publishes only the `static/` directory.

## Simulation Notes

- The lab supports up to 5 qubits to keep the statevector small and the interface readable.
- Displayed basis labels use app order: `q0`, `q1`, `q2`, and so on from left to right.
- The browser simulator and Python server both use little-endian qubit indexing internally while formatting labels for the app's visible qubit order.
- Measurement is intentionally deterministic for teaching: the app collapses to the more likely outcome, and exact ties resolve to `0`.
- A Bloch vector is shown only when the single-qubit reduced state is pure enough to be represented locally. For entangled qubits, the card reports the probabilities and purity while hiding the local vector.
