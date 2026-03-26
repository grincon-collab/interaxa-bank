'use strict';

// ── CONFIGURACIÓN GENESYS (Demo - Credenciales Attachadas) ──
const GENESYS_CONFIG = {
    clientId: '1eb69ae7-1be2-4d73-a55e-fc0308fcbf1d',
    clientSecret: '94pT8m2Jm4ZfIyCyxzaJwMJWXa4GF2r3tlyuv_qaw2E',
    region: 'mypurecloud.com', 
    queueId: '4a63f06a-ff43-44f2-b4b1-7524162210a1',
    typeId: '0eb59c4e-b628-4b1e-9c83-7cc9ba8c3f2f'
};

// ── NAVIGATION ──
function showPage(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    const navEl = document.getElementById('nav-' + id);
    if (navEl) navEl.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── TOAST ──
function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}

// ── SIMULADOR LOGIC ──
let currentType = 'Libre Inversión';

function selectType(el, val) {
    document.querySelectorAll('#creditType .radio-option').forEach(o => o.classList.remove('selected'));
    el.classList.add('selected');
    currentType = val;
    const rates = { 'Libre Inversión': 18.5, 'Hipotecario': 10.9, 'Vehículo': 15.2, 'Empresarial': 14.5 };
    document.getElementById('tasa').value = rates[val];
    updateTasa(document.getElementById('tasa'));
}

function updateMonto(el) {
    const val = new Intl.NumberFormat('es-CO').format(el.value * 1000000);
    document.getElementById('montoVal').textContent = '$' + val;
}

function updatePlazo(el) { document.getElementById('plazoVal').textContent = el.value + ' meses'; }
function updateTasa(el) { document.getElementById('tasaVal').textContent = parseFloat(el.value).toFixed(1) + '%'; }

function calcular() {
    const monto = parseFloat(document.getElementById('monto').value) * 1000000;
    const fmt = n => new Intl.NumberFormat('es-CO', { style:'currency', currency:'COP', maximumFractionDigits: 0 }).format(n);

    document.getElementById('simResults').innerHTML = `
      <div style="text-align:center; padding:30px; background:#001E42; color:white; border-radius:12px;">
        <h3 style="color:#D4AF37;">Simulación Exitosa</h3>
        <p>Monto: ${fmt(monto)}</p>
        <button class="calc-btn" style="margin-top:15px;" onclick="abrirModal('${fmt(monto)}')">Solicitar este crédito</button>
      </div>
    `;
}

// ── LÓGICA GENESYS OAUTH & WORKITEM ──

function abrirModal(monto) {
    document.getElementById('confirmMonto').innerText = monto;
    document.getElementById('modalSolicitud').style.display = 'flex';
}

function cerrarModal() { document.getElementById('modalSolicitud').style.display = 'none'; }

async function getGenesysToken() {
    const auth = btoa(`${GENESYS_CONFIG.clientId}:${GENESYS_CONFIG.clientSecret}`);
    try {
        const res = await fetch(`https://login.${GENESYS_CONFIG.region}/oauth/token`, {
            method: 'POST',
            headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'grant_type=client_credentials'
        });
        const data = await res.json();
        return data.access_token;
    } catch (e) { return null; }
}

document.getElementById('formCredito').addEventListener('submit', async (e) => {
    e.preventDefault();
    showToast('🔐 Autenticando...');
    const token = await getGenesysToken();
    
    if (!token) return showToast('❌ Error de Autenticación');

    const body = {
        name: "WTL_Credito",
        typeId: GENESYS_CONFIG.typeId,
        queueId: GENESYS_CONFIG.queueId,
        customFields: {
            documento_text: document.getElementById('docId').value,
            nombre_cliente_text: document.getElementById('nombreCompleto').value,
            tipo_credito_text: currentType,
            valor_credito_text: document.getElementById('confirmMonto').innerText
        }
    };

    try {
        const res = await fetch(`https://api.${GENESYS_CONFIG.region}/api/v2/taskmanagement/workitems`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (res.ok) {
            showToast('✅ Solicitud enviada a Genesys');
            cerrarModal();
        } else { showToast('❌ Error al enviar'); }
    } catch (err) { showToast('❌ Error de red'); }
});
