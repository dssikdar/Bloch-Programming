# Quantum Blocks Lab

Quantum Blocks Lab is an interactive teaching app for building and visualizing small quantum circuits. It presents gates as draggable blocks, runs the circuit step by step, and explains each qubit through probabilities, basis-state amplitudes, and simple Bloch-sphere visuals.

The browser UI sends circuits to a Python/Qiskit backend at `POST /api/simulate`, then renders the Qiskit-backed Quantum Story results. For local use, run `python3 app.py` and open `http://127.0.0.1:8000`. For GitHub Pages, deploy the Python backend separately and set `window.QUANTUM_BLOCKS_CONFIG.qiskitApiOrigin` to that HTTPS backend.

## Key Lab Features

- Block-programming circuit builder with click-to-add and drag-and-drop gate placement
- Configurable input register with 1 to 8 qubits
- Gate palette for Hadamard, Pauli X/Y/Z, S, T, RX/RY/RZ, CX, CZ, Swap, Controlled-Swap, and measurement
- Per-gate editors for target qubits, control qubits, rotation angles, and measurement axes
- Conflict checks so multi-qubit gates do not overlap invalidly inside the same circuit column
- Built-in Bell-state demo using `H` on `q0` followed by `CX q0 -> q1`
- Step timeline showing the initial state and every applied gate result
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
├── render.yaml
├── runtime.txt
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

Contains the UI behavior. It manages app state, gate configuration, drag-and-drop placement, validation, timeline rendering, animation, and practice checks while requesting Quantum Story results from the Qiskit backend.

### `static/styles.css`

Styles the lab interface, including the responsive page layout, gate palette categories, circuit slots, gate editor, story timeline, amplitude bars, and Bloch-sphere cards.

### `app.py`

Provides the Python/Qiskit backend. Locally it runs on `127.0.0.1:8000`; in production it reads `HOST` and `PORT` from environment variables. It serves the app and exposes:

- `GET /api/config` for gate metadata and max-qubit configuration
- `POST /api/simulate` for Qiskit-backed statevector simulation

### `requirements.txt`

Lists the Python dependency needed by the optional backend:

```text
qiskit>=2.3,<3
```

### `.github/workflows/pages.yml`

Deploys the `static/` directory to GitHub Pages whenever changes are pushed to `main` or `master`, or when the workflow is run manually.

## Run the Python/Qiskit App

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

1. Deploy the Python backend as a web service. `render.yaml` is included for Render and starts `python app.py` with `HOST=0.0.0.0`.
2. Copy the deployed HTTPS backend origin, for example `https://quantum-blocks-qiskit-api.onrender.com`.
3. In the GitHub repository settings, create an Actions repository variable named `QISKIT_API_ORIGIN` and set it to that backend origin.
4. Push to `main` or `master`, or manually run **Deploy static lab to GitHub Pages**.

The workflow injects `QISKIT_API_ORIGIN` into `static/index.html` before publishing. For a quick one-off test, you can also open the site with an `api` query parameter:

```text
https://your-github-pages-site/?api=https://your-qiskit-backend.example.com
```

For local development, leave `qiskitApiOrigin` as the placeholder and open the app through `python3 app.py`; the browser will use the local server automatically.

If you deploy without setting `QISKIT_API_ORIGIN`, `static/index.html` will keep this placeholder:

```html
<script>
  window.QUANTUM_BLOCKS_CONFIG = {
    qiskitApiOrigin: "__QISKIT_API_ORIGIN__",
  };
</script>
```

The workflow copies `static/` to `dist/`, injects the API origin, and publishes `dist/`.

## Simulation Notes

- The lab supports up to 8 qubits to keep the statevector small enough for classroom use.
- Displayed basis labels use app order: `q0`, `q1`, `q2`, and so on from left to right.
- Qiskit uses little-endian qubit indexing internally while the app formats labels in visible `q0`, `q1`, `q2` order.
- Measurement is intentionally deterministic for teaching: the app collapses to the more likely outcome, and exact ties resolve to `0`.
- A Bloch vector is shown only when the single-qubit reduced state is pure enough to be represented locally. For entangled qubits, the card reports the probabilities and purity while hiding the local vector.
