// 粒子背景：數千顆細小粒子在幾種形狀之間依序變形，顏色跟著漸變。
// 純 Canvas 2D，沒有任何外部套件。
//
// 設計重點
//  - 無狀態：每一幀直接由「上一個形狀、下一個形狀、進度」算出位置，
//    不做物理積分，所以視窗縮放、分頁切走再回來都不會壞掉。
//  - 每顆粒子有各自的延遲，變形時是像沙子一樣一批一批散開再聚攏，
//    而不是整片同時平移。
//  - 手機會自動降低粒子數，並在畫面吃力時再砍一次，優先保住流暢度。
//  - 「減少動態效果」的使用者只會看到一張靜態畫面。
(function () {
  'use strict';

  var canvas = document.getElementById('bg');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarse = window.matchMedia && matchMedia('(pointer: coarse)').matches;

  // ---- 調色盤：每個形狀 4 個顏色（第 4 個是亮白點綴）-----------------------
  var PAL = [
    [[143, 184, 255], [77, 125, 255], [181, 124, 255], [255, 255, 255]],  // 星：藍紫白
    [[61, 107, 255], [106, 160, 255], [42, 75, 224], [160, 196, 255]],    // 光帶：藍
    [[255, 90, 77], [255, 138, 112], [212, 59, 106], [255, 176, 160]],    // 緞帶：紅粉
    [[53, 224, 176], [77, 157, 255], [160, 112, 255], [208, 255, 232]],   // 十字：青紫
  ];
  var SHAPES = PAL.length;

  var HOLD = 3.6;     // 停在一個形狀的秒數
  var MORPH = 2.8;    // 變形到下一個的秒數
  var CYCLE = HOLD + MORPH;
  var STAGGER = 0.5;  // 粒子出發時間的最大延遲（佔變形時間的比例）

  // ---- 狀態 ---------------------------------------------------------------
  var W = 0, H = 0, DPR = 1;
  var N = 0, activeN = 0, dustN = 0;
  var targets = [];        // 每個形狀一個 Float32Array(2N)，單位是畫布像素
  var delay, scatX, scatY, jAmp, jSpd, jPh;
  var order, bucketStart;  // 依顏色桶排序，同色的一次畫完（少換 fillStyle）
  var sz0 = 1, sz1 = 2;
  var glowCanvas = document.createElement('canvas'), glowCtx = null, glowW = 1, glowH = 1;
  var startTime = performance.now();
  var lastRebuild = 0;

  // 指標（滑鼠／手指）會把附近的粒子輕輕推開
  var px = -9999, py = -9999, pStrength = 0, pTarget = 0, lastMove = 0;

  // ---- 小工具 -------------------------------------------------------------
  function gauss() {
    var u = 1 - Math.random(), v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function lerp(a, b, t) { return a + (b - a) * t; }

  // ---- 形狀產生器 ---------------------------------------------------------
  // 每個 gen 把 N 顆粒子的目標位置寫進 a。前 dustN 顆是「塵」：
  // 每個形狀都隨機散在整個畫面，讓背景永遠有稀疏的細沙。
  function dust(a) {
    for (var i = 0; i < dustN; i++) {
      a[2 * i] = Math.random() * W;
      a[2 * i + 1] = Math.random() * H;
    }
  }

  function genStar(a, cx, cy, S) {
    dust(a);
    for (var i = dustN; i < N; i++) {
      // 星形線（astroid）x=cos³θ, y=sin³θ：四個尖角、四邊內凹
      var th = Math.random() * 6.2831853;
      var c = Math.cos(th), s = Math.sin(th);
      // 只往外散，中間留黑。三層：緊貼邊緣的亮線（過半）、
      // 稍微散開的光暈、散得很遠的細沙
      var rr = Math.random();
      var k = 1 + Math.abs(gauss()) * (rr < 0.55 ? 0.035 : rr < 0.85 ? 0.11 : 0.38);
      a[2 * i] = cx + c * c * c * S * k + gauss() * S * 0.006;
      a[2 * i + 1] = cy + s * s * s * S * k + gauss() * S * 0.006;
    }
  }

  function genBeams(a, cx, cy, S) {
    dust(a);
    var ang = 0.62, dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx;
    var L = Math.sqrt(W * W + H * H);
    var offs = [-0.62, 0.02, 0.7], wts = [0.3, 0.45, 0.25];
    for (var i = dustN; i < N; i++) {
      var r = Math.random(), l = r < wts[0] ? 0 : r < wts[0] + wts[1] ? 1 : 2;
      var along = clamp(gauss() * L * 0.26, -L * 0.6, L * 0.6);
      var perp = offs[l] * S + gauss() * S * (Math.random() < 0.7 ? 0.012 : 0.1);
      a[2 * i] = cx + dx * along + nx * perp;
      a[2 * i + 1] = cy + dy * along + ny * perp;
    }
  }

  function genRibbon(a, cx, cy, S) {
    dust(a);
    for (var i = dustN; i < N; i++) {
      var x = Math.random() * W * 1.2 - W * 0.1;
      var second = Math.random() < 0.4;
      var ph = second ? 1.7 : 0;
      var u = x / W * Math.PI * 2 * 1.05 + ph;
      var y = cy + Math.sin(u) * H * (second ? 0.1 : 0.15) + (second ? H * 0.13 : -H * 0.07);
      // 緞帶粗細沿著波形忽粗忽細
      y += gauss() * S * (0.012 + 0.11 * Math.abs(Math.sin(u * 0.6)));
      a[2 * i] = x;
      a[2 * i + 1] = y;
    }
  }

  function genCross(a, cx, cy, S) {
    dust(a);
    for (var i = dustN; i < N; i++) {
      var x, y;
      if (Math.random() < 0.62) {
        // 沿水平／垂直軸拉出去的光，中心挖空
        var horiz = Math.random() < 0.5;
        var along = (Math.random() < 0.5 ? -1 : 1) * (S * 0.3 + Math.abs(gauss()) * S * 0.9);
        var perp = gauss() * S * 0.07 * (1 + Math.abs(along) / S);
        x = horiz ? cx + along : cx + perp;
        y = horiz ? cy + perp : cy + along;
      } else {
        var r = S * (0.42 + Math.abs(gauss()) * 0.85), t = Math.random() * 6.2831853;
        x = cx + Math.cos(t) * r;
        y = cy + Math.sin(t) * r * 0.9;
      }
      a[2 * i] = x;
      a[2 * i + 1] = y;
    }
  }

  var GENS = [genStar, genBeams, genRibbon, genCross];

  // ---- 建立／重建 ---------------------------------------------------------
  function build() {
    var cssW = window.innerWidth, cssH = window.innerHeight;
    DPR = Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2);
    W = canvas.width = Math.max(1, Math.round(cssW * DPR));
    H = canvas.height = Math.max(1, Math.round(cssH * DPR));

    // 粒子數：手機少、桌機多；由畫面面積決定
    var area = cssW * cssH;
    // 太稀疏看不出「發光」的質感，所以桌機給到兩萬顆；
    // 撐不住的裝置由主迴圈的自動降載處理。
    N = coarse ? clamp(Math.round(area / 45), 4500, 6500)
               : clamp(Math.round(area / 45), 6000, 20000);
    activeN = N;
    dustN = Math.round(N * 0.05);

    var S = Math.min(W * 0.4, H * 0.28);
    var cx = W / 2, cy = H * 0.46;

    targets = [];
    for (var s = 0; s < SHAPES; s++) {
      var arr = new Float32Array(2 * N);
      GENS[s](arr, cx, cy, S);
      targets.push(arr);
    }

    delay = new Float32Array(N);
    scatX = new Float32Array(N); scatY = new Float32Array(N);
    jAmp = new Float32Array(N); jSpd = new Float32Array(N); jPh = new Float32Array(N);
    var bucket = new Uint8Array(N);
    var counts = new Int32Array(9);
    for (var i = 0; i < N; i++) {
      delay[i] = Math.random() * STAGGER;
      scatX[i] = gauss() * S * 0.3;
      scatY[i] = gauss() * S * 0.3;
      jAmp[i] = (0.4 + Math.random() * 1.6) * DPR;
      jSpd[i] = 0.3 + Math.random() * 0.9;
      jPh[i] = Math.random() * 6.2831853;
      // 顏色：前 3 色為主，第 4 色（白）少量點綴；約 18% 是較亮較大的
      var r = Math.random();
      var ci = r < 0.42 ? 0 : r < 0.72 ? 1 : r < 0.92 ? 2 : 3;
      var b = ci * 2 + (Math.random() < 0.24 ? 1 : 0);
      bucket[i] = b;
      counts[b + 1]++;
    }
    bucketStart = new Int32Array(9);
    for (var b2 = 0; b2 < 8; b2++) bucketStart[b2 + 1] = bucketStart[b2] + counts[b2 + 1];
    var fill = bucketStart.slice(0, 8);
    order = new Uint16Array(N);
    for (var j = 0; j < N; j++) order[fill[bucket[j]]++] = j;

    sz0 = Math.max(1, Math.round(1.0 * DPR));
    sz1 = Math.max(2, Math.round(1.7 * DPR));

    // 泛光用的小畫布，寬高各 1/4
    glowW = Math.max(1, W >> 2);
    glowH = Math.max(1, H >> 2);
    glowCanvas.width = glowW;
    glowCanvas.height = glowH;
    glowCtx = glowCanvas.getContext('2d');
    if (glowCtx) glowCtx.imageSmoothingQuality = 'high';
    lastRebuild = performance.now();
    frames = 0; dtSum = 0;
  }

  // ---- 繪製一幀 -----------------------------------------------------------
  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';   // 疊在一起的粒子會更亮，像發光

    var k = Math.floor(t / CYCLE), local = t - k * CYCLE;
    var from = k % SHAPES, to = (from + 1) % SHAPES;
    var m = local < HOLD ? 0 : (local - HOLD) / MORPH;
    var A = targets[from], B = targets[to];
    var mc = ease(m);                            // 顏色用整體進度漸變

    // 指標推開粒子
    pStrength += (pTarget - pStrength) * 0.08;
    var R = 120 * DPR, R2 = R * R, pOn = pStrength > 0.01;

    for (var b = 0; b < 8; b++) {
      var ci = b >> 1, bright = b & 1;
      var ca = PAL[from][ci], cb = PAL[to][ci];
      ctx.fillStyle = 'rgba(' + Math.round(lerp(ca[0], cb[0], mc)) + ',' +
        Math.round(lerp(ca[1], cb[1], mc)) + ',' + Math.round(lerp(ca[2], cb[2], mc)) + ',' +
        (bright ? 0.95 : 0.55) + ')';
      var size = bright ? sz1 : sz0;

      for (var q = bucketStart[b], e = bucketStart[b + 1]; q < e; q++) {
        var i = order[q];
        if (i >= activeN) continue;

        // 這顆粒子自己的進度：有的先走、有的後走
        var u = clamp((m - delay[i]) / (1 - STAGGER), 0, 1);
        var ue = ease(u);
        var i2 = i * 2;
        var x = A[i2] + (B[i2] - A[i2]) * ue;
        var y = A[i2 + 1] + (B[i2 + 1] - A[i2 + 1]) * ue;

        if (u > 0 && u < 1) {                    // 變形途中向外散開再聚攏
          var sc = Math.sin(u * 3.1415927);
          x += scatX[i] * sc;
          y += scatY[i] * sc;
        }

        var a = t * jSpd[i] + jPh[i];            // 停著的時候也有微微的漂浮
        x += Math.cos(a) * jAmp[i];
        y += Math.sin(a) * jAmp[i];

        if (pOn) {
          var dx = x - px, dy = y - py, d2 = dx * dx + dy * dy;
          if (d2 < R2 && d2 > 1) {
            var d = Math.sqrt(d2), f = (1 - d / R);
            f = f * f * pStrength * R * 0.32 / d;
            x += dx * f; y += dy * f;
          }
        }
        ctx.fillRect(x | 0, y | 0, size, size);
      }
    }
    // 泛光：把畫面縮小（縮小時鄰近像素會被平均＝模糊）再放大疊回去。
    // 粒子密集的地方（星的邊緣、光帶）亮度會累加而發光，稀疏的沙則幾乎不受影響。
    // 全部由 GPU 做，比對每顆粒子畫光暈便宜很多。
    if (glowCtx) {
      glowCtx.globalCompositeOperation = 'copy';
      glowCtx.drawImage(canvas, 0, 0, glowW, glowH);
      ctx.globalCompositeOperation = 'lighter';
      for (var g = 0; g < 2; g++) ctx.drawImage(glowCanvas, 0, 0, W, H);
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  // ---- 主迴圈與效能自動調整 -----------------------------------------------
  var frames = 0, dtSum = 0, lastFrame = 0, tuned = 0;

  function loop(now) {
    requestAnimationFrame(loop);
    if (document.hidden) return;

    if (lastMove && now - lastMove > 1200) pTarget = 0;

    var dt = lastFrame ? now - lastFrame : 16;
    lastFrame = now;

    // 剛建好或剛切回分頁的前幾幀不算（會有一次很長的停頓）
    if (dt < 250) { frames++; if (frames > 20) dtSum += dt; }
    // 平均每幀超過 ~22ms（低於約 45fps）就砍 30% 粒子，最多砍 3 次
    if (frames === 100 && tuned < 3) {
      var avg = dtSum / 80;
      if (avg > 22 && activeN > 2200) { activeN = Math.round(activeN * 0.7); tuned++; }
      frames = 20; dtSum = 0;
    }

    draw((now - startTime) / 1000);
  }

  // ---- 事件 ---------------------------------------------------------------
  window.addEventListener('pointermove', function (e) {
    px = e.clientX * DPR; py = e.clientY * DPR;
    pTarget = 1; lastMove = performance.now();
  }, { passive: true });
  ['pointerup', 'pointercancel'].forEach(function (n) {
    window.addEventListener(n, function () { pTarget = 0; }, { passive: true });
  });
  document.addEventListener('mouseleave', function () { pTarget = 0; });

  var resizeTimer = 0;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      build();
      if (reduceMotion) draw(1);
    }, 150);
  });

  // ---- 啟動 ---------------------------------------------------------------
  build();
  if (reduceMotion) {
    draw(1);                                     // 只畫一張靜態的星
  } else {
    requestAnimationFrame(loop);
  }

  // 測試用：讓外部量測單幀成本。不影響正常運作。
  window.__bg = {
    draw: draw,
    seek: function (sec) { startTime = performance.now() - sec * 1000; },
    get particles() { return activeN; },
    get total() { return N; },
    get dpr() { return DPR; },
  };
})();
