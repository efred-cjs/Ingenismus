"""
API local que recibe mediciones del ESP32 y las guarda en Firebase Realtime
Database. El frontend consume esta API a traves del proxy de desarrollo de Vite.

Coloca serviceAccountKey.json en esta carpeta y configura FIREBASE_DATABASE_URL
si la base de datos no es la predeterminada.
"""

import os
from pathlib import Path

from flask import Flask, jsonify, request
import firebase_admin
from firebase_admin import credentials, db
from firebase_admin.exceptions import FirebaseError
from google.auth.exceptions import GoogleAuthError

FIREBASE_DATABASE_URL = os.environ.get(
    "FIREBASE_DATABASE_URL",
    "https://mediciones-9afdd-default-rtdb.firebaseio.com",
)
SERVICE_ACCOUNT_FILE = Path(
    os.environ.get(
        "FIREBASE_SERVICE_ACCOUNT_FILE",
        str(Path(__file__).with_name("serviceAccountKey.json")),
    )
)
HTTP_PORT = int(os.environ.get("HTTP_PORT", "5000"))
HTTP_HOST = "0.0.0.0"
MAX_MEDICIONES = 100

app = Flask(__name__)


def inicializar_firebase():
    """Inicializa Firebase Admin una sola vez."""
    if firebase_admin._apps:
        return

    if not SERVICE_ACCOUNT_FILE.is_file():
        raise FileNotFoundError(
            f"No se encontro la credencial de Firebase: {SERVICE_ACCOUNT_FILE}"
        )

    credencial = credentials.Certificate(str(SERVICE_ACCOUNT_FILE))
    firebase_admin.initialize_app(
        credencial, {"databaseURL": FIREBASE_DATABASE_URL}
    )


@app.get("/")
def estado():
    return jsonify({
        "estado": "activo",
        "base_datos": "Firebase Realtime Database",
        "endpoints": ["/mediciones"],
    })


@app.get("/mediciones")
def listar_mediciones():
    """Devuelve las mediciones mas recientes guardadas en Firebase."""
    limite_texto = request.args.get("limite", "20")
    try:
        limite = int(limite_texto)
    except ValueError:
        return jsonify({"error": "limite debe ser un entero"}), 400

    if not 1 <= limite <= MAX_MEDICIONES:
        return jsonify({
            "error": f"limite debe estar entre 1 y {MAX_MEDICIONES}"
        }), 400

    try:
        inicializar_firebase()
        registros = (
            db.reference("mediciones")
            .order_by_key()
            .limit_to_last(limite)
            .get()
            or {}
        )
        mediciones = [
            {"id": identificador, **registro}
            for identificador, registro in registros.items()
            if isinstance(registro, dict)
        ]
        mediciones.reverse()
        return jsonify({
            "firebase": "conectado",
            "mediciones": mediciones,
        })
    except (FirebaseError, FileNotFoundError, GoogleAuthError, ValueError):
        app.logger.exception("No se pudieron leer las mediciones de Firebase")
        return jsonify({
            "error": "No se pudieron leer las mediciones de Firebase"
        }), 503


@app.post("/mediciones")
def recibir_medicion():
    """Valida el JSON enviado por el ESP32 y lo guarda en Firebase."""
    datos = request.get_json(silent=True)
    if not isinstance(datos, dict):
        return jsonify({"error": "Se requiere un objeto JSON"}), 400

    campos = (
        "sensor_id", "aceleracion_x", "aceleracion_y", "aceleracion_z",
        "giroscopio_x", "giroscopio_y", "giroscopio_z",
    )
    if any(campo not in datos for campo in campos):
        return jsonify({"error": "Faltan campos", "requeridos": campos}), 400

    if any(type(datos[campo]) is not int for campo in campos):
        return jsonify({"error": "Todos los campos deben ser enteros"}), 400
    if datos["sensor_id"] not in (1, 2):
        return jsonify({"error": "sensor_id debe ser 1 o 2"}), 400

    try:
        inicializar_firebase()
        registro = {campo: datos[campo] for campo in campos}
        registro["fecha_servidor"] = {".sv": "timestamp"}
        nuevo_registro = db.reference("mediciones").push(registro)

        return jsonify({
            "guardado": True,
            "id": nuevo_registro.key,
            "base_datos": "Firebase Realtime Database",
        }), 201
    except (FirebaseError, FileNotFoundError, GoogleAuthError, ValueError):
        app.logger.exception("No se pudo guardar la medicion en Firebase")
        return jsonify({
            "error": "No se pudo guardar la medicion en Firebase"
        }), 503


if __name__ == "__main__":
    inicializar_firebase()
    app.run(host=HTTP_HOST, port=HTTP_PORT, debug=False)
