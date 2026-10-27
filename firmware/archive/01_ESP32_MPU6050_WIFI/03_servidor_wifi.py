"""
ARCHIVO: 03_servidor_wifi.py
FUNCIÓN: API HTTP local para que el ESP32 envíe mediciones por Wi-Fi.

El ESP32 enviará un POST JSON a:
    http://IP_DE_ESTA_PC:5000/mediciones

IMPORTANTE:
- Ajusta DB_CONFIG igual que en 02_receptor_usb.py.
- El ESP32 y esta computadora deben poder comunicarse por la red.
- En Windows, permite Python/puerto 5000 en el firewall solo para tu red privada.
- No expongas este servidor a Internet ni lo publiques en una red no confiable.
"""

# Importa Flask para crear un servidor HTTP pequeño.
from flask import Flask, request, jsonify
# Importa el conector MySQL.
import mysql.connector
# Importa errores de MySQL.
from mysql.connector import Error

# ================= CONFIGURACIÓN QUE PUEDES CAMBIAR =================

# Dirección del servidor MySQL local.
DB_HOST = "127.0.0.1"
# Puerto TCP de MySQL; XAMPP suele usar 3306.
DB_PORT = 3306
# Usuario MySQL; en XAMPP suele ser root.
DB_USER = "root"
# Contraseña MySQL; cambia esta cadena si tu usuario tiene contraseña.
DB_PASSWORD = ""
# Base de datos donde se insertan las mediciones.
DB_NAME = "sensores_esp32"
# Puerto HTTP donde Flask recibirá solicitudes del ESP32.
HTTP_PORT = 5000
# 0.0.0.0 permite recibir conexiones desde otros equipos de la LAN.
HTTP_HOST = "0.0.0.0"

# Crea la aplicación web Flask.
app = Flask(__name__)

# Sentencia parametrizada para insertar una lectura completa.
INSERT_SQL = """
INSERT INTO mediciones
(sensor_id, aceleracion_x, aceleracion_y, aceleracion_z,
 giroscopio_x, giroscopio_y, giroscopio_z)
VALUES (%s, %s, %s, %s, %s, %s, %s)
"""


def conectar_mysql():
    """Crea una conexión a MySQL para una petición."""
    # Devuelve una conexión usando los parámetros configurados arriba.
    return mysql.connector.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
    )


@app.get("/")
def estado():
    """Ruta de diagnóstico para comprobar que el servidor está activo."""
    # Devuelve una respuesta JSON simple cuando se visita la raíz.
    return jsonify({"estado": "activo", "endpoint": "/mediciones"})


@app.post("/mediciones")
def recibir_medicion():
    """Valida el JSON enviado por el ESP32 y lo guarda en MySQL."""
    # Lee el cuerpo JSON; si no es JSON válido, responde con error.
    datos = request.get_json(silent=True)
    if not isinstance(datos, dict):
        return jsonify({"error": "Se requiere un objeto JSON"}), 400

    # Define los campos obligatorios del mensaje.
    campos = (
        "sensor_id", "aceleracion_x", "aceleracion_y", "aceleracion_z",
        "giroscopio_x", "giroscopio_y", "giroscopio_z",
    )

    # Comprueba que no falte ningún campo.
    if any(campo not in datos for campo in campos):
        return jsonify({"error": "Faltan campos", "requeridos": campos}), 400

    # Comprueba que todos los valores sean enteros, sin aceptar booleanos.
    valores = [datos[campo] for campo in campos]
    if any(type(valor) is not int for valor in valores):
        return jsonify({"error": "Todos los campos deben ser enteros"}), 400

    # Acepta únicamente los identificadores 1 y 2.
    if datos["sensor_id"] not in (1, 2):
        return jsonify({"error": "sensor_id debe ser 1 o 2"}), 400

    # Abre conexión y cursor; guarda y confirma la medición.
    conexion = None
    cursor = None
    try:
        conexion = conectar_mysql()
        cursor = conexion.cursor()
        cursor.execute(
            INSERT_SQL,
            (
                datos["sensor_id"],
                datos["aceleracion_x"],
                datos["aceleracion_y"],
                datos["aceleracion_z"],
                datos["giroscopio_x"],
                datos["giroscopio_y"],
                datos["giroscopio_z"],
            ),
        )
        conexion.commit()
        # Devuelve confirmación al ESP32 después de guardar correctamente.
        return jsonify({"guardado": True, "id": cursor.lastrowid}), 201

    # Devuelve error de servidor si MySQL no puede guardar el registro.
    except Error as error:
        app.logger.error("Error de MySQL: %s", error)
        return jsonify({"error": "No se pudo guardar la medición"}), 500

    # Cierra los recursos en cualquier caso.
    finally:
        if cursor is not None:
            cursor.close()
        if conexion is not None and conexion.is_connected():
            conexion.close()


# Inicia el servidor solo al ejecutar este archivo directamente.
if __name__ == "__main__":
    # El modo debug está desactivado para evitar recargas innecesarias.
    app.run(host=HTTP_HOST, port=HTTP_PORT, debug=False)
