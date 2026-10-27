# Ingenismus

Prototipo modular para mostrar en el frontend mediciones de dos MPU6050
conectados a un ESP32. El ESP32 envia datos por Wi-Fi a una API Python local;
la API los guarda y lee desde Firebase Realtime Database. El navegador solo
se comunica con esa API, no con Firebase directamente.

## Estructura

```text
backend/
  servidor_firebase.py       API para Firebase y el ESP32
  simulador_wifi.py          Emite mediciones ficticias para pruebas
  requirements.txt           Dependencias Python
  serviceAccountKey.json     Credencial local (no se versiona)
firmware/
  ESP32_MPU6050_WIFI.ino     Firmware que se carga al ESP32
  archive/                   ZIP original, conservado como referencia
frontend/
  src/services/mediciones.js Acceso modular a la API
  src/App.jsx                Panel web y estado en vivo de los sensores
  vite.config.js             Proxy /api hacia el servidor Python
```

Los participantes, sesiones y video que aparecen en el panel siguen siendo de
demostracion. Los estados y lecturas MPU6050 se obtienen de la API/Firebase.

## 1. Configurar Firebase y arrancar la API

1. En Firebase crea una Realtime Database y una cuenta de servicio. Descarga el
   JSON de la cuenta y guardalo como `backend/serviceAccountKey.json`.
2. Si usas otra base de datos, configura `FIREBASE_DATABASE_URL` con su URL.
   En PowerShell, por ejemplo:

   ```powershell
   $env:FIREBASE_DATABASE_URL = "https://<tu-base-de-datos>.firebasedatabase.app"
   ```

   La API conserva como valor predeterminado la URL del proyecto configurada
   originalmente.
3. En PowerShell, desde la raiz del proyecto, instala dependencias y ejecuta:

   ```powershell
   py -m venv .venv
   .\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
   .\.venv\Scripts\python.exe backend\servidor_firebase.py
   ```

La API escucha en el puerto `5000` y expone `POST /mediciones` para recibir
datos, y `GET /mediciones` para leer los mas recientes. Prueba que esta activa
abriendo `http://127.0.0.1:5000/` en la computadora.

No agregues la credencial de Firebase al repositorio ni al firmware. El archivo
`backend/serviceAccountKey.json` esta excluido por `.gitignore`.

## 2. Arrancar el frontend

En otra terminal, desde la carpeta `frontend`:

```powershell
npm.cmd install
npm.cmd run dev
```

Abre la direccion que muestra Vite, normalmente `http://localhost:5173`.
El frontend consulta las mediciones cada dos segundos. En desarrollo, Vite
reenvia `/api/mediciones` a `http://127.0.0.1:5000/mediciones`; por eso inicia
primero la API. El proxy es para desarrollo local, no para un despliegue de
produccion.

## 3. Conectar el ESP32

1. En `firmware/ESP32_MPU6050_WIFI.ino`, cambia `WIFI_SSID` y
   `WIFI_PASSWORD` por los datos de tu red Wi-Fi.
2. Obtén la IPv4 de la computadora que ejecuta la API con `ipconfig`. Cambia
   `API_URL` por `http://<IPv4-de-la-computadora>:5000/mediciones`. No uses
   `localhost`, `127.0.0.1` ni la URL de Firebase en el firmware.
3. Asegurate de que la computadora y el ESP32 esten en la misma red y que el
   firewall permita conexiones entrantes al puerto TCP `5000`. El ESP32
   necesita una red Wi-Fi de 2.4 GHz.
4. Abre el `.ino` con Arduino IDE, selecciona tu placa ESP32 y el puerto serie,
   carga el programa y revisa el monitor serie a `115200` baudios.

El `.ino` es codigo C++ para Arduino y se carga directamente al ESP32; no se
debe renombrar a `.ini`. El ESP32 envia JSON a la API Python, y esa API es la
que se conecta a Firebase. Los dos buses I2C estan configurados en GPIO 21/22 y
27/26; conecta los sensores segun esos pines.

## Probar sin hardware

Con la API y Firebase configurados, desde la raiz del proyecto ejecuta en otra
terminal:

```powershell
.\.venv\Scripts\python.exe backend\simulador_wifi.py
```

El simulador envia datos ficticios de los sensores 1 y 2 a la misma API. El ZIP
original esta conservado en `firmware/archive/`; contiene una implementacion
anterior con MySQL y no se usa en este flujo Firebase.
