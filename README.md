# Ingenismus BD 2.0

Dashboard React/Vite y API Flask para dos MPU6050 conectados por Wi-Fi a un ESP32. El backend valida las lecturas, las relaciona con el modo y sesión activos y las guarda en Firebase Realtime Database. El navegador consulta un único snapshot del backend; no se conecta directamente a Firebase.

## Requisitos

- Node.js/npm.
- Python 3.10 o posterior.
- Proyecto Firebase Realtime Database y cuenta de servicio para guardar la clave privada localmente.

## Iniciar

Desde la raíz, instala e inicia el backend:

```powershell
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
$env:FIREBASE_DATABASE_URL = "https://<tu-proyecto>-default-rtdb.firebaseio.com"
.\.venv\Scripts\python.exe backend\servidor_firebase.py
```

Guarda la cuenta de servicio en `backend/serviceAccountKey.json`, o configura `FIREBASE_SERVICE_ACCOUNT_FILE`. No publiques esa clave.

En otra terminal:

```powershell
cd frontend
npm install
npm run dev
```

Abre la dirección de Vite, por defecto `http://localhost:5173`. El proxy `/api` apunta a Flask en `http://127.0.0.1:5000`; configura `VITE_API_PROXY_TARGET` en `frontend/.env.local` si es necesario.

## Sesiones y modos

En Recolección, selecciona **ESP32 real** o **Simulación** y después inicia una sesión. El modo no se puede cambiar mientras siga abierta. Las lecturas sin sesión o de una fuente distinta al modo activo reciben HTTP 409. Cerrar la sesión conserva sus lecturas e historial.

Para simular, inicia primero backend y frontend, selecciona Simulación e inicia una sesión desde la interfaz. Después, desde otra terminal en la raíz ejecuta:

```powershell
.\.venv\Scripts\python.exe backend\simulador_wifi.py
```

Detén el generador con Ctrl+C. Las lecturas se etiquetan como simuladas y nunca indican que el hardware físico está conectado.

Para hardware real, configura `WIFI_SSID`, `WIFI_PASSWORD` y `API_URL` en `firmware/ESP32_MPU6050_WIFI/ESP32_MPU6050_WIFI.ino`. Usa la IP LAN de la computadora que ejecuta Flask, puerto 5000, y abre una sesión en modo ESP32 antes de enviar lecturas.

## API principal

- `GET /panel`: modo, sesión activa, últimas 50 sesiones y hasta 300 lecturas para todas las vistas.
- `PUT /modo`: cambia entre `esp32` y `simulado` si no hay sesión activa.
- `POST /sesiones` y `POST /sesiones/cerrar`: abre/cierra sesiones sin borrar históricos.
- `POST /mediciones`: recibe el contrato JSON del firmware y simulador.
- `GET /mediciones?limite=N`: compatibilidad para consultar lecturas.

Consulta [DOCUMENTACION_TECNICA_INGENISMUS.txt](DOCUMENTACION_TECNICA_INGENISMUS.txt) para el contrato, estructura y estado de validación.

## Sujetos e historial por sesion

En **Prueba > Pacientes promedio** o **Pacientes con TEA**, selecciona un sujeto existente o registralo con su edad y pulsa iniciar en esa misma vista. El tipo de prueba lo determina la vista. La fecha y el identificador se generan en el backend. En **Recoleccion** se selecciona la fuente (ESP32/simulacion) y se controla una sesion ya iniciada: pausar, reanudar o finalizar. Cada lectura recibe `sujeto_id`, `sesion_id` y `tipo_fuente` en el servidor.

El nodo existente `/mediciones` se conserva. Se agregan `/sujetos/<sujeto_id>` y campos de asociacion a `/sesiones/<sesion_id>`; no se duplican las lecturas en subnodos. El historial consulta todas las lecturas de una sesion en paginas de hasta 500 registros y las carga en las graficas existentes.

La consulta historica usa `orderByChild("sesion_id")`. En Firebase Console > Realtime Database > Rules, integra `".indexOn": ["sesion_id"]` dentro de la regla existente para `/mediciones`. Conserva tus reglas actuales de lectura y escritura; no reemplaces el archivo completo con una regla abierta. El backend usa Firebase Admin y la cuenta de servicio; no se agregan credenciales al navegador.

Endpoints adicionales: `GET/POST /sujetos`, `POST /sesiones/pausar`, `POST /sesiones/reanudar` y `GET /sesiones/<id>/mediciones?limite=500&cursor=<push-id>`.
