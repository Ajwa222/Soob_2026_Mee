/*
 * Stripe-style WebGL Gradient Animation
 * Based on Stripe.com's implementation
 * Adapted for Simba
 */

function normalizeColor(hexCode) {
  return [
    ((hexCode >> 16) & 255) / 255,
    ((hexCode >> 8) & 255) / 255,
    (255 & hexCode) / 255,
  ];
}

class MiniGl {
  constructor(canvas, width, height) {
    const _miniGl = this;
    _miniGl.canvas = canvas;
    _miniGl.gl = _miniGl.canvas.getContext("webgl", { antialias: true });
    _miniGl.meshes = [];
    const context = _miniGl.gl;
    width && height && this.setSize(width, height);

    Object.defineProperties(_miniGl, {
      Material: {
        enumerable: false,
        value: class {
          constructor(vertexShaders, fragments, uniforms = {}) {
            const material = this;
            function getShaderByType(type, source) {
              const shader = context.createShader(type);
              return (
                context.shaderSource(shader, source),
                context.compileShader(shader),
                context.getShaderParameter(shader, context.COMPILE_STATUS) ||
                  console.error(context.getShaderInfoLog(shader)),
                shader
              );
            }
            function getUniformVariableDeclarations(uniforms, type) {
              return Object.entries(uniforms)
                .map(([uniform, value]) => value.getDeclaration(uniform, type))
                .join("\n");
            }
            material.uniforms = uniforms;
            material.uniformInstances = [];
            const prefix = "\n precision highp float;\n ";
            (material.vertexSource = `\n ${prefix}\n attribute vec4 position;\n attribute vec2 uv;\n attribute vec2 uvNorm;\n ${getUniformVariableDeclarations(_miniGl.commonUniforms, "vertex")}\n ${getUniformVariableDeclarations(uniforms, "vertex")}\n ${vertexShaders}\n `),
              (material.Source = `\n ${prefix}\n ${getUniformVariableDeclarations(_miniGl.commonUniforms, "fragment")}\n ${getUniformVariableDeclarations(uniforms, "fragment")}\n ${fragments}\n `),
              (material.vertexShader = getShaderByType(context.VERTEX_SHADER, material.vertexSource)),
              (material.fragmentShader = getShaderByType(context.FRAGMENT_SHADER, material.Source)),
              (material.program = context.createProgram()),
              context.attachShader(material.program, material.vertexShader),
              context.attachShader(material.program, material.fragmentShader),
              context.linkProgram(material.program),
              context.getProgramParameter(material.program, context.LINK_STATUS) ||
                console.error(context.getProgramInfoLog(material.program)),
              context.useProgram(material.program),
              material.attachUniforms(void 0, _miniGl.commonUniforms),
              material.attachUniforms(void 0, material.uniforms);
          }
          attachUniforms(name, uniforms) {
            const material = this;
            void 0 === name
              ? Object.entries(uniforms).forEach(([name, uniform]) => {
                  material.attachUniforms(name, uniform);
                })
              : "array" == uniforms.type
                ? uniforms.value.forEach((uniform, i) =>
                    material.attachUniforms(`${name}[${i}]`, uniform),
                  )
                : "struct" == uniforms.type
                  ? Object.entries(uniforms.value).forEach(([uniform, i]) =>
                      material.attachUniforms(`${name}.${uniform}`, i),
                    )
                  : material.uniformInstances.push({
                      uniform: uniforms,
                      location: context.getUniformLocation(material.program, name),
                    });
          }
        },
      },
      Uniform: {
        enumerable: false,
        value: class {
          constructor(e) {
            (this.type = "float"), Object.assign(this, e);
            (this.typeFn =
              {
                float: "1f",
                int: "1i",
                vec2: "2fv",
                vec3: "3fv",
                vec4: "4fv",
                mat4: "Matrix4fv",
              }[this.type] || "1f"),
              this.update();
          }
          update(value) {
            void 0 !== this.value &&
              context[`uniform${this.typeFn}`](
                value,
                0 === this.typeFn.indexOf("Matrix") ? this.transpose : this.value,
                0 === this.typeFn.indexOf("Matrix") ? this.value : null,
              );
          }
          getDeclaration(name, type, length) {
            const uniform = this;
            if (uniform.excludeFrom !== type) {
              if ("array" === uniform.type)
                return (
                  uniform.value[0].getDeclaration(name, type, uniform.value.length) +
                  `\nconst int ${name}_length = ${uniform.value.length};`
                );
              if ("struct" === uniform.type) {
                let name_no_prefix = name.replace("u_", "");
                return (
                  (name_no_prefix =
                    name_no_prefix.charAt(0).toUpperCase() + name_no_prefix.slice(1)),
                  `uniform struct ${name_no_prefix}\n{\n` +
                    Object.entries(uniform.value)
                      .map(([name, uniform]) =>
                        uniform.getDeclaration(name, type).replace(/^uniform/, ""),
                      )
                      .join("") +
                    `\n} ${name}${length > 0 ? `[${length}]` : ""};`
                );
              }
              return `uniform ${uniform.type} ${name}${length > 0 ? `[${length}]` : ""};`;
            }
          }
        },
      },
      PlaneGeometry: {
        enumerable: false,
        value: class {
          constructor(width, height, n, i, orientation) {
            context.createBuffer();
            (this.attributes = {
              position: new _miniGl.Attribute({ target: context.ARRAY_BUFFER, size: 3 }),
              uv: new _miniGl.Attribute({ target: context.ARRAY_BUFFER, size: 2 }),
              uvNorm: new _miniGl.Attribute({ target: context.ARRAY_BUFFER, size: 2 }),
              index: new _miniGl.Attribute({
                target: context.ELEMENT_ARRAY_BUFFER,
                size: 3,
                type: context.UNSIGNED_SHORT,
              }),
            }),
              this.setTopology(n, i),
              this.setSize(width, height, orientation);
          }
          setTopology(e = 1, t = 1) {
            const n = this;
            (n.xSegCount = e),
              (n.ySegCount = t),
              (n.vertexCount = (n.xSegCount + 1) * (n.ySegCount + 1)),
              (n.quadCount = n.xSegCount * n.ySegCount * 2),
              (n.attributes.uv.values = new Float32Array(2 * n.vertexCount)),
              (n.attributes.uvNorm.values = new Float32Array(2 * n.vertexCount)),
              (n.attributes.index.values = new Uint16Array(3 * n.quadCount));
            for (let e = 0; e <= n.ySegCount; e++)
              for (let t = 0; t <= n.xSegCount; t++) {
                const i = e * (n.xSegCount + 1) + t;
                if (
                  ((n.attributes.uv.values[2 * i] = t / n.xSegCount),
                  (n.attributes.uv.values[2 * i + 1] = 1 - e / n.ySegCount),
                  (n.attributes.uvNorm.values[2 * i] = (t / n.xSegCount) * 2 - 1),
                  (n.attributes.uvNorm.values[2 * i + 1] = 1 - (e / n.ySegCount) * 2),
                  t < n.xSegCount && e < n.ySegCount)
                ) {
                  const s = e * n.xSegCount + t;
                  (n.attributes.index.values[6 * s] = i),
                    (n.attributes.index.values[6 * s + 1] = i + 1 + n.xSegCount),
                    (n.attributes.index.values[6 * s + 2] = i + 1),
                    (n.attributes.index.values[6 * s + 3] = i + 1),
                    (n.attributes.index.values[6 * s + 4] = i + 1 + n.xSegCount),
                    (n.attributes.index.values[6 * s + 5] = i + 2 + n.xSegCount);
                }
              }
            n.attributes.uv.update(),
              n.attributes.uvNorm.update(),
              n.attributes.index.update();
          }
          setSize(width = 1, height = 1, orientation = "xz") {
            const geometry = this;
            (geometry.width = width),
              (geometry.height = height),
              (geometry.orientation = orientation),
              (geometry.attributes.position.values &&
                geometry.attributes.position.values.length === 3 * geometry.vertexCount) ||
                (geometry.attributes.position.values = new Float32Array(
                  3 * geometry.vertexCount,
                ));
            const o = width / -2,
              r = height / -2,
              segment_width = width / geometry.xSegCount,
              segment_height = height / geometry.ySegCount;
            for (let yIndex = 0; yIndex <= geometry.ySegCount; yIndex++) {
              const t = r + yIndex * segment_height;
              for (let xIndex = 0; xIndex <= geometry.xSegCount; xIndex++) {
                const r = o + xIndex * segment_width,
                  l = yIndex * (geometry.xSegCount + 1) + xIndex;
                (geometry.attributes.position.values[
                  3 * l + "xyz".indexOf(orientation[0])
                ] = r),
                  (geometry.attributes.position.values[
                    3 * l + "xyz".indexOf(orientation[1])
                  ] = -t);
              }
            }
            geometry.attributes.position.update();
          }
        },
      },
      Mesh: {
        enumerable: false,
        value: class {
          constructor(geometry, material) {
            const mesh = this;
            (mesh.geometry = geometry),
              (mesh.material = material),
              (mesh.wireframe = false),
              (mesh.attributeInstances = []),
              Object.entries(mesh.geometry.attributes).forEach(([e, attribute]) => {
                mesh.attributeInstances.push({
                  attribute: attribute,
                  location: attribute.attach(e, mesh.material.program),
                });
              }),
              _miniGl.meshes.push(mesh);
          }
          draw() {
            context.useProgram(this.material.program),
              this.material.uniformInstances.forEach(({ uniform: e, location: t }) =>
                e.update(t),
              ),
              this.attributeInstances.forEach(({ attribute: e, location: t }) => e.use(t)),
              context.drawElements(
                this.wireframe ? context.LINES : context.TRIANGLES,
                this.geometry.attributes.index.values.length,
                context.UNSIGNED_SHORT,
                0,
              );
          }
          remove() {
            _miniGl.meshes = _miniGl.meshes.filter((e) => e != this);
          }
        },
      },
      Attribute: {
        enumerable: false,
        value: class {
          constructor(e) {
            (this.type = context.FLOAT),
              (this.normalized = false),
              (this.buffer = context.createBuffer()),
              Object.assign(this, e),
              this.update();
          }
          update() {
            void 0 !== this.values &&
              (context.bindBuffer(this.target, this.buffer),
              context.bufferData(this.target, this.values, context.STATIC_DRAW));
          }
          attach(e, t) {
            const n = context.getAttribLocation(t, e);
            return (
              this.target === context.ARRAY_BUFFER &&
                (context.enableVertexAttribArray(n),
                context.vertexAttribPointer(n, this.size, this.type, this.normalized, 0, 0)),
              n
            );
          }
          use(e) {
            context.bindBuffer(this.target, this.buffer),
              this.target === context.ARRAY_BUFFER &&
                (context.enableVertexAttribArray(e),
                context.vertexAttribPointer(e, this.size, this.type, this.normalized, 0, 0));
          }
        },
      },
    });
    const a = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    _miniGl.commonUniforms = {
      projectionMatrix: new _miniGl.Uniform({ type: "mat4", value: a }),
      modelViewMatrix: new _miniGl.Uniform({ type: "mat4", value: a }),
      resolution: new _miniGl.Uniform({ type: "vec2", value: [1, 1] }),
      aspectRatio: new _miniGl.Uniform({ type: "float", value: 1 }),
    };
  }
  setSize(e = 640, t = 480) {
    (this.width = e),
      (this.height = t),
      (this.canvas.width = e),
      (this.canvas.height = t),
      this.gl.viewport(0, 0, e, t),
      (this.commonUniforms.resolution.value = [e, t]),
      (this.commonUniforms.aspectRatio.value = e / t);
  }
  setOrthographicCamera(e = 0, t = 0, n = 0, i = -2e3, s = 2e3) {
    this.commonUniforms.projectionMatrix.value = [
      2 / this.width, 0, 0, 0,
      0, 2 / this.height, 0, 0,
      0, 0, 2 / (i - s), 0,
      e, t, n, 1,
    ];
  }
  render() {
    this.gl.clearColor(0, 0, 0, 0),
      this.gl.clearDepth(1),
      this.meshes.forEach((e) => e.draw());
  }
}

