/**
 * Interaxa Bank — Main Application Script
 * ============================================================
 * Handles:
 *  - SPA page navigation  (calls IXTrack.page on every route)
 *  - Toast notifications
 *  - Credit simulator     (French amortization + IXTrack events)
 *  - Range slider UI
 *  - Radio option selectors
 *
 * Analytics events fired:
 *  IXTrack.page()          → on every virtual page view
 *  IXTrack.event()         → simulator use, CTA clicks, product views
 *  IXTrack.highIntentSignal() → large loan amounts (≥ $50M)
 * ============================================================
 */

'use strict';

// ─────────────────────────────────────────────
// PAGE LABELS
// ─────────────────────────────────────────────
const PAGE_TITLES = {
  home:      'Inicio',
  personal:  'Banca Personal',
  business:  'Banca Empresarial',
  simulator: 'Simulador de Crédito',
  services:  'Nosotros',
};

// ─────────────────────────────────────────────
// NAVIGATION
// ─────────────────────────────────────────────
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));

  document.getElementById(id).classList.add('active');

  const navEl = document.getElementById('nav-' + id);
  if (navEl) navEl.classList.add('active');

  window.scrollTo({ top: 0, behavior: 'smooth' });

  // ── Tracking: virtual page view ──
  if (typeof IXTrack !== 'undefined') {
    IXTrack.page(id, PAGE_TITLES[id] || id);
  }
}

// ─────────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────────
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

// ─────────────────────────────────────────────
// SIMULATOR — RADIO OPTIONS
// ─────────────────────────────────────────────
let currentType  = 'Libre Inversion';
let currentModal = 'Fija mensual';

const RATES_BY_TYPE = {
  'Libre Inversion': 18.5,
  'Hipotecario':     10.9,
  'Vehiculo':        15.2,
  'Empresarial':     14.5,
};

function selectType(el, val) {
  document.querySelectorAll('#creditType .radio-option').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  currentType = val;

  const rangeTasa = document.getElementById('tasa');
  rangeTasa.value = RATES_BY_TYPE[val] || 18.5;
  updateTasa(rangeTasa);

  if (typeof IXTrack !== 'undefined') {
    IXTrack.event('simulator', 'type_selected', { credit_type: val });
  }
}

function selectModal(el, val) {
  document.querySelectorAll('#modalidad .radio-option').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  currentModal = val;
}

// ─────────────────────────────────────────────
// SIMULATOR — RANGE SLIDERS
// ─────────────────────────────────────────────
function fmtMoney(n) {
  return new Intl.NumberFormat('es-CO').format(n * 1000000);
}

function updateMonto(el) {
  document.getElementById('montoVal').textContent = '$' + fmtMoney(el.value);
  const pct = ((el.value - el.min) / (el.max - el.min) * 100) + '%';
  el.style.setProperty('--val', pct);
}

function updatePlazo(el) {
  document.getElementById('plazoVal').textContent = el.value + ' meses';
  const pct = ((el.value - el.min) / (el.max - el.min) * 100) + '%';
  el.style.setProperty('--val', pct);
}

function updateTasa(el) {
  document.getElementById('tasaVal').textContent = parseFloat(el.value).toFixed(1) + '%';
  const pct = ((el.value - el.min) / (el.max - el.min) * 100) + '%';
  el.style.setProperty('--val', pct);
}

