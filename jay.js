// Estado global de la alarma
const PIN_CORRECTO = "1234";
let pinIngresado = "";
let sistemaArmado = false;
let estadoAlerta = false;
let audioCtx = null;
let oscilador = null;
let puertoSerie = null;

// Elementos DOM
const lcdLine1 = document.getElementById('lcdLine1');
const lcdLine2 = document.getElementById('lcdLine2');
const ledGreen = document.getElementById('ledGreen');
const ledRed = document.getElementById('ledRed');
const intruder = document.getElementById('intruder');
const buzzerHw = document.getElementById('buzzerHw');
const pirBeam = document.getElementById('pirBeam');
const terminalBox = document.getElementById('terminalBox');

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
  actualizarLCD("SISTEMA DESARMADO", "CLAVE: _ _ _ _");
  ledGreen.classList.add('active');
  logTerminal("SISTEMA", "Sistema listo. Envíe 1234 desde el Monitor Serie o Teclado para activar.");
});

// Control de pestañas
function switchTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
  
  document.getElementById(`tab-${tabName}`).classList.add('active');
  if (event) event.target.classList.add('active');
}

// -------------------------------------------------------------
// CONEXIÓN DIRECTA POR PUERTO SERIE (Tinkercad / Arduino Físico)
// -------------------------------------------------------------
async function conectarPuertoSerie() {
  if (!("serial" in navigator)) {
    alert("Tu navegador no soporta la Web Serial API. Usa Google Chrome o Microsoft Edge.");
    return;
  }

  try {
    puertoSerie = await navigator.serial.requestPort();
    await puertoSerie.open({ baudRate: 9600 });
    logTerminal("SISTEMA", "¡Conectado al Puerto Serie de Arduino a 9600 baudios!");

    const textDecoder = new TextDecoderStream();
    const readableStreamClosed = puertoSerie.readable.pipeTo(textDecoder.writable);
    const reader = textDecoder.readable.getReader();

    leerDatosSerie(reader);
  } catch (err) {
    logTerminal("ALERTA", "Error al conectar con el Puerto Serie: " + err.message);
  }
}

async function leerDatosSerie(reader) {
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      reader.releaseLock();
      break;
    }
    if (value) {
      buffer += value;
      let lineas = buffer.split("\n");
      buffer = lineas.pop(); // Guardar fragmento incompleto

      for (let linea of lineas) {
        procesarMensajeArduino(linea.trim());
      }
    }
  }
}

// Procesa lo que responde el Serial.println() del código de Tinkercad
function procesarMensajeArduino(mensaje) {
  if (!mensaje) return;
  logTerminal("ARDUINO", mensaje);

  if (mensaje.includes("Alarma Activada")) {
    sistemaArmado = true;
    actualizarLCD("SISTEMA ARMADO", "MONITOREANDO PIR");
    ledGreen.classList.remove('active');
    ledRed.classList.add('active');
  } else if (mensaje.includes("Movimiento Detectado")) {
    estadoAlerta = true;
    animarIntruso();
    actualizarLCD("¡INTRUSO DETECTADO!", "INGRESE CLAVE");
    ledRed.classList.add('blink');
    buzzerHw.classList.add('sounding');
    iniciarSirena();
  } else if (mensaje.includes("Alarma desactivada")) {
    desactivarAlarmaLocal();
  }
}

// Enviar comandos escritos en la Web hacia el Arduino por Serial
async function enviarDatoSerie(texto) {
  if (puertoSerie && puertoSerie.writable) {
    const encoder = new TextEncoder();
    const writer = puertoSerie.writable.getWriter();
    await writer.write(encoder.encode(texto + "\n"));
    writer.releaseLock();
  }
}

// Lógica del Teclado Numérico
function pressKey(key) {
  playBeepKey();

  if (key === '*') {
    pinIngresado = "";
    actualizarLCD(sistemaArmado ? "SISTEMA ARMADO" : "SISTEMA DESARMADO", "CLAVE: _ _ _ _");
    return;
  }

  if (key === '#') {
    verificarPin();
    return;
  }

  if (pinIngresado.length < 4) {
    pinIngresado += key;
    let asteriscos = "*".repeat(pinIngresado.length) + "_".repeat(4 - pinIngresado.length);
    actualizarLCD(sistemaArmado ? "SISTEMA ARMADO" : "SISTEMA DESARMADO", `CLAVE: ${asteriscos}`);
  }
}

