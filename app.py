from __future__ import annotations

import json
import math
import mimetypes
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from qiskit import QuantumCircuit
from qiskit.quantum_info import Statevector, partial_trace


ROOT_DIR = Path(__file__).resolve().parent
STATIC_DIR = ROOT_DIR / "static"
HOST = "127.0.0.1"
PORT = 8000
MAX_QUBITS = 5
AMPLITUDE_EPSILON = 1e-9

GATE_LIBRARY = [
    {
        "id": "h",
        "label": "Hadamard",
        "category": "Superposition",
        "description": "Turns a qubit with a definitive state into a superposition of red |0> and blue |1>.",
        "fields": [{"key": "target", "label": "Target", "kind": "qubit"}],
    },
    {
        "id": "x",
        "label": "Pauli-X",
        "category": "Single-Qubit",
        "description": "Rotates around the X axis, flipping red |0> to blue |1> and blue |1> to red |0>.",
        "fields": [{"key": "target", "label": "Target", "kind": "qubit"}],
    },
    {
        "id": "y",
        "label": "Pauli-Y",
        "category": "Single-Qubit",
        "description": "Rotates around the Y axis with a phase twist.",
        "fields": [{"key": "target", "label": "Target", "kind": "qubit"}],
    },
    {
        "id": "z",
        "label": "Pauli-Z",
        "category": "Single-Qubit",
        "description": "Rotates around the Z axis, changing the phase of the blue |1> component.",
        "fields": [{"key": "target", "label": "Target", "kind": "qubit"}],
    },
    {
        "id": "s",
        "label": "Phase-S",
        "category": "Phase",
        "description": "Adds a quarter-turn phase to the blue |1> part.",
        "fields": [{"key": "target", "label": "Target", "kind": "qubit"}],
    },
    {
        "id": "t",
        "label": "Phase-T",
        "category": "Phase",
        "description": "Adds an eighth-turn phase to the blue |1> part.",
        "fields": [{"key": "target", "label": "Target", "kind": "qubit"}],
    },
    {
        "id": "rx",
        "label": "Rotate-X",
        "category": "Rotation",
        "description": "Turns the quantum state vector around the X axis.",
        "fields": [
            {"key": "target", "label": "Target", "kind": "qubit"},
            {"key": "angle", "label": "Angle", "kind": "angle", "default": 90},
        ],
    },
    {
        "id": "ry",
        "label": "Rotate-Y",
        "category": "Rotation",
        "description": "Turns the quantum state vector around the Y axis.",
        "fields": [
            {"key": "target", "label": "Target", "kind": "qubit"},
            {"key": "angle", "label": "Angle", "kind": "angle", "default": 90},
        ],
    },
    {
        "id": "rz",
        "label": "Rotate-Z",
        "category": "Rotation",
        "description": "Turns the quantum state vector around the Z axis.",
        "fields": [
            {"key": "target", "label": "Target", "kind": "qubit"},
            {"key": "angle", "label": "Angle", "kind": "angle", "default": 90},
        ],
    },
    {
        "id": "cx",
        "label": "Controlled-X",
        "category": "Entangling",
        "description": "Flips the target only when the control is |1>.",
        "fields": [
            {"key": "control", "label": "Control", "kind": "qubit"},
            {"key": "target", "label": "Target", "kind": "qubit"},
        ],
    },
    {
        "id": "cz",
        "label": "Controlled-Z",
        "category": "Entangling",
        "description": "Adds phase when both qubits are |1>.",
        "fields": [
            {"key": "control", "label": "Control", "kind": "qubit"},
            {"key": "target", "label": "Target", "kind": "qubit"},
        ],
    },
    {
        "id": "swap",
        "label": "Swap",
        "category": "Two-Qubit",
        "description": "Exchanges the states of two qubits.",
        "fields": [
            {"key": "target", "label": "Qubit A", "kind": "qubit"},
            {"key": "target2", "label": "Qubit B", "kind": "qubit"},
        ],
    },
    {
        "id": "cswap",
        "label": "Controlled-Swap",
        "category": "Entangling",
        "description": "Swaps two target qubits only when the control qubit is |1>.",
        "fields": [
            {"key": "control", "label": "Control", "kind": "qubit"},
            {"key": "target", "label": "Target A", "kind": "qubit"},
            {"key": "target2", "label": "Target B", "kind": "qubit"},
        ],
    },
    {
        "id": "measure",
        "label": "Measure",
        "category": "Measurement",
        "description": "Measures a qubit along the chosen axis and collapses it to an outcome.",
        "fields": [
            {"key": "target", "label": "Target", "kind": "qubit"},
            {"key": "axis", "label": "Axis", "kind": "choice", "default": "Z", "options": ["X", "Y", "Z"]},
        ],
    },
]