// ─────────────────────────────────────────────
// SIMULATOR — CALCULATE (French amortization)
// ─────────────────────────────────────────────
function calcular() {
  const monto  = parseFloat(document.getElementById('monto').value) * 1000000;
  const plazo  = parseInt(document.getElementById('plazo').value);
  const tasaEA = parseFloat(document.getElementById('tasa').value) / 100;

  const tasaMensual = Math.pow(1 + tasaEA, 1 / 12) - 1;
  const cuota = monto * (tasaMensual * Math.pow(1 + tasaMensual, plazo))
                      / (Math.pow(1 + tasaMensual, plazo) - 1);
  const totalPagado    = cuota * plazo;
  const totalIntereses = totalPagado - monto;

  let saldo = monto;
  const tabla = [];
  for (let i = 1; i <= plazo; i++) {
    const interes = saldo * tasaMensual;
    const capital = cuota - interes;
    saldo -= capital;
    tabla.push({ mes: i, cuota, interes, capital, saldo: Math.max(0, saldo) });
  }

  const fmt = n => new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0,
  }).format(n);

  const preview = tabla.slice(0, 8);
  const montoM  = (monto / 1000000).toFixed(0);

  // ── Tracking ──
  if (typeof IXTrack !== 'undefined') {
    IXTrack.event('simulator', 'calculated', {
      credit_type:     currentType,
      amount_millions: montoM,
      term_months:     String(plazo),
      rate_ea:         String((tasaEA * 100).toFixed(2)),
      monthly_payment: String(Math.round(cuota)),
      total_interest:  String(Math.round(totalIntereses)),
      label:           currentType + ' $' + montoM + 'M / ' + plazo + 'm',
    });

    // High-intent signal for large loan amounts
    if (monto >= 50000000) {
      IXTrack.highIntentSignal('large_loan_simulated', {
        amount_millions: montoM,
        credit_type: currentType,
      });
    }
  }

  document.getElementById('simResults').innerHTML = `
    <div class="result-hero">
      <div class="result-label">CUOTA MENSUAL ESTIMADA</div>
      <div class="result-amount">${fmt(cuota)}</div>
      <div class="result-amount-sub">por ${plazo} meses</div>
      <div class="result-meta">
        <div class="result-meta-item">
          <div class="result-meta-val">${fmt(monto)}</div>
          <div class="result-meta-key">Monto solicitado</div>
        </div>
        <div class="result-meta-item">
          <div class="result-meta-val">${(tasaEA * 100).toFixed(1)}% E.A.</div>
          <div class="result-meta-key">Tasa efectiva anual</div>
        </div>
        <div class="result-meta-item">
          <div class="result-meta-val">${plazo} m</div>
          <div class="result-meta-key">Plazo</div>
        </div>
      </div>
    </div>

    <div class="result-breakdown">
      <div class="breakdown-title">📊 Resumen financiero · ${currentType}</div>
      <div class="breakdown-row"><span class="key">Capital solicitado</span><span class="val">${fmt(monto)}</span></div>
      <div class="breakdown-row"><span class="key">Total intereses</span><span class="val gold">${fmt(totalIntereses)}</span></div>
      <div class="breakdown-row"><span class="key">Total a pagar</span><span class="val">${fmt(totalPagado)}</span></div>
      <div class="breakdown-row"><span class="key">Tasa mensual efectiva</span><span class="val">${(tasaMensual * 100).toFixed(4)}% M.E.</span></div>
      <div class="breakdown-row"><span class="key">Tasa E.A.</span><span class="val">${(tasaEA * 100).toFixed(2)}% E.A.</span></div>
      <div class="breakdown-row"><span class="key">Modalidad</span><span class="val">${currentModal}</span></div>
      <div class="breakdown-row"><span class="key">Costo total del crédito</span><span class="val gold">${((totalIntereses / monto) * 100).toFixed(1)}% sobre capital</span></div>
    </div>

    <div class="amort-table">
      <div class="amort-header">
        <span>📋 Tabla de amortización (8 primeras cuotas)</span>
        <span class="amort-system">Sistema francés</span>
      </div>
      <div class="amort-scroll">
        <table>
          <thead>
            <tr><th>Mes</th><th>Cuota</th><th>Capital</th><th>Interés</th><th>Saldo</th></tr>
          </thead>
          <tbody>
            ${preview.map((r, i) => `
              <tr class="${i === 0 ? 'highlight-row' : ''}">
                <td>${r.mes}</td>
                <td>${fmt(r.cuota)}</td>
                <td>${fmt(r.capital)}</td>
                <td>${fmt(r.interes)}</td>
                <td>${fmt(r.saldo)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div class="sim-cta-wrap">
      <button class="btn btn-gold" onclick="requestCredit()">✅ Solicitar este crédito</button>
      <p class="sim-disclaimer">* Simulación informativa. Las condiciones finales están sujetas a estudio de crédito.</p>
    </div>
  `;
}

// ─────────────────────────────────────────────
// GENESYS CLOUD — DATA ACTION CONFIG (apiWA.json)
// Basado en: WTL_Workautomation_Credito_V2
// ─────────────────────────────────────────────
const DATA_ACTION_CONFIG = {
  tokenUrl:   'https://login.mypurecloud.com/oauth/token',
  workitemUrl: 'https://api.mypurecloud.com/api/v2/taskmanagement/workitems',
  typeId:      '0eb59c4e-b628-4b1e-9c83-7cc9ba8c3f2f',
  queueId:     '4a63f06a-ff43-44f2-b4b1-7524162210a1',
  workitemName: 'WTL_Credito',
};

// ─────────────────────────────────────────────
// GENESYS — STEP 1: Obtener Token OAuth
// (Client Credentials — igual a apiWA.json)
// ─────────────────────────────────────────────
async function getGenesysToken() {
  const credentials = btoa(
    '1eb69ae7-1be2-4d73-a55e-fc0308fcbf1d' + ':' +
    '94pT8m2Jm4ZfIyCyxzaJwMJWXa4GF2r3tlyuv_qaw2E'
  );

  console.log('Step 1: Solicitando Token OAuth...');

  const response = await fetch(DATA_ACTION_CONFIG.tokenUrl, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + credentials,
      'Content-Type':  'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error('Auth error: ' + (err.error_description || response.status));
  }

  const data = await response.json();
  return data.access_token;
}

// ─────────────────────────────────────────────
// GENESYS — STEP 2: Crear Workitem
// Estructura basada en apiWA.json → createWorkitem()
//
// Mapeo de campos (input → formulario/simulador):
//   input.documento_text       ← campo "Número de documento"    (formulario)
//   input.nombre_cliente_text  ← campo "Nombre completo"        (formulario)
//   input.tipo_credito_text    ← selección "Tipo de crédito"    (simulador)
//   input.valor_credito_text   ← valor "Monto solicitado" en COP (simulador)
//   input.telefono_cliente_text← campo "Teléfono / WhatsApp"   (formulario)
// ─────────────────────────────────────────────
async function createGenesysWorkitem(token, input) {
  console.log('Step 2: Creando Workitem en Genesys Cloud...');

  const response = await fetch(DATA_ACTION_CONFIG.workitemUrl, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      name:    DATA_ACTION_CONFIG.workitemName,
      typeId:  DATA_ACTION_CONFIG.typeId,
      queueId: DATA_ACTION_CONFIG.queueId,
      customFields: {
        documento_text:        input.documento_text,        // ← Número de documento (formulario)
        nombre_cliente_text:   input.nombre_cliente_text,   // ← Nombre completo     (formulario)
        tipo_credito_text:     input.tipo_credito_text,     // ← Tipo de crédito     (simulador)
        valor_credito_text:    input.valor_credito_text,    // ← Monto solicitado    (simulador)
        telefono_cliente_text: input.telefono_cliente_text, // ← Teléfono/WhatsApp   (formulario)
      },
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error('Workitem error: ' + (err.message || response.status));
  }

  return await response.json();
}

// ─────────────────────────────────────────────
// HELPERS — FORM VALIDATION
// ─────────────────────────────────────────────
function getContactFormData() {
  const nombre    = document.getElementById('clienteNombre').value.trim();
  const documento = document.getElementById('clienteDocumento').value.trim();
  const telefono  = document.getElementById('clienteTelefono').value.trim();

  const errorEl = document.getElementById('formErrorMsg');

  if (!nombre) {
    showFormError(errorEl, '⚠️ Por favor ingresa tu nombre completo.');
    document.getElementById('clienteNombre').focus();
    return null;
  }
  if (!documento || !/^\d{5,12}$/.test(documento)) {
    showFormError(errorEl, '⚠️ Ingresa un número de documento válido (5–12 dígitos).');
    document.getElementById('clienteDocumento').focus();
    return null;
  }
  if (!telefono || !/^\d{7,15}$/.test(telefono)) {
    showFormError(errorEl, '⚠️ Ingresa un teléfono válido (7–15 dígitos, sin espacios ni +).');
    document.getElementById('clienteTelefono').focus();
    return null;
  }

  errorEl.style.display = 'none';
  return { nombre, documento, telefono };
}

function showFormError(el, msg) {
  el.textContent = msg;
  el.style.display = 'block';
}

function setButtonState(loading) {
  // Update the button rendered inside simResults
  const btn = document.querySelector('.sim-cta-wrap .btn-gold');
  if (!btn) return;
  if (loading) {
    btn.disabled = true;
    btn.textContent = '⏳ Enviando solicitud...';
    btn.style.opacity = '0.7';
  } else {
    btn.disabled = false;
    btn.innerHTML = '✅ Solicitar este crédito';
    btn.style.opacity = '1';
  }
}

// ─────────────────────────────────────────────
// CTA — REQUEST CREDIT (main conversion action)
// ─────────────────────────────────────────────
async function requestCredit() {

  // 1. Validar formulario de contacto
  const contactData = getContactFormData();
  if (!contactData) return;

  // 2. Leer valores del simulador
  const montoMillones = parseFloat(document.getElementById('monto').value);
  const plazo         = document.getElementById('plazo').value;
  const valorCOP      = String(Math.round(montoMillones * 1000000));

  // 3. Construir objeto input con los nombres exactos de apiWA.json
  //    y poblar cada campo desde su fuente correspondiente:
  const input = {
    documento_text:        contactData.documento,   // ← "Número de documento"  (formulario)
    nombre_cliente_text:   contactData.nombre,      // ← "Nombre completo"      (formulario)
    tipo_credito_text:     currentType,             // ← "Tipo de crédito"      (simulador)
    valor_credito_text:    valorCOP,                // ← "Monto solicitado" COP (simulador)
    telefono_cliente_text: contactData.telefono,    // ← "Teléfono / WhatsApp"  (formulario)
  };

  setButtonState(true);

  try {
    // 4. Step 1: Obtener token → Step 2: Crear Workitem
    const token  = await getGenesysToken();
    const result = await createGenesysWorkitem(token, input);

    console.log('✅ Workitem creado ID:', result.id);
    showToast('✅ Solicitud enviada. Un asesor te contactará pronto.');

    // 5. IXTrack — evento de conversión
    if (typeof IXTrack !== 'undefined') {
      IXTrack.event('conversion', 'credit_requested', {
        credit_type:     currentType,
        amount_millions: String(montoMillones),
        term_months:     plazo,
        workitem_id:     result.id || '',
        label:           'Solicitud ' + currentType,
      });
    }

    // 6. Limpiar formulario tras éxito
    document.getElementById('clienteNombre').value    = '';
    document.getElementById('clienteDocumento').value = '';
    document.getElementById('clienteTelefono').value  = '';

  } catch (error) {
    console.error('❌ Error enviando solicitud:', error);
    showToast('❌ Error al enviar la solicitud. Intenta de nuevo.');

    if (typeof IXTrack !== 'undefined') {
      IXTrack.event('error', 'workitem_failed', { message: error.message });
    }
  } finally {
    setButtonState(false);
  }
}