// Verificación de PIN
function verificarPin() {
  enviarDatoSerie(pinIngresado); // Enviar clave al Serial.parseInt() de Tinkercad

  if (pinIngresado === PIN_CORRECTO) {
    if (estadoAlerta) {
      desactivarAlarmaLocal();
    } else {
      sistemaArmado = !sistemaArmado;
      if (sistemaArmado) {
        armarSistemaLocal();
      } else {
        desarmarSistemaLocal();
      }
    }
  } else {
    actualizarLCD("CLAVE INCORRECTA", "INTENTE DE NUEVO");
    logTerminal("ALERTA", "Intento fallido de PIN.");
    setTimeout(() => {
      actualizarLCD(sistemaArmado ? "SISTEMA ARMADO" : "SISTEMA DESARMADO", "CLAVE: _ _ _ _");
    }, 1500);
  }
  pinIngresado = "";
}

function armarSistemaLocal() {
  actualizarLCD("SISTEMA ARMADO", "MONITOREANDO PIR");
  ledGreen.classList.remove('active');
  ledRed.classList.add('active');
  logTerminal("INFO", "Sistema ARMADO.");
}

function desarmarSistemaLocal() {
  actualizarLCD("SISTEMA DESARMADO", "CLAVE: _ _ _ _");
  ledGreen.classList.add('active');
  ledRed.classList.remove('active', 'blink');
  detenerSirena();
  logTerminal("INFO", "Sistema desarmado por usuario.");
}

function desactivarAlarmaLocal() {
  estadoAlerta = false;
  sistemaArmado = false;
  buzzerHw.classList.remove('sounding');
  desarmarSistemaLocal();
}

// Simular Intruso (Sensor PIR)
document.getElementById('btnSimulateIntruder').addEventListener('click', () => {
  if (!sistemaArmado) {
    logTerminal("SISTEMA", "Movimiento detectado por PIR, pero el sistema está DESARMADO.");
    animarIntruso();
    return;
  }

  if (estadoAlerta) return;

  estadoAlerta = true;
  animarIntruso();
  actualizarLCD("¡INTRUSO DETECTADO!", "INGRESE CLAVE");
  ledRed.classList.add('blink');
  buzzerHw.classList.add('sounding');
  iniciarSirena();
  logTerminal("ALERTA", "¡ALERTA! Sensor PIR detectó movimiento (Pin A0).");
});

function animarIntruso() {
  intruder.classList.add('detected');
  pirBeam.style.background = "radial-gradient(circle, rgba(239, 68, 68, 0.4) 0%, rgba(239, 68, 68, 0) 70%)";
  
  setTimeout(() => {
    intruder.classList.remove('detected');
    pirBeam.style.background = "radial-gradient(circle, rgba(56,189,248,0.15) 0%, rgba(56,189,248,0) 70%)";
  }, 2500);
}

// Helper LCD & Logs
function actualizarLCD(l1, l2) {
  lcdLine1.textContent = l1;
  lcdLine2.textContent = l2;
}

function logTerminal(tipo, mensaje) {
  const time = new Date().toLocaleTimeString();
  const entry = document.createElement('div');
  entry.className = `log-entry ${tipo.toLowerCase()}`;
  entry.textContent = `[${time}] [${tipo}] ${mensaje}`;
  terminalBox.appendChild(entry);
  terminalBox.scrollTop = terminalBox.scrollHeight;
}

function clearLogs() {
  terminalBox.innerHTML = '';
}

// Sonido Web Audio
function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playBeepKey() {
  initAudio();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 800;
  gain.gain.value = 0.05;
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.05);
}

function iniciarSirena() {
  initAudio();
  if (oscilador) return;

  oscilador = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  oscilador.type = 'sawtooth';
  
  let f = 600;
  let subiendo = true;
  
  oscilador.sirenInterval = setInterval(() => {
    if (subiendo) {
      f += 40;
      if (f >= 1200) subiendo = false;
    } else {
      f -= 40;
      if (f <= 500) subiendo = true;
    }
    if (oscilador) oscilador.frequency.value = f;
  }, 20);

  gain.gain.value = 0.1;
  oscilador.connect(gain);
  gain.connect(audioCtx.destination);
  oscilador.start();
}

function detenerSirena() {
  if (oscilador) {
    clearInterval(oscilador.sirenInterval);
    oscilador.stop();
    oscilador.disconnect();
    oscilador = null;
  }
}