GATE_BY_ID = {gate["id"]: gate for gate in GATE_LIBRARY}


def angle_to_radians(angle_degrees: float) -> float:
    return angle_degrees * math.pi / 180.0


def validate_qubit(index: Any, num_qubits: int, label: str) -> int:
    if not isinstance(index, int):
        raise ValueError(f"{label} must be an integer.")
    if not 0 <= index < num_qubits:
        raise ValueError(f"{label} must be between 0 and {num_qubits - 1}.")
    return index


def validate_gate(gate: dict[str, Any], num_qubits: int) -> dict[str, Any]:
    gate_type = gate.get("type")
    if gate_type not in GATE_BY_ID:
        raise ValueError(f"Unsupported gate type: {gate_type}.")

    normalized: dict[str, Any] = {"type": gate_type}
    definition = GATE_BY_ID[gate_type]

    for field in definition["fields"]:
        key = field["key"]
        value = gate.get(key, field.get("default"))
        if field["kind"] == "qubit":
            normalized[key] = validate_qubit(value, num_qubits, key)
        elif field["kind"] == "angle":
            if not isinstance(value, (int, float)):
                raise ValueError(f"{key} must be numeric.")
            normalized[key] = float(value)
        elif field["kind"] == "choice":
            if value not in field["options"]:
                raise ValueError(f"{key} must be one of {', '.join(field['options'])}.")
            normalized[key] = value

    if gate_type in {"cx", "cz"} and normalized["control"] == normalized["target"]:
        raise ValueError("Control and target must be different qubits.")

    if gate_type == "swap" and normalized["target"] == normalized["target2"]:
        raise ValueError("Swap needs two different qubits.")
    if gate_type == "cswap" and len({normalized["control"], normalized["target"], normalized["target2"]}) < 3:
        raise ValueError("Controlled-Swap needs three different qubits.")

    return normalized


def apply_gate_instruction(circuit: QuantumCircuit, gate: dict[str, Any]) -> None:
    gate_type = gate["type"]
    if gate_type == "h":
        circuit.h(gate["target"])
    elif gate_type == "x":
        circuit.x(gate["target"])
    elif gate_type == "y":
        circuit.y(gate["target"])
    elif gate_type == "z":
        circuit.z(gate["target"])
    elif gate_type == "s":
        circuit.s(gate["target"])
    elif gate_type == "t":
        circuit.t(gate["target"])
    elif gate_type == "rx":
        circuit.rx(angle_to_radians(gate["angle"]), gate["target"])
    elif gate_type == "ry":
        circuit.ry(angle_to_radians(gate["angle"]), gate["target"])
    elif gate_type == "rz":
        circuit.rz(angle_to_radians(gate["angle"]), gate["target"])
    elif gate_type == "cx":
        circuit.cx(gate["control"], gate["target"])
    elif gate_type == "cz":
        circuit.cz(gate["control"], gate["target"])
    elif gate_type == "swap":
        circuit.swap(gate["target"], gate["target2"])
    elif gate_type == "cswap":
        circuit.cswap(gate["control"], gate["target"], gate["target2"])


