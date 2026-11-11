"""
SIMULADOR WIFI - DOS SENSORES MPU6050

Genera datos ficticios para los sensores 1 y 2.
Envía las mediciones al servidor Flask.
El servidor almacena los registros en Firebase Realtime Database.

No necesita conectar los ESP32 ni los sensores físicos.
"""

import json
import random
import time

from datetime import datetime
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError


# =====================================
# CONFIGURACIÓN DEL SERVIDOR
# =====================================

API_URL = "http://127.0.0.1:5000/mediciones"

# Tiempo entre ciclos completos.
# Cada ciclo envía una lectura de cada sensor.

INTERVALO_SEGUNDOS = 1.0

# Sensores activos.

SENSORES = (1, 2)


# =====================================
# GENERAR MEDICIONES
# =====================================

def crear_medicion(sensor_id):
    """
    Genera una medición ficticia de un MPU6050.
    """

    return {

        "sensor_id": sensor_id,

        # Acelerómetro XYZ

        "aceleracion_x": random.randint(-2000, 2000),

        "aceleracion_y": random.randint(-2000, 2000),

        "aceleracion_z": random.randint(14000, 17500),


        # Giroscopio XYZ

        "giroscopio_x": random.randint(-250, 250),

        "giroscopio_y": random.randint(-250, 250),

        "giroscopio_z": random.randint(-250, 250)

    }


# =====================================
# ENVIAR MEDICIONES A FLASK
# =====================================

def enviar_medicion(datos):
    """
    Envía una medición en formato JSON
    al servidor Flask.
    """

    cuerpo = json.dumps(datos).encode("utf-8")

    solicitud = Request(

        API_URL,

        data=cuerpo,

        headers={
            "Content-Type": "application/json"
        },

        method="POST"

    )

    with urlopen(solicitud, timeout=5) as respuesta:

        mensaje = respuesta.read().decode("utf-8")

        return respuesta.status, mensaje


# =====================================
# PROCESAR RESPUESTA DEL SERVIDOR
# =====================================

def procesar_medicion(sensor_id, datos):

    """
    Envía una medición y muestra el resultado.
    """

    global contador

    try:

        codigo, respuesta = enviar_medicion(datos)

        if codigo == 201:

            contador += 1

            hora = datetime.now().strftime("%H:%M:%S")

            resultado = json.loads(respuesta)

            print("-----------------------------------")

            print(f"Hora: {hora}")

            print(f"Sensor: {sensor_id}")

            print(f"HTTP: {codigo}")

            print("Estado: MEDICIÓN GUARDADA")

            print(f"ID Firebase: {resultado.get('id')}")

            print("-----------------------------------")

        else:

            print(
                f"Respuesta inesperada del servidor: {codigo}"
            )


    except HTTPError as error:

        detalle = error.read().decode(
            "utf-8",
            errors="replace"
        )

        print(
            f"Error HTTP {error.code} "
            f"en sensor {sensor_id}: {detalle}"
        )


    except (URLError, TimeoutError) as error:

        print(
            f"Error de conexión con Flask. "
            f"Sensor {sensor_id}: {error}"
        )


    except (ValueError, json.JSONDecodeError) as error:

        print(
            f"Error procesando respuesta JSON: {error}"
        )


# =====================================
# SIMULACIÓN PRINCIPAL
# =====================================

def main():

    global contador

    contador = 0

    print("===================================")

    print(" SIMULADOR INGENISMUS")

    print(" ESP32 + MPU6050")

    print("===================================")

    print(f"Servidor: {API_URL}")

    print(f"Sensores activos: {SENSORES}")

    print(f"Intervalo: {INTERVALO_SEGUNDOS} segundos")

    print("Generando datos FICTICIOS...")

    print("Presiona CTRL + C para detener.")

    print("===================================\n")


    try:

        while True:

            inicio = time.time()


            # Generar y enviar lecturas de ambos sensores.

            for sensor_id in SENSORES:

                datos = crear_medicion(sensor_id)

                procesar_medicion(sensor_id, datos)


            # Mantener el intervalo entre ciclos.

            transcurrido = time.time() - inicio

            tiempo_espera = max(
                0,
                INTERVALO_SEGUNDOS - transcurrido
            )

            time.sleep(tiempo_espera)


    except KeyboardInterrupt:

        print("\n===================================")

        print(" SIMULACIÓN DETENIDA")

        print("===================================")

        print(
            f"Total de mediciones guardadas: {contador}"
        )

        print("Fin del simulador.")


# =====================================
# EJECUCIÓN
# =====================================

if __name__ == "__main__":

    main()