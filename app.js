// ===== Setup base responsivo + animación del título =====
const canvas = document.getElementById('c');
const title = document.getElementById('title');
const ctx = canvas.getContext('2d', { alpha: true });

// Sustituye el with(...) por destructuring:
const { cos: C, sin: S, pow: P, random: R } = Math;

const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
let zbuf = new Map();

function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    zbuf.clear(); // limpiar z-buffer al redimensionar
}
window.addEventListener('resize', resizeCanvas);

// ===== Código de la rosa (strict-mode friendly) =====
(function start() {
    resizeCanvas();

    const f = 500;   // factor del algoritmo original
    const h = -250;  // desplazamiento

    // Declaramos TODAS las temporales que antes eran implícitas
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

    let started = false;

    function tick() {
        const rect = canvas.getBoundingClientRect();
        const cx = rect.width / 2;
        const cy = rect.height / 2;

        for (let i = 0; i < 1e4; i++) {
            const s = p(R(), R(), i % 46 / .74);
            if (!s) continue;

            const z = s[2];
            const x = Math.round(s[0] * f / z + cx); // centrado
            const y = Math.round(s[1] * f / z + cy);

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

    requestAnimationFrame(tick);
})();
