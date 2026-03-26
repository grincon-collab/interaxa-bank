'use strict';

// ── CONFIGURACIÓN GENESYS (Demo) ──
const GENESYS_CONFIG = {
    clientId: '1eb69ae7-1be2-4d73-a55e-fc0308fcbf1d',
    clientSecret: '94pT8m2Jm4ZfIyCyxzaJwMJWXa4GF2r3tlyuv_qaw2E',
    region: 'mypurecloud.com', // Ajustar según tu org (ej: usw2.purecloud.com)
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
let currentModal = 'Fija mensual';

function selectType(el, val) {
    document.querySelectorAll('#creditType .radio-option').forEach(o => o.classList.remove('selected'));
    el.classList.add('selected');
    currentType = val;
    const rates = { 'Libre Inversión': 18.5, 'Hipotecario': 10.9, 'Vehículo': 15.2, 'Empresarial': 14.5 };
    const rangeTasa = document.getElementById('tasa');
    rangeTasa.value = rates[val];
    updateTasa(rangeTasa);
}

function updateMonto(el) {
    const val = new Intl.NumberFormat('es-CO').format(el.value * 1000000);
    document.getElementById('montoVal').textContent = '$' + val;
    el.style.setProperty('--val', ((el.value - el.min) / (el.max - el.min) * 100) + '%');
}

function updatePlazo(el) {
    document.getElementById('plazoVal').textContent = el.value + ' meses';
    el.style.setProperty('--val', ((el.value - el.min) / (el.max - el.min) * 100) + '%');
}

function updateTasa(el) {
    document.getElementById('tasaVal').textContent = parseFloat(el.value).toFixed(1) + '%';
    el.style.setProperty('--val', ((el.value - el.min) / (el.max - el.min) * 100) + '%');
}

function calcular() {
    const monto = parseFloat(document.getElementById('monto').value) * 1000000;
    const plazo = parseInt(document.getElementById('plazo').value);
    const tasaEA = parseFloat(document.getElementById('tasa').value) / 100;
    const tasaMensual = Math.pow(1 + tasaEA, 1/12) - 1;
    const cuota = monto * (tasaMensual * Math.pow(1 + tasaMensual, plazo)) / (Math.pow(1 + tasaMensual, plazo) - 1);
    const fmt = n => new Intl.NumberFormat('es-CO', { style:'currency', currency:'COP', maximumFractionDigits: 0 }).format(n);

    document.getElementById('simResults').innerHTML = `
      <div class="result-hero" style="text-align:center; padding:20px; background:#001E42; color:white; border-radius:12px;">
        <div style="font-size:12px; opacity:0.8;">CUOTA MENSUAL ESTIMADA</div>
        <div style="font-size:32px; font-weight:900; color:#D4AF37;">${fmt(cuota)}</div>
        <div style="margin-top:20px;">
            <button class="btn btn-gold" onclick="abrirModalSolicitud('${fmt(monto)}')">Solicitar ahora</button>
        </div>
      </div>
      <p style="font-size:11px; color:gray; text-align:center; margin-top:10px;">* Sujeto a políticas de crédito de Interaxa Bank.</p>
    `;
}

// ── LÓGICA DEL FORMULARIO Y API GENESYS ──

function abrirModalSolicitud(montoFormateado) {
    document.getElementById('confirmTipo').innerText = currentType;
    document.getElementById('confirmMonto').innerText = montoFormateado;
    document.getElementById('modalSolicitud').style.display = 'flex';
}

function cerrarModal() {
    document.getElementById('modalSolicitud').style.display = 'none';
}

async function getGenesysToken() {
    try {
        const auth = btoa(`${GENESYS_CONFIG.clientId}:${GENESYS_CONFIG.clientSecret}`);
        const response = await fetch(`https://login.${GENESYS_CONFIG.region}/oauth/token`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'grant_type=client_credentials'
        });
        const data = await response.json();
        return data.access_token;
    } catch (e) {
        console.error("Error Auth:", e);
        return null;
    }
}

document.getElementById('formCredito').addEventListener('submit', async (e) => {
    e.preventDefault();
    showToast('🔐 Conectando con Genesys...');

    const token = await getGenesysToken();
    if (!token) return showToast('❌ Error de autenticación');

    const payload = {
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
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            showToast('✅ ¡Solicitud enviada a Genesys!');
            cerrarModal();
        } else {
            showToast('❌ Error al crear el Workitem');
        }
    } catch (err) {
        showToast('❌ Error de conexión con la API');
    }
});
