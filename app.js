// ═══════════════════════════════════════════
// INTERAXA BANK - APP.JS
// ═══════════════════════════════════════════

// ═══════════════════════════════════════════
// NAVIGATION & PAGE HANDLING
// ═══════════════════════════════════════════

function showPage(pageId) {
  // Hide all pages
  const pages = document.querySelectorAll('.page');
  pages.forEach(page => page.classList.remove('active'));
  
  // Show selected page
  const selectedPage = document.getElementById(pageId);
  if (selectedPage) {
    selectedPage.classList.add('active');
    
    // Update nav active state
    document.querySelectorAll('.nav-links a').forEach(link => {
      link.classList.remove('active');
    });
    const navLink = document.getElementById(`nav-${pageId}`);
    if (navLink) navLink.classList.add('active');
    
    // Update URL hash
    window.location.hash = pageId;
    
    // Scroll to top
    window.scrollTo(0, 0);
  }
}

// Handle URL hash on page load and when hash changes
function handleHashNavigation() {
  const hash = window.location.hash.slice(1); // Remove the #
  const validPages = ['home', 'personal', 'business', 'simulator', 'services'];
  
  if (hash && validPages.includes(hash)) {
    showPage(hash);
  } else {
    // Default to home if no valid hash
    showPage('home');
  }
}

// Listen for hash changes (browser back/forward buttons)
window.addEventListener('hashchange', handleHashNavigation);

// Run on page load
document.addEventListener('DOMContentLoaded', handleHashNavigation);

// ═══════════════════════════════════════════
// TOAST NOTIFICATIONS
// ═══════════════════════════════════════════

function showToast(message, duration = 3000) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}

// ═══════════════════════════════════════════
// SIMULATOR FUNCTIONALITY
// ═══════════════════════════════════════════

let creditType = 'Libre Inversión';
let modalidad = 'Fija mensual';

function selectType(element, type) {
  document.querySelectorAll('#creditType .radio-option').forEach(el => {
    el.classList.remove('selected');
  });
  element.classList.add('selected');
  creditType = type;
  
  // Update rates based on type
  const rateMap = {
    'Libre Inversión': 18.5,
    'Hipotecario': 10.9,
    'Vehículo': 15.5,
    'Empresarial': 14.2
  };
  
  document.getElementById('tasa').value = rateMap[type];
  updateTasa(document.getElementById('tasa'));
}

function selectModal(element, modal) {
  document.querySelectorAll('#modalidad .radio-option').forEach(el => {
    el.classList.remove('selected');
  });
  element.classList.add('selected');
  modalidad = modal;
}

function updateMonto(input) {
  const monto = parseInt(input.value) * 1000000;
  document.getElementById('montoVal').textContent = 
    '$' + monto.toLocaleString('es-CO', {maximumFractionDigits: 0});
  input.style.setProperty('--val', (input.value / 200 * 100) + '%');
}

function updatePlazo(input) {
  const plazo = parseInt(input.value);
  document.getElementById('plazoVal').textContent = plazo + ' meses';
  input.style.setProperty('--val', (input.value / 360 * 100) + '%');
}

function updateTasa(input) {
  const tasa = parseFloat(input.value);
  document.getElementById('tasaVal').textContent = tasa.toFixed(1) + '%';
  input.style.setProperty('--val', ((tasa - 5) / 30 * 100) + '%');
}

