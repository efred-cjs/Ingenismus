-- ============================================================
-- ARCHIVO: 01_crear_base_datos.sql
-- OBJETIVO: crear la base de datos y la tabla de mediciones.
-- EJECUCIÓN: abrir phpMyAdmin > SQL, pegar y ejecutar este archivo.
-- ============================================================

-- Crea la base de datos si todavía no existe.
CREATE DATABASE IF NOT EXISTS sensores_esp32
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Selecciona la base de datos para las siguientes instrucciones.
USE sensores_esp32;

-- Crea la tabla donde se guardará cada lectura completa de un sensor.
CREATE TABLE IF NOT EXISTS mediciones (
  -- Identificador único generado automáticamente por MySQL.
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

  -- Fecha y hora en que MySQL recibe y guarda el registro.
  fecha_hora TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Número del sensor: 1 o 2, según el programa del ESP32.
  sensor_id TINYINT UNSIGNED NOT NULL,

  -- Valores originales (raw) del acelerómetro, sin convertir unidades.
  aceleracion_x SMALLINT NOT NULL,
  aceleracion_y SMALLINT NOT NULL,
  aceleracion_z SMALLINT NOT NULL,

  -- Valores originales (raw) del giroscopio, sin convertir unidades.
  giroscopio_x SMALLINT NOT NULL,
  giroscopio_y SMALLINT NOT NULL,
  giroscopio_z SMALLINT NOT NULL,

  -- Define la clave primaria de cada registro.
  PRIMARY KEY (id),

  -- Índice para buscar rápidamente por fecha/hora.
  INDEX idx_fecha_hora (fecha_hora),

  -- Índice para consultar las lecturas de un sensor en orden temporal.
  INDEX idx_sensor_fecha (sensor_id, fecha_hora)
);