// ── Shader sources ──

const shaderNoise = `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}`;

const shaderBlend = `
vec3 blendNormal(vec3 base, vec3 blend) { return blend; }
vec3 blendNormal(vec3 base, vec3 blend, float opacity) {
  return (blendNormal(base, blend) * opacity + base * (1.0 - opacity));
}`;

const shaderVertex = `
varying vec3 v_color;
void main() {
  float time = u_time * u_global.noiseSpeed;
  vec2 noiseCoord = resolution * uvNorm * u_global.noiseFreq;
  vec2 st = 1. - uvNorm.xy;
  float tilt = resolution.y / 2.0 * uvNorm.y;
  float incline = resolution.x * uvNorm.x / 2.0 * u_vertDeform.incline;
  float offset = resolution.x / 2.0 * u_vertDeform.incline * mix(u_vertDeform.offsetBottom, u_vertDeform.offsetTop, uv.y);
  float noise = snoise(vec3(
    noiseCoord.x * u_vertDeform.noiseFreq.x + time * u_vertDeform.noiseFlow,
    noiseCoord.y * u_vertDeform.noiseFreq.y,
    time * u_vertDeform.noiseSpeed + u_vertDeform.noiseSeed
  )) * u_vertDeform.noiseAmp;
  noise *= 1.0 - pow(abs(uvNorm.y), 2.0);
  noise = max(0.0, noise);
  vec3 pos = vec3(position.x, position.y + tilt + incline + noise - offset, position.z);
  if (u_active_colors[0] == 1.) { v_color = u_baseColor; }
  for (int i = 0; i < u_waveLayers_length; i++) {
    if (u_active_colors[i + 1] == 1.) {
      WaveLayers layer = u_waveLayers[i];
      float noise = smoothstep(
        layer.noiseFloor,
        layer.noiseCeil,
        snoise(vec3(
          noiseCoord.x * layer.noiseFreq.x + time * layer.noiseFlow,
          noiseCoord.y * layer.noiseFreq.y,
          time * layer.noiseSpeed + layer.noiseSeed
        )) / 2.0 + 0.5
      );
      v_color = blendNormal(v_color, layer.color, pow(noise, 4.));
    }
  }
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}`;

