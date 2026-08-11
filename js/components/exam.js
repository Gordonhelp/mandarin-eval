/**
 * 考试评测模块组件
 */
window.ExamComponent = {
  props: {
    currentUser: { type: Object, default: () => ({ name: '考生', username: '', department: '' }) },
  },
  template: `
  <div class="exam-layout">
    <!-- 左侧题号列表 -->
    <div class="exam-sidebar">
      <div class="sidebar-title">题目列表</div>
      <div
        v-for="(q, idx) in questions"
        :key="q.id"
        class="question-list-item"
        :class="{ active: currentIndex === idx }"
        @click="goToQuestion(idx)"
      >
        <span class="q-status" :class="getQuestionStatus(idx)">
          <span v-if="results[idx]">✓</span>
          <span v-else-if="currentIndex === idx">{{ idx + 1 }}</span>
          <span v-else>{{ idx + 1 }}</span>
        </span>
        <span class="q-text">{{ q.title }}</span>
      </div>
      <div style="margin-top:16px;padding:12px;background:#f6ffed;border-radius:6px;border:1px solid #b7eb8f;" v-if="allDone">
        <div style="font-size:13px;color:#52c41a;font-weight:600;margin-bottom:8px;">✅ 全部题目已完成</div>
        <el-button type="success" size="small" @click="showReport = true" style="width:100%;">查看成绩单</el-button>
      </div>
    </div>

    <!-- 中间核心区 -->
    <div class="exam-center">
      <!-- 进度条 -->
      <div class="exam-progress-bar">
        <div class="progress-info">
          <span class="examinee-name">{{ currentUser.name }}</span>
          <el-divider direction="vertical" />
          <span class="examinee-id">账号：{{ currentUser.username }}</span>
          <el-divider direction="vertical" />
          <span class="examinee-id">{{ currentUser.department }}</span>
        </div>
        <div class="progress-bar-wrap">
          <el-progress
            :percentage="progressPercent"
            :format="() => (currentIndex + 1) + ' / ' + questions.length"
            :color="progressColor"
          />
        </div>
        <el-switch
          v-model="showPinyin"
          active-text="拼音"
          inactive-text=""
          :active-value="true"
          :inactive-value="false"
        />
      </div>

      <!-- 题目内容 -->
      <div class="question-card" v-if="currentQuestion">
        <div class="question-header">
          <div>
            <div class="question-title">{{ currentQuestion.title }}</div>
            <div class="question-meta">
              <el-tag size="small" type="info">{{ currentQuestion.category }}</el-tag>
              <el-tag size="small" :type="difficultyType(currentQuestion.difficulty)">
                {{ difficultyText(currentQuestion.difficulty) }}
              </el-tag>
              <span>建议录音时长：{{ currentQuestion.duration }}秒</span>
            </div>
          </div>
          <div v-if="results[currentIndex]">
            <el-tag type="success" size="large">已评测：{{ results[currentIndex].score }}分</el-tag>
          </div>
        </div>

        <div class="question-content" v-html="annotatedContent"></div>
      </div>

      <!-- 录音控制台 -->
      <div class="recorder-console">
        <div class="recorder-top">
          <div class="mic-status">
            <span class="mic-dot" :class="micStatusClass"></span>
            <span>{{ micStatusText }}</span>
          </div>
          <div class="recorder-timer" :class="{ recording: isRecording }">
            {{ formattedTime }}
          </div>
          <div v-if="recordState === 'stopped'" style="font-size:13px;color:#52c41a;">
            ✅ 录音已完成 ({{ recorderDuration }}秒)
          </div>
        </div>

        <div class="waveform-container">
          <canvas ref="waveformCanvas" class="waveform-canvas"></canvas>
        </div>

        <div class="recorder-controls">
          <el-button
            v-if="!isRecording && recordState !== 'stopped'"
            type="primary"
            size="large"
            round
            @click="startRecording"
          >
            🎤 开始录音
          </el-button>
          <el-button
            v-if="isRecording"
            type="danger"
            size="large"
            round
            @click="stopRecording"
          >
            ⏹ 停止录音
          </el-button>
          <el-button
            v-if="recordState === 'stopped'"
            size="large"
            round
            @click="playback"
          >
            🔊 试听回放
          </el-button>
          <el-button
            v-if="recordState === 'stopped'"
            type="warning"
            size="large"
            round
            @click="reRecord"
          >
            🔄 重新录制
          </el-button>
          <el-button
            v-if="recordState === 'stopped'"
            type="success"
            size="large"
            round
            :loading="evaluating"
            @click="submitEvaluation"
          >
            ✅ 确认提交
          </el-button>
        </div>

        <!-- 状态提示 -->
        <div style="text-align:center;margin-top:12px;">
          <el-alert
            v-if="recordState === 'denied'"
            title="麦克风权限被拒绝"
            type="error"
            description="请在浏览器地址栏点击锁形图标，将麦克风权限设为允许，然后刷新页面重试。"
            show-icon
            :closable="false"
            style="margin-bottom:8px;"
          />
          <el-alert
            v-if="recordState === 'stopped' && recorderDuration < 5"
            title="录音时长过短"
            type="warning"
            description="录音时长不足5秒，建议重新录制以获得更准确的评测结果。"
            show-icon
            :closable="false"
            style="margin-bottom:8px;"
          />
          <el-alert
            v-if="evaluating"
            title="正在调用讯飞评测引擎..."
            type="info"
            description="录音已上传，讯飞AI正在分析发音、流畅度、完整度和语调（预计5-8秒）"
            show-icon
            :closable="false"
          />
        </div>

        <!-- 评测结果 -->
        <div class="result-panel" v-if="currentResult">
          <el-divider content-position="left">评测结果</el-divider>
          <div style="display:flex;gap:24px;align-items:center;">
            <div class="score-circle" :class="scoreClass(currentResult.score)">
              <span class="score-value">{{ currentResult.score }}</span>
              <span class="score-label">总分</span>
            </div>
            <div style="flex:1;">
              <div class="dimension-grid">
                <div class="dimension-item">
                  <div class="dim-label">发音准确度</div>
                  <div class="dim-value" :style="{color: dimColor(currentResult.dimensions.pronunciation)}">
                    {{ currentResult.dimensions.pronunciation }}
                  </div>
                </div>
                <div class="dimension-item">
                  <div class="dim-label">流畅度</div>
                  <div class="dim-value" :style="{color: dimColor(currentResult.dimensions.fluency)}">
                    {{ currentResult.dimensions.fluency }}
                  </div>
                </div>
                <div class="dimension-item">
                  <div class="dim-label">完整度</div>
                  <div class="dim-value" :style="{color: dimColor(currentResult.dimensions.completeness)}">
                    {{ currentResult.dimensions.completeness }}
                  </div>
                </div>
                <div class="dimension-item">
                  <div class="dim-label">语调</div>
                  <div class="dim-value" :style="{color: dimColor(currentResult.dimensions.intonation)}">
                    {{ currentResult.dimensions.intonation }}
                  </div>
                </div>
              </div>
              <el-alert
                :title="currentResult.details"
                :description="currentResult.suggestion"
                type="info"
                show-icon
                :closable="false"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- 底部操作 -->
      <div style="display:flex;justify-content:space-between;padding:0 4px;" v-if="currentQuestion">
        <el-button @click="prevQuestion" :disabled="currentIndex === 0">← 上一题</el-button>
        <div>
          <el-button v-if="!allDone" type="primary" @click="nextQuestion" :disabled="currentIndex === questions.length - 1">
            下一题 →
          </el-button>
          <el-button v-if="allDone" type="success" @click="showReport = true">
            📊 查看成绩单
          </el-button>
        </div>
      </div>
    </div>

    <!-- 成绩单弹窗 -->
    <el-dialog v-model="showReport" title="📊 评测成绩单" width="700px" top="5vh">
      <div style="text-align:center;margin-bottom:24px;">
        <div class="score-circle" :class="scoreClass(totalAvgScore)" style="margin-bottom:8px;">
          <span class="score-value">{{ totalAvgScore }}</span>
          <span class="score-label">平均分</span>
        </div>
        <div style="font-size:14px;color:#8c8c8c;">
          {{ currentUser.name }} ({{ currentUser.username }}) · {{ currentUser.department }}
        </div>
        <div style="font-size:14px;margin-top:4px;">
          完成题数：{{ Object.keys(results).length }} / {{ questions.length }} ·
          评测时间：{{ reportTime }}
        </div>
      </div>
      <el-table :data="reportData" border style="width:100%">
        <el-table-column prop="index" label="题号" width="60" align="center" />
        <el-table-column prop="title" label="题目" min-width="180" />
        <el-table-column prop="score" label="总分" width="80" align="center">
          <template #default="{ row }">
            <span :style="{color: dimColor(row.score), fontWeight:600}">{{ row.score }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="pronunciation" label="发音" width="70" align="center" />
        <el-table-column prop="fluency" label="流畅" width="70" align="center" />
        <el-table-column prop="completeness" label="完整" width="70" align="center" />
        <el-table-column prop="intonation" label="语调" width="70" align="center" />
        <el-table-column prop="duration" label="时长" width="70" align="center">
          <template #default="{ row }">{{ row.duration }}s</template>
        </el-table-column>
      </el-table>
      <div style="margin-top:16px;text-align:center;">
        <el-button @click="printReport">🖨 打印成绩单</el-button>
        <el-button type="primary" @click="exportReport">📥 导出成绩单</el-button>
        <el-button @click="restartExam">🔄 重新评测</el-button>
      </div>
    </el-dialog>
  </div>
  `,

  data() {
    return {
      questions: [],
      currentIndex: 0,
      results: {},
      recordState: 'idle', // idle | recording | stopped | denied
      isRecording: false,
      evaluating: false,
      showPinyin: false,
      showReport: false,
      recorder: null,
      recorderDuration: 0,
      audioPlayer: null,
      reportTime: '',
    };
  },

  computed: {
    currentQuestion() {
      return this.questions[this.currentIndex];
    },
    annotatedContent() {
      if (!this.currentQuestion) return '';
      return PinyinUtil.annotate(this.currentQuestion.content, this.showPinyin);
    },
    micStatusClass() {
      return {
        ready: this.recordState === 'idle' || this.recordState === 'stopped',
        recording: this.isRecording,
        denied: this.recordState === 'denied',
      };
    },
    micStatusText() {
      const map = {
        idle: '麦克风就绪',
        recording: '正在录音...',
        stopped: '录音已完成',
        denied: '麦克风权限被拒绝',
      };
      return map[this.recordState] || '麦克风就绪';
    },
    formattedTime() {
      return AudioRecorder.formatTime(this.recorderDuration);
    },
    progressPercent() {
      if (this.questions.length === 0) return 0;
      return Math.round(((this.currentIndex + 1) / this.questions.length) * 100);
    },
    progressColor() {
      const percent = this.progressPercent;
      if (percent === 100) return '#52c41a';
      if (percent >= 50) return '#1890ff';
      return '#faad14';
    },
    currentResult() {
      return this.results[this.currentIndex];
    },
    allDone() {
      return this.questions.length > 0 && Object.keys(this.results).length === this.questions.length;
    },
    totalAvgScore() {
      const scores = Object.values(this.results);
      if (scores.length === 0) return 0;
      return Math.round(scores.reduce((s, r) => s + r.score, 0) / scores.length * 10) / 10;
    },
    reportData() {
      return this.questions.map((q, idx) => {
        const r = this.results[idx];
        return {
          index: idx + 1,
          title: q.title,
          score: r ? r.score : '-',
          pronunciation: r ? r.dimensions.pronunciation : '-',
          fluency: r ? r.dimensions.fluency : '-',
          completeness: r ? r.dimensions.completeness : '-',
          intonation: r ? r.dimensions.intonation : '-',
          duration: r ? r.duration : '-',
        };
      });
    },
  },

  mounted() {
    this.loadQuestions();
    this.initRecorder();
  },

  beforeUnmount() {
    if (this.recorder) {
      this.recorder.stop();
    }
    if (this.audioPlayer) {
      this.audioPlayer.pause();
    }
  },

  methods: {
    loadQuestions() {
      this.questions = Store.getActiveQuestions();
    },

    initRecorder() {
      this.recorder = new AudioRecorder({
        onStateChange: (state) => {
          this.recordState = state;
          this.isRecording = state === 'recording';
          if (state === 'stopped' && this.recorder) {
            this.recorderDuration = this.recorder.getDuration();
            this.$nextTick(() => {
              if (this.$refs.waveformCanvas) {
                this.recorder.drawStaticWaveform();
              }
            });
          }
        },
        onTimerChange: (duration) => {
          this.recorderDuration = duration;
          // 超时自动停止
          if (this.currentQuestion && duration >= this.currentQuestion.duration + 10) {
            this.stopRecording();
            ElementPlus.ElMessage.warning('已达到最大录音时长，自动停止录音');
          }
        },
        onError: (msg) => {
          ElementPlus.ElMessage.error(msg);
        },
      });

      this.$nextTick(() => {
        if (this.$refs.waveformCanvas) {
          const canvas = this.$refs.waveformCanvas;
          canvas.width = canvas.offsetWidth * 2;
          canvas.height = canvas.offsetHeight * 2;
          this.recorder.setCanvas(canvas);
        }
      });
    },

    async startRecording() {
      // 如果已有结果，提示重新评测
      if (this.results[this.currentIndex]) {
        try {
          await ElementPlus.ElMessageBox.confirm(
            '当前题目已完成评测，重新录音将覆盖之前的成绩。是否继续？',
            '提示',
            { type: 'warning' }
          );
          delete this.results[this.currentIndex];
          this.results = { ...this.results };
        } catch {
          return;
        }
      }

      this.recorderDuration = 0;
      await this.recorder.start();

      this.$nextTick(() => {
        if (this.$refs.waveformCanvas) {
          const canvas = this.$refs.waveformCanvas;
          canvas.width = canvas.offsetWidth * 2;
          canvas.height = canvas.offsetHeight * 2;
          this.recorder.setCanvas(canvas);
          // 重新触发绘制
          if (this.isRecording) {
            this.recorder.drawWaveform();
          }
        }
      });
    },

    stopRecording() {
      this.recorder.stop();
    },

    playback() {
      const url = this.recorder.getAudioUrl();
      if (!url) {
        ElementPlus.ElMessage.warning('没有可播放的录音');
        return;
      }
      if (this.audioPlayer) {
        this.audioPlayer.pause();
      }
      this.audioPlayer = new Audio(url);
      this.audioPlayer.play();
      ElementPlus.ElMessage.success('正在播放录音...');
    },

    reRecord() {
      this.recorder.reset();
      this.recorderDuration = 0;
      this.recordState = 'idle';
      this.$nextTick(() => {
        if (this.$refs.waveformCanvas) {
          const ctx = this.$refs.waveformCanvas.getContext('2d');
          ctx.clearRect(0, 0, this.$refs.waveformCanvas.width, this.$refs.waveformCanvas.height);
        }
      });
    },

    async submitEvaluation() {
      if (this.recorderDuration < 5) {
        ElementPlus.ElMessage.warning('录音时长过短，请重新录制');
        return;
      }

      this.evaluating = true;
      try {
        const res = await MockAPI.submitEvaluation({
          taskId: 'TASK_' + Date.now(),
          questionId: this.currentQuestion.id,
          questionText: this.currentQuestion.content,
          recorder: this.recorder,
          userId: this.currentUser.username,
          duration: this.recorderDuration,
        });

        if (res.code === 0) {
          const result = {
            ...res.data,
            duration: this.recorderDuration,
          };
          this.results[this.currentIndex] = result;
          this.results = { ...this.results };

          // 保存到记录（含字/句/段详细评测数据）
          Store.addRecord({
            userId: this.currentUser.username,
            userName: this.currentUser.name,
            questionId: this.currentQuestion.id,
            questionTitle: this.currentQuestion.title,
            questionText: this.currentQuestion.content.substring(0, 50),
            audioUrl: '',
            totalScore: result.score,
            pronunciationScore: result.dimensions.pronunciation,
            fluencyScore: result.dimensions.fluency,
            completenessScore: result.dimensions.completeness,
            intonationScore: result.dimensions.intonation,
            suggestion: result.suggestion,
            duration: this.recorderDuration,
            xfEvaluation: result.xfEvaluation || null,
          });

          ElementPlus.ElMessage.success('评测完成！总分：' + result.score + '分（讯飞语音评测）');
        }
      } catch (err) {
        ElementPlus.ElMessage.error('评测失败：' + err.message);
      } finally {
        this.evaluating = false;
      }
    },

    goToQuestion(idx) {
      if (idx === this.currentIndex) return;
      // 停止当前录音
      if (this.isRecording) {
        this.recorder.stop();
      }
      this.currentIndex = idx;
      this.reRecord();
    },

    prevQuestion() {
      if (this.currentIndex > 0) {
        this.goToQuestion(this.currentIndex - 1);
      }
    },

    nextQuestion() {
      if (this.currentIndex < this.questions.length - 1) {
        this.goToQuestion(this.currentIndex + 1);
      }
    },

    getQuestionStatus(idx) {
      if (this.results[idx]) return 'done';
      if (idx === this.currentIndex) return 'current';
      return 'pending';
    },

    difficultyText(d) {
      return { 1: '初级', 2: '中级', 3: '高级' }[d] || '初级';
    },

    difficultyType(d) {
      return { 1: 'success', 2: 'warning', 3: 'danger' }[d] || 'info';
    },

    scoreClass(score) {
      if (score >= 90) return 'score-excellent';
      if (score >= 80) return 'score-good';
      if (score >= 60) return 'score-pass';
      return 'score-fail';
    },

    dimColor(score) {
      if (score >= 90) return '#52c41a';
      if (score >= 80) return '#1890ff';
      if (score >= 60) return '#faad14';
      return '#ff4d4f';
    },

    printReport() {
      this.reportTime = new Date().toLocaleString('zh-CN', { hour12: false });
      this.$nextTick(() => {
        window.print();
      });
    },

    exportReport() {
      const data = this.reportData;
      let csv = '\ufeff题号,题目,总分,发音,流畅度,完整度,语调,时长(秒)\n';
      data.forEach(row => {
        csv += `${row.index},${row.title},${row.score},${row.pronunciation},${row.fluency},${row.completeness},${row.intonation},${row.duration}\n`;
      });
      csv += `\n平均分,${this.totalAvgScore}\n`;
      csv += `考生,${this.currentUser.name} (${this.currentUser.username})\n`;
      csv += `部门,${this.currentUser.department}\n`;
      csv += `时间,${new Date().toLocaleString('zh-CN', { hour12: false })}\n`;

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `评测成绩单_${this.currentUser.name}_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      ElementPlus.ElMessage.success('成绩单已导出');
    },

    restartExam() {
      this.showReport = false;
      this.results = {};
      this.currentIndex = 0;
      this.reRecord();
      ElementPlus.ElMessage.success('已重置，可以重新开始评测');
    },
  },
};
