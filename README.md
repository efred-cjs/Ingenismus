# Ingenismus BD 2.0

Dashboard React/Vite para visualizar lecturas reales de dos MPU6050 conectados a un ESP32. El ESP32 envía JSON por Wi-Fi a la API Flask; Flask valida los registros, los guarda en Firebase Realtime Database y entrega las últimas lecturas al navegador. El navegador se comunica solo con la API.

## Iniciar en desarrollo

Requisitos: Node.js/npm y Python 3.10 o posterior.

1. Configura Firebase Realtime Database y guarda la clave de cuenta de servicio como `backend/serviceAccountKey.json` (o indica otra ubicación mediante `FIREBASE_SERVICE_ACCOUNT_FILE`). No publiques esa clave.
2. Desde la raíz del proyecto, instala e inicia la API:

   ```powershell
   py -m venv .venv
   .\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
   $env:FIREBASE_DATABASE_URL = "https://<tu-proyecto>-default-rtdb.firebaseio.com"
   .\.venv\Scripts\python.exe backend\servidor_firebase.py
   ```

3. En otra terminal:

   ```powershell
   cd frontend
   npm.cmd install
   npm.cmd run dev
   ```

Abre la dirección impresa por Vite (por defecto `http://localhost:5173`). El frontend consulta `/api/mediciones` cada dos segundos; Vite reenvía esa ruta a Flask en `http://127.0.0.1:5000`.

## ESP32 y simulador

Antes de cargar `firmware/ESP32_MPU6050_WIFI/ESP32_MPU6050_WIFI.ino`, reemplaza `WIFI_SSID`, `WIFI_PASSWORD` y `API_URL` con los datos de la red local y la IPv4 de la computadora que ejecuta Flask. La API debe aceptar conexiones LAN por el puerto 5000. El firmware envía `sensor_id` y los seis enteros de aceleración/giroscopio a `POST /mediciones`.

Para probar sin hardware, inicia primero Flask y luego ejecuta desde la raíz:

```powershell
\.venv\Scripts\python.exe backend\simulador_wifi.py
```

Las lecturas del simulador son ficticias; no confirman el funcionamiento de sensores físicos.

## Configuración

- `FIREBASE_DATABASE_URL`: URL de Realtime Database.
- `FIREBASE_SERVICE_ACCOUNT_FILE`: ruta a la clave JSON privada; por defecto `backend/serviceAccountKey.json`.
- `HTTP_PORT`: puerto Flask; por defecto `5000`.
- `VITE_API_PROXY_TARGET`: destino del proxy de desarrollo; por defecto `http://127.0.0.1:5000`. Se puede definir en `frontend/.env.local` a partir de `frontend/.env.example`.
- `API_URL`: destino opcional del simulador; por defecto `http://127.0.0.1:5000/mediciones`.

La documentación de arquitectura, módulos, contratos, pruebas y requisitos pendientes está en [DOCUMENTACION_TECNICA_INGENISMUS.txt](DOCUMENTACION_TECNICA_INGENISMUS.txt).
