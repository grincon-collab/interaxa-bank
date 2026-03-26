/**
 * Interaxa Bank — Main Application Script
 * 
 * Handles:
 *  - Page navigation (SPA routing)
 *  - Toast notifications
 *  - Credit simulator (French amortization system)
 *  - Range slider UI updates
 *  - Radio option selectors
 */

'use strict';
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

  // ── RADIO OPTIONS ──
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

  function selectModal(el, val) {
    document.querySelectorAll('#modalidad .radio-option').forEach(o => o.classList.remove('selected'));
    el.classList.add('selected');
    currentModal = val;
  }

  // ── RANGE UPDATES ──
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

  // ── CALCULATE ──
  function calcular() {
    const monto = parseFloat(document.getElementById('monto').value) * 1000000;
    const plazo = parseInt(document.getElementById('plazo').value);
    const tasaEA = parseFloat(document.getElementById('tasa').value) / 100;

    // Tasa mensual efectiva
    const tasaMensual = Math.pow(1 + tasaEA, 1/12) - 1;

    // Cuota fija (sistema francés)
    const cuota = monto * (tasaMensual * Math.pow(1 + tasaMensual, plazo)) / (Math.pow(1 + tasaMensual, plazo) - 1);

    const totalPagado = cuota * plazo;
    const totalIntereses = totalPagado - monto;

    // Amortización (primeros 12 + últimos 3 periodos)
    let saldo = monto;
    const tabla = [];
    for (let i = 1; i <= plazo; i++) {
      const interes = saldo * tasaMensual;
      const capital = cuota - interes;
      saldo -= capital;
      tabla.push({ mes: i, cuota, interes, capital, saldo: Math.max(0, saldo) });
    }

    // Format COP
    const fmt = n => new Intl.NumberFormat('es-CO', { style:'currency', currency:'COP', maximumFractionDigits: 0 }).format(n);

    // Render results
    const preview = tabla.slice(0, 8);

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
            <div class="result-meta-val">${(tasaEA*100).toFixed(1)}% E.A.</div>
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
        <div class="breakdown-row"><span class="key">Tasa mensual efectiva</span><span class="val">${(tasaMensual*100).toFixed(4)}% M.E.</span></div>
        <div class="breakdown-row"><span class="key">Tasa E.A.</span><span class="val">${(tasaEA*100).toFixed(2)}% E.A.</span></div>
        <div class="breakdown-row"><span class="key">Modalidad</span><span class="val">${currentModal}</span></div>
        <div class="breakdown-row"><span class="key">Costo total del crédito</span><span class="val gold">${((totalIntereses/monto)*100).toFixed(1)}% sobre capital</span></div>
      </div>

      <div class="amort-table">
        <div class="amort-header">
          <span>📋 Tabla de amortización (8 primeras cuotas)</span>
          <span style="font-size:12px; color:var(--gray); font-weight:400;">Sistema francés</span>
        </div>
        <div class="amort-scroll">
          <table>
            <thead>
              <tr>
                <th>Mes</th>
                <th>Cuota</th>
                <th>Capital</th>
                <th>Interés</th>
                <th>Saldo</th>
              </tr>
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

      <div style="text-align:center; padding:4px 0;">
        <button class="btn btn-gold" onclick="showToast('✅ Solicitud enviada. Un asesor te contactará pronto.')">
          ✅ Solicitar este crédito
        </button>
        <p style="font-size:11px; color:var(--gray); margin-top:10px;">* Simulación informativa. Las condiciones finales están sujetas a estudio de crédito.</p>
      </div>
    `;
  }