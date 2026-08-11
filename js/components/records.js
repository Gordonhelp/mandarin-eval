/**
 * 结果记录模块组件
 */
window.RecordsComponent = {
  props: {
    currentUser: { type: Object, default: () => ({}) },
  },
  template: `
  <div>
    <!-- 统计卡片 -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-icon" style="background:#e6f7ff;color:#1890ff;">📋</div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.total }}</div>
          <div class="stat-label">总评测数</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:#f6ffed;color:#52c41a;">📊</div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.avgScore }}</div>
          <div class="stat-label">平均分</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:#fffbe6;color:#faad14;">✅</div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.passRate }}%</div>
          <div class="stat-label">合格率</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:#fff2f0;color:#ff4d4f;">🏆</div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.excellentCount }}</div>
          <div class="stat-label">优秀(≥90分)</div>
        </div>
      </div>
    </div>

    <!-- 图表 -->
    <div class="chart-row">
      <div class="chart-card">
        <div class="chart-title">分数段分布</div>
        <div ref="distChart" class="chart-container"></div>
      </div>
      <div class="chart-card">
        <div class="chart-title">各维度平均分</div>
        <div ref="dimChart" class="chart-container"></div>
      </div>
    </div>

    <!-- 筛选工具栏 -->
    <div class="filter-toolbar">
      <el-input
        v-model="filters.keyword"
        placeholder="搜索姓名/工号/题目"
        style="width:240px;"
        clearable
        @clear="loadData"
        @keyup.enter="loadData"
      />
      <el-date-picker
        v-model="filters.dateRange"
        type="daterange"
        range-separator="至"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        value-format="YYYY-MM-DD"
        style="width:260px;"
        @change="loadData"
      />
      <el-select v-model="filters.category" placeholder="话术分类" clearable style="width:140px;">
        <el-option v-for="cat in categories" :key="cat" :label="cat" :value="cat" />
      </el-select>
      <el-select v-model="filters.scoreRange" placeholder="分数区间" clearable style="width:140px;">
        <el-option label="90分以上" value="90-100" />
        <el-option label="80-89分" value="80-89" />
        <el-option label="70-79分" value="70-79" />
        <el-option label="60-69分" value="60-69" />
        <el-option label="60分以下" value="0-59" />
      </el-select>
      <el-select v-model="filters.sortBy" placeholder="排序" style="width:140px;">
        <el-option label="时间倒序" value="time_desc" />
        <el-option label="时间正序" value="time_asc" />
        <el-option label="分数从高到低" value="score_desc" />
        <el-option label="分数从低到高" value="score_asc" />
      </el-select>
      <el-button type="primary" @click="loadData">查询</el-button>
      <el-button @click="resetFilters">重置</el-button>
      <el-button type="success" @click="exportData">📥 导出Excel</el-button>
    </div>

    <!-- 数据表格 -->
    <div class="data-table-card">
      <el-table
        :data="records"
        v-loading="loading"
        border
        stripe
        style="width:100%"
        :default-sort="{ prop: 'createdAt', order: 'descending' }"
        @sort-change="handleSort"
      >
        <el-table-column prop="id" label="评测ID" width="160" />
        <el-table-column label="考生信息" width="140">
          <template #default="{ row }">
            <div>{{ row.userName }}</div>
            <div style="font-size:12px;color:#8c8c8c;">{{ row.userId }}</div>
          </template>
        </el-table-column>
        <el-table-column prop="questionTitle" label="话术题目" min-width="180" show-overflow-tooltip />
        <el-table-column prop="totalScore" label="总分" width="80" align="center" sortable="custom">
          <template #default="{ row }">
            <span :style="{color: dimColor(row.totalScore), fontWeight:600}">{{ row.totalScore }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="pronunciationScore" label="发音" width="70" align="center" />
        <el-table-column prop="fluencyScore" label="流畅" width="70" align="center" />
        <el-table-column prop="completenessScore" label="完整" width="70" align="center" />
        <el-table-column prop="intonationScore" label="语调" width="70" align="center" />
        <el-table-column prop="duration" label="时长" width="70" align="center">
          <template #default="{ row }">{{ row.duration }}s</template>
        </el-table-column>
        <el-table-column prop="createdAt" label="评测时间" width="170" sortable="custom" />
        <el-table-column label="操作" :width="isAdmin ? 240 : 140" align="center" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" link @click="viewDetail(row)">详情</el-button>
            <el-button size="small" type="info" link @click="viewLog(row)">接口日志</el-button>
            <template v-if="isAdmin">
              <el-button size="small" type="warning" link @click="reEvaluate(row)">重新评测</el-button>
              <el-button size="small" type="danger" link @click="deleteRecord(row)">删除</el-button>
            </template>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div style="padding:16px;display:flex;justify-content:flex-end;">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.size"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadData"
          @current-change="loadData"
        />
      </div>
    </div>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" title="📋 评测详情报告" width="750px" top="5vh">
      <div v-if="detailData" style="padding:0 8px;">
        <!-- 基本信息 -->
        <div class="detail-section">
          <div class="section-title">基本信息</div>
          <el-descriptions :column="3" border>
            <el-descriptions-item label="评测ID">{{ detailData.id }}</el-descriptions-item>
            <el-descriptions-item label="考生姓名">{{ detailData.userName }}</el-descriptions-item>
            <el-descriptions-item label="工号">{{ detailData.userId }}</el-descriptions-item>
            <el-descriptions-item label="话术题目" :span="3">{{ detailData.questionTitle }}</el-descriptions-item>
            <el-descriptions-item label="录音时长">{{ detailData.duration }}秒</el-descriptions-item>
            <el-descriptions-item label="评测时间" :span="2">{{ detailData.createdAt }}</el-descriptions-item>
          </el-descriptions>
        </div>

        <!-- 评分结果 -->
        <div class="detail-section">
          <div class="section-title">评分结果</div>
          <div style="display:flex;gap:24px;align-items:center;">
            <div class="score-circle" :class="scoreClass(detailData.totalScore)">
              <span class="score-value">{{ detailData.totalScore }}</span>
              <span class="score-label">总分</span>
            </div>
            <div style="flex:1;">
              <div class="dimension-grid">
                <div class="dimension-item">
                  <div class="dim-label">发音准确度</div>
                  <div class="dim-value" :style="{color: dimColor(detailData.pronunciationScore)}">{{ detailData.pronunciationScore }}</div>
                </div>
                <div class="dimension-item">
                  <div class="dim-label">流畅度</div>
                  <div class="dim-value" :style="{color: dimColor(detailData.fluencyScore)}">{{ detailData.fluencyScore }}</div>
                </div>
                <div class="dimension-item">
                  <div class="dim-label">完整度</div>
                  <div class="dim-value" :style="{color: dimColor(detailData.completenessScore)}">{{ detailData.completenessScore }}</div>
                </div>
                <div class="dimension-item">
                  <div class="dim-label">语调</div>
                  <div class="dim-value" :style="{color: dimColor(detailData.intonationScore)}">{{ detailData.intonationScore }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 话术原文 -->
        <div class="detail-section">
          <div class="section-title">话术原文</div>
          <div style="background:#fafafa;padding:16px;border-radius:8px;border:1px solid #f0f0f0;font-size:16px;line-height:2;">
            {{ detailData.questionText }}
          </div>
        </div>

        <!-- 改进建议 -->
        <div class="detail-section">
          <div class="section-title">评测建议</div>
          <el-alert
            :description="detailData.suggestion"
            type="info"
            show-icon
            :closable="false"
          />
        </div>

        <!-- 音频回放 -->
        <div class="detail-section">
          <div class="section-title">音频回放</div>
          <div class="audio-player-wrap">
            <span style="font-size:24px;">🎵</span>
            <span style="font-size:13px;color:#8c8c8c;">录音时长：{{ detailData.duration }}秒</span>
            <el-button size="small" type="primary" @click="playAudio" :disabled="!hasAudioData">
              ▶ 播放
            </el-button>
            <el-button size="small" @click="stopAudio">⏹ 停止</el-button>
            <span v-if="!hasAudioData" style="font-size:12px;color:#bfbfbf;">（无音频数据）</span>
            <span v-if="audioPlaying" style="font-size:12px;color:#52c41a;">▶ 正在播放...</span>
          </div>
        </div>
      </div>
    </el-dialog>

    <!-- 接口日志弹窗 -->
    <el-dialog v-model="logVisible" title="📋 讯飞API接口日志" width="850px" top="5vh">
      <div v-if="logData" style="padding:0 4px;">
        <!-- 基本信息 -->
        <div class="detail-section">
          <div class="section-title">基本信息</div>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="评测ID">{{ logData.id }}</el-descriptions-item>
            <el-descriptions-item label="考生">{{ logData.userName }} ({{ logData.userId }})</el-descriptions-item>
            <el-descriptions-item label="话术题目">{{ logData.questionTitle }}</el-descriptions-item>
            <el-descriptions-item label="评测时间">{{ logData.createdAt }}</el-descriptions-item>
          </el-descriptions>
        </div>

        <!-- 评测数据存在性 -->
        <div v-if="!logData.xfEvaluation" class="detail-section">
          <el-alert title="该记录没有讯飞API评测数据" type="warning" description="此记录可能是在接入讯飞API之前创建的，或评测调用失败。" show-icon :closable="false" />
        </div>

        <!-- 入参信息 -->
        <div v-if="logData.xfEvaluation" class="detail-section">
          <div class="section-title">请求入参（发送给讯飞的参数）</div>
          <div style="background:#1e1e1e;color:#d4d4d4;padding:12px;border-radius:6px;font-size:12px;font-family:Consolas,monospace;overflow-x:auto;line-height:1.6;">
            <div style="color:#569cd6;">// WebSocket 请求地址</div>
            <div>wss://ise-api.xfyun.cn/v2/open-ise</div>
            <div style="color:#569cd6; margin-top:8px;">// 第1帧: 参数上传 (cmd=ssb)</div>
            <div>{{ formatLogJson(logSsbParams(logData.questionText)) }}</div>
            <div style="color:#569cd6; margin-top:8px;">// 音频帧: 录音base64数据分帧发送（aus=1第一帧 / aus=2中间帧 / aus=4最后一帧+status=2）</div>
            <div style="color:#6a9955;">// 完整音频base64（共 {{ logAudioInfo(logData).totalLen }} 字符，约 {{ logAudioInfo(logData).totalKB }} KB）：</div>
            <div style="word-break:break-all;max-height:200px;overflow-y:auto;">{{ logAudioInfo(logData).preview }}</div>
            <el-collapse style="margin-top:4px;">
              <el-collapse-item title="查看完整base64音频数据" name="fullaudio">
                <div style="word-break:break-all;max-height:400px;overflow-y:auto;font-size:11px;">{{ logFullAudioBase64 }}</div>
              </el-collapse-item>
            </el-collapse>
          </div>
        </div>

        <!-- 出参：评测结果 -->
        <div v-if="logData.xfEvaluation" class="detail-section">
          <div class="section-title">返回结果（5个评分字段）</div>
          <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:12px;">
            <div v-for="item in logScoreItems(logData.xfEvaluation)" :key="item.label" style="text-align:center;padding:10px 6px;background:#fafafa;border-radius:6px;">
              <div style="font-size:11px;color:#8c8c8c;margin-bottom:4px;">{{ item.label }}</div>
              <div style="font-size:18px;font-weight:600;" :style="{color: dimColor(item.value)}">{{ item.value ?? '-' }}</div>
            </div>
          </div>
          <el-collapse>
            <el-collapse-item title="查看原始XML返回" name="raw">
              <div style="background:#1e1e1e;color:#d4d4d4;padding:12px;border-radius:6px;font-size:11px;font-family:Consolas,monospace;overflow-x:auto;max-height:300px;white-space:pre-wrap;word-break:break-all;">
{{ logData.xfEvaluation.raw || '(无原始数据)' }}
              </div>
            </el-collapse-item>
          </el-collapse>
        </div>
      </div>
    </el-dialog>
  </div>
  `,

  data() {
    return {
      records: [],
      loading: false,
      stats: {
        total: 0,
        avgScore: 0,
        passRate: 0,
        excellentCount: 0,
        dimensions: { pronunciation: 0, fluency: 0, completeness: 0, intonation: 0 },
        distribution: {},
      },
      filters: {
        keyword: '',
        dateRange: null,
        category: '',
        scoreRange: '',
        sortBy: 'time_desc',
      },
      pagination: {
        page: 1,
        size: 20,
        total: 0,
      },
      detailVisible: false,
      detailData: null,
      logVisible: false,
      logData: null,
      audioPlayer: null,
      audioPlaying: false,
      currentAudioUrl: null,
      distChartInstance: null,
      dimChartInstance: null,
    };
  },

  computed: {
    isAdmin() {
      return this.currentUser.role === 'admin';
    },
    categories() {
      return Object.keys(MockAPI.getCategories());
    },
    hasAudioData() {
      if (!this.detailData) return false;
      if (this.detailData.audioUrl) return true;
      if (this.detailData.xfEvaluation?.requestAudioBase64) return true;
      if (Store.getAudioBase64(this.detailData.id)) return true;
      return false;
    },
    logFullAudioBase64() {
      if (!this.logData) return '(无数据)';
      return this.logData.xfEvaluation?.requestAudioBase64
        || Store.getAudioBase64(this.logData.id)
        || '(无数据，刷新页面后缓存丢失)';
    },
  },

  mounted() {
    this.loadData();
    this.loadStats();
    this.$nextTick(() => {
      this.initCharts();
    });
  },

  beforeUnmount() {
    this.stopAudio();
    if (this.distChartInstance) {
      this.distChartInstance.dispose();
    }
    if (this.dimChartInstance) {
      this.dimChartInstance.dispose();
    }
    window.removeEventListener('resize', this.handleResize);
  },

  methods: {
    // 考生只能看自己的记录，管理员看全部
    getRecordFilter() {
      if (this.currentUser.role === 'student') {
        return { userId: this.currentUser.username };
      }
      return {};
    },

    async loadData() {
      this.loading = true;
      try {
        let minScore = null, maxScore = null;
        if (this.filters.scoreRange) {
          const [min, max] = this.filters.scoreRange.split('-').map(Number);
          minScore = min;
          maxScore = max;
        }

        const res = await MockAPI.getRecords({
          ...this.getRecordFilter(),
          keyword: this.filters.keyword,
          startDate: this.filters.dateRange ? this.filters.dateRange[0] : null,
          endDate: this.filters.dateRange ? this.filters.dateRange[1] : null,
          category: this.filters.category,
          minScore,
          maxScore,
          sortBy: this.filters.sortBy,
          page: this.pagination.page,
          size: this.pagination.size,
        });

        if (res.code === 0) {
          this.records = res.data.list;
          this.pagination.total = res.data.total;
        }
      } finally {
        this.loading = false;
      }
      this.loadStats();
      this.updateCharts();
    },

    loadStats() {
      this.stats = MockAPI.getStatistics(this.getRecordFilter());
    },

    resetFilters() {
      this.filters = {
        keyword: '',
        dateRange: null,
        category: '',
        scoreRange: '',
        sortBy: 'time_desc',
      };
      this.pagination.page = 1;
      this.loadData();
    },

    handleSort({ prop, order }) {
      if (prop === 'totalScore') {
        this.filters.sortBy = order === 'descending' ? 'score_desc' : 'score_asc';
      } else if (prop === 'createdAt') {
        this.filters.sortBy = order === 'descending' ? 'time_desc' : 'time_asc';
      }
      this.loadData();
    },

    viewDetail(row) {
      this.detailData = row;
      this.detailVisible = true;
    },

    viewLog(row) {
      this.logData = row;
      this.logVisible = true;
    },

    logSsbParams(text) {
      return {
        common: { app_id: '21eec9e3' },
        business: {
          sub: 'ise',
          ent: 'cn_vip',
          category: 'read_chapter',
          cmd: 'ssb',
          text: '\uFEFF' + (text || ''),
          tte: 'utf-8',
          ttp_skip: true,
          aue: 'lame',
          auf: 'audio/L16;rate=16000',
          rstcd: 'utf8',
          group: 'adult',
          check_type: 'common',
          rst: 'entirety',
          plev: '0',
        },
        data: { status: 0 },
      };
    },

    logScoreItems(evalData) {
      if (!evalData) return [];
      return [
        { label: '流利度分', value: evalData.fluency_score },
        { label: '完整度分', value: evalData.integrity_score },
        { label: '声韵分(发音)', value: evalData.phone_score },
        { label: '调型分(声调)', value: evalData.tone_score },
        { label: '总分【模型回归】', value: evalData.total_score },
      ];
    },

    formatLogJson(obj) {
      try {
        return JSON.stringify(obj, null, 2);
      } catch {
        return String(obj);
      }
    },

    logAudioInfo(row) {
      let b64 = row?.xfEvaluation?.requestAudioBase64 || '';
      if (!b64) b64 = Store.getAudioBase64(row?.id) || '';
      const totalLen = b64.length;
      const totalKB = totalLen > 0 ? Math.round(totalLen * 0.75 / 1024 * 10) / 10 : 0;
      let preview = '';
      if (totalLen > 600) {
        preview = b64.substring(0, 300) + '\n...（省略中间部分）...\n' + b64.substring(totalLen - 300);
      } else {
        preview = b64 || '(无音频数据，刷新页面后缓存丢失)';
      }
      return { totalLen, totalKB, preview };
    },

    reEvaluate(row) {
      ElementPlus.ElMessageBox.confirm(
        `确认对「${row.userName}」的「${row.questionTitle}」重新评测吗？此操作将生成新的评测记录。`,
        '重新评测确认',
        { type: 'warning' }
      ).then(() => {
        // 模拟重新评测
        const baseScore = 75 + Math.random() * 20;
        const pronunciation = Math.round(Math.max(60, Math.min(99, baseScore + (Math.random() * 8 - 4))));
        const fluency = Math.round(Math.max(60, Math.min(99, baseScore + (Math.random() * 8 - 4))));
        const completeness = Math.round(Math.max(60, Math.min(99, baseScore + (Math.random() * 8 - 4))));
        const intonation = Math.round(Math.max(60, Math.min(99, baseScore + (Math.random() * 8 - 4))));
        const totalScore = Math.round(((pronunciation + fluency + completeness + intonation) / 4) * 10) / 10;

        Store.addRecord({
          userId: row.userId,
          userName: row.userName,
          questionId: row.questionId,
          questionTitle: row.questionTitle,
          questionText: row.questionText,
          audioUrl: '',
          totalScore,
          pronunciationScore: pronunciation,
          fluencyScore: fluency,
          completenessScore: completeness,
          intonationScore: intonation,
          suggestion: '重新评测完成。整体表现' + (totalScore >= 80 ? '良好' : totalScore >= 60 ? '合格' : '需提升') + '。',
          duration: row.duration,
        });

        ElementPlus.ElMessage.success('重新评测完成，新成绩：' + totalScore + '分');
        this.loadData();
      }).catch(() => {});
    },

    deleteRecord(row) {
      ElementPlus.ElMessageBox.confirm(
        `确认删除评测记录「${row.id}」吗？此操作不可恢复。`,
        '删除确认',
        { type: 'error' }
      ).then(() => {
        Store.deleteRecord(row.id);
        ElementPlus.ElMessage.success('删除成功');
        this.loadData();
      }).catch(() => {});
    },

    exportData() {
      let csv = '\ufeff评测ID,考生姓名,工号,话术题目,总分,发音,流畅度,完整度,语调,时长(秒),评测时间\n';
      this.records.forEach(r => {
        csv += `${r.id},${r.userName},${r.userId},${r.questionTitle},${r.totalScore},${r.pronunciationScore},${r.fluencyScore},${r.completenessScore},${r.intonationScore},${r.duration},${r.createdAt}\n`;
      });
      csv += `\n统计,总评测数:${this.stats.total},平均分:${this.stats.avgScore},合格率:${this.stats.passRate}%\n`;

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `评测记录_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      ElementPlus.ElMessage.success('数据已导出');
    },

    playAudio() {
      if (this.audioPlayer) {
        this.audioPlayer.pause();
        this.audioPlayer = null;
      }

      if (!this.detailData) return;

      let url = this.detailData.audioUrl;
      let b64 = this.detailData.xfEvaluation?.requestAudioBase64;
      if (!b64) b64 = Store.getAudioBase64(this.detailData.id);
      if (!url && b64) {
        const byteChars = atob(b64);
        const byteArray = new Uint8Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) {
          byteArray[i] = byteChars.charCodeAt(i);
        }
        const blob = new Blob([byteArray], { type: 'audio/mp3' });
        url = URL.createObjectURL(blob);
        this.currentAudioUrl = url;
      }

      if (url) {
        this.audioPlayer = new Audio(url);
        this.audioPlayer.onended = () => {
          this.audioPlaying = false;
        };
        this.audioPlayer.play().then(() => {
          this.audioPlaying = true;
        }).catch(err => {
          ElementPlus.ElMessage.error('播放失败: ' + err.message);
          this.audioPlaying = false;
        });
      }
    },

    stopAudio() {
      if (this.audioPlayer) {
        this.audioPlayer.pause();
        this.audioPlayer = null;
      }
      this.audioPlaying = false;
      if (this.currentAudioUrl) {
        URL.revokeObjectURL(this.currentAudioUrl);
        this.currentAudioUrl = null;
      }
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

    initCharts() {
      if (this.$refs.distChart) {
        this.distChartInstance = echarts.init(this.$refs.distChart);
      }
      if (this.$refs.dimChart) {
        this.dimChartInstance = echarts.init(this.$refs.dimChart);
      }
      window.addEventListener('resize', this.handleResize);
      this.updateCharts();
    },

    handleResize() {
      if (this.distChartInstance) this.distChartInstance.resize();
      if (this.dimChartInstance) this.dimChartInstance.resize();
    },

    updateCharts() {
      this.$nextTick(() => {
        if (this.distChartInstance) {
          const dist = this.stats.distribution;
          this.distChartInstance.setOption({
            tooltip: { trigger: 'axis' },
            grid: { left: '8%', right: '5%', bottom: '10%', top: '10%' },
            xAxis: {
              type: 'category',
              data: Object.keys(dist),
              axisLabel: { fontSize: 12 },
            },
            yAxis: { type: 'value', name: '人数' },
            series: [{
              type: 'bar',
              data: Object.values(dist),
              itemStyle: {
                color: function(params) {
                  const colors = ['#52c41a', '#1890ff', '#faad14', '#fa8c16', '#ff4d4f'];
                  return colors[params.dataIndex] || '#1890ff';
                },
                borderRadius: [4, 4, 0, 0],
              },
              label: { show: true, position: 'top' },
            }],
          });
        }

        if (this.dimChartInstance) {
          const dims = this.stats.dimensions;
          this.dimChartInstance.setOption({
            tooltip: {},
            radar: {
              indicator: [
                { name: '发音准确度', max: 100 },
                { name: '流畅度', max: 100 },
                { name: '完整度', max: 100 },
                { name: '语调', max: 100 },
              ],
              radius: '65%',
            },
            series: [{
              type: 'radar',
              data: [{
                value: [dims.pronunciation, dims.fluency, dims.completeness, dims.intonation],
                name: '平均分',
                areaStyle: { color: 'rgba(24,144,255,0.3)' },
                lineStyle: { color: '#1890ff' },
                itemStyle: { color: '#1890ff' },
              }],
            }],
          });
        }
      });
    },
  },
};
