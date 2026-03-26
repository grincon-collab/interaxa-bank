/**
 * Interaxa Bank — Proxy Server
 * ============================================================
 * Resuelve el error CORS al llamar a Genesys Cloud desde el browser.
 *
 * El browser NO puede llamar directamente a login.mypurecloud.com
 * porque Genesys bloquea peticiones cross-origin desde frontends.
 *
 * Arquitectura:
 *   Browser → POST /api/solicitar-credito → Este servidor
 *                                          → Genesys (token + workitem)
 *                                          ← Respuesta al browser
 *
 * Uso:
 *   1. npm install
 *   2. node server.js
 *   3. Abrir http://localhost:3000
 * ============================================================
 */

'use strict';

const https    = require('https');
const http     = require('http');
const fs       = require('fs');
const path     = require('path');

// ─────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

const DATA_ACTION_CONFIG = {
  clientId:     '1eb69ae7-1be2-4d73-a55e-fc0308fcbf1d',
  clientSecret: '94pT8m2Jm4ZfIyCyxzaJwMJWXa4GF2r3tlyuv_qaw2E',
  tokenUrl:     'login.mypurecloud.com',
  apiUrl:       'api.mypurecloud.com',
  typeId:       '0eb59c4e-b628-4b1e-9c83-7cc9ba8c3f2f',
  queueId:      '4a63f06a-ff43-44f2-b4b1-7524162210a1',
  workitemName: 'WTL_Credito',
};

// ─────────────────────────────────────────────
// HELPER: petición HTTPS nativa (sin axios)
// ─────────────────────────────────────────────
function httpsRequest(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(data)); }
          catch { resolve(data); }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// ─────────────────────────────────────────────
// STEP 1: Obtener Token OAuth (Client Credentials)
// ─────────────────────────────────────────────
async function getGenesysToken() {
  const credentials = Buffer.from(
    `${DATA_ACTION_CONFIG.clientId}:${DATA_ACTION_CONFIG.clientSecret}`
  ).toString('base64');

  const postData = 'grant_type=client_credentials';

  const options = {
    hostname: DATA_ACTION_CONFIG.tokenUrl,
    path:     '/oauth/token',
    method:   'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type':  'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData),
    },
  };

  console.log('  → Step 1: Solicitando Token OAuth...');
  const response = await httpsRequest(options, postData);
  console.log('  ✅ Token obtenido.');
  return response.access_token;
}

// ─────────────────────────────────────────────
// STEP 2: Crear Workitem en Genesys Cloud
// ─────────────────────────────────────────────
async function createGenesysWorkitem(token, input) {
  const body = JSON.stringify({
    name:    DATA_ACTION_CONFIG.workitemName,
    typeId:  DATA_ACTION_CONFIG.typeId,
    queueId: DATA_ACTION_CONFIG.queueId,
    customFields: {
      documento_text:        input.documento_text,        // Número de documento (formulario)
      nombre_cliente_text:   input.nombre_cliente_text,   // Nombre completo     (formulario)
      tipo_credito_text:     input.tipo_credito_text,     // Tipo de crédito     (simulador)
      valor_credito_text:    input.valor_credito_text,    // Monto solicitado    (simulador)
      telefono_cliente_text: input.telefono_cliente_text, // Teléfono/WhatsApp   (formulario)
    },
  });

  const options = {
    hostname: DATA_ACTION_CONFIG.apiUrl,
    path:     '/api/v2/taskmanagement/workitems',
    method:   'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type':  'application/json',
      'Content-Length': Buffer.byteLength(body),
    },
  };

  console.log('  → Step 2: Creando Workitem...');
  const response = await httpsRequest(options, body);
  console.log('  ✅ Workitem creado ID:', response.id);
  return response;
}

// ─────────────────────────────────────────────
// HELPER: leer body de la request
// ─────────────────────────────────────────────
function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try { resolve(JSON.parse(body)); }
      catch { reject(new Error('JSON inválido en el body')); }
    });
    req.on('error', reject);
  });
}

// ─────────────────────────────────────────────
// HELPER: headers CORS para todas las respuestas
// ─────────────────────────────────────────────
function setCORSHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// ─────────────────────────────────────────────
// SERVIDOR HTTP
// ─────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  setCORSHeaders(res);

  // Preflight CORS
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url.split('?')[0];

  // ── POST /api/solicitar-credito ──────────────
  // Recibe los datos del formulario + simulador,
  // obtiene token y crea workitem en Genesys.
  if (req.method === 'POST' && url === '/api/solicitar-credito') {
    console.log('\n📥 Nueva solicitud de crédito recibida');
    try {
      const input = await readBody(req);

      // Validación básica de campos requeridos
      const required = ['documento_text','nombre_cliente_text','tipo_credito_text',
                        'valor_credito_text','telefono_cliente_text'];
      const missing = required.filter(k => !input[k]);
      if (missing.length > 0) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `Campos requeridos: ${missing.join(', ')}` }));
        return;
      }

      const token  = await getGenesysToken();
      const result = await createGenesysWorkitem(token, input);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, workitemId: result.id, data: result }));

    } catch (error) {
      console.error('❌ Error:', error.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
    return;
  }

  // ── GET / → Servir archivos estáticos ────────
  // Sirve index.html, app.js, styles.css, tracking.js
  if (req.method === 'GET') {
    const fileMap = {
      '/':             'index.html',
      '/index.html':   'index.html',
      '/app.js':       'app.js',
      '/styles.css':   'styles.css',
      '/tracking.js':  'tracking.js',
    };

    const fileName = fileMap[url];
    if (fileName) {
      const filePath = path.join(__dirname, fileName);
      const extMap = {
        '.html': 'text/html',
        '.js':   'application/javascript',
        '.css':  'text/css',
      };
      const contentType = extMap[path.extname(filePath)] || 'text/plain';

      try {
        const content = fs.readFileSync(filePath);
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      } catch {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Archivo no encontrado');
      }
      return;
    }
  }

  // 404 por defecto
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Ruta no encontrada' }));
});

server.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║   Interaxa Bank — Proxy Server           ║');
  console.log(`║   http://localhost:${PORT}                   ║`);
  console.log('╚══════════════════════════════════════════╝');
  console.log('');
  console.log('Endpoints disponibles:');
  console.log(`  GET  http://localhost:${PORT}/          → Sitio web`);
  console.log(`  POST http://localhost:${PORT}/api/solicitar-credito → Genesys Workitem`);
  console.log('');
});
