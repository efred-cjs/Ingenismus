"""
API local que recibe mediciones del ESP32 y las guarda en Firebase Realtime
Database. El frontend consume esta API a traves del proxy de desarrollo de Vite.

Coloca serviceAccountKey.json en esta carpeta y configura FIREBASE_DATABASE_URL
si la base de datos no es la predeterminada.
"""

import os
import time
import uuid
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
# La interfaz original consultaba las 300 lecturas más recientes.
MAX_MEDICIONES = 300
MODOS = {"simulado", "esp32"}
PRUEBAS = {"promedio", "tea"}
MAX_LECTURAS_HISTORICAS = 500

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
        "endpoints": ["/panel", "/modo", "/sesiones", "/mediciones"],
    })


@app.get("/sujetos")
def listar_sujetos():
    try:
        inicializar_firebase()
        sujetos = db.reference("sujetos").get() or {}
        items = [
            {"sujeto_id": identificador, **valor}
            for identificador, valor in sujetos.items()
            if isinstance(valor, dict)
        ]
        items.sort(key=lambda item: item.get("fecha_registro", 0), reverse=True)
        return jsonify({"sujetos": items})
    except (FirebaseError, FileNotFoundError, GoogleAuthError, ValueError):
        app.logger.exception("No se pudieron leer los sujetos")
        return jsonify({"error": "No se pudieron leer los sujetos"}), 503


@app.post("/sujetos")
def crear_sujeto():
    datos = request.get_json(silent=True)
    if not isinstance(datos, dict):
        return jsonify({"error": "Se requiere un objeto JSON"}), 400
    edad = datos.get("edad")
    if type(edad) is not int or not 0 <= edad <= 120:
        return jsonify({"error": "edad debe ser un entero entre 0 y 120"}), 400
    try:
        inicializar_firebase()
        sujeto_id = f"SUJ-{uuid.uuid4()}"
        sujeto = {"edad": edad, "fecha_registro": int(time.time() * 1000)}
        db.reference(f"sujetos/{sujeto_id}").set(sujeto)
        return jsonify({"sujeto": {"sujeto_id": sujeto_id, **sujeto}}), 201
    except (FirebaseError, FileNotFoundError, GoogleAuthError, ValueError):
        app.logger.exception("No se pudo registrar el sujeto")
        return jsonify({"error": "No se pudo registrar el sujeto"}), 503


def leer_estado_backend(incluir_sesiones=False):
    """Lee el modo y la sesion activa persistidos en Firebase."""
    estado_ref = db.reference("estado")
    estado = estado_ref.get() or {}
    sesion_id = estado.get("sesion_activa")
    sesion = db.reference(f"sesiones/{sesion_id}").get() if sesion_id else None
    sesiones = db.reference("sesiones").get() or {} if incluir_sesiones else {}
    sujetos = db.reference("sujetos").get() or {} if incluir_sesiones else {}
    return estado, sesiones, sesion, sujetos


@app.get("/panel")
def panel():
    """Entrega un snapshot unico para todos los modulos del frontend."""
    try:
        inicializar_firebase()
        estado, sesiones, sesion, sujetos = leer_estado_backend(incluir_sesiones=True)
        registros = (
            db.reference("mediciones")
            .order_by_key()
            .limit_to_last(MAX_MEDICIONES)
            .get()
            or {}
        )
        mediciones = [
            {"id": identificador, **registro}
            for identificador, registro in registros.items()
            if isinstance(registro, dict)
        ]
        mediciones.reverse()
        listado_sesiones = [
            valor for valor in sesiones.values() if isinstance(valor, dict)
        ]
        listado_sesiones.sort(key=lambda item: item.get("inicio", 0), reverse=True)
        listado_sujetos = [
            {"sujeto_id": identificador, **valor}
            for identificador, valor in sujetos.items()
            if isinstance(valor, dict)
        ]
        listado_sujetos.sort(key=lambda item: item.get("fecha_registro", 0), reverse=True)
        return jsonify({
            "firebase": "conectado",
            "modo": estado.get("modo", "esp32"),
            "sesion_activa": sesion,
            "sesiones": listado_sesiones,
            "sujetos": listado_sujetos,
            "mediciones": mediciones,
        })
    except (FirebaseError, FileNotFoundError, GoogleAuthError, ValueError):
        app.logger.exception("No se pudo cargar el panel desde Firebase")
        return jsonify({"error": "No se pudo cargar el panel desde Firebase"}), 503


@app.put("/modo")
def cambiar_modo():
    datos = request.get_json(silent=True)
    modo = datos.get("modo") if isinstance(datos, dict) else None
    if not isinstance(modo, str) or modo not in MODOS:
        return jsonify({"error": "modo debe ser 'simulado' o 'esp32'"}), 400
    try:
        inicializar_firebase()
        estado, _, sesion, _ = leer_estado_backend()
        modo_actual = estado.get("modo", "esp32")
        if sesion and modo != modo_actual:
            return jsonify({"error": "Cierra la sesion activa antes de cambiar el modo"}), 409
        db.reference("estado/modo").set(modo)
        return jsonify({"modo": modo, "actualizado": True})
    except (FirebaseError, FileNotFoundError, GoogleAuthError, ValueError):
        app.logger.exception("No se pudo cambiar el modo de operacion")
        return jsonify({"error": "No se pudo cambiar el modo de operacion"}), 503


