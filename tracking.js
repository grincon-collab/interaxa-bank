/**
 * Interaxa Bank — Tracking & Analytics Layer
 * ============================================================
 * Integrations supported:
 *  1. Genesys Cloud — Predictive Engagement (Journey SDK)
 *  2. Google Analytics 4 (GA4) — gtag events
 *  3. Generic DataLayer (compatible with GTM, Segment, etc.)
 *
 * Usage:
 *  - Replace GENESYS_DEPLOYMENT_ID with your real Deployment ID
 *    from Genesys Cloud > Predictive Engagement > Deployments
 *  - Replace GA_MEASUREMENT_ID with your GA4 Measurement ID
 *  - All page views and events fire automatically when the
 *    app calls the public API: IXTrack.page() / IXTrack.event()
 * ============================================================
 */

'use strict';

// ─────────────────────────────────────────────
// CONFIG  — replace values before going live
// ─────────────────────────────────────────────
const TRACKING_CONFIG = {
  genesys: {
    enabled: true,
    deploymentId: 'YOUR_GENESYS_DEPLOYMENT_ID',   // ← replace
    region: 'use1',                                // use1 | euw1 | apse1 | cac1
    environment: 'https://api.mypurecloud.com',    // your Genesys org environment
  },
  ga4: {
    enabled: true,
    measurementId: 'G-XXXXXXXXXX',                 // ← replace
  },
  dataLayer: {
    enabled: true,   // always push to window.dataLayer (GTM compatible)
  },
  debug: false,      // set true to log all events to console
};

// ─────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────
const _log = (...args) => {
  if (TRACKING_CONFIG.debug) console.log('[IXTrack]', ...args);
};

const _dl = (payload) => {
  if (!TRACKING_CONFIG.dataLayer.enabled) return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(payload);
  _log('dataLayer ←', payload);
};

const _ga = (eventName, params = {}) => {
  if (!TRACKING_CONFIG.ga4.enabled) return;
  if (typeof window.gtag !== 'function') return;
  window.gtag('event', eventName, params);
  _log('GA4 ←', eventName, params);
};

// ─────────────────────────────────────────────
// 1. GENESYS CLOUD — PREDICTIVE ENGAGEMENT
// ─────────────────────────────────────────────
const GenesysTracker = (() => {

  /**
   * Injects the Genesys Cloud Web Messenger / Journey snippet.
   * Must be called once on page load.
   * Docs: https://developer.genesys.cloud/commdigital/digital/webmessaging/predictiveengagement
   */
  function init() {
    if (!TRACKING_CONFIG.genesys.enabled) return;

    const { deploymentId, environment } = TRACKING_CONFIG.genesys;

    // Bootstrap the Genesys Journey SDK (async snippet)
    (function (g, e, n, es, ys) {
      g['_genesysJs'] = e;
      g[e] = g[e] || function () { (g[e].q = g[e].q || []).push(arguments); };
      g[e].t = 1 * new Date();
      g[e].c = es;
      ys = document.createElement('script');
      ys.async = 1;
      ys.src = n;
      ys.charset = 'utf-8';
      document.head.appendChild(ys);
    })(
      window,
      'Genesys',
      'https://apps.mypurecloud.com/genesys-bootstrap/genesys.min.js',
      {
        environment,
        deploymentId,
      }
    );

    _log('Genesys Journey SDK initialized. Deployment:', deploymentId);
  }

  /**
   * Sends a custom Journey event to Genesys Predictive Engagement.
   * These events feed the scoring model and can trigger proactive chat.
   *
   * @param {string} eventName  - e.g. 'SimulatorUsed', 'ProductViewed'
   * @param {object} attributes - key/value pairs (strings only)
   */
  function sendEvent(eventName, attributes = {}) {
    if (!TRACKING_CONFIG.genesys.enabled) return;
    if (typeof window.Genesys !== 'function') {
      _log('Genesys not ready — queuing event:', eventName);
      return;
    }
    window.Genesys('command', 'Journey.record', {
      eventName,
      attributes,
    });
    _log('Genesys Journey ←', eventName, attributes);
  }

  /**
   * Identifies the visitor (e.g. after login or form submit).
   * Maps to Genesys External Contact.
   *
   * @param {object} identity  - { email, phone, customerId, name }
   */
  function identify(identity = {}) {
    if (!TRACKING_CONFIG.genesys.enabled) return;
    if (typeof window.Genesys !== 'function') return;
    window.Genesys('command', 'Journey.identify', {
      customerId:  identity.customerId || '',
      email:       identity.email      || '',
      phone:       identity.phone      || '',
      firstName:   identity.firstName  || '',
      lastName:    identity.lastName   || '',
    });
    _log('Genesys identify ←', identity);
  }

  /**
   * Triggers a proactive engagement action manually
   * (e.g. after high-intent score detected in your own logic).
   */
  function triggerAction(actionId) {
    if (!TRACKING_CONFIG.genesys.enabled) return;
    if (typeof window.Genesys !== 'function') return;
    window.Genesys('command', 'Messenger.open');
    _log('Genesys proactive action triggered:', actionId);
  }

  return { init, sendEvent, identify, triggerAction };
})();

