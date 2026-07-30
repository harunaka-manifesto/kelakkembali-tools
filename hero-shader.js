/* Adaptive homepage hero. Plain WebGL with a CSS-gradient safety net. */
window.KK = window.KK || {};

KK.heroShader = (function () {
  'use strict';

  const DEFAULT_PERIODS = [
    { name: 'dawn', start: 5 * 60, emoji: '🌅' },
    { name: 'morning', start: 7 * 60, emoji: '🌻' },
    { name: 'noon', start: 11 * 60, emoji: '🌻' },
    { name: 'afternoon', start: 14 * 60, emoji: '🌻' },
    { name: 'dusk', start: 17 * 60, emoji: '🌆' },
    { name: 'night', start: 19 * 60, emoji: '🌙' }
  ];

  const DEFAULT_PALETTES = {
    dawn: ['#251B48', '#9A5C91', '#F2A66C', '#F7D8A4'],
    morning: ['#F7F3DA', '#F3D46A', '#EEA746', '#D8DEA0'],
    noon: ['#5DBCE5', '#A9E2F5', '#FFF4C7', '#F5D66B'],
    afternoon: ['#58A9D5', '#F3C66C', '#ED9A4B', '#F7D9A8'],
    dusk: ['#281E50', '#9D416F', '#E36F58', '#F1A04D'],
    night: ['#060A18', '#10264B', '#283B71', '#66528E']
  };

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function circularDistance(a, b) {
    let delta = a - b;
    if (delta > 720) delta -= 1440;
    if (delta < -720) delta += 1440;
    return delta;
  }

  /** One resolver drives the palette, greeting period, and emoji. */
  function resolveTime(date, periods) {
    const list = periods || DEFAULT_PERIODS;
    const minute = date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;
    let active = list[list.length - 1];
    for (let i = 0; i < list.length; i += 1) {
      if (minute >= list[i].start) active = list[i];
    }

    let from = active;
    let to = active;
    let mix = 0;
    for (let i = 0; i < list.length; i += 1) {
      const boundary = list[i].start;
      const distance = circularDistance(minute, boundary);
      if (Math.abs(distance) <= 15) {
        from = list[(i + list.length - 1) % list.length];
        to = list[i];
        mix = clamp((distance + 15) / 30, 0, 1);
        break;
      }
    }
    return { period: active.name, emoji: active.emoji, from: from.name, to: to.name, mix };
  }

  function hexRgb(hex) {
    const value = String(hex).replace('#', '');
    return [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16) / 255);
  }

  function blendedPalette(clock, palettes) {
    const from = palettes[clock.from] || DEFAULT_PALETTES[clock.from];
    const to = palettes[clock.to] || DEFAULT_PALETTES[clock.to];
    return from.map((hex, index) => {
      const a = hexRgb(hex);
      const b = hexRgb(to[index]);
      return a.map((channel, channelIndex) => channel + (b[channelIndex] - channel) * clock.mix);
    });
  }

  function cssColor(rgb) {
    return 'rgb(' + rgb.map((channel) => Math.round(channel * 255)).join(' ') + ')';
  }

  function compile(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(message || 'Could not compile hero shader');
    }
    return shader;
  }

  function programFor(gl, webgl2) {
    const vertex = webgl2
      ? '#version 300 es\nin vec2 aPosition;\nvoid main(){gl_Position=vec4(aPosition,0.,1.);}'
      : 'attribute vec2 aPosition;\nvoid main(){gl_Position=vec4(aPosition,0.,1.);}';
    const body = [
      'precision mediump float;',
      'uniform vec2 uResolution;',
      'uniform float uTime;',
      'uniform vec3 uColor0;',
      'uniform vec3 uColor1;',
      'uniform vec3 uColor2;',
      'uniform vec3 uColor3;',
      'float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}',
      'void main(){',
      ' vec2 uv=gl_FragCoord.xy/uResolution.xy;',
      ' float phase=uTime*0.130899694;',
      ' vec2 warp=vec2(sin(uv.y*5.2+phase),cos(uv.x*4.7-phase*.83))*.018;',
      ' vec2 p=uv+warp;',
      ' vec2 yellowPos=vec2(.53+sin(phase*.73)*.05,.55+cos(phase*.61)*.04);',
      ' vec2 orangePos=vec2(.15+cos(phase*.51)*.04,.18+sin(phase*.69)*.05);',
      ' vec2 greenPos=vec2(.91+sin(phase*.57)*.03,.12+cos(phase*.47)*.04);',
      ' float yellow=1.-smoothstep(.08,.74,distance(p,yellowPos));',
      ' float orange=1.-smoothstep(.02,.63,distance(p,orangePos));',
      ' float green=1.-smoothstep(.02,.54,distance(p,greenPos));',
      ' vec3 color=mix(uColor0,uColor1,yellow*.92);',
      ' color=mix(color,uColor2,orange*.78);',
      ' color=mix(color,uColor3,green*.58);',
      ' vec2 grainDrift=vec2(sin(uTime*.349066),cos(uTime*.349066))*36.;',
      ' float grain=hash(floor(gl_FragCoord.xy*1.15+grainDrift));',
      ' color+=(grain-.5)*.15;',
      (webgl2 ? ' outColor=vec4(color,1.);' : ' gl_FragColor=vec4(color,1.);'),
      '}'
    ];
    const fragment = webgl2
      ? '#version 300 es\nprecision mediump float;\nout vec4 outColor;\n' + body.slice(1).join('\n')
      : body.join('\n');
    const program = gl.createProgram();
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, vertex));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, fragment));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) || 'Could not link hero shader');
    }
    return program;
  }

  function mount(canvas, options) {
    const opts = options || {};
    const periods = opts.periods || DEFAULT_PERIODS;
    const palettes = Object.assign({}, DEFAULT_PALETTES, opts.palettes || {});
    const hero = canvas.parentElement;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let targetFps = opts.fps || 30;
    let maxDpr = opts.maxDpr || 1.5;
    if (navigator.connection && navigator.connection.saveData) {
      targetFps = Math.min(targetFps, 15);
      maxDpr = Math.min(maxDpr, 1);
    }
    if (navigator.deviceMemory && navigator.deviceMemory <= 4) maxDpr = Math.min(maxDpr, 1);

    let gl = null;
    let program = null;
    let buffer = null;
    let webgl2 = false;
    let clock = resolveTime(new Date(), periods);
    let palette = blendedPalette(clock, palettes);
    let motionEnabled = false;
    let onScreen = true;
    let destroyed = false;
    let lost = false;
    let raf = 0;
    let lastFrame = 0;
    let elapsed = 0;
    let previousStamp = 0;

    function setFallback() {
      hero.style.setProperty('--hero-0', cssColor(palette[0]));
      hero.style.setProperty('--hero-1', cssColor(palette[1]));
      hero.style.setProperty('--hero-2', cssColor(palette[2]));
      hero.style.setProperty('--hero-3', cssColor(palette[3]));
    }

    function initialize() {
      try {
        gl = canvas.getContext('webgl2', { alpha: false, antialias: false, powerPreference: 'low-power' });
        webgl2 = !!gl;
        if (!gl) gl = canvas.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'low-power' });
        if (!gl) throw new Error('WebGL is unavailable');
        program = programFor(gl, webgl2);
        buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
        gl.useProgram(program);
        const position = gl.getAttribLocation(program, 'aPosition');
        gl.enableVertexAttribArray(position);
        gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
        hero.classList.remove('home-hero--fallback');
        resize();
        draw();
      } catch (error) {
        console.warn('Hero shader fallback:', error.message);
        gl = null;
        program = null;
        hero.classList.add('home-hero--fallback');
      }
    }

    function resize() {
      if (!gl || lost) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
      const width = Math.max(1, Math.round(rect.width * dpr));
      const height = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
        draw();
      }
    }

    function draw() {
      if (!gl || !program || lost) return;
      gl.useProgram(program);
      gl.uniform2f(gl.getUniformLocation(program, 'uResolution'), canvas.width, canvas.height);
      gl.uniform1f(gl.getUniformLocation(program, 'uTime'), elapsed);
      palette.forEach((color, index) => {
        gl.uniform3fv(gl.getUniformLocation(program, 'uColor' + index), color);
      });
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function shouldAnimate() {
      return motionEnabled && !reducedMotion.matches && !document.hidden && onScreen && !destroyed;
    }

    function tick(stamp) {
      raf = 0;
      if (!shouldAnimate()) return;
      if (!previousStamp) previousStamp = stamp;
      const interval = 1000 / targetFps;
      if (stamp - lastFrame >= interval) {
        elapsed += Math.min(100, stamp - previousStamp) / 1000;
        previousStamp = stamp;
        lastFrame = stamp;
        draw();
      }
      raf = requestAnimationFrame(tick);
    }

    function syncAnimation() {
      if (shouldAnimate() && !raf) {
        previousStamp = 0;
        raf = requestAnimationFrame(tick);
      } else if (!shouldAnimate() && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    }

    function setClock(date) {
      clock = resolveTime(date || new Date(), periods);
      palette = blendedPalette(clock, palettes);
      setFallback();
      draw();
      if (typeof opts.onClock === 'function') opts.onClock(clock);
      return clock;
    }

    function reveal() {
      canvas.classList.add('is-revealed');
    }

    function setMotionEnabled(enabled) {
      motionEnabled = !!enabled;
      if (!motionEnabled) draw();
      syncAnimation();
    }

    function onVisibility() { syncAnimation(); }
    function onContextLost(event) {
      event.preventDefault();
      lost = true;
      hero.classList.add('home-hero--fallback');
      syncAnimation();
    }
    function onContextRestored() {
      lost = false;
      gl = null;
      program = null;
      initialize();
      syncAnimation();
    }

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    const intersectionObserver = new IntersectionObserver((entries) => {
      onScreen = !!entries[0] && entries[0].isIntersecting;
      syncAnimation();
    });
    intersectionObserver.observe(hero);
    const minuteTimer = setInterval(() => setClock(new Date()), 60000);
    document.addEventListener('visibilitychange', onVisibility);
    canvas.addEventListener('webglcontextlost', onContextLost, false);
    canvas.addEventListener('webglcontextrestored', onContextRestored, false);
    reducedMotion.addEventListener('change', syncAnimation);

    if (navigator.getBattery) {
      navigator.getBattery().then((battery) => {
        if (!battery.charging && battery.level <= 0.2) {
          targetFps = Math.min(targetFps, 15);
          maxDpr = Math.min(maxDpr, 1);
          resize();
        }
      }).catch(() => {});
    }

    setFallback();
    initialize();
    setClock(new Date());

    return {
      setClock,
      reveal,
      setMotionEnabled,
      getClock: () => Object.assign({}, clock),
      destroy() {
        destroyed = true;
        if (raf) cancelAnimationFrame(raf);
        clearInterval(minuteTimer);
        resizeObserver.disconnect();
        intersectionObserver.disconnect();
        document.removeEventListener('visibilitychange', onVisibility);
        canvas.removeEventListener('webglcontextlost', onContextLost);
        canvas.removeEventListener('webglcontextrestored', onContextRestored);
        reducedMotion.removeEventListener('change', syncAnimation);
        if (gl && buffer) gl.deleteBuffer(buffer);
        if (gl && program) gl.deleteProgram(program);
      }
    };
  }

  return {
    periods: DEFAULT_PERIODS,
    palettes: DEFAULT_PALETTES,
    resolveTime,
    mount
  };
})();
