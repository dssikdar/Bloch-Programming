# Quantum Blocks Lab

Quantum Blocks Lab is a static teaching app that turns quantum circuit building into a block-programming experience. The UI is designed to feel closer to Scratch or Lego logic blocks than a conventional circuit editor, and the simulator now runs directly in the browser so it can be hosted on GitHub Pages.

## What it does

- Lets learners build circuits by dragging machine blocks into a workspace
- Shows how each gate changes the system from input state to output state
- Uses red for `|0>`, blue for `|1>`, and blended sphere surfaces for superposition
- Hides the local Bloch vector when a qubit becomes entangled
- Runs quantum-state calculations in browser-side JavaScript for up to 5 qubits

## Run locally as a static app

Open `static/index.html` in a browser. No Python server is required for the GitHub Pages version.

You can also serve the static folder from this directory:

```bash
python3 -m http.server 8000 --directory static
```

Then open [http://127.0.0.1:8000](http://127.0.0.1:8000).

## Deploy to GitHub Pages

1. Push this folder to a GitHub repository.
2. In the repository settings, open **Pages**.
3. Set **Source** to **GitHub Actions**.
4. Push to `main` or run the **Deploy static lab to GitHub Pages** workflow manually.

The workflow publishes the `static/` directory as the public site.

## Legacy Python server

The original Python/Qiskit server is still available for local comparison:

```bash
python3 app.py
```

## Notes

- The simulator currently supports up to 5 qubits to keep the UI readable.
- Basis-state labels are shown in app order: `q0`, `q1`, `q2`, from left to right.
- The static frontend is the version intended for GitHub Pages.
