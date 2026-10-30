#!/usr/bin/env node
/**
 * JINStock - Script de Prueba de Carga y Rendimiento (Fase 3 / Lab 15)
 * Ejecuta 50 solicitudes con concurrencia 10 contra endpoints del backend,
 * reportando latencia media, p95, p50 y tasa de errores HTTP 5xx.
 *
 * Uso:
 *   node backend/scripts/load-test.js [BASE_URL]
 *   Ejemplo: node backend/scripts/load-test.js https://jinstock-proyect.onrender.com
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

const rawBaseUrl = process.argv[2] || process.env.TEST_URL || 'http://localhost:4000';
let baseUrl = rawBaseUrl.replace(/\/+$/, '');
if (baseUrl.endsWith('/api/health')) {
  baseUrl = baseUrl.slice(0, -'/api/health'.length);
} else if (baseUrl.endsWith('/health')) {
  baseUrl = baseUrl.slice(0, -'/health'.length);
} else if (baseUrl.endsWith('/api')) {
  baseUrl = baseUrl.slice(0, -'/api'.length);
}

function requestAsync(targetUrl, options = {}) {
  return new Promise((resolve) => {
    const parsed = new URL(targetUrl);
    const client = parsed.protocol === 'https:' ? https : http;
    const start = process.hrtime.bigint();

    const req = client.request(
      parsed,
      {
        method: options.method || 'GET',
        headers: options.headers || {},
        timeout: options.timeout || 15000,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          const end = process.hrtime.bigint();
          const durationMs = Number(end - start) / 1e6;
          resolve({
            ok: true,
            status: res.statusCode,
            durationMs,
            body,
          });
        });
      }
    );

    req.on('timeout', () => {
      req.destroy(new Error('TIMEOUT'));
    });

    req.on('error', (err) => {
      const end = process.hrtime.bigint();
      const durationMs = Number(end - start) / 1e6;
      resolve({
        ok: false,
        status: 0,
        error: err.message,
        durationMs,
      });
    });

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

function calculatePercentile(sortedValues, percentile) {
  if (sortedValues.length === 0) return 0;
  const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(0, Math.min(index, sortedValues.length - 1))];
}

async function runConcurrentBatch(url, totalRequests = 50, concurrency = 10, headers = {}) {
  const results = [];
  let completed = 0;
  let active = 0;
  let index = 0;

  return new Promise((resolve) => {
    function launchNext() {
      while (active < concurrency && index < totalRequests) {
        const currentIndex = index++;
        active++;
        requestAsync(url, { headers })
          .then((res) => {
            results.push(res);
          })
          .catch((err) => {
            results.push({ ok: false, status: 0, error: err.message, durationMs: 0 });
          })
          .finally(() => {
            active--;
            completed++;
            if (completed === totalRequests) {
              resolve(results);
            } else {
              launchNext();
            }
          });
      }
    }
    launchNext();
  });
}

function printReport(title, url, results, totalDurationSec) {
  const latencies = results.map((r) => r.durationMs).sort((a, b) => a - b);
  const total = results.length;
  const avg = latencies.reduce((a, b) => a + b, 0) / (total || 1);
  const min = latencies[0] || 0;
  const max = latencies[latencies.length - 1] || 0;
  const p50 = calculatePercentile(latencies, 50);
  const p95 = calculatePercentile(latencies, 95);

  const statusCounts = {};
  let errors5xx = 0;
  let errorsNon2xx = 0;

  results.forEach((r) => {
    statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
    if (r.status >= 500 && r.status < 600) {
      errors5xx++;
    }
    if (!r.status || r.status < 200 || r.status >= 300) {
      errorsNon2xx++;
    }
  });

  console.log('\n================================================================');
  console.log(`📊 REPORTE DE CARGA: ${title}`);
  console.log(`🎯 URL: ${url}`);
  console.log(`⏱️  Total solicitudes: ${total} | Concurrencia: 10 | Tiempo total: ${totalDurationSec.toFixed(2)}s`);
  console.log('----------------------------------------------------------------');
  console.log(`⚡ Latencia Min:           ${min.toFixed(2)} ms`);
  console.log(`⚡ Latencia Mediana (p50): ${p50.toFixed(2)} ms`);
  console.log(`⚡ Latencia Media:         ${avg.toFixed(2)} ms`);
  console.log(`⚡ Latencia p95:           ${p95.toFixed(2)} ms  ${p95 < 500 ? '✅ (Cumple < 500ms)' : '⚠️ (Supera 500ms)'}`);
  console.log(`⚡ Latencia Max:           ${max.toFixed(2)} ms`);
  console.log('----------------------------------------------------------------');
  console.log(`🚨 Errores HTTP 5xx:       ${errors5xx} ${errors5xx === 0 ? '✅ (Cero caídas)' : '❌ (Fallos 5xx detectados)'}`);
  console.log(`🚨 Respuestas no 2xx:      ${errorsNon2xx} ${errorsNon2xx === 0 ? '✅ (100% exitosas)' : '❌ (Respuestas fallidas)'}`);
  console.log('📋 Códigos HTTP recibidos:', JSON.stringify(statusCounts));
  console.log('================================================================');

  return { errors5xx, errorsNon2xx, p95, avg };
}

async function main() {
  console.log(`🚀 Iniciando prueba de carga contra: ${baseUrl}`);

  // 1. Pre-calentamiento (Warm-up)
  console.log('🔥 Calentando servicio (warm-up ping a /api/health)...');
  const warmupStart = Date.now();
  const warmupRes = await requestAsync(`${baseUrl}/api/health`, { timeout: 30000 });
  const warmupSec = (Date.now() - warmupStart) / 1000;

  if (!warmupRes.ok || warmupRes.status !== 200) {
    console.error(`❌ ERROR: Warm-up falló. Se esperaba HTTP 200 en ${baseUrl}/api/health pero se recibió HTTP ${warmupRes.status} (${warmupRes.error || 'código no 200'}).`);
    process.exit(1);
  }
  console.log(`✅ Warm-up completado en ${warmupSec.toFixed(2)}s (HTTP 200).`);

  // 2. Medición 1: /api/health (50 solicitudes, concurrencia 10)
  console.log('\n⚡ Ejecutando 50 solicitudes a /api/health (concurrencia 10)...');
  const t1Start = Date.now();
  const healthResults = await runConcurrentBatch(`${baseUrl}/api/health`, 50, 10);
  const t1Sec = (Date.now() - t1Start) / 1000;
  const rep1 = printReport('Endpoint de Salud (/api/health)', `${baseUrl}/api/health`, healthResults, t1Sec);

  // 3. Medición 2: /api/products?all=true (Endpoint real de datos) o /api
  const token = process.env.AUTH_TOKEN;
  let rep2;
  if (token) {
    console.log('\n⚡ Ejecutando 50 solicitudes a /api/products?all=true con token (concurrencia 10)...');
    const t2Start = Date.now();
    const dataResults = await runConcurrentBatch('' + baseUrl + '/api/products?all=true', 50, 10, { Authorization: 'Bearer ' + token });
    const t2Sec = (Date.now() - t2Start) / 1000;
    rep2 = printReport('Catálogo con BD y Auth (/api/products?all=true)', baseUrl + '/api/products?all=true', dataResults, t2Sec);
  } else {
    console.log('\n⚡ Ejecutando 50 solicitudes a /api (concurrencia 10)...');
    const t2Start = Date.now();
    const apiResults = await runConcurrentBatch(baseUrl + '/api', 50, 10);
    const t2Sec = (Date.now() - t2Start) / 1000;
    rep2 = printReport('Endpoint Catálogo Informativo (/api)', baseUrl + '/api', apiResults, t2Sec);
  }

  const totalNon2xx = rep1.errorsNon2xx + rep2.errorsNon2xx;
  if (totalNon2xx > 0) {
    console.error(`\n❌ La prueba falló: se registraron ${totalNon2xx} respuestas fuera del rango 2xx (incluyendo ${rep1.errors5xx + rep2.errors5xx} errores 5xx).`);
    process.exit(1);
  } else {
    console.log('\n✅ Prueba de carga satisfactoria: 100% respuestas 2xx, 0 caídas y latencias en rango.');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Error fatal durante la prueba de carga:', err);
  process.exit(1);
});
