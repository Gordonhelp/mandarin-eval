/**
 * 主应用入口
 * 普通话智能评测系统
 */
const { createApp, ref, computed, watch } = Vue;

const App = {
  template: `
  <!-- 登录页 -->
  <login-component v-if="!loggedIn" @login-success="onLoginSuccess" />

  <!-- 主系统 -->
  <div v-else class="app-layout" :class="{ 'app-collapsed': collapsed }">
    <!-- 侧边栏 -->
    <aside class="app-aside" :class="{ collapsed }">
      <div class="app-logo">
        <span class="logo-icon">🗣️</span>
        <span class="logo-text" v-show="!collapsed">普通话评测系统</span>
      </div>
      <nav class="app-nav">
        <div
          v-for="item in navItems"
          :key="item.key"
          class="nav-item"
          :class="{ active: currentView === item.key }"
          @click="currentView = item.key"
        >
          <span class="nav-icon">{{ item.icon }}</span>
          <span class="nav-label">{{ item.label }}</span>
        </div>
      </nav>
      <div class="app-aside-footer">
        <div class="user-avatar">{{ currentUser.name.charAt(0) }}</div>
        <div class="user-info" v-show="!collapsed">
          <div class="user-name">{{ currentUser.name }}</div>
          <div class="user-role">{{ currentUser.role === 'admin' ? '管理员' : '考生' }}</div>
        </div>
      </div>
    </aside>

    <!-- 主内容区 -->
    <main class="app-main">
      <header class="app-header">
        <div class="header-left">
          <span class="collapse-btn" @click="collapsed = !collapsed">
            {{ collapsed ? '☰' : '☜' }}
          </span>
          <span class="page-title">{{ currentTitle }}</span>
        </div>
        <div class="header-right">
          <el-tag v-if="storageMode" size="small" :type="storageMode === 'server' ? 'success' : 'warning'" style="margin-right:8px;">
            {{ storageMode === 'server' ? '☁️ 云端存储' : '💾 本地存储' }}
          </el-tag>
          <span style="font-size:13px;color:#8c8c8c;">
            👤 {{ currentUser.username }} ({{ currentUser.role === 'admin' ? '管理员' : '考生' }})
          </span>
          <el-tooltip content="备份数据（导出JSON）" placement="bottom">
            <el-button circle size="small" @click="backupData" v-if="currentUser.role === 'admin'">📥</el-button>
          </el-tooltip>
          <el-tooltip content="恢复数据（导入JSON）" placement="bottom">
            <el-button circle size="small" @click="restoreData" v-if="currentUser.role === 'admin'">📤</el-button>
          </el-tooltip>
          <el-tooltip content="退出登录" placement="bottom">
            <el-button circle size="small" type="danger" @click="logout">🚪</el-button>
          </el-tooltip>
        </div>
      </header>

      <div class="app-content">
        <component :is="currentComponent" v-if="currentComponent" :current-user="currentUser" />
      </div>
    </main>
  </div>
  `,

  setup() {
    const currentView = ref('exam');
    const collapsed = ref(false);
    const loggedIn = ref(Store.isLoggedIn());
    const currentUser = ref(Store.getSession() || {});
    const storageMode = ref(Store.isServerMode() ? 'server' : 'local');

    // 导航菜单项（按角色动态生成）
    const navItems = computed(() => {
      const items = [
        { key: 'exam', label: '考试评测', icon: '📝' },
        { key: 'records', label: '结果记录', icon: '📊' },
      ];
      if (currentUser.value.role === 'admin') {
        items.push({ key: 'config', label: '系统配置', icon: '⚙️' });
        items.push({ key: 'account', label: '账号管理', icon: '👥' });
      }
      return items;
    });

    const currentTitle = computed(() => {
      const item = navItems.value.find(i => i.key === currentView.value);
      return item ? item.label : '';
    });

    const currentComponent = computed(() => {
      // 权限检查：非管理员不能访问配置和账号管理
      if ((currentView.value === 'config' || currentView.value === 'account') && currentUser.value.role !== 'admin') {
        return {
          template: `
            <div class="empty-state">
              <div class="empty-icon">🔒</div>
              <div class="empty-text">该模块仅管理员可访问</div>
            </div>
          `,
        };
      }
      const map = {
        exam: 'ExamComponent',
        records: 'RecordsComponent',
        config: 'ConfigComponent',
        account: 'AccountComponent',
      };
      return window[map[currentView.value]];
    });

    function onLoginSuccess(user) {
      currentUser.value = user;
      loggedIn.value = true;
      currentView.value = 'exam';
    }

    function logout() {
      ElementPlus.ElMessageBox.confirm(
        '确认退出登录吗？', '退出确认', { type: 'warning' }
      ).then(() => {
        Store.logout();
        loggedIn.value = false;
        currentUser.value = {};
        ElementPlus.ElMessage.success('已安全退出');
      }).catch(() => {});
    }

    function backupData() {
      const data = Store.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `普通话评测系统_数据备份_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      ElementPlus.ElMessage.success('数据已备份，请妥善保存备份文件');
    }

    function restoreData() {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
          const text = await file.text();
          const data = JSON.parse(text);
          if (!data.questions || !data.users) {
            ElementPlus.ElMessage.error('文件格式不正确，请选择有效的备份文件');
            return;
          }
          await ElementPlus.ElMessageBox.confirm(
            `确认恢复数据吗？将覆盖当前所有数据（话术${data.questions?.length || 0}条、记录${data.records?.length || 0}条、账号${data.users?.length || 0}个）。此操作不可恢复。`,
            '恢复数据确认',
            { type: 'warning' }
          );
          Store.importData(data);
          ElementPlus.ElMessage.success('数据已恢复，页面即将刷新');
          setTimeout(() => location.reload(), 1000);
        } catch (err) {
          if (err !== 'cancel') {
            ElementPlus.ElMessage.error('恢复失败：' + err.message);
          }
        }
      };
      input.click();
    }

    return {
      currentView,
      collapsed,
      loggedIn,
      currentUser,
      storageMode,
      navItems,
      currentTitle,
      currentComponent,
      onLoginSuccess,
      logout,
      backupData,
      restoreData,
    };
  },
};

// 创建应用
const app = createApp(App);

// 注册 Element Plus
if (typeof ElementPlusLocaleZhCn !== 'undefined') {
  app.use(ElementPlus, { locale: ElementPlusLocaleZhCn });
} else {
  app.use(ElementPlus);
}

// 注册全局组件
app.component('LoginComponent', window.LoginComponent);
app.component('ExamComponent', window.ExamComponent);
app.component('RecordsComponent', window.RecordsComponent);
app.component('ConfigComponent', window.ConfigComponent);
app.component('AccountComponent', window.AccountComponent);

// 先初始化数据存储（连接服务器），再挂载应用
Store.init().finally(() => {
  app.mount('#app');
});
