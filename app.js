'use strict';

// NAVIGATION
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  const navEl = document.getElementById('nav-' + id);
  if (navEl) navEl.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// TOAST
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

// SIMULATOR LOGIC
let currentType = 'Libre Inversión';
const fmt = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);

function selectType(el, val) {
  document.querySelectorAll('#creditType .radio-option').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  currentType = val;
}

function updateMonto(el) { document.getElementById('montoVal').textContent = fmt(el.value * 1000000); }
function updatePlazo(el) { document.getElementById('plazoVal').textContent = el.value + ' meses'; }
function updateTasa(el) { document.getElementById('tasaVal').textContent = el.value + '%'; }

function calcular() {
  const monto = parseFloat(document.getElementById('monto').value) * 1000000;
  const meses = parseInt(document.getElementById('plazo').value);
  const tasaEA = parseFloat(document.getElementById('tasa').value) / 100;
  
  // Tasa mensual vencida
  const i = Math.pow(1 + tasaEA, 1/12) - 1;
  const cuota = (monto * i) / (1 - Math.pow(1 + i, -meses));

  const resultsDiv = document.getElementById('simResults');
  resultsDiv.innerHTML = `
    <div class="res-card">
      <h3>Resultado de tu Simulación</h3>
      <div class="res-main-val">${fmt(cuota)}</div>
      <p>Cuota mensual estimada</p>
      <hr>
      <div style="margin: 20px 0;">
        <p>Monto: ${fmt(monto)}</p>
        <p>Plazo: ${meses} meses</p>
        <p>Tasa: ${(tasaEA*100).toFixed(2)}% E.A.</p>
      </div>
      <button class="btn btn-gold" onclick="abrirModalCredito(${monto})">✅ Solicitar este crédito</button>
    </div>
  `;
}

// MODAL LOGIC
function abrirModalCredito(monto) {
  document.getElementById('resumenMonto').innerText = fmt(monto);
  document.getElementById('form_valor_credito').value = monto;
  document.getElementById('form_tipo_credito').value = currentType;
  document.getElementById('modalContacto').style.display = 'flex';
}

function enviarAFinal() {
  const data = {
    nombre: document.getElementById('form_nombre').value,
    documento: document.getElementById('form_documento').value,
    telefono: document.getElementById('form_telefono').value,
    monto: document.getElementById('form_valor_credito').value,
    tipo: document.getElementById('form_tipo_credito').value
  };

  if(!data.nombre || !data.documento) {
    alert("Por favor completa los campos obligatorios");
    return;
  }

  console.log("Enviando a Genesys Cloud...", data);
  showToast('🚀 Solicitud enviada con éxito. Un asesor te llamará.');
  document.getElementById('modalContacto').style.display = 'none';
}
