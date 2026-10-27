"""
Servidor HTTP local para recibir mediciones del ESP32 por Wi-Fi y guardarlas
en Firebase Realtime Database.

1. Coloca serviceAccountKey.json junto a este archivo.
2. Sustituye FIREBASE_DATABASE_URL por la URL real de Realtime Database.
3. Instala dependencias: py -m pip install flask firebase-admin
"""

from pathlib import Path

from flask import Flask, request, jsonify
import firebase_admin
from firebase_admin import credentials, db

FIREBASE_DATABASE_URL = "https://mediciones-9afdd-default-rtdb.firebaseio.com"
SERVICE_ACCOUNT_FILE = Path(__file__).with_name("serviceAccountKey.json")
HTTP_PORT = 5000
HTTP_HOST = "0.0.0.0"

app = Flask(__name__)


def inicializar_firebase():
    """Inicializa Firebase Admin una sola vez."""
    if firebase_admin._apps:
        return

    if FIREBASE_DATABASE_URL == "PEGA_AQUI_TU_URL_REAL":
        raise RuntimeError(
            "Configura FIREBASE_DATABASE_URL con la URL real de Firebase."
        )
    if not SERVICE_ACCOUNT_FILE.is_file():
        raise FileNotFoundError(
            "No se encontró serviceAccountKey.json junto a este archivo."
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
        "endpoint": "/mediciones",
    })


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
        referencia = db.reference("mediciones")
        registro = {
            campo: datos[campo] for campo in campos
        }
        # Firebase reemplaza este valor por la hora del servidor en milisegundos.
        registro["fecha_servidor"] = {".sv": "timestamp"}
        nuevo_registro = referencia.push(registro)

        return jsonify({
            "guardado": True,
            "id": nuevo_registro.key,
            "base_datos": "Firebase Realtime Database",
        }), 201
    except Exception:
        app.logger.exception("No se pudo guardar la medición en Firebase")
        return jsonify({
            "error": "No se pudo guardar la medición en Firebase"
        }), 500


if __name__ == "__main__":
    inicializar_firebase()
    app.run(host=HTTP_HOST, port=HTTP_PORT, debug=False)
