const PIN_CORRECTO = "1234";

let sistemaArmado = false;
let estadoAlerta = false;
let ledAlternado = false;
let audioCtx = null;
let sirenaOscilador = null;
let sirenaGain = null;
let sirenaInterval = null;
let parpadeoInterval = null;

const elementos = {
  ledYellow: document.getElementById("ledYellowSvg"),
  ledRed: document.getElementById("ledRedSvg"),
  buzzer: document.getElementById("buzzerHw"),
  pirBeam: document.getElementById("pirBeam"),
  intruder: document.getElementById("intruder"),
  terminal: document.getElementById("terminalBox"),
  status: document.getElementById("boardStatus"),
  statusIndicator: document.getElementById("statusIndicator"),
  codeInput: document.getElementById("serialCode")
};

document.addEventListener("DOMContentLoaded", () => {
  actualizarIndicadores();
  logTerminal("SISTEMA", "Simulación lista. Envíe 1234 para activar la alarma.");
  document.getElementById("serialForm").addEventListener("submit", enviarCodigo);
  document.getElementById("btnSimulateIntruder").addEventListener("click", simularMovimiento);
});

function switchTab(tabName, button) {
  document.querySelectorAll(".tab-content").forEach((tab) => tab.classList.remove("active"));
  document.querySelectorAll(".tab-btn").forEach((tabButton) => tabButton.classList.remove("active"));
  document.getElementById(`tab-${tabName}`).classList.add("active");
  if (button) button.classList.add("active");
}

function enviarCodigo(event) {
  event.preventDefault();
  const codigo = elementos.codeInput.value.trim();
  elementos.codeInput.value = "";

  if (!/^\d{1,4}$/.test(codigo)) {
    logTerminal("ALERTA", "Escriba un código numérico de hasta cuatro dígitos.");
    return;
  }

  logTerminal("SERIE", `Código recibido: ${"•".repeat(codigo.length)}`);
  if (codigo !== PIN_CORRECTO) {
    logTerminal("ALERTA", "Código incorrecto. Intente de nuevo.");
    elementos.status.textContent = "Código incorrecto";
    return;
  }

  if (estadoAlerta) {
    detenerAlarma();
  } else if (sistemaArmado) {
    sistemaArmado = false;
    actualizarIndicadores();
    logTerminal("INFO", "Alarma desactivada sin movimiento.");
  } else {
    sistemaArmado = true;
    actualizarIndicadores();
    logTerminal("INFO", "Alarma activada. Sensor PIR monitoreando.");
  }
}

function simularMovimiento() {
  animarIntruso();
  if (!sistemaArmado) {
    logTerminal("SISTEMA", "Movimiento detectado, pero la alarma está desarmada.");
    return;
  }
  if (estadoAlerta) return;

  estadoAlerta = true;
  actualizarIndicadores();
  iniciarParpadeo();
  iniciarSirena();
  logTerminal("ALERTA", "Movimiento detectado por el sensor PIR (entrada A0).");
  logTerminal("ARDUINO", "Ingrese el código para desactivar.");
}

function detenerAlarma() {
  estadoAlerta = false;
  sistemaArmado = false;
  detenerParpadeo();
  detenerSirena();
  actualizarIndicadores();
  logTerminal("INFO", "Alarma desactivada. Bocina apagada.");
}

function actualizarIndicadores() {
  elementos.ledYellow.classList.toggle("is-on", estadoAlerta && ledAlternado);
  elementos.ledRed.classList.toggle("is-on", estadoAlerta && !ledAlternado);
  elementos.buzzer.classList.toggle("sounding", estadoAlerta);
  elementos.statusIndicator.classList.toggle("armed", sistemaArmado);
  elementos.statusIndicator.classList.toggle("alert", estadoAlerta);

  if (estadoAlerta) {
    elementos.status.textContent = "¡Movimiento detectado! Ingrese 1234 para apagar.";
  } else if (sistemaArmado) {
    elementos.status.textContent = "Alarma activada · monitoreando el sensor PIR";
  } else {
    elementos.status.textContent = "Alarma desarmada";
  }
}

function iniciarParpadeo() {
  detenerParpadeo();
  ledAlternado = false;
  parpadeoInterval = setInterval(() => {
    ledAlternado = !ledAlternado;
    actualizarIndicadores();
  }, 500);
}

function detenerParpadeo() {
  if (parpadeoInterval) clearInterval(parpadeoInterval);
  parpadeoInterval = null;
  ledAlternado = false;
}

function animarIntruso() {
  elementos.intruder.classList.add("detected");
  elementos.pirBeam.classList.add("motion-detected");
  setTimeout(() => {
    elementos.intruder.classList.remove("detected");
    elementos.pirBeam.classList.remove("motion-detected");
  }, 1800);
}

function logTerminal(tipo, mensaje) {
  const entrada = document.createElement("div");
  entrada.className = `log-entry ${tipo.toLowerCase()}`;
  entrada.textContent = `[${new Date().toLocaleTimeString()}] [${tipo}] ${mensaje}`;
  elementos.terminal.appendChild(entrada);
  elementos.terminal.scrollTop = elementos.terminal.scrollHeight;
}

function clearLogs() {
  elementos.terminal.innerHTML = "";
}

function iniciarSirena() {
  if (sirenaOscilador) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;

  audioCtx = audioCtx || new AudioContext();
  if (audioCtx.state === "suspended") audioCtx.resume();
  sirenaOscilador = audioCtx.createOscillator();
  sirenaGain = audioCtx.createGain();
  sirenaOscilador.type = "square";
  sirenaOscilador.frequency.value = 2500;
  sirenaGain.gain.value = 0.045;
  sirenaOscilador.connect(sirenaGain);
  sirenaGain.connect(audioCtx.destination);
  sirenaOscilador.start();
  sirenaInterval = setInterval(() => {
    if (sirenaOscilador && audioCtx) {
      const frecuencia = sirenaOscilador.frequency.value > 1500 ? 900 : 2500;
      sirenaOscilador.frequency.setTargetAtTime(frecuencia, audioCtx.currentTime, 0.08);
    }
  }, 450);
}

function detenerSirena() {
  if (sirenaInterval) clearInterval(sirenaInterval);
  sirenaInterval = null;
  if (sirenaOscilador) {
    sirenaOscilador.stop();
    sirenaOscilador.disconnect();
  }
  if (sirenaGain) sirenaGain.disconnect();
  sirenaOscilador = null;
  sirenaGain = null;
}
