/**
 * RobotAvatar — ikki shaffof video holati (tinglash / gapirish) o‘rtasida
 * yumshoq o‘tish. Packed MP4: chap yarmi RGB, o‘ng yarmi grayscale alpha.
 *
 * robot-preview.html dan ko‘chirilgan; tarmoq yoki tashqi kutubxona yo‘q.
 */

export type RobotAvatarState = 'listening' | 'speaking';

export type RobotAvatarOptions = {
  listening: string;
  speaking: string;
  transitionMs?: number;
  onError?: (error: Error) => void;
};

type WorkBuffers = {
  color: HTMLCanvasElement;
  matte: HTMLCanvasElement;
  c: CanvasRenderingContext2D;
  a: CanvasRenderingContext2D;
  time: number;
};

export class RobotAvatar {
  private readonly canvas: HTMLCanvasElement;
  private readonly duration: number;
  private readonly onError?: (error: Error) => void;
  private value = 0;
  private from = 0;
  private target = 0;
  private startedAt = 0;
  private state: RobotAvatarState = 'listening';
  private disposed = false;
  paused = false;
  private readonly gl: WebGLRenderingContext | null;
  private ctx2d: CanvasRenderingContext2D | null = null;
  private renderSize = 512;
  private last2D = -Infinity;
  private work: WorkBuffers[] = [];
  private videos: HTMLVideoElement[] = [];
  private textures: WebGLTexture[] = [];
  private program: WebGLProgram | null = null;
  private buffer: WebGLBuffer | null = null;
  private fadeUniform: WebGLUniformLocation | null = null;
  private raf = 0;
  readonly ready: Promise<RobotAvatar>;

  constructor(canvas: HTMLCanvasElement, options: RobotAvatarOptions) {
    if (!(canvas instanceof HTMLCanvasElement)) throw new TypeError('A canvas is required.');
    if (!options.listening || !options.speaking) {
      throw new TypeError('Both video sources are required.');
    }
    this.canvas = canvas;
    this.duration = Math.max(0, Number(options.transitionMs ?? 240));
    this.onError = options.onError;

    this.gl = canvas.getContext('webgl', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'low-power',
    });
    if (this.gl) this.setupGL();
    else this.setup2D();

    this.videos = [options.listening, options.speaking].map((src) => {
      const video = document.createElement('video');
      video.muted = true;
      video.defaultMuted = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = 'auto';
      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', '');
      video.setAttribute('aria-hidden', 'true');
      video.tabIndex = -1;
      video.style.cssText =
        'position:fixed;left:-4px;top:-4px;width:1px;height:1px;opacity:0;pointer-events:none';
      if (/^https?:/.test(src)) video.crossOrigin = 'anonymous';
      video.src = src;
      document.body.appendChild(video);
      return video;
    });

    this.ready = Promise.all(this.videos.map((video) => this.waitForVideo(video)))
      .then(() => this.resume())
      .then(() => {
        this.draw(performance.now());
        return this;
      });
    this.ready.catch((error: unknown) => {
      if (this.onError) this.onError(error instanceof Error ? error : new Error(String(error)));
    });

