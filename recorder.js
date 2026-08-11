/**
 * 音频录制工具类
 * 基于 MediaRecorder + Web Audio API + lamejs
 * 支持：录音/停止/试听/波形可视化/时长计时/MP3编码/PCM采集
 */
window.AudioRecorder = class AudioRecorder {
  constructor(options = {}) {
    this.stream = null;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.audioBlob = null;
    this.audioUrl = null;
    this.audioContext = null;
    this.analyser = null;
    this.dataArray = null;
    this.canvas = null;
    this.canvasCtx = null;
    this.animationId = null;
    this.startTime = 0;
    this.timerId = null;
    this.duration = 0;
    this.isRecording = false;
    this.permission = 'unknown'; // unknown | granted | denied
    this.onStateChange = options.onStateChange || (() => {});
    this.onTimerChange = options.onTimerChange || (() => {});
    this.onError = options.onError || (() => {});
    // PCM采集
    this.scriptProcessor = null;
    this.pcmSamples = [];
    this.sourceSampleRate = 44100;
  }

  /**
   * 检查浏览器支持
   */
  static isSupported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  }

  /**
   * 请求麦克风权限
   */
  async requestPermission() {
    if (!AudioRecorder.isSupported()) {
      this.onError('当前浏览器不支持录音功能，请使用 Chrome 90+ 或 Edge 90+');
      return false;
    }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });
      this.permission = 'granted';
      this.onStateChange('ready');
      return true;
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        this.permission = 'denied';
        this.onError('麦克风权限被拒绝，请在浏览器设置中允许使用麦克风');
      } else if (err.name === 'NotFoundError') {
        this.onError('未检测到麦克风设备，请检查设备连接');
      } else {
        this.onError('麦克风初始化失败：' + err.message);
      }
      this.permission = 'denied';
      this.onStateChange('denied');
      return false;
    }
  }

  /**
   * 设置波形可视化画布
   */
  setCanvas(canvas) {
    this.canvas = canvas;
    if (canvas) {
      this.canvasCtx = canvas.getContext('2d');
    }
  }

  /**
   * 开始录音
   */
  async start() {
    if (this.isRecording) return;

    if (!this.stream) {
      const ok = await this.requestPermission();
      if (!ok) return;
    }

    // 设置音频分析
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    this.sourceSampleRate = this.audioContext.sampleRate;
    const source = this.audioContext.createMediaStreamSource(this.stream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    source.connect(this.analyser);
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    // PCM采集（用于讯飞评测MP3编码）
    this.pcmSamples = [];
    this.scriptProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);
    this.scriptProcessor.onaudioprocess = (e) => {
      if (!this.isRecording) return;
      const input = e.inputBuffer.getChannelData(0);
      // 复制一份数据（Float32Array）
      const chunk = new Float32Array(input.length);
      chunk.set(input);
      this.pcmSamples.push(chunk);
    };
    source.connect(this.scriptProcessor);
    this.scriptProcessor.connect(this.audioContext.destination);

    // 开始录音（MediaRecorder用于试听回放）
    this.audioChunks = [];
    const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
    this.mediaRecorder = new MediaRecorder(this.stream, mimeType ? { mimeType } : undefined);

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.onstop = () => {
      this.audioBlob = new Blob(this.audioChunks, { type: this.mediaRecorder.mimeType || 'audio/webm' });
      this.audioUrl = URL.createObjectURL(this.audioBlob);
      this.onStateChange('stopped');
    };

    this.mediaRecorder.start();
    this.isRecording = true;
    this.startTime = Date.now();
    this.duration = 0;
    this.onStateChange('recording');

    // 启动计时器
    this.timerId = setInterval(() => {
      this.duration = Math.floor((Date.now() - this.startTime) / 1000);
      this.onTimerChange(this.duration);
    }, 200);

    // 启动波形动画
    this.drawWaveform();
  }

  /**
   * 停止录音
   */
  stop() {
    if (!this.isRecording) return;
    this.isRecording = false;

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }

    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    // 停止所有音轨
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    this.scriptProcessor = null;
  }

  /**
   * 将PCM采样重采样到目标采样率
   */
  resample(samples, fromRate, toRate) {
    if (fromRate === toRate) return samples;
    const ratio = fromRate / toRate;
    const newLength = Math.round(samples.length / ratio);
    const result = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
      const srcIndex = i * ratio;
      const srcLow = Math.floor(srcIndex);
      const srcHigh = Math.min(srcLow + 1, samples.length - 1);
      const fraction = srcIndex - srcLow;
      result[i] = samples[srcLow] * (1 - fraction) + samples[srcHigh] * fraction;
    }
    return result;
  }

  /**
   * 将PCM Float32采样编码为MP3
   * @returns {Blob} MP3 Blob
   */
  encodeMP3() {
    if (!this.pcmSamples || this.pcmSamples.length === 0) return null;

    // 合并所有PCM采样
    let totalLength = 0;
    this.pcmSamples.forEach(s => totalLength += s.length);
    let merged = new Float32Array(totalLength);
    let offset = 0;
    this.pcmSamples.forEach(s => {
      merged.set(s, offset);
      offset += s.length;
    });

    // 重采样到16kHz
    merged = this.resample(merged, this.sourceSampleRate, 16000);

    // 转换为Int16
    const int16 = new Int16Array(merged.length);
    for (let i = 0; i < merged.length; i++) {
      const s = Math.max(-1, Math.min(1, merged[i]));
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }

    // MP3编码
    const mp3encoder = new lamejs.Mp3Encoder(1, 16000, 128);
    const mp3Data = [];
    const blockSize = 1152;
    for (let i = 0; i < int16.length; i += blockSize) {
      const chunk = int16.subarray(i, i + blockSize);
      const mp3buf = mp3encoder.encodeBuffer(chunk);
      if (mp3buf.length > 0) mp3Data.push(new Uint8Array(mp3buf));
    }
    const flush = mp3encoder.flush();
    if (flush.length > 0) mp3Data.push(new Uint8Array(flush));

    return new Blob(mp3Data, { type: 'audio/mp3' });
  }

  /**
   * 获取MP3的base64编码（用于发送给讯飞API）
   * @returns {string} base64字符串
   */
  getMp3Base64() {
    const blob = this.encodeMP3();
    if (!blob) return '';
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.readAsDataURL(blob);
    });
  }

  /**
   * 绘制波形
   */
  drawWaveform() {
    if (!this.canvas || !this.analyser) return;

    const draw = () => {
      if (!this.isRecording) return;

      this.animationId = requestAnimationFrame(draw);
      this.analyser.getByteFrequencyData(this.dataArray);

      const width = this.canvas.width;
      const height = this.canvas.height;
      this.canvasCtx.clearRect(0, 0, width, height);

      const barCount = 60;
      const barWidth = width / barCount - 2;
      let x = 0;

      for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.floor(i * this.dataArray.length / barCount);
        const value = this.dataArray[dataIndex];
        const barHeight = (value / 255) * height * 0.8 + 2;

        const gradient = this.canvasCtx.createLinearGradient(0, height, 0, height - barHeight);
        gradient.addColorStop(0, '#1890ff');
        gradient.addColorStop(1, '#36cfc9');

        this.canvasCtx.fillStyle = gradient;
        this.canvasCtx.fillRect(x, height - barHeight, barWidth, barHeight);

        x += barWidth + 2;
      }
    };

    draw();
  }

  /**
   * 绘制静态波形（录音结束后）
   */
  drawStaticWaveform() {
    if (!this.canvas) return;
    const width = this.canvas.width;
    const height = this.canvas.height;
    this.canvasCtx.clearRect(0, 0, width, height);

    const barCount = 60;
    const barWidth = width / barCount - 2;
    let x = 0;

    for (let i = 0; i < barCount; i++) {
      // 生成静态随机波形
      const seed = (i * 7919) % 100;
      const barHeight = (seed / 100) * height * 0.5 + 4;
      this.canvasCtx.fillStyle = '#d9d9d9';
      this.canvasCtx.fillRect(x, height - barHeight, barWidth, barHeight);
      x += barWidth + 2;
    }
  }

  /**
   * 获取录音 URL
   */
  getAudioUrl() {
    return this.audioUrl;
  }

  /**
   * 获取录音 Blob
   */
  getAudioBlob() {
    return this.audioBlob;
  }

  /**
   * 获取录音时长（秒）
   */
  getDuration() {
    return this.duration;
  }

  /**
   * 重置
   */
  reset() {
    if (this.isRecording) {
      this.stop();
    }
    this.audioChunks = [];
    this.audioBlob = null;
    this.pcmSamples = [];
    if (this.audioUrl) {
      URL.revokeObjectURL(this.audioUrl);
      this.audioUrl = null;
    }
    this.duration = 0;
    this.onTimerChange(0);
    this.onStateChange('idle');
  }

  /**
   * 格式化时长
   */
  static formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }
};