def evolve_statevector(statevector: Statevector, gate: dict[str, Any], num_qubits: int) -> Statevector:
    circuit = QuantumCircuit(num_qubits)
    apply_gate_instruction(circuit, gate)
    return statevector.evolve(circuit)


def measurement_basis_rotation(axis: str, target: int, num_qubits: int) -> QuantumCircuit:
    circuit = QuantumCircuit(num_qubits)
    if axis == "X":
        circuit.h(target)
    elif axis == "Y":
        circuit.sdg(target)
        circuit.h(target)
    return circuit


def collapse_in_z_basis(
    statevector: Statevector,
    *,
    target: int,
    num_qubits: int,
    preferred_outcome: str,
) -> Statevector:
    amplitudes = list(statevector.data)
    probability = 0.0

    for index, amplitude in enumerate(amplitudes):
        bit = format_basis_label(index, num_qubits)[target]
        if bit == preferred_outcome:
            probability += abs(amplitude) ** 2

    if probability < AMPLITUDE_EPSILON:
        return statevector

    scale = math.sqrt(probability)
    collapsed = []
    for index, amplitude in enumerate(amplitudes):
        bit = format_basis_label(index, num_qubits)[target]
        if bit == preferred_outcome:
            collapsed.append(amplitude / scale)
        else:
            collapsed.append(0j)

    return Statevector(collapsed)


def measure_gate(
    statevector: Statevector,
    gate: dict[str, Any],
    num_qubits: int,
) -> tuple[Statevector, dict[str, Any]]:
    axis = gate["axis"]
    target = gate["target"]
    rotation = measurement_basis_rotation(axis, target, num_qubits)
    rotated_state = statevector.evolve(rotation)

    probabilities = [0.0, 0.0]
    for index, amplitude in enumerate(rotated_state.data):
        bit = format_basis_label(index, num_qubits)[target]
        probabilities[int(bit)] += abs(amplitude) ** 2

    outcome = "0" if probabilities[0] >= probabilities[1] else "1"
    collapsed_rotated = collapse_in_z_basis(
        rotated_state,
        target=target,
        num_qubits=num_qubits,
        preferred_outcome=outcome,
    )
    post_measurement = collapsed_rotated.evolve(rotation.inverse())

    return post_measurement, {
        "axis": axis,
        "target": target,
        "probabilities": {
            "0": round(float(probabilities[0]), 6),
            "1": round(float(probabilities[1]), 6),
        },
        "outcome": outcome,
        "rule": "The app collapses to the more likely outcome. Exact ties resolve to 0.",
    }


def format_basis_label(index: int, num_qubits: int) -> str:
    canonical = format(index, f"0{num_qubits}b")
    return canonical[::-1]


def summarize_qubit_state(qubit_state: dict[str, Any]) -> str:
    red_percentage = round(qubit_state["zeroProbability"] * 100)
    blue_percentage = round(qubit_state["oneProbability"] * 100)
    if qubit_state["entangled"]:
        return f"{red_percentage}% Red, {blue_percentage}% Blue, entangled."
    return f"{red_percentage}% Red, {blue_percentage}% Blue."


def single_qubit_report(statevector: Statevector, qubit_index: int, num_qubits: int) -> dict[str, Any]:
    traced_out = [index for index in range(num_qubits) if index != qubit_index]
    density = partial_trace(statevector, traced_out)
    rho = density.data

    zero_prob = float(rho[0][0].real)
    one_prob = float(rho[1][1].real)
    coherence = rho[0][1]
    x_axis = float(2.0 * coherence.real)
    y_axis = float(-2.0 * coherence.imag)
    z_axis = float(zero_prob - one_prob)
    purity = float(
        (
            rho[0][0] * rho[0][0]
            + rho[0][1] * rho[1][0]
            + rho[1][0] * rho[0][1]
            + rho[1][1] * rho[1][1]
        ).real
    )
    entangled = purity < 0.999999

    report = {
        "index": qubit_index,
        "zeroProbability": round(zero_prob, 6),
        "oneProbability": round(one_prob, 6),
        "blochVector": None
        if entangled
        else {
            "x": round(x_axis, 6),
            "y": round(y_axis, 6),
            "z": round(z_axis, 6),
        },
        "purity": round(purity, 6),
        "entangled": entangled,
        "coherenceMagnitude": round(float(abs(coherence)), 6),
        "summary": "",
    }
    report["summary"] = summarize_qubit_state(report)
    return report


