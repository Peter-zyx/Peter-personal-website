const hero = document.querySelector(".hero");
const canvas = document.querySelector("[data-fluid-canvas]");
const title = document.querySelector("[data-fluid-title]");
const cursor = document.querySelector("[data-fluid-cursor]");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

if (hero && canvas && title && !prefersReducedMotion.matches) {
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    depth: false,
    stencil: false,
    antialias: false,
    preserveDrawingBuffer: false,
  });

  if (gl) {
    gl.getExtension("EXT_color_buffer_float");
    const MAX_DPR = 2;
    const SIM_RESOLUTION = 128;
    const DYE_RESOLUTION = 256;
    const DENSITY_DISSIPATION = 2.5;
    const VELOCITY_DISSIPATION = 0.5;
    const PRESSURE = 0;
    const PRESSURE_ITERATIONS = 12;
    const CURL = 0;
    const SPLAT_RADIUS = 0.0015;
    const SPLAT_FORCE = 1000;

    const vertexShader = `
      precision highp float;
      attribute vec2 aPosition;
      varying vec2 vUv;
      varying vec2 vL;
      varying vec2 vR;
      varying vec2 vT;
      varying vec2 vB;
      uniform vec2 texelSize;
      void main () {
        vUv = aPosition * 0.5 + 0.5;
        vL = vUv - vec2(texelSize.x, 0.0);
        vR = vUv + vec2(texelSize.x, 0.0);
        vT = vUv + vec2(0.0, texelSize.y);
        vB = vUv - vec2(0.0, texelSize.y);
        gl_Position = vec4(aPosition, 0.0, 1.0);
      }
    `;

    const copyShader = `
      precision mediump float;
      precision mediump sampler2D;
      varying highp vec2 vUv;
      uniform sampler2D uTexture;
      void main () {
        gl_FragColor = texture2D(uTexture, vUv);
      }
    `;

    const clearShader = `
      precision mediump float;
      precision mediump sampler2D;
      varying highp vec2 vUv;
      uniform sampler2D uTexture;
      uniform float value;
      void main () {
        gl_FragColor = value * texture2D(uTexture, vUv);
      }
    `;

    const splatShader = `
      precision highp float;
      precision highp sampler2D;
      varying vec2 vUv;
      uniform sampler2D uTarget;
      uniform float aspectRatio;
      uniform vec3 color;
      uniform vec2 point;
      uniform float radius;
      void main () {
        vec2 p = vUv - point.xy;
        p.x *= aspectRatio;
        float gaussian = exp(-dot(p, p) / radius);
        vec3 splat = gaussian * color;
        vec3 base = texture2D(uTarget, vUv).xyz;
        gl_FragColor = vec4(base + splat, 1.0);
      }
    `;

    const advectionShader = `
      precision highp float;
      precision highp sampler2D;
      varying vec2 vUv;
      uniform sampler2D uVelocity;
      uniform sampler2D uSource;
      uniform vec2 texelSize;
      uniform float dt;
      uniform float dissipation;
      void main () {
        vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
        vec4 result = texture2D(uSource, coord);
        float decay = 1.0 + dissipation * dt;
        gl_FragColor = result / decay;
      }
    `;

    const divergenceShader = `
      precision mediump float;
      precision mediump sampler2D;
      varying highp vec2 vUv;
      varying highp vec2 vL;
      varying highp vec2 vR;
      varying highp vec2 vT;
      varying highp vec2 vB;
      uniform sampler2D uVelocity;
      void main () {
        float L = texture2D(uVelocity, vL).x;
        float R = texture2D(uVelocity, vR).x;
        float T = texture2D(uVelocity, vT).y;
        float B = texture2D(uVelocity, vB).y;
        vec2 C = texture2D(uVelocity, vUv).xy;
        if (vL.x < 0.0) { L = -C.x; }
        if (vR.x > 1.0) { R = -C.x; }
        if (vT.y > 1.0) { T = -C.y; }
        if (vB.y < 0.0) { B = -C.y; }
        float div = 0.5 * (R - L + T - B);
        gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
      }
    `;

    const curlShader = `
      precision mediump float;
      precision mediump sampler2D;
      varying highp vec2 vUv;
      varying highp vec2 vL;
      varying highp vec2 vR;
      varying highp vec2 vT;
      varying highp vec2 vB;
      uniform sampler2D uVelocity;
      void main () {
        float L = texture2D(uVelocity, vL).y;
        float R = texture2D(uVelocity, vR).y;
        float T = texture2D(uVelocity, vT).x;
        float B = texture2D(uVelocity, vB).x;
        float vorticity = R - L - T + B;
        gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
      }
    `;

    const vorticityShader = `
      precision highp float;
      precision highp sampler2D;
      varying vec2 vUv;
      varying vec2 vL;
      varying vec2 vR;
      varying vec2 vT;
      varying vec2 vB;
      uniform sampler2D uVelocity;
      uniform sampler2D uCurl;
      uniform float curl;
      uniform float dt;
      void main () {
        float L = texture2D(uCurl, vL).x;
        float R = texture2D(uCurl, vR).x;
        float T = texture2D(uCurl, vT).x;
        float B = texture2D(uCurl, vB).x;
        float C = texture2D(uCurl, vUv).x;
        vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
        force /= length(force) + 0.0001;
        force *= curl * C;
        force.y *= -1.0;
        vec2 velocity = texture2D(uVelocity, vUv).xy;
        velocity += force * dt;
        velocity = min(max(velocity, -1000.0), 1000.0);
        gl_FragColor = vec4(velocity, 0.0, 1.0);
      }
    `;

    const pressureShader = `
      precision mediump float;
      precision mediump sampler2D;
      varying highp vec2 vUv;
      varying highp vec2 vL;
      varying highp vec2 vR;
      varying highp vec2 vT;
      varying highp vec2 vB;
      uniform sampler2D uPressure;
      uniform sampler2D uDivergence;
      void main () {
        float L = texture2D(uPressure, vL).x;
        float R = texture2D(uPressure, vR).x;
        float T = texture2D(uPressure, vT).x;
        float B = texture2D(uPressure, vB).x;
        float divergence = texture2D(uDivergence, vUv).x;
        float pressure = (L + R + B + T - divergence) * 0.25;
        gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
      }
    `;

    const gradientSubtractShader = `
      precision mediump float;
      precision mediump sampler2D;
      varying highp vec2 vUv;
      varying highp vec2 vL;
      varying highp vec2 vR;
      varying highp vec2 vT;
      varying highp vec2 vB;
      uniform sampler2D uPressure;
      uniform sampler2D uVelocity;
      void main () {
        float L = texture2D(uPressure, vL).x;
        float R = texture2D(uPressure, vR).x;
        float T = texture2D(uPressure, vT).x;
        float B = texture2D(uPressure, vB).x;
        vec2 velocity = texture2D(uVelocity, vUv).xy;
        velocity.xy -= vec2(R - L, T - B);
        gl_FragColor = vec4(velocity, 0.0, 1.0);
      }
    `;

    const displayShader = `
      precision highp float;
      precision highp sampler2D;
      varying vec2 vUv;
      uniform sampler2D uTexture;
      uniform sampler2D uTextMask;
      uniform float uTime;
      uniform vec2 uResolution;
      uniform float uHasTextMask;
      uniform float uPixelRatio;

      float hash(vec2 p) {
        p = fract(p * vec2(127.1, 311.7));
        p += dot(p, p.yx + 19.19);
        return fract(p.x * p.y);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
      }

      float fbm(vec2 p, float time) {
        float value = 0.0;
        float amplitude = 0.5;
        float phase = time * 0.015;
        for (int i = 0; i < 2; i++) {
          value += amplitude * noise(p);
          float fi = phase + float(i) * 0.5;
          p = p * 1.5 + vec2(12.7 + cos(fi) * 0.5, 4.3 + sin(fi) * 0.5);
          amplitude *= 0.5;
        }
        return value;
      }

      float shapeNoise(vec2 p, float time) {
        vec2 offset = vec2(fbm(p + vec2(7.1, -3.9), time) - 0.5) * 3.0;
        return fbm(p + offset, time);
      }

      float bayer4(vec2 pixelPos) {
        vec2 p = mod(pixelPos, 4.0);
        vec2 p2 = mod(p, 2.0);
        vec2 p4 = floor(p * 0.5);
        float inner = 2.0 * (p2.x + p2.y - 2.0 * p2.x * p2.y) + p2.y;
        float outer = 2.0 * (p4.x + p4.y - 2.0 * p4.x * p4.y) + p4.y;
        return (4.0 * inner + outer) / 16.0;
      }

      void main () {
        float blockSize = 2.5 * uPixelRatio;
        vec2 blockCoord = floor(gl_FragCoord.xy / blockSize);
        vec2 blockCenter = (blockCoord + 0.5) * blockSize;
        vec2 blockUv = blockCenter / uResolution.xy;
        vec2 centeredUv = blockUv - 0.5;
        centeredUv.x *= uResolution.x / max(uResolution.y, 1.0);

        float time = uTime * 0.03;
        vec2 flow = vec2(time, -time * 0.65);
        vec2 noiseUv = vec2(centeredUv.x * 1.5, centeredUv.y * 1.5 * 0.45) + flow;
        float base = shapeNoise(noiseUv, uTime);
        base = (base - 0.5) * 6.0 + 0.5;
        base = clamp(base * 1.5, 0.0, 1.0);

        vec3 dye = texture2D(uTexture, vUv).rgb;
        float fluidLum = max(dye.r, max(dye.g, dye.b));
        float fluidStrength = smoothstep(0.012, 0.145, fluidLum);

        float caAmount = fluidStrength * 22.0 / uResolution.x;
        vec2 caDir = normalize(vec2(1.0, 0.4));
        vec2 caDirPerp = vec2(-caDir.y, caDir.x);
        float e = 2.0 / uResolution.x;
        float dL = texture2D(uTexture, vUv - vec2(e, 0.0)).r;
        float dR = texture2D(uTexture, vUv + vec2(e, 0.0)).r;
        float dT = texture2D(uTexture, vUv + vec2(0.0, e)).r;
        float dB = texture2D(uTexture, vUv - vec2(0.0, e)).r;
        vec2 warp = vec2(dR - dL, dT - dB) * (0.35 + fluidStrength) * 58.0 / uResolution.x;
        vec2 warpedUv = vUv + warp;
        vec2 uvC = vec2(warpedUv.x, 1.0 - warpedUv.y);
        vec2 uvR = vec2(warpedUv.x + caDir.x * caAmount, 1.0 - (warpedUv.y + caDir.y * caAmount));
        vec2 uvG = vec2(warpedUv.x + caDirPerp.x * caAmount * 0.5, 1.0 - (warpedUv.y + caDirPerp.y * caAmount * 0.5));
        vec2 uvB = vec2(warpedUv.x - caDir.x * caAmount * 0.72, 1.0 - (warpedUv.y - caDir.y * caAmount * 0.72));

        vec3 maskC = texture2D(uTextMask, uvC).rgb * uHasTextMask;
        vec3 maskR = texture2D(uTextMask, uvR).rgb * uHasTextMask;
        vec3 maskG = texture2D(uTextMask, uvG).rgb * uHasTextMask;
        vec3 maskB = texture2D(uTextMask, uvB).rgb * uHasTextMask;

        float textMask = max(maskC.r, max(maskC.g, maskC.b));
        float textMaskR = max(maskR.r, max(maskR.g, maskR.b));
        float textMaskG = max(maskG.r, max(maskG.g, maskG.b));
        float textMaskB = max(maskB.r, max(maskB.g, maskB.b));

        float modifiedBase = clamp(base - fluidStrength * (1.0 - textMask), 0.0, 1.0);
        float threshold = (bayer4(blockCoord) - 0.5) * 2.0;
        float dithered = step(0.5, clamp(modifiedBase + threshold, 0.0, 1.0));

        vec3 darkColor = vec3(0.010, 0.012, 0.011);
        vec3 lightColor = vec3(0.158, 0.184, 0.178);
        vec3 textColor = vec3(0.965, 0.984, 0.969);
        vec3 coolColor = vec3(0.385, 0.710, 0.735);
        vec3 metalColor = vec3(0.775, 0.830, 0.805);

        float splatFade = fluidStrength * fluidStrength;
        vec3 tintedLight = mix(lightColor, coolColor, splatFade * 0.84);
        tintedLight = mix(tintedLight, metalColor, splatFade * 0.12);
        vec3 bgColor = mix(darkColor, tintedLight, dithered);
        bgColor += dye * vec3(0.18, 0.24, 0.23) * (1.0 - textMask) * 0.42;

        vec3 textEffect = mix(textColor, mix(coolColor, textColor, 0.42), fluidStrength * 0.82);
        float edgeCool = max(0.0, textMaskB - textMask);
        float edgeMetal = max(0.0, max(textMaskR, textMaskG) - textMask);
        vec3 finalColor = mix(bgColor, textEffect, textMask);
        finalColor = mix(finalColor, coolColor, edgeCool * fluidStrength * 0.72);
        finalColor = mix(finalColor, metalColor, edgeMetal * fluidStrength * 0.36);

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    function compile(type, source) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(shader) || "Shader compile failed");
      }
      return shader;
    }

    const baseVertex = compile(gl.VERTEX_SHADER, vertexShader);
    function createProgramFromCompiled(fragmentSource) {
      const program = gl.createProgram();
      gl.attachShader(program, baseVertex);
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program) || "Program link failed");
      }
      const uniforms = {};
      const total = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
      for (let index = 0; index < total; index += 1) {
        const info = gl.getActiveUniform(program, index);
        uniforms[info.name] = gl.getUniformLocation(program, info.name);
      }
      return {
        program,
        uniforms,
        bind() {
          gl.useProgram(program);
        },
      };
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    const programs = {
      copy: createProgramFromCompiled(copyShader),
      clear: createProgramFromCompiled(clearShader),
      splat: createProgramFromCompiled(splatShader),
      advection: createProgramFromCompiled(advectionShader),
      divergence: createProgramFromCompiled(divergenceShader),
      curl: createProgramFromCompiled(curlShader),
      vorticity: createProgramFromCompiled(vorticityShader),
      pressure: createProgramFromCompiled(pressureShader),
      gradientSubtract: createProgramFromCompiled(gradientSubtractShader),
      display: createProgramFromCompiled(displayShader),
    };

    function createFBO(width, height) {
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, width, height, 0, gl.RGBA, gl.HALF_FLOAT, null);
      const fbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
      gl.viewport(0, 0, width, height);
      gl.clear(gl.COLOR_BUFFER_BIT);
      return {
        texture,
        fbo,
        width,
        height,
        texelSizeX: 1 / width,
        texelSizeY: 1 / height,
        attach(unit) {
          gl.activeTexture(gl.TEXTURE0 + unit);
          gl.bindTexture(gl.TEXTURE_2D, texture);
          return unit;
        },
      };
    }

    function createDoubleFBO(width, height) {
      let read = createFBO(width, height);
      let write = createFBO(width, height);
      return {
        width,
        height,
        texelSizeX: 1 / width,
        texelSizeY: 1 / height,
        get read() {
          return read;
        },
        set read(value) {
          read = value;
        },
        get write() {
          return write;
        },
        set write(value) {
          write = value;
        },
        swap() {
          const temp = read;
          read = write;
          write = temp;
        },
      };
    }

    function blit(target, clear = false) {
      if (target) {
        gl.viewport(0, 0, target.width, target.height);
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
      } else {
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      }
      if (clear) {
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
      }
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    }

    function getResolution(base) {
      let aspect = gl.drawingBufferWidth / gl.drawingBufferHeight;
      if (aspect < 1) aspect = 1 / aspect;
      const min = Math.round(base);
      const max = Math.round(base * aspect);
      return gl.drawingBufferWidth > gl.drawingBufferHeight
        ? { width: max, height: min }
        : { width: min, height: max };
    }

    let velocity;
    let dye;
    let divergence;
    let curl;
    let pressure;
    let textTexture = null;
    let textTextureSize = { width: 0, height: 0 };
    let lastTime = Date.now();
    let elapsed = Math.random() * 120;
    let needsMask = true;
    let needsResize = true;
    let raf = 0;

    const pointer = {
      rawX: -8,
      rawY: -8,
      x: -8,
      y: -8,
      sx: -8,
      sy: -8,
      cachedY: -8,
      inCanvas: false,
      texcoordX: 0,
      texcoordY: 0,
      prevTexcoordX: 0,
      prevTexcoordY: 0,
      deltaX: 0,
      deltaY: 0,
      speed: 0,
      smoothSpeed: 0,
      moved: false,
      color: { r: 0.12, g: 0.16, b: 0.15 },
    };

    const bounds = { left: 0, top: 0, width: 0, height: 0 };

    function initFramebuffers() {
      const sim = getResolution(SIM_RESOLUTION);
      const dyeRes = getResolution(DYE_RESOLUTION);
      velocity = createDoubleFBO(sim.width, sim.height);
      dye = createDoubleFBO(dyeRes.width, dyeRes.height);
      divergence = createFBO(sim.width, sim.height);
      curl = createFBO(sim.width, sim.height);
      pressure = createDoubleFBO(sim.width, sim.height);
    }

    function resizeCanvas() {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      const width = Math.floor(rect.width * dpr);
      const height = Math.floor(rect.height * dpr);
      if (canvas.width !== width || canvas.height !== height || !velocity || !dye) {
        canvas.width = width;
        canvas.height = height;
        initFramebuffers();
        needsMask = true;
      }
      bounds.left = rect.left;
      bounds.top = rect.top + window.scrollY;
      bounds.width = rect.width;
      bounds.height = rect.height;
      needsResize = false;
    }

    function splitLines(element) {
      const range = document.createRange();
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      const lines = [];
      let current = [];
      let previousTop = null;
      let lineIndex = 0;
      let node;
      while ((node = walker.nextNode())) {
        const words = node.textContent.split(/(\s+)/);
        let offset = 0;
        for (const word of words) {
          if (!word.trim()) {
            offset += word.length;
            continue;
          }
          range.setStart(node, offset);
          range.setEnd(node, offset + 1);
          const top = range.getBoundingClientRect().top;
          if (previousTop === null || Math.abs(top - previousTop) > 2) {
            if (current.length) {
              lines.push({ text: current.join(" "), lineIndex });
              lineIndex += 1;
            }
            previousTop = top;
            current = [word];
          } else {
            current.push(word);
          }
          offset += word.length;
        }
      }
      if (current.length) lines.push({ text: current.join(" "), lineIndex });
      return lines;
    }

    function uploadTextMask() {
      const rect = canvas.getBoundingClientRect();
      const titleRect = title.getBoundingClientRect();
      const dpr = canvas.width / rect.width;
      const mask = document.createElement("canvas");
      mask.width = canvas.width;
      mask.height = canvas.height;
      const ctx = mask.getContext("2d");
      const style = window.getComputedStyle(title);
      const fontSize = parseFloat(style.fontSize) * dpr;
      const lineHeight = (parseFloat(style.lineHeight) || fontSize * 0.84) * dpr;
      const letterSpacing = parseFloat(style.letterSpacing);
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, mask.width, mask.height);
      ctx.fillStyle = "white";
      ctx.font = `${style.fontWeight} ${fontSize}px ${style.fontFamily}`;
      if ("letterSpacing" in ctx) ctx.letterSpacing = Number.isNaN(letterSpacing) ? "normal" : `${letterSpacing * dpr}px`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      const x = (titleRect.left - rect.left + titleRect.width / 2) * dpr;
      const y = (titleRect.top - rect.top) * dpr;
      for (const line of splitLines(title)) {
        ctx.fillText(line.text, x, y + line.lineIndex * lineHeight);
      }

      if (!textTexture) {
        textTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, textTexture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      } else {
        gl.bindTexture(gl.TEXTURE_2D, textTexture);
      }
      const changed = mask.width !== textTextureSize.width || mask.height !== textTextureSize.height;
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      if (changed) {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, mask);
        textTextureSize = { width: mask.width, height: mask.height };
      } else {
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, mask);
      }
      needsMask = false;
      hero.classList.add("is-fluid-ready");
    }

    function correctRadius(radius) {
      const aspect = canvas.width / canvas.height;
      return aspect > 1 ? radius * aspect : radius;
    }

    function correctDeltaX(delta) {
      const aspect = canvas.width / canvas.height;
      return aspect < 1 ? delta * aspect : delta;
    }

    function correctDeltaY(delta) {
      const aspect = canvas.width / canvas.height;
      return aspect > 1 ? delta / aspect : delta;
    }

    function splat(x, y, dx, dy, color, radius) {
      programs.splat.bind();
      gl.uniform1i(programs.splat.uniforms.uTarget, velocity.read.attach(0));
      gl.uniform1f(programs.splat.uniforms.aspectRatio, canvas.width / canvas.height);
      gl.uniform2f(programs.splat.uniforms.point, x, y);
      gl.uniform3f(programs.splat.uniforms.color, dx, dy, 0);
      gl.uniform1f(programs.splat.uniforms.radius, correctRadius(radius));
      blit(velocity.write);
      velocity.swap();

      gl.uniform1i(programs.splat.uniforms.uTarget, dye.read.attach(0));
      gl.uniform3f(programs.splat.uniforms.color, color.r, color.g, color.b);
      blit(dye.write);
      dye.swap();
    }

    function applyPointerSplat() {
      const scaledSpeed = pointer.speed * canvas.width / 1920;
      const speed01 = Math.min(Math.max((scaledSpeed - 0.0015) / 0.0185, 0), 1);
      const influence = 0.34 + speed01 * 0.86;
      const color = {
        r: pointer.color.r * influence,
        g: pointer.color.g * influence,
        b: pointer.color.b * influence,
      };
      const radius = (SPLAT_RADIUS + speed01 * 0.0029) * 1920 / canvas.width;
      const force = SPLAT_FORCE * (0.75 + speed01 * 1.15);
      splat(
        pointer.texcoordX,
        pointer.texcoordY,
        pointer.deltaX * force,
        pointer.deltaY * force,
        color,
        radius,
      );
    }

    function stepSimulation(dt) {
      gl.disable(gl.BLEND);

      programs.curl.bind();
      gl.uniform2f(programs.curl.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
      gl.uniform1i(programs.curl.uniforms.uVelocity, velocity.read.attach(0));
      blit(curl);

      programs.vorticity.bind();
      gl.uniform2f(programs.vorticity.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
      gl.uniform1i(programs.vorticity.uniforms.uVelocity, velocity.read.attach(0));
      gl.uniform1i(programs.vorticity.uniforms.uCurl, curl.attach(1));
      gl.uniform1f(programs.vorticity.uniforms.curl, CURL);
      gl.uniform1f(programs.vorticity.uniforms.dt, dt);
      blit(velocity.write);
      velocity.swap();

      programs.divergence.bind();
      gl.uniform2f(programs.divergence.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
      gl.uniform1i(programs.divergence.uniforms.uVelocity, velocity.read.attach(0));
      blit(divergence);

      programs.clear.bind();
      gl.uniform1i(programs.clear.uniforms.uTexture, pressure.read.attach(0));
      gl.uniform1f(programs.clear.uniforms.value, PRESSURE);
      blit(pressure.write);
      pressure.swap();

      programs.pressure.bind();
      gl.uniform2f(programs.pressure.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
      gl.uniform1i(programs.pressure.uniforms.uDivergence, divergence.attach(0));
      for (let i = 0; i < PRESSURE_ITERATIONS; i += 1) {
        gl.uniform1i(programs.pressure.uniforms.uPressure, pressure.read.attach(1));
        blit(pressure.write);
        pressure.swap();
      }

      programs.gradientSubtract.bind();
      gl.uniform2f(programs.gradientSubtract.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
      gl.uniform1i(programs.gradientSubtract.uniforms.uPressure, pressure.read.attach(0));
      gl.uniform1i(programs.gradientSubtract.uniforms.uVelocity, velocity.read.attach(1));
      blit(velocity.write);
      velocity.swap();

      programs.advection.bind();
      gl.uniform2f(programs.advection.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
      gl.uniform1i(programs.advection.uniforms.uVelocity, velocity.read.attach(0));
      gl.uniform1i(programs.advection.uniforms.uSource, velocity.read.attach(0));
      gl.uniform1f(programs.advection.uniforms.dt, dt);
      gl.uniform1f(programs.advection.uniforms.dissipation, VELOCITY_DISSIPATION);
      blit(velocity.write);
      velocity.swap();

      gl.uniform1i(programs.advection.uniforms.uVelocity, velocity.read.attach(0));
      gl.uniform1i(programs.advection.uniforms.uSource, dye.read.attach(1));
      gl.uniform1f(programs.advection.uniforms.dissipation, DENSITY_DISSIPATION);
      blit(dye.write);
      dye.swap();
    }

    function render() {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.disable(gl.BLEND);
      programs.display.bind();
      gl.uniform1i(programs.display.uniforms.uTexture, dye.read.attach(0));
      gl.uniform1f(programs.display.uniforms.uTime, elapsed);
      gl.uniform2f(programs.display.uniforms.uResolution, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.uniform1f(programs.display.uniforms.uPixelRatio, Math.min(window.devicePixelRatio || 1, MAX_DPR));
      if (textTexture) {
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, textTexture);
        gl.uniform1i(programs.display.uniforms.uTextMask, 1);
        gl.uniform1f(programs.display.uniforms.uHasTextMask, 1);
      } else {
        gl.uniform1f(programs.display.uniforms.uHasTextMask, 0);
      }
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    }

    function tick() {
      if (needsResize) resizeCanvas();
      if (needsMask) uploadTextMask();
      const now = Date.now();
      const dt = Math.min((now - lastTime) / 1000, 0.016666);
      lastTime = now;
      elapsed += dt;

      pointer.sx += (pointer.x - pointer.sx) * 0.12;
      pointer.sy += (pointer.cachedY - pointer.sy) * 0.12;
      pointer.inCanvas = pointer.sx >= 0 && pointer.sx <= bounds.width && pointer.sy >= 0 && pointer.sy <= bounds.height;

      if (cursor) {
        cursor.style.opacity = pointer.inCanvas ? "1" : "0";
        cursor.style.transform = `translate(${pointer.sx}px, ${pointer.sy}px)`;
      }

      pointer.prevTexcoordX = pointer.texcoordX;
      pointer.prevTexcoordY = pointer.texcoordY;
      pointer.texcoordX = (pointer.sx * Math.min(window.devicePixelRatio || 1, MAX_DPR)) / canvas.width;
      pointer.texcoordY = 1 - (pointer.sy * Math.min(window.devicePixelRatio || 1, MAX_DPR)) / canvas.height;
      pointer.deltaX = correctDeltaX(pointer.texcoordX - pointer.prevTexcoordX);
      pointer.deltaY = correctDeltaY(pointer.texcoordY - pointer.prevTexcoordY);
      const speed = Math.hypot(pointer.deltaX, pointer.deltaY);
      pointer.smoothSpeed += (speed - pointer.smoothSpeed) * 0.15;
      pointer.speed = pointer.smoothSpeed;
      pointer.moved = Math.abs(pointer.deltaX) > 0 || Math.abs(pointer.deltaY) > 0;

      if (pointer.moved && pointer.rawX !== -8 && pointer.inCanvas) {
        applyPointerSplat();
      }

      stepSimulation(dt);
      render();
      raf = requestAnimationFrame(tick);
    }

    function updatePointer(event) {
      const rectTop = bounds.top - window.scrollY;
      const x = event.clientX - bounds.left;
      const y = event.clientY - rectTop;
      document.documentElement.style.setProperty("--cursor-xn", `${event.clientX / window.innerWidth}`);
      document.documentElement.style.setProperty("--cursor-yn", `${event.clientY / window.innerHeight}`);
      pointer.rawX = event.clientX;
      pointer.rawY = event.clientY;
      pointer.x = x;
      pointer.y = y;
      pointer.cachedY = y;
      pointer.inCanvas = x >= 0 && x <= bounds.width && y >= 0 && y <= bounds.height;
    }

    const observer = new ResizeObserver(() => {
      needsResize = true;
      needsMask = true;
    });
    observer.observe(hero);
    observer.observe(title);

    window.addEventListener("pointermove", updatePointer, { passive: true });
    window.addEventListener("scroll", () => {
      needsResize = true;
    }, { passive: true });
    window.addEventListener("resize", () => {
      needsResize = true;
      needsMask = true;
    }, { passive: true });
    if (document.fonts) {
      document.fonts.ready.then(() => {
        needsMask = true;
      });
    }

    try {
      resizeCanvas();
      uploadTextMask();
      tick();
    } catch (error) {
      console.error(error);
      hero.classList.remove("is-fluid-ready");
      cancelAnimationFrame(raf);
    }
  }
}
