# Interaxa Bank V2

Aplicación de demostración para el sector bancario con integración a Genesys Cloud. 
Proporciona una interfaz para simulador de crédito y se conecta a Genesys Cloud (creación de Workitems a través de API).

## Requisitos
- Node.js >= 16.0.0

## Instalación y Configuración

1. Clona el repositorio.
2. Crea un archivo `.env` basado en `.env.example`:
   ```bash
   cp .env.example .env
   ```
3. Edita `.env` y añade tus credenciales (`GENESYS_CLIENT_ID` y `GENESYS_CLIENT_SECRET`).
4. (Opcional) Instala dependencias si hubieran: `npm install`
5. Inicia el servidor:
   ```bash
   npm start
   ```

## Estructura

- `server.js`: Proxy backend en Node.js que procesa la petición y se comunica con Genesys Cloud (resuelve problemas de CORS).
- `app.js` / `index.html` / `styles.css`: Frontend de la aplicación.
- `tracking.js`: Utilidades de tracking y analíticas (si aplica).

## Endpoints

- `GET /`: Interfaz de la aplicación bancaria.
- `POST /api/solicitar-credito`: Punto de entrada que comunica con la API de Genesys Cloud. Requiere los siguientes campos en formato JSON:
  - `documento_text`
  - `nombre_cliente_text`
  - `tipo_credito_text`
  - `valor_credito_text`
  - `telefono_cliente_text`
