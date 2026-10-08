# Ingenismus

Prototipo inicial del sistema experimental para apoyo a la evaluación del TEA.

## Sprint 1 actual

Se ha dejado el esqueleto funcional básico del frontend en `frontend/`, con una interfaz visual de recolección, estado simulado de componentes y navegación inicial. Esto permite validar el flujo visual sin inventar integración real con YOLO, PostgreSQL ni ESP32.

## Estructura principal

- `frontend/`: interfaz React + Vite para el prototipo visual.
- `docs/`: documentación técnica y decisiones de arquitectura (pendiente en siguientes pasos).
- `backend/`: se añadirá en el Sprint 2.
- `firmware/`: se añadirá cuando se defina la arquitectura del ESP32.

## Requisitos de Windows

1. Instalar Node.js LTS desde: https://nodejs.org/
2. Verificar:
   - `node -v`
   - `npm -v`
3. En la carpeta del proyecto:
   - `cd frontend`
   - `npm install`
   - `npm run dev`

## Verificación

- Abrir la URL mostrada por Vite, normalmente http://localhost:5173
- Confirmar que aparece la pantalla principal de Ingenismus
- Comprobar que se muestran los estados simulados y la navegación del flujo principal

## Decisión técnica pendiente

La arquitectura real de sensores y base de datos todavía se definirá en el siguiente sprint. Por ahora, el frontend usa datos simulados y estados claramente identificados como tales.

## Nota

Este prototipo no sustituye evaluación clínica ni realiza diagnósticos. Solo actúa como base técnica para recolección experimental y análisis posterior.
