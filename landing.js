/* ============================================================
   Grocery Manager — Landing Page JS
   Vanilla ports of Magic UI components:
   - Sparkles Text
   - Number Ticker (in-view)
   - Animated Beam (flow section)
   - Confetti (on CTA click)
   ============================================================ */

(function () {
  'use strict';

  /* ---------- Sparkles Text ----------
     Generates random sparkle SVGs around a text element and
     cycles them with staggered animations (same approach as the
     official Magic UI SparklesText component). */
  function initSparkles() {
    var wrap = document.getElementById('sparklesWrap');
    if (!wrap) return;
    var colors = ['#ffaa40', '#9c40ff', '#FE8BBB', '#9E7AFF'];
    var count = 10;

    function makeSparkle() {
      var s = document.createElement('span');
      s.className = 'sparkle';
      s.style.left = (Math.random() * 100) + '%';
      s.style.top = (Math.random() * 100) + '%';
      s.style.background = colors[Math.floor(Math.random() * colors.length)];
      s.style.animationDelay = (Math.random() * 2) + 's';
      s.style.animationDuration = (1 + Math.random() * 0.8) + 's';
      return s;
    }

    function refresh() {
      wrap.querySelectorAll('.sparkle').forEach(function (n) { n.remove(); });
      for (var i = 0; i < count; i++) {
        var sp = makeSparkle();
        sp.style.clipPath = 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)';
        sp.style.background = sp.style.background;
        wrap.appendChild(sp);
      }
    }

    refresh();
    setInterval(refresh, 2200);
  }

  /* ---------- Number Ticker (in-view) ----------
     Counts up to the data-target value when the element scrolls
     into view. Same ease-out curve and locale formatting approach
     as the in-app ticker. */
  function initNumberTickers() {
    var nodes = document.querySelectorAll('.number-ticker');
    if (!nodes.length || !('IntersectionObserver' in window)) {
      nodes.forEach(function (n) { n.textContent = n.dataset.target; });
      return;
    }

    function animate(node) {
      var target = Number(node.dataset.target) || 0;
      var suffix = node.dataset.suffix || '';
      var duration = 1400;
      var start = performance.now();

      function step(now) {
        var t = Math.min((now - start) / duration, 1);
        var eased = 1 - Math.pow(1 - t, 3);
        var value = Math.round(target * eased);
        node.textContent = Intl.NumberFormat('en-US').format(value) + suffix;
        if (t < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          animate(e.target);
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.4 });

    nodes.forEach(function (n) { io.observe(n); });
  }

  /* ---------- Flow Beams ----------
     Draws 3 curved SVG beams between the 4 flow nodes, each with
     a static background stroke, an animated gradient stroke, and
     a traveling dot. Same algorithm as the in-app Animated Beam. */
  function initFlowBeams() {
    var svg = document.getElementById('flowBeams');
    var stage = document.querySelector('.flow-stage');
    if (!svg || !stage) return;

    var nodeIds = ['flowNode1', 'flowNode2', 'flowNode3', 'flowNode4'];
    var nodes = nodeIds.map(function (id) { return document.getElementById(id); });
    if (nodes.some(function (n) { return !n; })) return;

    function draw() {
      var stageRect = stage.getBoundingClientRect();
      var points = nodes.map(function (n) {
        var r = n.getBoundingClientRect();
        return {
          x: r.left + r.width / 2 - stageRect.left,
          y: r.top + r.height / 2 - stageRect.top,
        };
      });

      svg.setAttribute('viewBox', '0 0 ' + stageRect.width + ' ' + stageRect.height);
      svg.setAttribute('width', stageRect.width);
      svg.setAttribute('height', stageRect.height);

      var defs = '<defs>';
      var paths = '';
      var dots = '';

      for (var i = 0; i < points.length - 1; i++) {
        var a = points[i];
        var b = points[i + 1];
        var midX = (a.x + b.x) / 2;
        var midY = (a.y + b.y) / 2 - 40; // upward arc
        var d = 'M ' + a.x + ',' + a.y + ' Q ' + midX + ',' + midY + ' ' + b.x + ',' + b.y;

        var gid = 'flowGrad' + i;
        var did = 'flowDot' + i;
        var mid = 'flowMotion' + i;

        defs +=
          '<linearGradient id="' + gid + '" gradientUnits="userSpaceOnUse" x1="' + a.x + '" y1="' + a.y + '" x2="' + b.x + '" y2="' + b.y + '">' +
            '<stop offset="0%" stop-color="#ffaa40" stop-opacity="0"/>' +
            '<stop offset="15%" stop-color="#ffaa40" stop-opacity="1"/>' +
            '<stop offset="50%" stop-color="#9c40ff" stop-opacity="1"/>' +
            '<stop offset="85%" stop-color="#9c40ff" stop-opacity="0"/>' +
          '</linearGradient>';
        defs +=
          '<radialGradient id="' + did + '" cx="50%" cy="50%" r="50%">' +
            '<stop offset="0%" stop-color="#ffd9a8"/>' +
            '<stop offset="40%" stop-color="#ffaa40"/>' +
            '<stop offset="100%" stop-color="#9c40ff"/>' +
          '</radialGradient>';
        defs += '<path id="' + mid + '" d="' + d + '" />';

        paths += '<path class="flow-bg" d="' + d + '" />';
        paths += '<path class="flow-fg" stroke-dasharray="80 120" d="' + d + '" stroke="url(#' + gid + ')" />';

        dots +=
          '<circle r="4" fill="url(#' + did + ')">' +
            '<animateMotion dur="1.8s" repeatCount="indefinite" begin="' + (i * 0.4) + 's">' +
              '<mpath href="#' + mid + '"/>' +
            '</animateMotion>' +
          '</circle>';
      }

      svg.innerHTML = defs + '</defs>' + paths + dots;
    }

    draw();
    var ro = new ResizeObserver(draw);
    ro.observe(stage);
    window.addEventListener('resize', draw);
  }

  /* ---------- Confetti (on CTA) ----------
     Fires a confetti burst from the CTA button, then navigates
     to the app after a short delay. Uses canvas-confetti style
     particle system implemented in plain JS (no library). */
  function initConfettiCta() {
    var btn = document.getElementById('ctaBtn');
    if (!btn) return;

    btn.addEventListener('click', function (e) {
      e.preventDefault();
      var rect = btn.getBoundingClientRect();
      var origin = {
        x: (rect.left + rect.width / 2) / window.innerWidth,
        y: (rect.top + rect.height / 2) / window.innerHeight,
      };
      fireConfetti(origin);
      setTimeout(function () { window.location.href = 'index.html'; }, 900);
    });
  }

  function fireConfetti(origin) {
    var colors = ['#ffaa40', '#9c40ff', '#FE8BBB', '#ffd166', '#22c55e'];
    var canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999;';
    document.body.appendChild(canvas);
    var ctx = canvas.getContext('2d');
    var dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.scale(dpr, dpr);

    var particles = [];
    var count = 80;
    for (var i = 0; i < count; i++) {
      var angle = Math.random() * Math.PI * 2;
      var speed = 4 + Math.random() * 6;
      particles.push({
        x: origin.x * window.innerWidth,
        y: origin.y * window.innerHeight,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 4,
        gravity: 0.18,
        size: 4 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        life: 0,
        maxLife: 90 + Math.random() * 40,
      });
    }

    function frame() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      var alive = false;
      particles.forEach(function (p) {
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.rotation += p.vr;
        var alpha = Math.max(0, 1 - p.life / p.maxLife);
        if (alpha > 0) alive = true;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      });
      if (alive) requestAnimationFrame(frame);
      else canvas.remove();
    }
    frame();
  }

  /* ---------- Init ---------- */
  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    initSparkles();
    initNumberTickers();
    initFlowBeams();
    initConfettiCta();
  });
})();
