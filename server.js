/**
 * 轻量后端服务器（零依赖，仅用 Node.js 内置模块）
 * 提供数据持久化 API + 静态文件服务
 *
 * API:
 *   GET  /api/data       -> 返回全部数据
 *   POST /api/data       -> 保存全部数据
 *   GET  /api/health     -> 健康检查
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'server-data.json');
const PUBLIC_DIR = __dirname;

// MIME 类型映射
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.csv': 'text/csv; charset=utf-8',
  '.map': 'application/json',
};

// 默认数据
const DEFAULT_DATA = require('./default-data.js');

// 初始化数据文件
function initDataFile() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(DEFAULT_DATA, null, 2), 'utf-8');
    console.log('[DB] Initialized server-data.json with default data');
  }
}

// 读取数据
function readData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    console.error('[DB] Read error:', e.message);
    return DEFAULT_DATA;
  }
}

// 写入数据
function writeData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (e) {
    console.error('[DB] Write error:', e.message);
    return false;
  }
}

// 读取请求体
function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

// 发送 JSON 响应
function sendJSON(res, statusCode, data) {
  const json = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(json);
}

// 发送静态文件
function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h1>404 Not Found</h1>');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

// 创建服务器
const server = http.createServer(async (req, res) => {
  // 处理 CORS 预检
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  // ===== API 路由 =====
  if (pathname === '/api/health') {
    sendJSON(res, 200, { status: 'ok', timestamp: Date.now() });
    return;
  }

  if (pathname === '/api/data' && req.method === 'GET') {
    const data = readData();
    sendJSON(res, 200, { code: 0, data });
    return;
  }

  if (pathname === '/api/data' && req.method === 'POST') {
    try {
      const body = await readBody(req);
      const success = writeData(body);
      sendJSON(res, 200, { code: 0, success });
    } catch (e) {
      sendJSON(res, 500, { code: -1, message: e.message });
    }
    return;
  }

  // ===== 静态文件 =====
  let filePath = pathname === '/' ? '/index.html' : pathname;
  // 安全：防止路径穿越
  filePath = filePath.replace(/\.\./g, '');
  const fullPath = path.join(PUBLIC_DIR, filePath);

  // 如果文件不存在，返回 index.html（SPA fallback）
  fs.access(fullPath, fs.constants.F_OK, (err) => {
    if (err) {
      sendFile(res, path.join(PUBLIC_DIR, 'index.html'));
    } else {
      sendFile(res, fullPath);
    }
  });
});

// 启动
initDataFile();
server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Server] Mandarin Evaluation System running at http://0.0.0.0:${PORT}`);
});
