/**
 * 登录模块组件
 */
window.LoginComponent = {
  template: `
  <div class="login-page">
    <div class="login-bg">
      <div class="login-bg-circle c1"></div>
      <div class="login-bg-circle c2"></div>
      <div class="login-bg-circle c3"></div>
    </div>
    <div class="login-card">
      <div class="login-header">
        <div class="login-logo">🗣️</div>
        <div class="login-title">普通话智能评测系统</div>
        <div class="login-subtitle">Mandarin Pronunciation Evaluation System</div>
      </div>

      <el-form
        ref="loginFormRef"
        :model="loginForm"
        :rules="loginRules"
        class="login-form"
        @keyup.enter="handleLogin"
      >
        <el-form-item prop="username">
          <el-input
            v-model="loginForm.username"
            placeholder="请输入用户名"
            size="large"
            :prefix-icon="''"
          >
            <template #prefix>
              <span style="font-size:18px;">👤</span>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="loginForm.password"
            type="password"
            placeholder="请输入密码"
            size="large"
            show-password
          >
            <template #prefix>
              <span style="font-size:18px;">🔒</span>
            </template>
          </el-input>
        </el-form-item>

        <el-button
          type="primary"
          size="large"
          class="login-btn"
          :loading="loading"
          @click="handleLogin"
        >
          登 录
        </el-button>
      </el-form>
    </div>
  </div>
  `,

  data() {
    return {
      loginForm: {
        username: '',
        password: '',
      },
      loginRules: {
        username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
        password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
      },
      loading: false,
    };
  },

  methods: {
    async handleLogin() {
      if (!this.$refs.loginFormRef) return;
      try {
        await this.$refs.loginFormRef.validate();
      } catch {
        return;
      }

      this.loading = true;
      // 模拟登录延迟
      await new Promise(r => setTimeout(r, 500));

      const result = Store.login(this.loginForm.username, this.loginForm.password);
      this.loading = false;

      if (result.success) {
        ElementPlus.ElMessage.success('登录成功，欢迎回来：' + result.user.name);
        this.$emit('login-success', result.user);
      } else {
        ElementPlus.ElMessage.error(result.message);
      }
    },
  },
};
