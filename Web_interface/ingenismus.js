
/* =====================================
   IMPORTAR FIREBASE
===================================== */

import { initializeApp } from
"https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js";

import {
    getDatabase,
    ref,
    query,
    orderByChild,
    limitToLast,
    onValue
} from
"https://www.gstatic.com/firebasejs/13.2.0/firebase-database.js";


/* =====================================
   CONFIGURACIÓN FIREBASE
===================================== */

const firebaseConfig = {

    apiKey: "AIzaSyBH4un4Dm1Jmwtf1SYzzaznFokdaxkTPeQ",

    authDomain: "mediciones-9afdd.firebaseapp.com",

    databaseURL:
    "https://mediciones-9afdd-default-rtdb.firebaseio.com",

    projectId: "mediciones-9afdd",

    storageBucket: "mediciones-9afdd.firebasestorage.app",

    messagingSenderId: "277818955359",

    appId: "1:277818955359:web:fc8ab858d5f45680b9edea",

    measurementId: "G-GGT5CEP67F"

};


// Inicializar Firebase

const app = initializeApp(firebaseConfig);


// Inicializar Realtime Database

const database = getDatabase(app);


/* =====================================
   CONFIGURACIÓN GENERAL
===================================== */

// Ruta de las lecturas en Firebase

const RUTA_LECTURAS = "mediciones";

// Cantidad máxima de registros

const LIMITE_LECTURAS = 300;


/* =====================================
   VARIABLES
===================================== */

let lecturas = [];

let cancelarLectura = null;


// Elementos HTML

const sensorSelect = document.getElementById("sensor");

const btnConsultar = document.getElementById("btnConsultar");

const totalLecturas = document.getElementById("totalLecturas");

const ultimaLectura = document.getElementById("ultimaLectura");

const estadoConexion = document.getElementById("estadoConexion");


/* =====================================
   CREACIÓN DE GRÁFICAS
===================================== */

function crearGrafica(elemento, titulo, unidad) {

    return new Chart(elemento, {

        type: "line",

        data: {

            labels: [],

            datasets: [

                {
                    label: "Eje X",
                    data: [],
                    borderColor: "#ff8800",
                    backgroundColor: "#ff8800",
                    borderWidth: 2,
                    tension: 0.3,
                    pointRadius: 0
                },

                {
                    label: "Eje Y",
                    data: [],
                    borderColor: "#00bcd4",
                    backgroundColor: "#00bcd4",
                    borderWidth: 2,
                    tension: 0.3,
                    pointRadius: 0
                },

                {
                    label: "Eje Z",
                    data: [],
                    borderColor: "#8bc34a",
                    backgroundColor: "#8bc34a",
                    borderWidth: 2,
                    tension: 0.3,
                    pointRadius: 0
                }

            ]

        },

        options: {

            responsive: true,

            maintainAspectRatio: false,

            interaction: {

                intersect: false,

                mode: "index"

            },

            plugins: {

                legend: {

                    labels: {

                        color: "white"

                    }

                },

                title: {

                    display: true,

                    text: titulo,

                    color: "white"

                }

            },

            scales: {

                x: {

                    ticks: {

                        color: "#aaa",

                        maxTicksLimit: 12

                    },

                    grid: {

                        color: "rgba(255,255,255,0.06)"

                    },

                    title: {

                        display: true,

                        text: "Hora de lectura",

                        color: "white"

                    }

                },

                y: {

                    ticks: {

                        color: "#aaa"

                    },

                    grid: {

                        color: "rgba(255,255,255,0.06)"

                    },

                    title: {

                        display: true,

                        text: unidad,

                        color: "white"

                    }

                }

            }

        }

    });

}


/* =====================================
   INSTANCIAR GRÁFICAS
===================================== */

const graficaAcelerometro = crearGrafica(

    document.getElementById("graficaAcelerometro"),

    "Acelerómetro",

    "Cuentas (raw counts)"

);


const graficaGiroscopio = crearGrafica(

    document.getElementById("graficaGiroscopio"),

    "Giroscopio",

    "Cuentas (raw counts)"

);


/* =====================================
   CONSULTAR FIREBASE
===================================== */

