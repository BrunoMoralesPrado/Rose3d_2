// ==================== app.js ====================

// Canvas + título
const canvas = document.getElementById('c');
const title = document.getElementById('title');
const ctx = canvas.getContext('2d', { alpha: true });

// Maths (reemplaza el "with(Math)" del snippet original)
const { cos: C, sin: S, pow: P, random: R } = Math;

// HiDPI
const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));

// Z-buffer
let zbuf = new Map();

// Escala y paneo calculados por auto-centrado
let F = 500;     // escala efectiva (se recalcula)
let panX = 0;    // desplazamiento X
let panY = 0;    // desplazamiento Y

// Resize del canvas al tamaño visual y limpieza de z-buffer
function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    zbuf.clear();
}

// ---------- Núcleo del algoritmo (versión strict-mode) ----------
const f = 500;   // factor del algoritmo original (base)
const h = -250;  // desplazamiento original

function p(a, b, c) {
    if (c > 60) {
        return [
            S(a * 7) * (13 + 5 / (.2 + P(b * 4, 4))) - S(b) * 50,
            b * f + 50,
            625 + C(a * 7) * (13 + 5 / (.2 + P(b * 4, 4))) + b * 400,
            a * 1 - b / 2,
            a
        ];
    }

    let A = a * 2 - 1;
    let B = b * 2 - 1;

    if (A * A + B * B < 1) {
        if (c > 37) {
            let j = (c & 1) ? 1 : 0;
            let n = j ? 6 : 4;
            let o = .5 / (a + .01) + C(b * 125) * 3 - a * 300;
            let w = b * h;
            return [
                o * C(n) + w * S(n) + (j ? 610 : -390),
                o * S(n) - w * C(n) + 550 - (j ? 350 : 0),
                1180 + C(B + A) * 99 - (j ? 300 : 0),
                .4 - a * .1 + P(1 - B * B, -h * 6) * .15 - a * b * .4 + C(a + b) / 5 +
                P(C((o * (a + 1) + (B > 0 ? w : -w)) / 25), 30) * .1 * (1 - B * B),
                o / 1e3 + .7 - o * w * 3e-6
            ];
        }
        if (c > 32) {
            c = c * 1.16 - .15;
            let o = a * 45 - 20;
            let w = b * b * h;
            let z = o * S(c) + w * C(c) + 620;
            return [
                o * C(c) - w * S(c),
                28 + C(B * .5) * 99 - b * b * b * 60 - z / 2 - h,
                z,
                (b * b * .3 + P((1 - (A * A)), 7) * .15 + .3) * b,
                b * .7
            ];
        }
        let o = A * (2 - b) * (80 - c * 2);
        let w = 99 - C(A) * 120 - C(b) * (-h - c * 4.9) + C(P(1 - b, 7)) * 50 + c * 2;
        let z = o * S(c) + w * C(c) + 700;
        return [
            o * C(c) - w * S(c),
            B * 99 - C(P(b, 7)) * 50 - c / 3 - z / 1.35 + 450,
            z,
            (1 - b / 1.2) * .9 + a * .1,
            P((1 - b), 20) / 4 + .05
        ];
    }
    return null;
}
// ---------------------------------------------------------------

// --- Autocentrado + Autofit (mide caja proyectada y ajusta F/pan) ---
function projectSample(a1, b1, c1, fBase) {
    // p() usa f fijo=500 en su interior; medimos en ese sistema
    const s = p(a1, b1, c1);
    if (!s) return null;
    const z = s[2];
    return { x: (s[0] * fBase) / z, y: (s[1] * fBase) / z, z };
}

function measureBounds(samples = 9000, fBase = 500) {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    for (let i = 0; i < samples; i++) {
        const cval = (i % 46) / 0.74; // mismo rango que en el render
        const s = projectSample(Math.random(), Math.random(), cval, fBase);
        if (!s) continue;
        if (s.x < minX) minX = s.x;
        if (s.x > maxX) maxX = s.x;
        if (s.y < minY) minY = s.y;
        if (s.y > maxY) maxY = s.y;
    }
    return { minX, maxX, minY, maxY };
}

function autoCenterAndFit() {
    const rect = canvas.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;

    const baseF = 500; // sistema de medida del modelo (igual a f)
    const box = measureBounds(9000, baseF);

    const wModel = box.maxX - box.minX;
    const hModel = box.maxY - box.minY;

    // margen para no tocar bordes
    const margin = 0.88; // 88% del contenedor
    const scaleX = (rect.width * margin) / wModel;
    const scaleY = (rect.height * margin) / hModel;

    F = baseF * Math.min(scaleX, scaleY); // nueva escala efectiva

    // Centro del modelo (en coords base) escalado a F
    const modelCx = ((box.minX + box.maxX) / 2) * (F / baseF);
    const modelCy = ((box.minY + box.maxY) / 2) * (F / baseF);

    // Paneo para colocar centro del modelo en centro del lienzo
    panX = cx - modelCx;
    panY = cy - modelCy;

    // Opcional: levanta un poquito la flor (estética)
    // panY -= 10;
}

// Recalcular en inicio y en resize
function recalcLayout() {
    resizeCanvas();
    autoCenterAndFit();
}

// ---------- Bucle de dibujo ----------
let started = false;

function tick() {
    const rect = canvas.getBoundingClientRect();

    for (let i = 0; i < 1e4; i++) {
        const s = p(R(), R(), i % 46 / .74);
        if (!s) continue;

        const z = s[2];
        const x = Math.round((s[0] * F) / z + panX);
        const y = Math.round((s[1] * F) / z + panY);

        if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) continue;

        const key = y * rect.width + x;
        if (!zbuf.has(key) || zbuf.get(key) > z) {
            zbuf.set(key, z);
            ctx.fillStyle = `rgb(${~(s[3] * h)},${~(s[4] * h)},${~(s[3] * s[3] * -80)})`;
            ctx.fillRect(x, y, 1, 1);
        }
    }

    if (!started) {
        started = true;
        requestAnimationFrame(() => title.classList.add('reveal'));
    }
    requestAnimationFrame(tick);
}

// Init
window.addEventListener('resize', recalcLayout);
recalcLayout();
requestAnimationFrame(tick);

// ================== fin app.js ==================