def snapshot_payload(
    *,
    label: str,
    machine_note: str,
    statevector: Statevector,
    num_qubits: int,
    gate: dict[str, Any] | None,
    measurement: dict[str, Any] | None = None,
) -> dict[str, Any]:
    amplitudes = []
    for index, complex_amplitude in enumerate(statevector.data):
        magnitude = abs(complex_amplitude)
        if magnitude < AMPLITUDE_EPSILON:
            continue
        amplitudes.append(
            {
                "basis": format_basis_label(index, num_qubits),
                "real": round(float(complex_amplitude.real), 6),
                "imag": round(float(complex_amplitude.imag), 6),
                "magnitude": round(float(magnitude), 6),
                "phaseDegrees": round(math.degrees(math.atan2(complex_amplitude.imag, complex_amplitude.real)), 3),
            }
        )

    amplitudes.sort(key=lambda item: (-item["magnitude"], item["basis"]))
    qubits = [single_qubit_report(statevector, qubit_index, num_qubits) for qubit_index in range(num_qubits)]

    return {
        "label": label,
        "machineNote": machine_note,
        "gate": gate,
        "measurement": measurement,
        "amplitudes": amplitudes,
        "qubits": qubits,
    }


def describe_gate(gate: dict[str, Any]) -> str:
    gate_type = gate["type"]
    if gate_type in {"x", "y", "z", "h", "s", "t"}:
        return f"{GATE_BY_ID[gate_type]['label']} acts on q{gate['target']}."
    if gate_type in {"rx", "ry", "rz"}:
        return f"{GATE_BY_ID[gate_type]['label']} turns q{gate['target']} by {gate['angle']} degrees."
    if gate_type in {"cx", "cz"}:
        return f"{GATE_BY_ID[gate_type]['label']} uses q{gate['control']} to influence q{gate['target']}."
    if gate_type == "swap":
        return f"Swap exchanges q{gate['target']} and q{gate['target2']}."
    if gate_type == "cswap":
        return f"Controlled-Swap uses q{gate['control']} to swap q{gate['target']} and q{gate['target2']}."
    if gate_type == "measure":
        return f"Measure reads q{gate['target']} along the {gate['axis']}-axis and collapses it."
    return GATE_BY_ID[gate_type]["description"]


