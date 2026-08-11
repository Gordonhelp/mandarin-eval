/**
 * 数据存储层
 * 优先使用服务器 API 持久化，自动回退到 localStorage
 */
window.Store = (function () {
  const DB_KEY = 'mandarin_eval_db';
  const SESSION_KEY = 'mandarin_eval_session';
  const API_URL = '/api/data';

  // 默认数据（仅用于 localStorage 回退模式）
  const DEFAULT_DATA = {
    version: 2,
    questions: [
      { id: 1, title: '第1题：自我介绍', content: '大家好，我叫李明，今年二十五岁，来自中国北京。我毕业于北京大学计算机专业，目前在一家互联网公司担任后端工程师。平时喜欢看书、跑步和旅游，很高兴认识大家。', category: '职场沟通', difficulty: 1, duration: 45, status: 1, sortOrder: 1, createdAt: '2026-07-01 09:00:00', updatedAt: '2026-07-01 09:00:00' },
      { id: 2, title: '第2题：客服开场白', content: '您好，欢迎致电客户服务中心。我是客服代表张三，工号二三零八。请问有什么可以帮助您的吗？我将竭诚为您服务，请稍等片刻，让我了解一下您的需求。', category: '职场沟通', difficulty: 2, duration: 30, status: 1, sortOrder: 2, createdAt: '2026-07-01 09:05:00', updatedAt: '2026-07-01 09:05:00' },
      { id: 3, title: '第3题：春季朗读', content: '春天来了，万物复苏。柳树发了芽，草地上开满了鲜花。小鸟在树上唱歌，清澈的小溪哗啦啦地流淌。远处的山峦若隐若现，一幅美丽的春景图展现在眼前。', category: '新闻播报', difficulty: 2, duration: 40, status: 1, sortOrder: 3, createdAt: '2026-07-01 09:10:00', updatedAt: '2026-07-01 09:10:00' },
      { id: 4, title: '第4题：车站广播', content: '各位乘客请注意，列车即将进站，请大家排好队，依次上车，不要拥挤，注意安全。祝大家旅途愉快，一路顺风。请大家照顾好身边的老人和小孩。', category: '新闻播报', difficulty: 1, duration: 25, status: 1, sortOrder: 4, createdAt: '2026-07-01 09:15:00', updatedAt: '2026-07-01 09:15:00' },
      { id: 5, title: '第5题：工作汇报', content: '今天的会议主要讨论下季度的工作计划。首先，我们需要明确目标。其次，制定可执行的方案。最后，落实到每个人头上。希望大家齐心协力，共同完成任务。', category: '职场沟通', difficulty: 3, duration: 35, status: 1, sortOrder: 5, createdAt: '2026-07-01 09:20:00', updatedAt: '2026-07-01 09:20:00' },
      { id: 6, title: '第6题：生活对话', content: '请问去火车站怎么走？您沿着这条路一直往前走，到第二个红绿灯左转，就能看到火车站了。大概需要十五分钟的路程。如果不认识路，可以坐出租车过去。', category: '生活会话', difficulty: 1, duration: 30, status: 1, sortOrder: 6, createdAt: '2026-07-01 09:25:00', updatedAt: '2026-07-01 09:25:00' },
      { id: 7, title: '第7题：道歉话术', content: '非常抱歉给您带来不便，我理解您的心情。请您放心，我会马上为您处理这个问题，确保不再发生类似情况。感谢您的理解与支持，如果有任何问题，随时联系我们。', category: '职场沟通', difficulty: 2, duration: 30, status: 1, sortOrder: 7, createdAt: '2026-07-01 09:30:00', updatedAt: '2026-07-01 09:30:00' },
      { id: 8, title: '第8题：天气预报', content: '各位听众朋友大家好，现在播报今天的天气预报。今天白天晴转多云，最高气温二十八度，最低气温十八度。风力二到三级，空气质量良好。出门请注意防晒，祝大家生活愉快。', category: '新闻播报', difficulty: 2, duration: 35, status: 1, sortOrder: 8, createdAt: '2026-07-01 09:35:00', updatedAt: '2026-07-01 09:35:00' },
    ],
    records: [
      { id: 'REC20260701001', userId: 'kaosheng001', userName: '王芳', questionId: 1, questionTitle: '第1题：自我介绍', questionText: '大家好，我叫李明，今年二十五岁...', audioUrl: '', totalScore: 88.5, pronunciationScore: 90, fluencyScore: 85, completenessScore: 92, intonationScore: 87, suggestion: '发音清晰，语速适中，个别翘舌音不够准确。建议加强zh/ch/sh的发音练习。', duration: 42, createdAt: '2026-07-15 10:30:15' },
      { id: 'REC20260701002', userId: 'kaosheng001', userName: '王芳', questionId: 2, questionTitle: '第2题：客服开场白', questionText: '您好，欢迎致电客户服务中心...', audioUrl: '', totalScore: 92.0, pronunciationScore: 94, fluencyScore: 93, completenessScore: 90, intonationScore: 91, suggestion: '整体表现优秀，语调自然亲切，发音准确。注意个别轻声字的弱化处理。', duration: 28, createdAt: '2026-07-15 11:15:30' },
      { id: 'REC20260701003', userId: 'kaosheng001', userName: '王芳', questionId: 3, questionTitle: '第3题：春季朗读', questionText: '春天来了，万物复苏...', audioUrl: '', totalScore: 85.3, pronunciationScore: 86, fluencyScore: 88, completenessScore: 82, intonationScore: 85, suggestion: '朗读流畅度较好，但情感表达略显平淡。建议在描写性语句中加强语气变化。', duration: 38, createdAt: '2026-07-16 09:20:45' },
      { id: 'REC20260701004', userId: 'kaosheng001', userName: '王芳', questionId: 4, questionTitle: '第4题：车站广播', questionText: '各位乘客请注意...', audioUrl: '', totalScore: 89.7, pronunciationScore: 91, fluencyScore: 90, completenessScore: 88, intonationScore: 90, suggestion: '播报清晰有力，语调庄重。建议在注意安全处加强语气强调。', duration: 24, createdAt: '2026-07-19 09:45:30' },
      { id: 'REC20260701005', userId: 'kaosheng001', userName: '王芳', questionId: 5, questionTitle: '第5题：工作汇报', questionText: '今天的会议主要讨论下季度的工作计划...', audioUrl: '', totalScore: 87.3, pronunciationScore: 88, fluencyScore: 89, completenessScore: 86, intonationScore: 86, suggestion: '汇报条理清晰，逻辑性强。注意首先、其次、最后等过渡词的重音处理。', duration: 33, createdAt: '2026-07-19 14:20:15' },
    ],
    users: [
      { id: 1, username: 'admin', password: '123456', name: '管理员', department: '系统管理', role: 'admin', status: 1, createdAt: '2026-07-01 00:00:00' },
      { id: 2, username: 'kaosheng001', password: '123456', name: '王芳', department: '客服一部', role: 'student', status: 1, createdAt: '2026-07-01 00:00:00' },
    ],
    nextQuestionId: 9,
    nextRecordSeq: 6,
    nextUserId: 3,
  };

  let db = null;
  let useServer = false; // 是否使用服务器模式
  let saveTimer = null;  // 防抖保存
  const audioCache = {}; // 录音base64缓存（不存入localStorage，避免超出容量）

  // ===== 服务器 API =====
  async function serverLoad() {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error('Server load failed: ' + res.status);
    const json = await res.json();
    if (json.code === 0 && json.data) {
      return json.data;
    }
    throw new Error('Server returned error');
  }

  async function serverSave() {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(db),
    });
    if (!res.ok) throw new Error('Server save failed: ' + res.status);
    return true;
  }

  // ===== localStorage 回退 =====
  function localLoad() {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        console.warn('[Store] localStorage parse error', e);
      }
    }
    return JSON.parse(JSON.stringify(DEFAULT_DATA));
  }

  function localSave() {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(db));
    } catch (e) {
      console.warn('[Store] localStorage save failed:', e.message);
      // 如果超出容量，尝试不带录音base64数据保存
      try {
        const stripped = JSON.parse(JSON.stringify(db));
        if (stripped.records) {
          stripped.records.forEach(r => {
            if (r.xfEvaluation) delete r.xfEvaluation.requestAudioBase64;
          });
        }
        localStorage.setItem(DB_KEY, JSON.stringify(stripped));
        console.warn('[Store] Saved without audio base64 data due to storage limit');
      } catch (e2) {
        console.error('[Store] localStorage save completely failed:', e2.message);
      }
    }
  }

  // ===== 统一保存（防抖） =====
  function save() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      if (useServer) {
        try {
          await serverSave();
        } catch (e) {
          console.warn('[Store] Server save failed, fallback to localStorage:', e.message);
          localSave();
        }
      } else {
        localSave();
      }
    }, 300);
  }

  // 立即保存（不等防抖）
  async function saveNow() {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    if (useServer) {
      try {
        await serverSave();
      } catch (e) {
        console.warn('[Store] Server save failed:', e.message);
        localSave();
      }
    } else {
      localSave();
    }
  }

  function getDB() {
    if (!db) {
      // 同步回退：如果 init() 还没执行过
      db = localLoad();
    }
    return db;
  }

  function nowStr() {
    const d = new Date();
    const Y = d.getFullYear();
    const M = String(d.getMonth() + 1).padStart(2, '0');
    const D = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    const s = String(d.getSeconds()).padStart(2, '0');
    return `${Y}-${M}-${D} ${h}:${m}:${s}`;
  }

  return {
    /**
     * 初始化：尝试连接服务器，失败则用 localStorage
     */
    async init() {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        const res = await fetch('/api/health', { signal: controller.signal });
        clearTimeout(timeout);
        if (res.ok) {
          db = await serverLoad();
          useServer = true;
          console.log('[Store] Server mode: data loaded from server');
          return;
        }
      } catch (e) {
        console.log('[Store] Server not available, using localStorage:', e.message);
      }
      // 回退到 localStorage
      db = localLoad();
      localSave();
      useServer = false;
    },

    isServerMode() {
      return useServer;
    },

    // ===== Auth =====
    login(username, password) {
      const d = getDB();
      const user = d.users.find(u => u.username === username && u.password === password);
      if (user) {
        if (user.status === 0) {
          return { success: false, message: '账号已被禁用，请联系管理员' };
        }
        const session = {
          id: user.id,
          username: user.username,
          name: user.name,
          department: user.department,
          role: user.role,
        };
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
        return { success: true, user: session };
      }
      return { success: false, message: '用户名或密码错误' };
    },

    logout() {
      sessionStorage.removeItem(SESSION_KEY);
    },

    getSession() {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) {
        try { return JSON.parse(raw); } catch { return null; }
      }
      return null;
    },

    isLoggedIn() {
      return !!this.getSession();
    },

    // ===== Questions =====
    getQuestions() { return getDB().questions; },
    getQuestion(id) { return getDB().questions.find(q => q.id === Number(id)); },
    getActiveQuestions() {
      return getDB().questions.filter(q => q.status === 1).sort((a, b) => a.sortOrder - b.sortOrder);
    },

    addQuestion(data) {
      const d = getDB();
      const now = nowStr();
      const question = {
        id: d.nextQuestionId++,
        ...data,
        status: data.status !== undefined ? data.status : 1,
        sortOrder: data.sortOrder !== undefined ? data.sortOrder : d.questions.length + 1,
        createdAt: now,
        updatedAt: now,
      };
      d.questions.push(question);
      save();
      return question;
    },

    updateQuestion(id, data) {
      const d = getDB();
      const idx = d.questions.findIndex(q => q.id === Number(id));
      if (idx === -1) return null;
      d.questions[idx] = { ...d.questions[idx], ...data, id: Number(id), updatedAt: nowStr() };
      save();
      return d.questions[idx];
    },

    deleteQuestion(id) {
      const d = getDB();
      const idx = d.questions.findIndex(q => q.id === Number(id));
      if (idx === -1) return false;
      d.questions.splice(idx, 1);
      save();
      return true;
    },

    deleteQuestions(ids) {
      const d = getDB();
      const idSet = new Set(ids.map(Number));
      d.questions = d.questions.filter(q => !idSet.has(q.id));
      save();
      return true;
    },

    batchImportQuestions(items) {
      const d = getDB();
      let count = 0;
      const now = nowStr();
      items.forEach(item => {
        const question = {
          id: d.nextQuestionId++,
          title: item.title || `第${d.nextQuestionId}题`,
          content: item.content || '',
          category: item.category || '未分类',
          difficulty: Number(item.difficulty) || 1,
          duration: Number(item.duration) || 60,
          status: 1,
          sortOrder: d.questions.length + count + 1,
          createdAt: now,
          updatedAt: now,
        };
        d.questions.push(question);
        count++;
      });
      save();
      return count;
    },

    updateSort(orders) {
      const d = getDB();
      orders.forEach(({ id, sortOrder }) => {
        const q = d.questions.find(q => q.id === Number(id));
        if (q) q.sortOrder = sortOrder;
      });
      save();
    },

    // ===== Records =====
    getRecords() { return getDB().records; },
    getRecord(id) { return getDB().records.find(r => r.id === id); },

    addRecord(data) {
      const d = getDB();
      const seq = String(d.nextRecordSeq++).padStart(3, '0');
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const record = {
        id: `REC${dateStr}${seq}`,
        ...data,
        createdAt: nowStr(),
      };

      // 录音base64数据存入内存缓存，不放入DB（避免localStorage超容）
      if (record.xfEvaluation?.requestAudioBase64) {
        audioCache[record.id] = record.xfEvaluation.requestAudioBase64;
      }

      d.records.unshift(record);
      save();
      return record;
    },

    deleteRecord(id) {
      const d = getDB();
      const idx = d.records.findIndex(r => r.id === id);
      if (idx === -1) return false;
      d.records.splice(idx, 1);
      save();
      return true;
    },

    // ===== Users =====
    getUsers() { return getDB().users; },
    getStudents() { return getDB().users.filter(u => u.role === 'student'); },
    getUser(id) { return getDB().users.find(u => u.id === Number(id)); },
    getUserByUsername(username) { return getDB().users.find(u => u.username === username); },

    addUser(data) {
      const d = getDB();
      if (d.users.find(u => u.username === data.username)) {
        return { success: false, message: '用户名已存在' };
      }
      const user = {
        id: d.nextUserId++,
        username: data.username,
        password: data.password || '123456',
        name: data.name || '',
        department: data.department || '',
        role: data.role || 'student',
        status: data.status !== undefined ? data.status : 1,
        createdAt: nowStr(),
      };
      d.users.push(user);
      save();
      return { success: true, user };
    },

    updateUser(id, data) {
      const d = getDB();
      const idx = d.users.findIndex(u => u.id === Number(id));
      if (idx === -1) return { success: false, message: '用户不存在' };
      if (data.username && d.users.find(u => u.username === data.username && u.id !== Number(id))) {
        return { success: false, message: '用户名已存在' };
      }
      d.users[idx] = { ...d.users[idx], ...data, id: Number(id) };
      save();
      return { success: true, user: d.users[idx] };
    },

    deleteUser(id) {
      const d = getDB();
      const user = d.users.find(u => u.id === Number(id));
      if (!user) return false;
      if (user.username === 'admin') return false;
      d.users = d.users.filter(u => u.id !== Number(id));
      save();
      return true;
    },

    resetPassword(id, newPassword) {
      const d = getDB();
      const user = d.users.find(u => u.id === Number(id));
      if (!user) return false;
      user.password = newPassword;
      save();
      return true;
    },

    // ===== Audio Cache =====
    getAudioBase64(recordId) {
      return audioCache[recordId] || null;
    },

    setAudioBase64(recordId, base64) {
      audioCache[recordId] = base64;
    },

    // ===== Reset =====
    async reset() {
      sessionStorage.removeItem(SESSION_KEY);
      if (useServer) {
        db = JSON.parse(JSON.stringify(DEFAULT_DATA));
        await serverSave();
      } else {
        localStorage.removeItem(DB_KEY);
        db = JSON.parse(JSON.stringify(DEFAULT_DATA));
        localSave();
      }
    },

    // ===== Backup / Restore =====
    exportData() {
      return JSON.parse(JSON.stringify(getDB()));
    },

    importData(data) {
      db = data;
      if (useServer) {
        serverSave();
      } else {
        localSave();
      }
    },
  };
})();