const shaderFragment = `
varying vec3 v_color;
void main() {
  vec3 color = v_color;
  if (u_darken_top == 1.0) {
    vec2 st = gl_FragCoord.xy/resolution.xy;
    color.g -= pow(st.y + sin(-12.0) * st.x, u_shadow_power) * 0.4;
  }
  gl_FragColor = vec4(color, 1.0);
}`;

// ── Gradient controller ──

class Gradient {
  constructor() {
    this.el = null;
    this.cssVarRetries = 0;
    this.maxCssVarRetries = 200;
    this.angle = 0;
    this.isLoadedClass = false;
    this.computedCanvasStyle = null;
    this.conf = { density: [0.06, 0.16], zoom: 1, rotation: 0, playing: true };
    this.uniforms = null;
    this.t = 1253106;
    this.last = 0;
    this.width = 0;
    this.height = 600;
    this.autoHeight = true;
    this.xSegCount = 0;
    this.ySegCount = 0;
    this.mesh = null;
    this.material = null;
    this.geometry = null;
    this.minigl = null;
    this.amp = 320;
    this.seed = 5;
    this.freqX = 14e-5;
    this.freqY = 29e-5;
    this.activeColors = [1, 1, 1, 1];
    this.colors = null;
    this._raf = null;
    this._disposed = false;

    this.resize = () => {
      if (this._disposed) return;
      this.width = window.innerWidth;
      if (this.autoHeight && this.el && this.el.parentElement) {
        this.height = this.el.parentElement.offsetHeight;
      }
      this.minigl.setSize(this.width, this.height);
      this.minigl.setOrthographicCamera();
      const isMobile = this.width < 600;
      const density = isMobile ? [0.04, 0.12] : this.conf.density;
      this.xSegCount = Math.ceil(this.width * density[0]);
      this.ySegCount = Math.ceil(this.height * density[1]);
      this.mesh.geometry.setTopology(this.xSegCount, this.ySegCount);
      this.mesh.geometry.setSize(this.width, this.height);
      this.mesh.material.uniforms.u_shadow_power.value = isMobile ? 5 : 6;
    };

    this.animate = (e) => {
      if (this._disposed) return;
      if (!this.shouldSkipFrame(e)) {
        this.t += Math.min(e - this.last, 1e3 / 15);
        this.last = e;
        this.mesh.material.uniforms.u_time.value = this.t;
        this.minigl.render();
      }
      if (this.conf.playing) {
        this._raf = requestAnimationFrame(this.animate);
      }
    };
  }