function consultarLecturas() {

    // Cancelar escucha anterior

    if (cancelarLectura) {

        cancelarLectura();

        cancelarLectura = null;

    }


    estadoConexion.textContent = "Conectando...";


    // Referencia a la ruta de Firebase

    const ruta = ref(database, RUTA_LECTURAS);


    // Obtener las últimas 300 lecturas

    const consulta = query(

        ruta,

        orderByChild("fecha_servidor"),

        limitToLast(LIMITE_LECTURAS)

    );


    // Escuchar cambios en tiempo real

    cancelarLectura = onValue(

        consulta,

        (snapshot) => {

            lecturas = [];


            // Recorrer registros

            snapshot.forEach((registro) => {

                const dato = registro.val();


                // Validar campos necesarios

                if (

                    dato.sensor_id !== undefined &&

                    dato.fecha_servidor !== undefined

                ) {

                    lecturas.push(dato);

                }

            });


            // Ordenar cronológicamente

            lecturas.sort(

                (a, b) =>

                    Number(a.fecha_servidor) -

                    Number(b.fecha_servidor)

            );


            estadoConexion.textContent = "Conectado";


            // Actualizar gráficas y estadísticas

            actualizarGraficas();

        },


        (error) => {

            console.error("Error de Firebase:", error);

            estadoConexion.textContent = "Error de conexión";

        }

    );

}


/* =====================================
   ACTUALIZAR GRÁFICAS
===================================== */

function actualizarGraficas() {

    // Identificador del sensor seleccionado

    const sensorSeleccionado = Number(sensorSelect.value);


    // Filtrar registros por sensor

    const datosSensor = lecturas.filter(

        dato => Number(dato.sensor_id) === sensorSeleccionado

    );


    // Preparar arreglos

    const etiquetas = [];

    const aceleracion = [[], [], []];

    const giroscopio = [[], [], []];


    // Recorrer lecturas del sensor

    datosSensor.forEach((dato) => {

        const fecha = new Date(

            Number(dato.fecha_servidor)

        );


        etiquetas.push(

            fecha.toLocaleTimeString()

        );


        // Datos del acelerómetro

        aceleracion[0].push(dato.aceleracion_x ?? null);

        aceleracion[1].push(dato.aceleracion_y ?? null);

        aceleracion[2].push(dato.aceleracion_z ?? null);


        // Datos del giroscopio

        giroscopio[0].push(dato.giroscopio_x ?? null);

        giroscopio[1].push(dato.giroscopio_y ?? null);

        giroscopio[2].push(dato.giroscopio_z ?? null);

    });


    /* =====================================
       ACTUALIZAR ACELERÓMETRO
    ===================================== */

    graficaAcelerometro.data.labels = etiquetas;

    graficaAcelerometro.data.datasets[0].data = aceleracion[0];

    graficaAcelerometro.data.datasets[1].data = aceleracion[1];

    graficaAcelerometro.data.datasets[2].data = aceleracion[2];


    graficaAcelerometro.options.plugins.title.text =

        `Acelerómetro - Sensor ${sensorSeleccionado}`;


    graficaAcelerometro.update();


    /* =====================================
       ACTUALIZAR GIROSCOPIO
    ===================================== */

    graficaGiroscopio.data.labels = etiquetas;

    graficaGiroscopio.data.datasets[0].data = giroscopio[0];

    graficaGiroscopio.data.datasets[1].data = giroscopio[1];

    graficaGiroscopio.data.datasets[2].data = giroscopio[2];


    graficaGiroscopio.options.plugins.title.text =

        `Giroscopio - Sensor ${sensorSeleccionado}`;


    graficaGiroscopio.update();


    /* =====================================
       ACTUALIZAR ESTADÍSTICAS
    ===================================== */

    totalLecturas.textContent = datosSensor.length;


    if (datosSensor.length > 0) {

        const ultima = datosSensor[datosSensor.length - 1];

        ultimaLectura.textContent =

            new Date(

                Number(ultima.fecha_servidor)

            ).toLocaleTimeString();

    }

    else {

        ultimaLectura.textContent = "Sin datos";

    }

}


/* =====================================
   EVENTOS
===================================== */

// Consultar nuevamente

btnConsultar.addEventListener(

    "click",

    consultarLecturas

);


// Cambiar de sensor

sensorSelect.addEventListener(

    "change",

    actualizarGraficas

);


/* =====================================
   INICIALIZAR
===================================== */

consultarLecturas();
