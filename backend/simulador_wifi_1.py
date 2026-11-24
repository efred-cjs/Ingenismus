"""
SIMULADOR WIFI - DOS SENSORES MPU6050

Genera datos ficticios para los sensores 1 y 2.
Envía las mediciones a la API Flask, que las guarda en Firebase Realtime
Database.

No necesita conectar el ESP32 ni los sensores físicos.
"""

import json
import random
import time
from datetime import datetime
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

# Dirección de la API en la misma computadora.
API_URL = "http://127.0.0.1:5000/mediciones"

# Tiempo aproximado entre ciclos completos.
INTERVALO_SEGUNDOS = 1.0


def crear_medicion(sensor_id):
    """Genera una medición ficticia de un sensor."""

    return {
        "sensor_id": sensor_id,

        # Valores ficticios del acelerómetro
        "aceleracion_x": random.randint(-2000, 2000),
        "aceleracion_y": random.randint(-2000, 2000),
        "aceleracion_z": random.randint(14000, 17500),

        # Valores ficticios del giroscopio
        "giroscopio_x": random.randint(-250, 250),
        "giroscopio_y": random.randint(-250, 250),
        "giroscopio_z": random.randint(-250, 250),
    }


def enviar_medicion(datos):
    """Envía los datos en formato JSON a la API."""

    cuerpo = json.dumps(datos).encode("utf-8")

    solicitud = Request(
        API_URL,
        data=cuerpo,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    with urlopen(solicitud, timeout=5) as respuesta:
        mensaje = respuesta.read().decode("utf-8")
        return respuesta.status, mensaje


def main():
    print("===================================")
    print(" SIMULADOR WIFI - ESP32 + MPU6050")
    print("===================================")
    print(f"API: {API_URL}")
    print("Generando datos FICTICIOS...")
    print("Presiona Ctrl+C para detener.\n")

    contador = 0

    try:
        while True:
            inicio = time.time()

            # Simular ambos sensores en cada ciclo.
            for sensor_id in (1, 2):
                datos = crear_medicion(sensor_id)

                try:
                    codigo, respuesta = enviar_medicion(datos)
                    contador += 1
                    hora = datetime.now().strftime("%H:%M:%S")

                    print(
                        f"[{hora}] Sensor {sensor_id} | "
                        f"HTTP {codigo} | Datos: {datos} | "
                        f"Respuesta: {respuesta}"
                    )

                except HTTPError as error:
                    detalle = error.read().decode(
                        "utf-8", errors="replace"
                    )
                    print(
                        f"Error HTTP {error.code} para sensor "
                        f"{sensor_id}: {detalle}"
                    )

                except (URLError, TimeoutError) as error:
                    print(
                        f"No se pudo conectar con la API para "
                        f"el sensor {sensor_id}: {error}"
                    )

            # Mantener aproximadamente un ciclo por segundo.
            transcurrido = time.time() - inicio
            time.sleep(max(0, INTERVALO_SEGUNDOS - transcurrido))

    except KeyboardInterrupt:
        print("\nSimulación detenida.")
        print(f"Mediciones enviadas correctamente: {contador}")


if __name__ == "__main__":
    main()