def build_simulation(payload: dict[str, Any]) -> dict[str, Any]:
    num_qubits = payload.get("numQubits", 2)
    if not isinstance(num_qubits, int) or not 1 <= num_qubits <= MAX_QUBITS:
        raise ValueError(f"numQubits must be an integer between 1 and {MAX_QUBITS}.")

    initial_bits = payload.get("initialBits", [0] * num_qubits)
    if not isinstance(initial_bits, list) or len(initial_bits) != num_qubits:
        raise ValueError("initialBits must be a list matching the number of qubits.")

    normalized_bits: list[int] = []
    for index, bit in enumerate(initial_bits):
        if bit not in (0, 1):
            raise ValueError(f"Initial bit q{index} must be 0 or 1.")
        normalized_bits.append(int(bit))

    raw_gates = payload.get("gates", [])
    if not isinstance(raw_gates, list):
        raise ValueError("gates must be a list.")

    gates = [validate_gate(gate, num_qubits) for gate in raw_gates]
    circuit = QuantumCircuit(num_qubits)
    for qubit_index, bit in enumerate(normalized_bits):
        if bit == 1:
            circuit.x(qubit_index)
    statevector = Statevector.from_instruction(circuit)

    snapshots = [
        snapshot_payload(
            label="Initial state",
            machine_note="The qubits start here before entering the first machine block.",
            statevector=statevector,
            num_qubits=num_qubits,
            gate=None,
        )
    ]

    for step_index, gate in enumerate(gates, start=1):
        measurement = None
        if gate["type"] == "measure":
            statevector, measurement = measure_gate(statevector, gate, num_qubits)
        else:
            statevector = evolve_statevector(statevector, gate, num_qubits)
        snapshots.append(
            snapshot_payload(
                label=f"After step {step_index}",
                machine_note=describe_gate(gate),
                statevector=statevector,
                num_qubits=num_qubits,
                gate=gate,
                measurement=measurement,
            )
        )

    return {
        "numQubits": num_qubits,
        "initialBits": normalized_bits,
        "gates": gates,
        "snapshots": snapshots,
        "bitOrder": "The displayed basis labels follow q0, q1, q2 ... from left to right.",
    }


class QuantumBlocksHandler(BaseHTTPRequestHandler):
    server_version = "QuantumBlocks/1.0"

    def do_GET(self) -> None:
        self.handle_request(include_body=True)

    def do_HEAD(self) -> None:
        self.handle_request(include_body=False)

    def handle_request(self, *, include_body: bool) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/api/config":
            self.send_json(
                {
                    "maxQubits": MAX_QUBITS,
                    "host": HOST,
                    "port": PORT,
                    "gates": GATE_LIBRARY,
                },
                include_body=include_body,
            )
            return

        if parsed.path.startswith("/api/"):
            self.send_error(HTTPStatus.NOT_FOUND, "Unknown API route.")
            return

        self.serve_static(parsed.path, include_body=include_body)

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path != "/api/simulate":
            self.send_error(HTTPStatus.NOT_FOUND, "Unknown API route.")
            return

        length_header = self.headers.get("Content-Length")
        if not length_header:
            self.send_error(HTTPStatus.BAD_REQUEST, "Missing Content-Length header.")
            return

        try:
            body = self.rfile.read(int(length_header))
            payload = json.loads(body.decode("utf-8"))
            result = build_simulation(payload)
        except ValueError as error:
            self.send_json({"error": str(error)}, status=HTTPStatus.BAD_REQUEST)
            return
        except json.JSONDecodeError:
            self.send_json({"error": "Request body must be valid JSON."}, status=HTTPStatus.BAD_REQUEST)
            return

        self.send_json(result)

    def serve_static(self, request_path: str, *, include_body: bool) -> None:
        relative = request_path.lstrip("/") or "index.html"
        file_path = (STATIC_DIR / relative).resolve()

        try:
            file_path.relative_to(STATIC_DIR.resolve())
        except ValueError:
            self.send_error(HTTPStatus.FORBIDDEN, "Invalid path.")
            return

        if file_path.is_dir():
            file_path = file_path / "index.html"

        if not file_path.exists():
            file_path = STATIC_DIR / "index.html"

        mime_type, _ = mimetypes.guess_type(str(file_path))
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", mime_type or "application/octet-stream")
        payload = file_path.read_bytes()
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        if include_body:
            self.wfile.write(payload)

    def send_json(
        self,
        payload: dict[str, Any],
        status: HTTPStatus = HTTPStatus.OK,
        *,
        include_body: bool = True,
    ) -> None:
        data = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        if include_body:
            self.wfile.write(data)

    def log_message(self, format_string: str, *args: Any) -> None:
        return


def run() -> None:
    server = ThreadingHTTPServer((HOST, PORT), QuantumBlocksHandler)
    print(f"Quantum Blocks is running at http://{HOST}:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    run()