// ─────────────────────────────────────────────
// 2. GOOGLE ANALYTICS 4
// ─────────────────────────────────────────────
const GA4Tracker = (() => {

  function init() {
    if (!TRACKING_CONFIG.ga4.enabled) return;
    const { measurementId } = TRACKING_CONFIG.ga4;

    // Inject gtag.js
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', measurementId, { send_page_view: false });

    _log('GA4 initialized. Measurement ID:', measurementId);
  }

  return { init };
})();

// ─────────────────────────────────────────────
// 3. PUBLIC TRACKING API  — IXTrack
// ─────────────────────────────────────────────
/**
 * IXTrack — Interaxa Tracking unified API
 *
 * Call these methods from app.js instead of calling
 * individual vendor SDKs directly. This keeps vendor
 * code isolated and easy to swap.
 */
const IXTrack = (() => {

  // Session context accumulated across page views
  const session = {
    startTime:    Date.now(),
    pageCount:    0,
    events:       [],
    lastPage:     null,
    simulatorUsed: false,
  };

  // ── INIT ──────────────────────────────────
  function init() {
    GA4Tracker.init();
    GenesysTracker.init();
    _log('IXTrack ready');
  }

  // ── PAGE VIEW ─────────────────────────────
  /**
   * Track a virtual page view (SPA navigation).
   * Call this inside showPage() in app.js.
   *
   * @param {string} pageId    - e.g. 'home', 'personal', 'simulator'
   * @param {string} pageTitle - Human-readable label
   */
  function page(pageId, pageTitle) {
    session.pageCount++;
    session.lastPage = pageId;

    const payload = {
      event:      'virtualPageView',
      page_id:    pageId,
      page_title: pageTitle,
      page_path:  `/#${pageId}`,
      session_page_count: session.pageCount,
      timestamp:  new Date().toISOString(),
    };

    // → dataLayer / GTM
    _dl(payload);

    // → GA4
    _ga('page_view', {
      page_title:    pageTitle,
      page_location: window.location.origin + `/#${pageId}`,
      page_path:     `/#${pageId}`,
    });

    // → Genesys Journey: page view event
    GenesysTracker.sendEvent('PageViewed', {
      pageId,
      pageTitle,
      pageCount: String(session.pageCount),
    });

    _log(`page() → ${pageId} | "${pageTitle}"`);
  }

  // ── CUSTOM EVENT ──────────────────────────
  /**
   * Track a custom interaction event.
   *
   * @param {string} category  - e.g. 'simulator', 'product', 'navigation'
   * @param {string} action    - e.g. 'calculate', 'view', 'click_cta'
   * @param {object} data      - additional key/value context
   */
  function event(category, action, data = {}) {
    const payload = {
      event:    `${category}_${action}`,
      category,
      action,
      ...data,
      timestamp: new Date().toISOString(),
    };

    session.events.push(payload);

    // → dataLayer / GTM
    _dl(payload);

    // → GA4
    _ga(`${category}_${action}`, {
      event_category: category,
      event_label:    data.label || action,
      ...data,
    });

    // → Genesys Journey
    const genesysAttrs = {};
    Object.entries({ category, action, ...data }).forEach(([k, v]) => {
      genesysAttrs[k] = String(v);  // Genesys requires string values
    });
    GenesysTracker.sendEvent(`${category}_${action}`, genesysAttrs);

    _log(`event() → ${category}/${action}`, data);
  }

  // ── IDENTIFY ──────────────────────────────
  /**
   * Associate the current visitor with a known identity.
   * Call after login or after a form submission with contact info.
   */
  function identify(identity = {}) {
    GenesysTracker.identify(identity);
    _ga('login', { method: 'form' });
    _dl({ event: 'identify', ...identity });
  }

  // ── SCORE HINT ────────────────────────────
  /**
   * Optionally signal high intent directly to Genesys,
   * e.g. when a visitor spends >60s on simulator with a large loan amount.
   */
  function highIntentSignal(reason, data = {}) {
    GenesysTracker.triggerAction('high_intent');
    event('engagement', 'high_intent_detected', { reason, ...data });
    _log('⚡ High-intent signal:', reason, data);
  }

  return { init, page, event, identify, highIntentSignal };
})();

// ─────────────────────────────────────────────
// AUTO-INIT on DOM ready
// ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  IXTrack.init();
  IXTrack.page('home', 'Inicio');  // initial page view
});