  initGradient(selector) {
    this.el = document.querySelector(selector);
    if (!this.el) return this;
    this.connect();
    return this;
  }

  connect() {
    this.minigl = new MiniGl(this.el, null, null);
    requestAnimationFrame(() => {
      if (this.el) {
        this.computedCanvasStyle = getComputedStyle(this.el);
        this.waitForCssVars();
      }
    });
  }

  disconnect() {
    this._disposed = true;
    this.conf.playing = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    window.removeEventListener("resize", this.resize);
  }

  waitForCssVars() {
    if (this._disposed) return;
    if (
      this.computedCanvasStyle &&
      this.computedCanvasStyle.getPropertyValue("--gradient-color-1").indexOf("#") !== -1
    ) {
      this.init();
      this.addIsLoadedClass();
    } else {
      this.cssVarRetries += 1;
      if (this.cssVarRetries > this.maxCssVarRetries) {
        this.sectionColors = [
          normalizeColor(0x5ba8f5),
          normalizeColor(0x6dcbca),
          normalizeColor(0x6ee29e),
          normalizeColor(0x5ba8f5),
        ];
        this.init();
        return;
      }
      requestAnimationFrame(() => this.waitForCssVars());
    }
  }

  initGradientColors() {
    if (this.colors && this.colors.length) {
      this.sectionColors = this.colors.map((hex) => {
        const clean = hex.replace('#', '');
        return normalizeColor(parseInt(clean, 16));
      });
      return;
    }
    this.sectionColors = [
      "--gradient-color-1",
      "--gradient-color-2",
      "--gradient-color-3",
      "--gradient-color-4",
    ]
      .map((cssPropertyName) => {
        let hex = this.computedCanvasStyle.getPropertyValue(cssPropertyName).trim();
        if (4 === hex.length) {
          const hexTemp = hex
            .substr(1)
            .split("")
            .map((h) => h + h)
            .join("");
          hex = `#${hexTemp}`;
        }
        return hex && `0x${hex.substr(1)}`;
      })
      .filter(Boolean)
      .map(normalizeColor);
  }

