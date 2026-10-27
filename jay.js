// Estado global de la alarma
const PIN_CORRECTO = "1234";
let pinIngresado = "";
let sistemaArmado = false;
let estadoAlerta = false;
let audioCtx = null;
let oscilador = null;

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
  logTerminal("SISTEMA", "Sistema listo. Ingrese clave 1234 y presione # para armar.");
});

// Control de pestañas
function switchTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
  
  document.getElementById(`tab-${tabName}`).classList.add('active');
  event.target.classList.add('active');
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
  if (pinIngresado === PIN_CORRECTO) {
    if (estadoAlerta) {
      desactivarAlarma();
    } else {
      sistemaArmado = !sistemaArmado;
      if (sistemaArmado) {
        armarSistema();
      } else {
        desarmarSistema();
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

// Armar Sistema
function armarSistema() {
  actualizarLCD("ARMANDO EN 3s...", "POR FAVOR SALGA");
  logTerminal("INFO", "Iniciando secuencia de armado...");

  setTimeout(() => {
    actualizarLCD("SISTEMA ARMADO", "MONITOREANDO PIR");
    ledGreen.classList.remove('active');
    ledRed.classList.add('active');
    logTerminal("INFO", "Sistema ARMADO y vigilando el sensor PIR.");
  }, 3000);
}

// Desarmar Sistema
function desarmarSistema() {
  actualizarLCD("SISTEMA DESARMADO", "CLAVE: _ _ _ _");
  ledGreen.classList.add('active');
  ledRed.classList.remove('active', 'blink');
  detenerSirena();
  logTerminal("INFO", "Sistema desarmado por usuario.");
}

// Simular Intruso (Sensor PIR)
document.getElementById('btnSimulateIntruder').addEventListener('click', () => {
  if (!sistemaArmado) {
    logTerminal("SISTEMA", "Movimiento detectado por PIR, pero el sistema está DESARMADO (Ignores).");
    animarIntruso();
    return;
  }

  if (estadoAlerta) return;

  estadoAlerta = true;
  animarIntruso();
  
  actualizarLCD("¡INTRUSO DETECTADO!", "INGRESET CLAVE!");
  ledRed.classList.add('blink');
  buzzerHw.classList.add('sounding');
  
  iniciarSirena();
  logTerminal("ALERTA", "¡ALERTA! Sensor PIR detectó movimiento en Pin 2. Sirena activada.");
});

function animarIntruso() {
  intruder.classList.add('detected');
  pirBeam.style.background = "radial-gradient(circle, rgba(239, 68, 68, 0.4) 0%, rgba(239, 68, 68, 0) 70%)";
  
  setTimeout(() => {
    intruder.classList.remove('detected');
    pirBeam.style.background = "radial-gradient(circle, rgba(56,189,248,0.15) 0%, rgba(56,189,248,0) 70%)";
  }, 2500);
}

// Desactivar estado de alerta
function desactivarAlarma() {
  estadoAlerta = false;
  sistemaArmado = false;
  buzzerHw.classList.remove('sounding');
  desarmarSistema();
  logTerminal("INFO", "Alarma desactivada con éxito.");
}

// Pantalla LCD Helper
function actualizarLCD(l1, l2) {
  lcdLine1.textContent = l1;
  lcdLine2.textContent = l2;
}

// Logs en Terminal
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

// Sintetizador Web Audio (Sirena del Buzzer)
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
  
  // Modulación de frecuencia tipo sirena
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