    const tick = (time: number) => {
      if (this.disposed) return;
      this.draw(time);
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  private setup2D(): void {
    this.ctx2d = this.canvas.getContext('2d', { alpha: true });
    if (!this.ctx2d) throw new Error('Canvas brauzerda ishlamayapti.');
    this.renderSize = Math.min(512, this.canvas.width);
    this.last2D = -Infinity;
    this.work = [0, 1].map(() => {
      const color = document.createElement('canvas');
      const matte = document.createElement('canvas');
      color.width = color.height = matte.width = matte.height = this.renderSize;
      const c = color.getContext('2d', { willReadFrequently: true });
      const a = matte.getContext('2d', { willReadFrequently: true });
      if (!c || !a) throw new Error('2D kontekst ochilmadi.');
      return { color, matte, c, a, time: -1 };
    });
  }

  private draw2D(now: number): void {
    if (!this.ctx2d) return;
    if (now - this.last2D < 31) return;
    this.last2D = now;
    this.value = this.getValue(now);
    const size = this.renderSize;
    const ctx = this.ctx2d;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.globalCompositeOperation = 'source-over';
    this.videos.forEach((video, index) => {
      const weight = index === 0 ? 1 - this.value : this.value;
      if (weight < 0.0001 || video.readyState < 2) return;
      const work = this.work[index];
      if (Math.abs(video.currentTime - work.time) > 0.012 || work.time < 0) {
        const half = video.videoWidth / 2;
        work.c.clearRect(0, 0, size, size);
        work.a.clearRect(0, 0, size, size);
        work.c.drawImage(video, 0, 0, half, video.videoHeight, 0, 0, size, size);
        work.a.drawImage(video, half, 0, half, video.videoHeight, 0, 0, size, size);
        const color = work.c.getImageData(0, 0, size, size);
        const alpha = work.a.getImageData(0, 0, size, size).data;
        for (let i = 0; i < color.data.length; i += 4) {
          color.data[i + 3] = Math.max(0, Math.min(255, ((alpha[i] - 2) * 255) / 251));
        }
        work.c.putImageData(color, 0, 0);
        work.time = video.currentTime;
      }
      ctx.globalAlpha = weight;
      ctx.drawImage(work.color, 0, 0, this.canvas.width, this.canvas.height);
      ctx.globalCompositeOperation = 'lighter';
    });
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  private waitForVideo(video: HTMLVideoElement): Promise<void> {
    return new Promise((resolve, reject) => {
      if (video.readyState >= 2) {
        resolve();
        return;
      }
      const cleanup = () => {
        clearTimeout(timer);
        video.removeEventListener('loadeddata', ok);
        video.removeEventListener('error', fail);
      };
      const ok = () => {
        cleanup();
        resolve();
      };
      const fail = () => {
        cleanup();
        reject(new Error('Robot videosini yuklab bo‘lmadi.'));
      };
      const timer = window.setTimeout(() => {
        cleanup();
        reject(new Error('Robot videosi juda sekin yuklandi.'));
      }, 20_000);
      video.addEventListener('loadeddata', ok, { once: true });
      video.addEventListener('error', fail, { once: true });
      video.load();
    });
  }

  private setupGL(): void {
    const gl = this.gl;
    if (!gl) return;
    const compile = (kind: number, code: string) => {
      const shader = gl.createShader(kind);
      if (!shader) throw new Error('WebGL shader yaratilmadi.');
      gl.shaderSource(shader, code);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(shader) || 'Shader xatosi');
      }
      return shader;
    };
    const vs = compile(
      gl.VERTEX_SHADER,
      `attribute vec2 a_position; varying vec2 uv;
        void main(){uv=(a_position+1.0)*0.5;gl_Position=vec4(a_position,0.0,1.0);}`,
    );
    const fs = compile(
      gl.FRAGMENT_SHADER,
      `precision mediump float;
        varying vec2 uv; uniform sampler2D listenTex; uniform sampler2D speakTex; uniform float fade;
        vec4 readAvatar(sampler2D frame){
          vec3 rgb=texture2D(frame,vec2(uv.x*0.5,uv.y)).rgb;
          float a=texture2D(frame,vec2(0.5+uv.x*0.5,uv.y)).r;
          a=clamp((a-0.008)/0.984,0.0,1.0);
          return vec4(rgb*a,a);
        }
        void main(){gl_FragColor=mix(readAvatar(listenTex),readAvatar(speakTex),fade);}`,
    );
    const program = gl.createProgram();
    if (!program) throw new Error('WebGL program yaratilmadi.');
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) || 'Program link xatosi');
    }
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    this.program = program;
    gl.useProgram(program);
    this.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.uniform1i(gl.getUniformLocation(program, 'listenTex'), 0);
    gl.uniform1i(gl.getUniformLocation(program, 'speakTex'), 1);
    this.fadeUniform = gl.getUniformLocation(program, 'fade');
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    this.textures = [0, 1].map((index) => {
      gl.activeTexture(gl.TEXTURE0 + index);
      const texture = gl.createTexture();
      if (!texture) throw new Error('WebGL texture yaratilmadi.');
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
      return texture;
    });
    gl.clearColor(0, 0, 0, 0);
  }

  private getValue(now: number): number {
    if (this.duration === 0) return this.target;
    const progress = Math.max(0, Math.min(1, (now - this.startedAt) / this.duration));
    const smooth = progress * progress * (3 - 2 * progress);
    return this.from + (this.target - this.from) * smooth;
  }

  setState(state: RobotAvatarState): void {
    if (this.disposed || this.state === state) return;
    const now = performance.now();
    this.from = this.getValue(now);
    this.target = state === 'speaking' ? 1 : 0;
    this.startedAt = now;
    this.state = state;
    const incoming = this.videos[this.target];
    const outgoing = this.videos[1 - this.target];
    if (
      incoming.readyState >= 2 &&
      outgoing.readyState >= 2 &&
      Math.abs(incoming.currentTime - outgoing.currentTime) > 0.1
    ) {
      try {
        incoming.currentTime = outgoing.currentTime % (incoming.duration || 6);
      } catch {
        /* metadata hali yo'q */
      }
    }
  }

  private draw(now: number): void {
    if (!this.videos.length || this.disposed) return;
    if (!this.gl) {
      this.draw2D(now);
      return;
    }
    const gl = this.gl;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    if (this.program) gl.useProgram(this.program);
    this.videos.forEach((video, i) => {
      if (video.readyState < 2) return;
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, this.textures[i]);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
    });
    this.value = this.getValue(now);
    gl.uniform1f(this.fadeUniform, this.value);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  async resume(): Promise<void> {
    if (this.disposed) return;
    await Promise.all(this.videos.map((video) => video.play()));
    this.paused = false;
  }

  pause(): void {
    this.videos.forEach((video) => video.pause());
    this.paused = true;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.videos.forEach((video) => {
      video.pause();
      video.removeAttribute('src');
      video.load();
      video.remove();
    });
    if (this.gl) {
      this.textures.forEach((t) => this.gl!.deleteTexture(t));
      if (this.buffer) this.gl.deleteBuffer(this.buffer);
      if (this.program) this.gl.deleteProgram(this.program);
    }
  }
}