  initMaterial() {
    this.uniforms = {
      u_time: new this.minigl.Uniform({ value: 0 }),
      u_shadow_power: new this.minigl.Uniform({ value: 5 }),
      u_darken_top: new this.minigl.Uniform({
        value: "" === this.el.dataset.jsDarkenTop ? 1 : 0,
      }),
      u_active_colors: new this.minigl.Uniform({
        value: this.activeColors,
        type: "vec4",
      }),
      u_global: new this.minigl.Uniform({
        value: {
          noiseFreq: new this.minigl.Uniform({
            value: [this.freqX, this.freqY],
            type: "vec2",
          }),
          noiseSpeed: new this.minigl.Uniform({ value: 1e-5 }),
        },
        type: "struct",
      }),
      u_vertDeform: new this.minigl.Uniform({
        value: {
          incline: new this.minigl.Uniform({
            value: Math.sin(this.angle) / Math.cos(this.angle),
          }),
          offsetTop: new this.minigl.Uniform({ value: -0.5 }),
          offsetBottom: new this.minigl.Uniform({ value: -0.5 }),
          noiseFreq: new this.minigl.Uniform({ value: [3, 4], type: "vec2" }),
          noiseAmp: new this.minigl.Uniform({ value: this.amp }),
          noiseSpeed: new this.minigl.Uniform({ value: 10 }),
          noiseFlow: new this.minigl.Uniform({ value: 3 }),
          noiseSeed: new this.minigl.Uniform({ value: this.seed }),
        },
        type: "struct",
        excludeFrom: "fragment",
      }),
      u_baseColor: new this.minigl.Uniform({
        value: this.sectionColors[0],
        type: "vec3",
        excludeFrom: "fragment",
      }),
      u_waveLayers: new this.minigl.Uniform({
        value: [],
        excludeFrom: "fragment",
        type: "array",
      }),
    };
    for (let e = 1; e < this.sectionColors.length; e += 1) {
      this.uniforms.u_waveLayers.value.push(
        new this.minigl.Uniform({
          value: {
            color: new this.minigl.Uniform({
              value: this.sectionColors[e],
              type: "vec3",
            }),
            noiseFreq: new this.minigl.Uniform({
              value: [2 + e / this.sectionColors.length, 3 + e / this.sectionColors.length],
              type: "vec2",
            }),
            noiseSpeed: new this.minigl.Uniform({ value: 11 + 0.3 * e }),
            noiseFlow: new this.minigl.Uniform({ value: 6.5 + 0.3 * e }),
            noiseSeed: new this.minigl.Uniform({ value: this.seed + 10 * e }),
            noiseFloor: new this.minigl.Uniform({ value: 0.1 }),
            noiseCeil: new this.minigl.Uniform({ value: 0.63 + 0.07 * e }),
          },
          type: "struct",
        }),
      );
    }
    const vertexShaderSource = [shaderNoise, shaderBlend, shaderVertex].join("\n\n");
    return new this.minigl.Material(vertexShaderSource, shaderFragment, this.uniforms);
  }

  initMesh() {
    this.material = this.initMaterial();
    this.geometry = new this.minigl.PlaneGeometry();
    this.mesh = new this.minigl.Mesh(this.geometry, this.material);
  }

  shouldSkipFrame(e) {
    return !!window.document.hidden || !this.conf.playing;
  }

  init() {
    this.initGradientColors();
    this.initMesh();
    this.resize();
    this._raf = requestAnimationFrame(this.animate);
    window.addEventListener("resize", this.resize);
  }

  addIsLoadedClass() {
    if (!this.isLoadedClass && this.el) {
      this.isLoadedClass = true;
      this.el.classList.add("isLoaded");
    }
  }

  pause() {
    this.conf.playing = false;
  }

  play() {
    this.conf.playing = true;
    this._raf = requestAnimationFrame(this.animate);
  }
}

export { Gradient };
