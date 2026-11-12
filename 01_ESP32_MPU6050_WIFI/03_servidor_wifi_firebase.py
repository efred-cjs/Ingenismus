
"""
Servidor HTTP local para recibir mediciones del ESP32 por Wi-Fi
y almacenarlas en Firebase Realtime Database.

Requisitos:
1. serviceAccountKey.json debe estar en la carpeta principal.
2. Configurar la URL de Firebase.
3. Instalar dependencias:

   py -m pip install flask firebase-admin
"""

from pathlib import Path

from flask import Flask, request, jsonify

import firebase_admin
from firebase_admin import credentials, db


# =====================================
# CONFIGURACIÓN FIREBASE
# =====================================

FIREBASE_DATABASE_URL = (
    "https://mediciones-9afdd-default-rtdb.firebaseio.com"
)

# Buscar las credenciales en la carpeta principal del proyecto.
# Este archivo Python está dentro de 01_ESP32_MPU6050_WIFI.

SERVICE_ACCOUNT_FILE = Path(__file__).with_name("serviceAccountKey.json")

# =====================================
# CONFIGURACIÓN DEL SERVIDOR
# =====================================

HTTP_PORT = 5000

HTTP_HOST = "0.0.0.0"

app = Flask(__name__)


# =====================================
# INICIALIZAR FIREBASE
# =====================================

def inicializar_firebase():
    """
    Inicializa Firebase Admin SDK una sola vez.
    """

    if firebase_admin._apps:
        return

    # Comprobar existencia de credenciales.

    if not SERVICE_ACCOUNT_FILE.is_file():

        raise FileNotFoundError(
            f"No se encontró el archivo de credenciales: "
            f"{SERVICE_ACCOUNT_FILE}"
        )

    # Cargar credenciales.

    credencial = credentials.Certificate(
        str(SERVICE_ACCOUNT_FILE)
    )

    # Inicializar Firebase.

    firebase_admin.initialize_app(
        credencial,
        {
            "databaseURL": FIREBASE_DATABASE_URL
        }
    )

    print("Firebase conectado correctamente.")


# =====================================
# RUTA PRINCIPAL
# =====================================

@app.get("/")
def estado():

    return jsonify({

        "estado": "activo",

        "base_datos": "Firebase Realtime Database",

        "endpoint": "/mediciones"

    })


# =====================================
# RECIBIR MEDICIONES
# =====================================

@app.post("/mediciones")
def recibir_medicion():

    """
    Recibe, valida y almacena las mediciones
    provenientes de los sensores MPU6050.
    """

    datos = request.get_json(silent=True)

    # Comprobar que se recibió un JSON válido.

    if not isinstance(datos, dict):

        return jsonify({

            "error": "Se requiere un objeto JSON"

        }), 400


    # Campos requeridos.

    campos = (

        "sensor_id",

        "aceleracion_x",
        "aceleracion_y",
        "aceleracion_z",

        "giroscopio_x",
        "giroscopio_y",
        "giroscopio_z"

    )


    # =====================================
    # VALIDAR CAMPOS
    # =====================================

    if any(campo not in datos for campo in campos):

        return jsonify({

            "error": "Faltan campos requeridos",

            "requeridos": campos

        }), 400


    # =====================================
    # VALIDAR TIPOS DE DATOS
    # =====================================

    if any(type(datos[campo]) is not int for campo in campos):

        return jsonify({

            "error": "Todos los campos deben ser enteros"

        }), 400


    # =====================================
    # VALIDAR IDENTIFICADOR DEL SENSOR
    # =====================================

    if datos["sensor_id"] not in (1, 2):

        return jsonify({

            "error": "sensor_id debe ser 1 o 2"

        }), 400


    # =====================================
    # GUARDAR EN FIREBASE
    # =====================================

    try:

        # Inicializar Firebase.

        inicializar_firebase()


        # Referencia a la colección de mediciones.

        referencia = db.reference("mediciones")


        # Preparar registro.

        registro = {

            campo: datos[campo]

            for campo in campos

        }


        # Fecha generada por el servidor de Firebase.
        # Se almacena como timestamp Unix en milisegundos.

        registro["fecha_servidor"] = {
            ".sv": "timestamp"
        }


        # Crear registro con identificador único.

        nuevo_registro = referencia.push(registro)


        print(
            f"Medición almacenada correctamente. "
            f"Sensor: {datos['sensor_id']} | "
            f"ID: {nuevo_registro.key}"
        )


        return jsonify({

            "guardado": True,

            "id": nuevo_registro.key,

            "sensor_id": datos["sensor_id"],

            "base_datos": "Firebase Realtime Database"

        }), 201


    except Exception:

        app.logger.exception(
            "No se pudo guardar la medición en Firebase."
        )

        return jsonify({

            "error": "No se pudo guardar la medición en Firebase"

        }), 500


# =====================================
# EJECUTAR SERVIDOR
# =====================================

if __name__ == "__main__":

    # Inicializar Firebase antes de iniciar Flask.

    inicializar_firebase()


    print("-----------------------------------")
    print("       SERVIDOR INGENISMUS")
    print("-----------------------------------")
    print("Firebase: Conectado")
    print(f"Puerto HTTP: {HTTP_PORT}")
    print("Esperando mediciones...")
    print("-----------------------------------")


    # Iniciar servidor HTTP.

    app.run(

        host=HTTP_HOST,

        port=HTTP_PORT,

        debug=False

    )
