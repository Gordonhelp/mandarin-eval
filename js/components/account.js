/**
 * 账号管理模块组件（管理员专用）
 */
window.AccountComponent = {
  template: `
  <div>
    <!-- 统计卡片 -->
    <div class="account-stats">
      <div class="stat-card">
        <div class="stat-icon" style="background:#e6f7ff;color:#1890ff;">👥</div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.total }}</div>
          <div class="stat-label">总账号数</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:#f6ffed;color:#52c41a;">🎓</div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.students }}</div>
          <div class="stat-label">考生账号</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:#fffbe6;color:#faad14;">✅</div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.active }}</div>
          <div class="stat-label">启用中</div>
        </div>
      </div>
    </div>

    <!-- 工具栏 -->
    <div class="filter-toolbar">
      <el-input
        v-model="filters.keyword"
        placeholder="搜索用户名/姓名/工号"
        style="width:260px;"
        clearable
        @clear="loadData"
        @keyup.enter="loadData"
      />
      <el-select v-model="filters.role" placeholder="角色" clearable style="width:120px;">
        <el-option label="管理员" value="admin" />
        <el-option label="考生" value="student" />
      </el-select>
      <el-select v-model="filters.status" placeholder="状态" clearable style="width:120px;">
        <el-option label="启用" :value="1" />
        <el-option label="禁用" :value="0" />
      </el-select>
      <el-button type="primary" @click="loadData">查询</el-button>
      <el-button @click="resetFilters">重置</el-button>
      <el-button type="success" @click="openAddDialog">➕ 新增账号</el-button>
    </div>

    <!-- 数据表格 -->
    <div class="data-table-card">
      <el-table :data="users" v-loading="loading" border stripe style="width:100%">
        <el-table-column prop="id" label="ID" width="60" align="center" />
        <el-table-column prop="username" label="用户名" width="160">
          <template #default="{ row }">
            <span style="font-weight:600;">{{ row.username }}</span>
            <el-tag v-if="row.username === 'admin'" size="small" type="danger" style="margin-left:6px;">超管</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="姓名" width="120" />
        <el-table-column prop="department" label="部门" width="140" />
        <el-table-column prop="role" label="角色" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.role === 'admin' ? 'danger' : 'primary'" size="small">
              {{ row.role === 'admin' ? '管理员' : '考生' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-switch
              :model-value="row.status === 1"
              @change="(val) => toggleStatus(row, val)"
              size="small"
              :disabled="row.username === 'admin'"
            />
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180" />
        <el-table-column label="操作" width="240" align="center" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" link @click="editUser(row)">编辑</el-button>
            <el-button size="small" type="warning" link @click="resetPwd(row)">重置密码</el-button>
            <el-button
              size="small"
              type="danger"
              link
              @click="deleteUser(row)"
              :disabled="row.username === 'admin'"
            >删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 新增/编辑弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="editingId ? '编辑账号' : '新增账号'"
      width="560px"
      :close-on-click-modal="false"
    >
      <el-form :model="form" :rules="formRules" ref="formRef" label-width="90px">
        <el-form-item label="用户名" prop="username">
          <el-input
            v-model="form.username"
            placeholder="如：kaosheng002"
            :disabled="editingId !== null"
            maxlength="30"
          />
          <div v-if="!editingId" style="font-size:12px;color:#8c8c8c;margin-top:4px;">
            登录系统使用的账号名，创建后不可修改
          </div>
        </el-form-item>
        <el-form-item label="姓名" prop="name">
          <el-input v-model="form.name" placeholder="如：张三" maxlength="20" />
        </el-form-item>
        <el-form-item label="部门" prop="department">
          <el-input v-model="form.department" placeholder="如：客服一部" maxlength="50" />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-radio-group v-model="form.role">
            <el-radio value="student">考生</el-radio>
            <el-radio value="admin">管理员</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="!editingId" label="初始密码" prop="password">
          <el-input v-model="form.password" placeholder="默认123456" maxlength="30" show-password />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="form.status" :active-value="1" :inactive-value="0" />
          <span style="margin-left:8px;font-size:13px;color:#8c8c8c;">
            {{ form.status === 1 ? '启用（可登录系统）' : '禁用（无法登录）' }}
          </span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveUser" :loading="saving">保存</el-button>
      </template>
    </el-dialog>

    <!-- 重置密码弹窗 -->
    <el-dialog v-model="pwdVisible" title="🔑 重置密码" width="450px">
      <div style="margin-bottom:16px;">
        <span style="color:#8c8c8c;">为账号</span>
        <span style="font-weight:600;margin:0 4px;">{{ pwdUser?.username }}</span>
        <span style="color:#8c8c8c;">设置新密码</span>
      </div>
      <el-input
        v-model="newPassword"
        placeholder="请输入新密码"
        show-password
        size="large"
        maxlength="30"
      />
      <div style="margin-top:8px;font-size:12px;color:#8c8c8c;">建议密码不少于6位</div>
      <template #footer>
        <el-button @click="pwdVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmResetPwd" :loading="pwdSaving">确认重置</el-button>
      </template>
    </el-dialog>
  </div>
  `,

  data() {
    return {
      users: [],
      loading: false,
      filters: { keyword: '', role: '', status: null },
      dialogVisible: false,
      editingId: null,
      saving: false,
      form: {
        username: '',
        name: '',
        department: '',
        role: 'student',
        password: '123456',
        status: 1,
      },
      formRules: {
        username: [
          { required: true, message: '请输入用户名', trigger: 'blur' },
          { min: 3, message: '用户名至少3个字符', trigger: 'blur' },
        ],
        name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
        department: [{ required: true, message: '请输入部门', trigger: 'blur' }],
        role: [{ required: true, message: '请选择角色', trigger: 'change' }],
        password: [{ required: true, message: '请输入初始密码', trigger: 'blur' }],
      },
      pwdVisible: false,
      pwdUser: null,
      newPassword: '',
      pwdSaving: false,
    };
  },

  computed: {
    stats() {
      const all = Store.getUsers();
      return {
        total: all.length,
        students: all.filter(u => u.role === 'student').length,
        active: all.filter(u => u.status === 1).length,
      };
    },
  },

  mounted() {
    this.loadData();
  },

  methods: {
    loadData() {
      this.loading = true;
      let users = Store.getUsers();

      if (this.filters.keyword) {
        const kw = this.filters.keyword.toLowerCase();
        users = users.filter(u =>
          u.username.toLowerCase().includes(kw) ||
          u.name.toLowerCase().includes(kw) ||
          (u.department || '').toLowerCase().includes(kw)
        );
      }
      if (this.filters.role) {
        users = users.filter(u => u.role === this.filters.role);
      }
      if (this.filters.status !== null && this.filters.status !== '') {
        users = users.filter(u => u.status === Number(this.filters.status));
      }

      this.users = [...users];
      this.loading = false;
    },

    resetFilters() {
      this.filters = { keyword: '', role: '', status: null };
      this.loadData();
    },

    openAddDialog() {
      this.editingId = null;
      this.form = {
        username: '',
        name: '',
        department: '',
        role: 'student',
        password: '123456',
        status: 1,
      };
      this.dialogVisible = true;
      this.$nextTick(() => {
        if (this.$refs.formRef) this.$refs.formRef.clearValidate();
      });
    },

    editUser(row) {
      this.editingId = row.id;
      this.form = {
        username: row.username,
        name: row.name,
        department: row.department,
        role: row.role,
        password: '',
        status: row.status,
      };
      this.dialogVisible = true;
      this.$nextTick(() => {
        if (this.$refs.formRef) this.$refs.formRef.clearValidate();
      });
    },

    async saveUser() {
      if (!this.$refs.formRef) return;
      try {
        await this.$refs.formRef.validate();
      } catch {
        return;
      }

      this.saving = true;
      if (this.editingId) {
        const result = Store.updateUser(this.editingId, {
          name: this.form.name,
          department: this.form.department,
          role: this.form.role,
          status: this.form.status,
        });
        if (result.success) {
          ElementPlus.ElMessage.success('账号已更新');
          this.dialogVisible = false;
          this.loadData();
        } else {
          ElementPlus.ElMessage.error(result.message);
        }
      } else {
        const result = Store.addUser({
          username: this.form.username,
          name: this.form.name,
          department: this.form.department,
          role: this.form.role,
          password: this.form.password,
          status: this.form.status,
        });
        if (result.success) {
          ElementPlus.ElMessage.success('账号已创建，初始密码：' + this.form.password);
          this.dialogVisible = false;
          this.loadData();
        } else {
          ElementPlus.ElMessage.error(result.message);
        }
      }
      this.saving = false;
    },

    async toggleStatus(row, val) {
      const status = val ? 1 : 0;
      Store.updateUser(row.id, { status });
      row.status = status;
      ElementPlus.ElMessage.success(status === 1 ? '已启用' : '已禁用');
    },

    resetPwd(row) {
      this.pwdUser = row;
      this.newPassword = '';
      this.pwdVisible = true;
    },

    async confirmResetPwd() {
      if (!this.newPassword || this.newPassword.length < 6) {
        ElementPlus.ElMessage.warning('密码至少6位');
        return;
      }
      this.pwdSaving = true;
      Store.resetPassword(this.pwdUser.id, this.newPassword);
      ElementPlus.ElMessage.success('密码已重置');
      this.pwdVisible = false;
      this.pwdSaving = false;
    },

    async deleteUser(row) {
      try {
        await ElementPlus.ElMessageBox.confirm(
          `确认删除账号「${row.username}（${row.name}）」吗？该账号的评测记录将保留但无法再登录。此操作不可恢复。`,
          '删除确认',
          { type: 'error' }
        );
        Store.deleteUser(row.id);
        ElementPlus.ElMessage.success('账号已删除');
        this.loadData();
      } catch {}
    },
  },
};
