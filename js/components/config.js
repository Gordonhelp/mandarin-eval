/**
 * 系统配置模块组件 - 话术管理
 */
window.ConfigComponent = {
  template: `
  <div class="config-layout">
    <!-- 左侧分类树 -->
    <div class="config-sidebar">
      <div class="sidebar-title">📂 话术分类</div>
      <div
        class="category-tree-item"
        :class="{ active: selectedCategory === '' }"
        @click="selectCategory('')"
      >
        <span>📋 全部话术</span>
        <span class="cat-count">{{ totalCount }}</span>
      </div>
      <div
        v-for="(count, cat) in categoryCounts"
        :key="cat"
        class="category-tree-item"
        :class="{ active: selectedCategory === cat }"
        @click="selectCategory(cat)"
      >
        <span>{{ cat }}</span>
        <span class="cat-count">{{ count }}</span>
      </div>
      <el-divider />
      <el-button type="primary" size="small" style="width:100%;" @click="openAddDialog">
        ➕ 新增话术
      </el-button>
      <el-button size="small" style="width:100%;margin-top:8px;margin-left:0;" @click="openImportDialog">
        📥 批量导入
      </el-button>
      <el-button size="small" style="width:100%;margin-top:8px;margin-left:0;" @click="downloadTemplate">
        📄 下载模板
      </el-button>
    </div>

    <!-- 右侧话术列表 -->
    <div class="config-main">
      <!-- 搜索栏 -->
      <div class="filter-toolbar">
        <el-input
          v-model="filters.keyword"
          placeholder="搜索话术标题或内容"
          style="width:260px;"
          clearable
          @clear="loadData"
          @keyup.enter="loadData"
        />
        <el-select v-model="filters.difficulty" placeholder="难度等级" clearable style="width:120px;">
          <el-option label="初级" :value="1" />
          <el-option label="中级" :value="2" />
          <el-option label="高级" :value="3" />
        </el-select>
        <el-select v-model="filters.status" placeholder="状态" clearable style="width:120px;">
          <el-option label="启用" :value="1" />
          <el-option label="禁用" :value="0" />
        </el-select>
        <el-button type="primary" @click="loadData">查询</el-button>
        <el-button @click="resetFilters">重置</el-button>
        <el-button type="success" @click="exportData">📥 导出</el-button>
        <el-button
          type="danger"
          :disabled="selectedIds.length === 0"
          @click="batchDelete"
        >
          🗑 批量删除 ({{ selectedIds.length }})
        </el-button>
      </div>

      <!-- 数据表格 -->
      <div class="data-table-card">
        <el-table
          :data="questions"
          v-loading="loading"
          border
          stripe
          style="width:100%"
          @selection-change="handleSelectionChange"
        >
          <el-table-column type="selection" width="50" />
          <el-table-column prop="sortOrder" label="序号" width="70" align="center">
            <template #default="{ row }">
              <span style="font-weight:600;">{{ row.sortOrder }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="title" label="话术标题" min-width="160" />
          <el-table-column prop="content" label="话术内容" min-width="250" show-overflow-tooltip>
            <template #default="{ row }">
              {{ row.content.substring(0, 50) }}{{ row.content.length > 50 ? '...' : '' }}
            </template>
          </el-table-column>
          <el-table-column prop="category" label="分类" width="110" align="center">
            <template #default="{ row }">
              <el-tag size="small">{{ row.category }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="difficulty" label="难度" width="80" align="center">
            <template #default="{ row }">
              <el-tag size="small" :type="difficultyType(row.difficulty)">
                {{ difficultyText(row.difficulty) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="duration" label="建议时长" width="90" align="center">
            <template #default="{ row }">{{ row.duration }}秒</template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="80" align="center">
            <template #default="{ row }">
              <el-switch
                :model-value="row.status === 1"
                @change="(val) => toggleStatus(row, val)"
                size="small"
              />
            </template>
          </el-table-column>
          <el-table-column prop="updatedAt" label="更新时间" width="170" />
          <el-table-column label="操作" width="200" align="center" fixed="right">
            <template #default="{ row }">
              <el-button size="small" type="primary" link @click="previewQuestion(row)">预览</el-button>
              <el-button size="small" type="warning" link @click="editQuestion(row)">编辑</el-button>
              <el-button size="small" type="info" link @click="moveUp(row)" :disabled="row.sortOrder === 1">↑</el-button>
              <el-button size="small" type="info" link @click="moveDown(row)" :disabled="row.sortOrder === totalCount">↓</el-button>
              <el-button size="small" type="danger" link @click="deleteQuestion(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页 -->
        <div style="padding:16px;display:flex;justify-content:flex-end;">
          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.size"
            :total="pagination.total"
            :page-sizes="[10, 20, 50]"
            layout="total, sizes, prev, pager, next"
            @size-change="loadData"
            @current-change="loadData"
          />
        </div>
      </div>
    </div>

    <!-- 新增/编辑弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="editingId ? '编辑话术' : '新增话术'"
      width="700px"
      :close-on-click-modal="false"
    >
      <el-form :model="form" :rules="formRules" ref="formRef" label-width="100px">
        <el-form-item label="话术标题" prop="title">
          <el-input v-model="form.title" placeholder="如：第1题：自我介绍" maxlength="100" show-word-limit />
        </el-form-item>
        <el-form-item label="话术正文" prop="content">
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="6"
            placeholder="请输入话术正文内容（30-200字）"
            maxlength="200"
            show-word-limit
          />
          <div style="font-size:12px;color:#8c8c8c;margin-top:4px;">
            当前字数：{{ form.content.length }} / 200
          </div>
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="分类" prop="category">
              <el-select v-model="form.category" placeholder="选择分类" allow-create filterable style="width:100%;">
                <el-option v-for="cat in existingCategories" :key="cat" :label="cat" :value="cat" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="难度等级" prop="difficulty">
              <el-select v-model="form.difficulty" style="width:100%;">
                <el-option label="初级" :value="1" />
                <el-option label="中级" :value="2" />
                <el-option label="高级" :value="3" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="录音时长" prop="duration">
              <el-input-number v-model="form.duration" :min="10" :max="120" :step="5" style="width:100%;" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="是否启用">
          <el-switch v-model="form.status" :active-value="1" :inactive-value="0" />
          <span style="margin-left:8px;font-size:13px;color:#8c8c8c;">
            {{ form.status === 1 ? '启用（在评测菜单中显示）' : '禁用（不在评测菜单中显示）' }}
          </span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveQuestion" :loading="saving">保存</el-button>
      </template>
    </el-dialog>

    <!-- 预览弹窗 -->
    <el-dialog v-model="previewVisible" title="👁 话术预览" width="650px">
      <div v-if="previewData">
        <div style="display:flex;gap:8px;margin-bottom:16px;">
          <el-tag>{{ previewData.category }}</el-tag>
          <el-tag :type="difficultyType(previewData.difficulty)">{{ difficultyText(previewData.difficulty) }}</el-tag>
          <el-tag type="info">建议时长：{{ previewData.duration }}秒</el-tag>
        </div>
        <div style="margin-bottom:12px;">
          <el-switch v-model="previewPinyin" active-text="显示拼音" />
        </div>
        <div class="preview-content" v-html="previewAnnotated"></div>
      </div>
    </el-dialog>

    <!-- 批量导入弹窗 -->
    <el-dialog v-model="importVisible" title="📥 批量导入话术" width="600px">
      <el-alert
        title="导入说明"
        type="info"
        description="请先下载Excel模板，按模板格式填写话术数据后上传。支持的字段：标题、正文、分类、难度（1初级/2中级/3高级）、建议时长（秒）。"
        show-icon
        :closable="false"
        style="margin-bottom:16px;"
      />
      <el-upload
        ref="uploadRef"
        :auto-upload="false"
        :limit="1"
        accept=".csv,.xlsx,.xls"
        :on-change="handleFileChange"
        :on-exceed="handleExceed"
        drag
      >
        <div class="el-upload__text" style="padding:20px 0;">📁 将文件拖到此处，或点击上传</div>
        <template #tip>
          <div class="el-upload__tip">支持 .csv / .xlsx / .xls 格式，文件大小不超过 5MB</div>
        </template>
      </el-upload>
      <div v-if="importPreview.length > 0" style="margin-top:16px;">
        <div style="font-size:14px;font-weight:600;margin-bottom:8px;">
          预览（前5条）：
        </div>
        <el-table :data="importPreview" border size="small" style="width:100%;">
          <el-table-column prop="title" label="标题" min-width="120" />
          <el-table-column prop="content" label="内容" min-width="200" show-overflow-tooltip />
          <el-table-column prop="category" label="分类" width="100" />
          <el-table-column prop="difficulty" label="难度" width="80" />
        </el-table>
        <div style="margin-top:8px;font-size:13px;color:#8c8c8c;">
          共解析到 {{ importData.length }} 条数据
        </div>
      </div>
      <template #footer>
        <el-button @click="importVisible = false">取消</el-button>
        <el-button type="primary" @click="doImport" :loading="importing" :disabled="importData.length === 0">
          确认导入 ({{ importData.length }}条)
        </el-button>
      </template>
    </el-dialog>
  </div>
  `,

  data() {
    return {
      questions: [],
      loading: false,
      selectedCategory: '',
      selectedIds: [],
      filters: {
        keyword: '',
        difficulty: null,
        status: null,
      },
      pagination: {
        page: 1,
        size: 20,
        total: 0,
      },
      dialogVisible: false,
      editingId: null,
      saving: false,
      form: {
        title: '',
        content: '',
        category: '',
        difficulty: 1,
        duration: 45,
        status: 1,
      },
      formRules: {
        title: [{ required: true, message: '请输入话术标题', trigger: 'blur' }],
        content: [
          { required: true, message: '请输入话术正文', trigger: 'blur' },
          { min: 10, message: '话术正文至少10个字', trigger: 'blur' },
          { max: 200, message: '话术正文不能超过200字', trigger: 'blur' },
        ],
        category: [{ required: true, message: '请选择或输入分类', trigger: 'change' }],
      },
      previewVisible: false,
      previewData: null,
      previewPinyin: false,
      importVisible: false,
      importData: [],
      importPreview: [],
      importing: false,
      uploadFile: null,
    };
  },

  computed: {
    categoryCounts() {
      return MockAPI.getCategories();
    },
    totalCount() {
      return Store.getQuestions().length;
    },
    existingCategories() {
      return Object.keys(this.categoryCounts);
    },
    previewAnnotated() {
      if (!this.previewData) return '';
      return PinyinUtil.annotate(this.previewData.content, this.previewPinyin);
    },
  },

  mounted() {
    this.loadData();
  },

  methods: {
    async loadData() {
      this.loading = true;
      try {
        const res = await MockAPI.getQuestions({
          keyword: this.filters.keyword,
          category: this.selectedCategory,
          difficulty: this.filters.difficulty,
          status: this.filters.status,
          page: this.pagination.page,
          size: this.pagination.size,
        });
        if (res.code === 0) {
          this.questions = res.data.list;
          this.pagination.total = res.data.total;
        }
      } finally {
        this.loading = false;
      }
    },

    selectCategory(cat) {
      this.selectedCategory = cat;
      this.pagination.page = 1;
      this.loadData();
    },

    resetFilters() {
      this.filters = { keyword: '', difficulty: null, status: null };
      this.selectedCategory = '';
      this.pagination.page = 1;
      this.loadData();
    },

    openAddDialog() {
      this.editingId = null;
      this.form = {
        title: '',
        content: '',
        category: this.selectedCategory || '',
        difficulty: 1,
        duration: 45,
        status: 1,
      };
      this.dialogVisible = true;
      this.$nextTick(() => {
        if (this.$refs.formRef) {
          this.$refs.formRef.clearValidate();
        }
      });
    },

    editQuestion(row) {
      this.editingId = row.id;
      this.form = {
        title: row.title,
        content: row.content,
        category: row.category,
        difficulty: row.difficulty,
        duration: row.duration,
        status: row.status,
      };
      this.dialogVisible = true;
      this.$nextTick(() => {
        if (this.$refs.formRef) {
          this.$refs.formRef.clearValidate();
        }
      });
    },

    async saveQuestion() {
      if (!this.$refs.formRef) return;
      try {
        await this.$refs.formRef.validate();
      } catch {
        return;
      }

      this.saving = true;
      try {
        if (this.editingId) {
          await MockAPI.updateQuestion(this.editingId, { ...this.form });
          ElementPlus.ElMessage.success('话术已更新');
        } else {
          await MockAPI.addQuestion({ ...this.form });
          ElementPlus.ElMessage.success('话术已新增');
        }
        this.dialogVisible = false;
        this.loadData();
      } finally {
        this.saving = false;
      }
    },

    previewQuestion(row) {
      this.previewData = row;
      this.previewPinyin = false;
      this.previewVisible = true;
    },

    async toggleStatus(row, val) {
      const status = val ? 1 : 0;
      await MockAPI.updateQuestion(row.id, { status });
      row.status = status;
      ElementPlus.ElMessage.success(status === 1 ? '已启用' : '已禁用');
    },

    async deleteQuestion(row) {
      try {
        await ElementPlus.ElMessageBox.confirm(
          `确认删除话术「${row.title}」吗？此操作不可恢复。`,
          '删除确认',
          { type: 'error' }
        );
        await MockAPI.deleteQuestion(row.id);
        ElementPlus.ElMessage.success('删除成功');
        this.loadData();
      } catch {}
    },

    handleSelectionChange(rows) {
      this.selectedIds = rows.map(r => r.id);
    },

    async batchDelete() {
      try {
        await ElementPlus.ElMessageBox.confirm(
          `确认删除选中的 ${this.selectedIds.length} 条话术吗？此操作不可恢复。`,
          '批量删除确认',
          { type: 'error' }
        );
        await MockAPI.deleteQuestions(this.selectedIds);
        ElementPlus.ElMessage.success(`已删除 ${this.selectedIds.length} 条话术`);
        this.selectedIds = [];
        this.loadData();
      } catch {}
    },

    async moveUp(row) {
      const sorted = [...this.questions].sort((a, b) => a.sortOrder - b.sortOrder);
      const idx = sorted.findIndex(q => q.id === row.id);
      if (idx > 0) {
        const prev = sorted[idx - 1];
        const tempOrder = row.sortOrder;
        await MockAPI.updateSort([
          { id: row.id, sortOrder: prev.sortOrder },
          { id: prev.id, sortOrder: tempOrder },
        ]);
        this.loadData();
      }
    },

    async moveDown(row) {
      const sorted = [...this.questions].sort((a, b) => a.sortOrder - b.sortOrder);
      const idx = sorted.findIndex(q => q.id === row.id);
      if (idx < sorted.length - 1) {
        const next = sorted[idx + 1];
        const tempOrder = row.sortOrder;
        await MockAPI.updateSort([
          { id: row.id, sortOrder: next.sortOrder },
          { id: next.id, sortOrder: tempOrder },
        ]);
        this.loadData();
      }
    },

    difficultyText(d) {
      return { 1: '初级', 2: '中级', 3: '高级' }[d] || '初级';
    },

    difficultyType(d) {
      return { 1: 'success', 2: 'warning', 3: 'danger' }[d] || 'info';
    },

    downloadTemplate() {
      const csv = '\ufeff标题,正文,分类,难度,建议时长(秒)\n'
        + '示例：第1题,大家好我叫张三来自北京,生活会话,1,30\n'
        + '示例：第2题,您好欢迎致电客服中心,职场沟通,2,30\n';
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '话术导入模板.csv';
      a.click();
      URL.revokeObjectURL(url);
      ElementPlus.ElMessage.success('模板已下载');
    },

    openImportDialog() {
      this.importData = [];
      this.importPreview = [];
      this.uploadFile = null;
      this.importVisible = true;
    },

    handleFileChange(file) {
      this.uploadFile = file;
      // 解析CSV文件
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result.replace(/^\ufeff/, '');
        const lines = text.split('\n').filter(l => l.trim());
        if (lines.length < 2) {
          ElementPlus.ElMessage.warning('文件内容为空或格式不正确');
          return;
        }

        // 跳过表头
        const data = [];
        for (let i = 1; i < lines.length; i++) {
          const parts = this.parseCSVLine(lines[i]);
          if (parts.length >= 2 && parts[0] && parts[1]) {
            data.push({
              title: parts[0].trim(),
              content: parts[1].trim(),
              category: parts[2] ? parts[2].trim() : '未分类',
              difficulty: parts[3] ? Number(parts[3].trim()) || 1 : 1,
              duration: parts[4] ? Number(parts[4].trim()) || 45 : 45,
            });
          }
        }

        this.importData = data;
        this.importPreview = data.slice(0, 5);

        if (data.length === 0) {
          ElementPlus.ElMessage.warning('未解析到有效数据，请检查文件格式');
        } else {
          ElementPlus.ElMessage.success(`已解析 ${data.length} 条数据`);
        }
      };
      reader.readAsText(file.raw, 'UTF-8');
    },

    parseCSVLine(line) {
      const result = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current);
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current);
      return result;
    },

    handleExceed() {
      ElementPlus.ElMessage.warning('只能上传一个文件');
    },

    async doImport() {
      if (this.importData.length === 0) return;
      this.importing = true;
      try {
        const res = await MockAPI.importQuestions(this.importData);
        ElementPlus.ElMessage.success(`成功导入 ${res.data.imported} 条话术`);
        this.importVisible = false;
        this.loadData();
      } finally {
        this.importing = false;
      }
    },

    exportData() {
      let csv = '\ufeff序号,标题,内容,分类,难度,建议时长(秒),状态,创建时间,更新时间\n';
      this.questions.forEach(q => {
        csv += `${q.sortOrder},${q.title},${q.content.replace(/,/g, '，')},${q.category},${this.difficultyText(q.difficulty)},${q.duration},${q.status === 1 ? '启用' : '禁用'},${q.createdAt},${q.updatedAt}\n`;
      });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `话术配置_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      ElementPlus.ElMessage.success('数据已导出');
    },
  },
};