function calcular() {
  const monto = parseInt(document.getElementById('monto').value) * 1000000;
  const plazo = parseInt(document.getElementById('plazo').value);
  const tasaEA = parseFloat(document.getElementById('tasa').value);
  
  // Convert EA (Efectivo Anual) to monthly rate
  const tasaMensual = Math.pow(1 + tasaEA / 100, 1 / 12) - 1;
  
  // Calculate monthly payment using amortization formula
  // PMT = P * [r(1+r)^n] / [(1+r)^n - 1]
  const numerator = monto * tasaMensual * Math.pow(1 + tasaMensual, plazo);
  const denominator = Math.pow(1 + tasaMensual, plazo) - 1;
  const cuotaMensual = numerator / denominator;
  
  // Calculate total interest and total paid
  const totalPagado = cuotaMensual * plazo;
  const totalIntereses = totalPagado - monto;
  
  // Generate amortization table (first 12 months + last month)
  let tablaAmortizacion = [];
  let saldoRestante = monto;
  
  for (let i = 1; i <= plazo; i++) {
    const interesMes = saldoRestante * tasaMensual;
    const capitalMes = cuotaMensual - interesMes;
    saldoRestante -= capitalMes;
    
    // Show first 12 months and last month
    if (i <= 12 || i === plazo) {
      tablaAmortizacion.push({
        mes: i,
        cuota: cuotaMensual,
        capital: capitalMes,
        interes: interesMes,
        saldo: Math.max(0, saldoRestante)
      });
    }
  }
  
  // Display results
  displayResults(monto, cuotaMensual, totalIntereses, totalPagado, plazo, tablaAmortizacion);
}

function displayResults(monto, cuota, interes, totalPagado, plazo, tabla) {
  const resultsDiv = document.getElementById('simResults');
  
  const montoFormat = monto.toLocaleString('es-CO', {maximumFractionDigits: 0});
  const cuotaFormat = cuota.toLocaleString('es-CO', {maximumFractionDigits: 0});
  const intereFormat = interes.toLocaleString('es-CO', {maximumFractionDigits: 0});
  const totalFormat = totalPagado.toLocaleString('es-CO', {maximumFractionDigits: 0});
  
  let tablaHTML = '';
  tabla.forEach((row, index) => {
    if (index === 12 && tabla.length > 13) {
      tablaHTML += '<tr style="opacity:0.5;"><td colspan="5" style="text-align:center; padding:8px;">...</td></tr>';
    }
    if (index < 12 || index >= tabla.length - 1) {
      tablaHTML += `
        <tr>
          <td class="tabla-cell">${row.mes}</td>
          <td class="tabla-cell">$${row.cuota.toLocaleString('es-CO', {maximumFractionDigits: 0})}</td>
          <td class="tabla-cell">$${row.capital.toLocaleString('es-CO', {maximumFractionDigits: 0})}</td>
          <td class="tabla-cell">$${row.interes.toLocaleString('es-CO', {maximumFractionDigits: 0})}</td>
          <td class="tabla-cell">$${row.saldo.toLocaleString('es-CO', {maximumFractionDigits: 0})}</td>
        </tr>
      `;
    }
  });
  
  resultsDiv.innerHTML = `
    <div class="sim-results-header">
      <div class="sim-results-title">📊 Tu Simulación - ${creditType}</div>
      <div class="sim-results-subtitle">Resultados precisos basados en los parámetros ingresados</div>
    </div>
    
    <div class="results-grid">
      <div class="result-card highlight">
        <div class="result-label">Monto solicitado</div>
        <div class="result-value">$${montoFormat}</div>
      </div>
      <div class="result-card highlight">
        <div class="result-label">Cuota mensual</div>
        <div class="result-value">$${cuotaFormat}</div>
      </div>
      <div class="result-card">
        <div class="result-label">Plazo</div>
        <div class="result-value">${plazo} meses</div>
      </div>
      <div class="result-card">
        <div class="result-label">Total de intereses</div>
        <div class="result-value">$${intereFormat}</div>
      </div>
      <div class="result-card">
        <div class="result-label">Total pagado</div>
        <div class="result-value">$${totalFormat}</div>
      </div>
    </div>
    
    <div class="tabla-section">
      <h3 class="tabla-title">Tabla de Amortización</h3>
      <div class="tabla-wrapper">
        <table class="tabla-amortizacion">
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
            ${tablaHTML}
          </tbody>
        </table>
      </div>
    </div>
    
    <div class="cta-section">
      <p class="cta-text">¿Te interesa este crédito?</p>
      <button class="btn btn-gold" onclick="showToast('📋 Iniciando solicitud de crédito...')">Solicitar ahora</button>
      <button class="btn btn-outline" onclick="showToast('📞 Conectando con un asesor...')">Hablar con asesor</button>
    </div>
  `;
}

// ═══════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    const href = this.getAttribute('href');
    if (href !== '#') {
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    }
  });
});