@app.post("/sesiones")
def iniciar_sesion():
    datos = request.get_json(silent=True) or {}
    if not isinstance(datos, dict):
        return jsonify({"error": "Se requiere un objeto JSON"}), 400
    prueba = datos.get("prueba")
    if prueba is not None and (not isinstance(prueba, str) or prueba not in PRUEBAS):
        return jsonify({"error": "prueba debe ser 'promedio' o 'tea'"}), 400
    try:
        inicializar_firebase()
        sujeto_id = datos.get("sujeto_id")
        if not isinstance(sujeto_id, str) or not sujeto_id.strip():
            return jsonify({"error": "Selecciona o registra un sujeto antes de iniciar"}), 400
        estado, _, activa, _ = leer_estado_backend()
        if activa:
            return jsonify({"error": "Ya existe una sesion activa", "sesion": activa}), 409
        sujeto = db.reference(f"sujetos/{sujeto_id}").get()
        if not isinstance(sujeto, dict):
            return jsonify({"error": "El sujeto seleccionado no existe"}), 404
        identificador = str(uuid.uuid4())
        ahora = int(time.time() * 1000)
        fuente = estado.get("modo", "esp32")
        modo_prueba = "con_tea" if prueba == "tea" else "sin_tea"
        sesion = {
            "id": identificador,
            "sesion_id": identificador,
            "sujeto_id": sujeto_id,
            "edad": sujeto.get("edad"),
            "inicio": ahora,
            "fecha": ahora,
            "fin": None,
            "modo": modo_prueba,
            "tipo_fuente": fuente,
            "estado": "activa",
        }
        if prueba:
            sesion["prueba"] = prueba
        db.reference(f"sesiones/{identificador}").set(sesion)
        puntero = db.reference("estado/sesion_activa")
        resultado = puntero.transaction(
            lambda actual: identificador if actual is None else actual
        )
        if resultado != identificador:
            db.reference(f"sesiones/{identificador}").delete()
            return jsonify({"error": "Ya existe una sesion activa"}), 409
        return jsonify({"sesion": sesion}), 201
    except (FirebaseError, FileNotFoundError, GoogleAuthError, ValueError):
        app.logger.exception("No se pudo iniciar la sesion")
        return jsonify({"error": "No se pudo iniciar la sesion"}), 503


@app.post("/sesiones/cerrar")
def cerrar_sesion():
    try:
        inicializar_firebase()
        estado, _, sesion, _ = leer_estado_backend()
        if not sesion:
            return jsonify({"error": "No hay una sesion activa"}), 409
        sesion_id = sesion.get("id") or estado.get("sesion_activa")
        sesion_actualizada = dict(sesion)
        sesion_actualizada["fin"] = int(time.time() * 1000)
        sesion_actualizada["estado"] = "finalizada"
        db.reference(f"sesiones/{sesion_id}").update(sesion_actualizada)
        db.reference("estado/sesion_activa").delete()
        return jsonify({"sesion": sesion_actualizada, "cerrada": True})
    except (FirebaseError, FileNotFoundError, GoogleAuthError, ValueError) as error:
        app.logger.exception("No se pudo cerrar la sesion")
        return jsonify({
            "error": "No se pudo cerrar la sesion",
            "detalle": str(error),
        }), 503


def cambiar_estado_sesion(estado_destino, estados_origen):
    try:
        inicializar_firebase()
        estado, _, sesion, _ = leer_estado_backend()
        if not sesion:
            return jsonify({"error": "No hay una sesion abierta"}), 409
        if sesion.get("estado") not in estados_origen:
            return jsonify({"error": f"La sesion no puede pasar a estado {estado_destino}"}), 409
        sesion_id = sesion.get("id") or estado.get("sesion_activa")
        ahora = int(time.time() * 1000)
        cambios = {"estado": estado_destino}
        if estado_destino == "pausada":
            cambios["pausa"] = ahora
        else:
            cambios["reanudacion"] = ahora
        db.reference(f"sesiones/{sesion_id}").update(cambios)
        return jsonify({"sesion": {**sesion, **cambios}})
    except (FirebaseError, FileNotFoundError, GoogleAuthError, ValueError):
        app.logger.exception("No se pudo actualizar el estado de la sesion")
        return jsonify({"error": "No se pudo actualizar el estado de la sesion"}), 503


@app.post("/sesiones/pausar")
def pausar_sesion():
    return cambiar_estado_sesion("pausada", {"activa"})


@app.post("/sesiones/reanudar")
def reanudar_sesion():
    return cambiar_estado_sesion("activa", {"pausada"})


