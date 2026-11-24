/*
  ESP32 + 2 sensores MPU6050 -> Wi-Fi -> API Python -> MySQL

  IMPORTANTE:
  - Este firmware conserva los dos buses I2C y sus pines del código original.
  - La API de Python debe estar ejecutándose en la computadora.
  - Cambia WIFI_SSID, WIFI_PASSWORD y API_URL antes de cargar el programa.
  - Este archivo envía por Wi-Fi; no implementa respaldo USB.
*/

#include <Wire.h>
#include <WiFi.h>
#include <HTTPClient.h>

// ===== CONFIGURACIÓN QUE DEBES CAMBIAR =====
const char* WIFI_SSID = "NOMBRE_DE_TU_WIFI";
const char* WIFI_PASSWORD = "CONTRASENA_DE_TU_WIFI";

// Sustituye 192.168.1.50 por la IPv4 de la computadora donde corre Flask.
// No uses localhost ni 127.0.0.1 en esta dirección.
const char* API_URL = "http://192.168.1.50:5000/mediciones";

// Dos buses I2C independientes (igual que el código original)
TwoWire I2C_1 = TwoWire(0);
TwoWire I2C_2 = TwoWire(1);

const uint8_t MPU_ADDR = 0x68;

// Sensor 1
const int SDA_1 = 21;
const int SCL_1 = 22;

// Sensor 2
const int SDA_2 = 27;
const int SCL_2 = 26;

// Escribe un registro del MPU6050
bool escribirRegistro(TwoWire &bus, uint8_t reg, uint8_t valor) {
  bus.beginTransmission(MPU_ADDR);
  bus.write(reg);
  bus.write(valor);
  return bus.endTransmission() == 0;
}

// Lee dos bytes consecutivos como entero con signo
int16_t leer16(TwoWire &bus, uint8_t reg) {
  bus.beginTransmission(MPU_ADDR);
  bus.write(reg);

  if (bus.endTransmission(false) != 0) {
    return 0;
  }

  if (bus.requestFrom((uint8_t)MPU_ADDR, (uint8_t)2, (bool)true) != 2) {
    return 0;
  }

  uint8_t alto = bus.read();
  uint8_t bajo = bus.read();

  return (int16_t)((alto << 8) | bajo);
}

// Conecta o reconecta el ESP32 al Wi-Fi
void conectarWiFi() {
  if (WiFi.status() == WL_CONNECTED) {
    return;
  }

  Serial.println("Conectando al Wi-Fi...");
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  // Espera hasta 15 segundos. Si no conecta, el programa vuelve a intentarlo
  // en la siguiente iteración del loop.
  unsigned long inicio = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - inicio < 15000) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("Wi-Fi conectado. IP del ESP32: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("No se pudo conectar al Wi-Fi; se reintentará.");
  }
}

// Envía una medición de un sensor a la API como JSON
bool enviarMedicionWiFi(int numero,
                        int16_t ax, int16_t ay, int16_t az,
                        int16_t gx, int16_t gy, int16_t gz) {
  if (WiFi.status() != WL_CONNECTED) {
    return false;
  }

  HTTPClient http;
  http.setTimeout(3000);

  if (!http.begin(API_URL)) {
    Serial.println("No se pudo iniciar la petición HTTP.");
    return false;
  }

  http.addHeader("Content-Type", "application/json");

  // Los nombres deben coincidir con los que espera 03_servidor_wifi.py
  String json = "{";
  json += "\"sensor_id\":" + String(numero) + ",";
  json += "\"aceleracion_x\":" + String(ax) + ",";
  json += "\"aceleracion_y\":" + String(ay) + ",";
  json += "\"aceleracion_z\":" + String(az) + ",";
  json += "\"giroscopio_x\":" + String(gx) + ",";
  json += "\"giroscopio_y\":" + String(gy) + ",";
  json += "\"giroscopio_z\":" + String(gz);
  json += "}";

  int codigoHTTP = http.POST(json);
  http.end();

  if (codigoHTTP == 201) {
    Serial.print("Medición del sensor ");
    Serial.print(numero);
    Serial.println(" guardada en MySQL.");
    return true;
  }

  Serial.print("Error al enviar sensor ");
  Serial.print(numero);
  Serial.print(". Código HTTP: ");
  Serial.println(codigoHTTP);
  return false;
}

// Lee los seis valores y los envía por Wi-Fi
void leerYEnviarSensor(TwoWire &bus, int numero) {
  int16_t ax = leer16(bus, 0x3B);
  int16_t ay = leer16(bus, 0x3D);
  int16_t az = leer16(bus, 0x3F);

  int16_t gx = leer16(bus, 0x43);
  int16_t gy = leer16(bus, 0x45);
  int16_t gz = leer16(bus, 0x47);

  enviarMedicionWiFi(numero, ax, ay, az, gx, gy, gz);
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  // Inicializar los dos buses con pines diferentes (código original)
  I2C_1.begin(SDA_1, SCL_1, 100000);
  I2C_2.begin(SDA_2, SCL_2, 100000);

  // Despertar ambos sensores
  escribirRegistro(I2C_1, 0x6B, 0x00);
  escribirRegistro(I2C_2, 0x6B, 0x00);
  delay(100);

  conectarWiFi();
}

void loop() {
  // Intentar reconectar si el Wi-Fi se perdió
  if (WiFi.status() != WL_CONNECTED) {
    conectarWiFi();
  }

  leerYEnviarSensor(I2C_1, 1);
  leerYEnviarSensor(I2C_2, 2);

  // Aproximadamente una lectura por sensor cada medio segundo,
  // más el tiempo que tarden las peticiones HTTP.
  delay(500);
}