@app.get("/sesiones/<sesion_id>/mediciones")
def listar_mediciones_sesion(sesion_id):
    try:
        limite = int(request.args.get("limite", str(MAX_LECTURAS_HISTORICAS)))
    except ValueError:
        return jsonify({"error": "limite debe ser un entero"}), 400
    if not 1 <= limite <= MAX_LECTURAS_HISTORICAS:
        return jsonify({"error": f"limite debe estar entre 1 y {MAX_LECTURAS_HISTORICAS}"}), 400
    cursor = request.args.get("cursor")
    try:
        inicializar_firebase()
        sesion = db.reference(f"sesiones/{sesion_id}").get()
        if not isinstance(sesion, dict):
            return jsonify({"error": "La sesion no existe"}), 404
        try:
            consulta = db.reference("mediciones").order_by_child("sesion_id").equal_to(sesion_id)
            if cursor:
                consulta = consulta.start_at(sesion_id, key=cursor)
            resultado = consulta.limit_to_first(limite + 2).get() or {}
            ordenados = sorted(resultado.items(), key=lambda par: par[0])
            if cursor and ordenados and ordenados[0][0] == cursor:
                ordenados = ordenados[1:]
        except FirebaseError as error:
            # Keep historic charts usable if the RTDB .indexOn rule has not
            # been deployed yet. This read-only fallback filters the JSON node.
            if "Index not defined" not in str(error):
                raise
            registros = db.reference("mediciones").get() or {}
            ordenados = sorted(
                (
                    (key, valor)
                    for key, valor in registros.items()
                    if isinstance(valor, dict) and valor.get("sesion_id") == sesion_id
                ),
                key=lambda par: par[0],
            )
            if cursor:
                ordenados = [par for par in ordenados if par[0] > cursor]
        hay_mas = len(ordenados) > limite
        pagina = ordenados[:limite]
        mediciones = [{"id": key, **valor} for key, valor in pagina if isinstance(valor, dict)]
        siguiente = mediciones[-1]["id"] if hay_mas and mediciones else None
        return jsonify({"sesion": sesion, "mediciones": mediciones, "siguiente_cursor": siguiente})
    except (FirebaseError, FileNotFoundError, GoogleAuthError, ValueError):
        app.logger.exception("No se pudieron consultar lecturas historicas")
        return jsonify({"error": "No se pudieron consultar lecturas historicas"}), 503


@app.get("/mediciones/sin-sesion")
def listar_mediciones_sin_sesion():
    """Carga por paginas las lecturas antiguas que no tienen sesion asociada."""
    try:
        limite = int(request.args.get("limite", str(MAX_LECTURAS_HISTORICAS)))
    except ValueError:
        return jsonify({"error": "limite debe ser un entero"}), 400
    if not 1 <= limite <= MAX_LECTURAS_HISTORICAS:
        return jsonify({"error": f"limite debe estar entre 1 y {MAX_LECTURAS_HISTORICAS}"}), 400
    cursor = request.args.get("cursor")
    try:
        inicializar_firebase()
        registros = db.reference("mediciones").get() or {}
        ordenados = sorted(
            (
                (key, valor)
                for key, valor in registros.items()
                if isinstance(valor, dict) and not valor.get("sesion_id")
            ),
            key=lambda par: par[0],
        )
        total = len(ordenados)
        if cursor:
            ordenados = [par for par in ordenados if par[0] > cursor]
        hay_mas = len(ordenados) > limite
        pagina = ordenados[:limite]
        mediciones = [{"id": key, **valor} for key, valor in pagina]
        siguiente = mediciones[-1]["id"] if hay_mas and mediciones else None
        return jsonify({"mediciones": mediciones, "total": total, "siguiente_cursor": siguiente})
    except (FirebaseError, FileNotFoundError, GoogleAuthError, ValueError):
        app.logger.exception("No se pudieron consultar lecturas historicas sin sesion")
        return jsonify({"error": "No se pudieron consultar lecturas historicas"}), 503


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
    if "fuente" in datos and datos["fuente"] not in MODOS:
        return jsonify({"error": "fuente debe ser 'esp32' o 'simulado'"}), 400

    try:
        inicializar_firebase()
        estado, _, sesion, _ = leer_estado_backend()
        modo = estado.get("modo", "esp32")
        fuente = "simulado" if datos.get("fuente") == "simulado" else "esp32"
        if fuente != modo:
            return jsonify({"error": f"La API esta en modo {modo}; se rechazo la fuente {fuente}"}), 409
        if not sesion:
            return jsonify({"error": "Inicia una sesion antes de enviar mediciones"}), 409
        if sesion.get("estado") != "activa":
            return jsonify({"error": "La sesion esta pausada; reanudala antes de enviar mediciones"}), 409
        registro = {campo: datos[campo] for campo in campos}
        registro["modo"] = modo
        registro["fuente"] = fuente
        registro["sesion_id"] = sesion["id"]
        registro["sujeto_id"] = sesion["sujeto_id"]
        registro["tipo_fuente"] = fuente
        registro["fecha_servidor"] = {".sv": "timestamp"}
        nuevo_registro = db.reference("mediciones").push(registro)

        return jsonify({
            "guardado": True,
            "id": nuevo_registro.key,
            "sensor_id": datos["sensor_id"],
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
