/**
 * 讯飞语音评测（流式版）WebSocket 客户端
 * API地址: wss://ise-api.xfyun.cn/v2/open-ise
 * 鉴权: HMAC-SHA256 签名
 * 返回: XML格式评测结果（base64编码）
 *
 * 支持三种评测：
 *   read_syllable  单字评测 → phone_score(发音) + tone_score(声调) + total_score(总分)
 *   read_sentence  句子评测 → fluency_score + integrity_score + phone_score + tone_score + total_score
 *   read_chapter   段落评测 → fluency_score + integrity_score + phone_score + tone_score + total_score
 */
window.XfEval = (function () {

  const APPID = '21eec9e3';
  const API_KEY = 'df5415ec3aa9940ac400b3ee3715aa69';
  const API_SECRET = 'YWUzMTVmMzQzYWIzYzgxMDIzMTFkMjky';
  const HOST = 'ise-api.xfyun.cn';
  const PATH = '/v2/open-ise';
  const WS_URL = `wss://${HOST}${PATH}`;

  /**
   * 生成鉴权URL（HMAC-SHA256签名）
   */
  async function buildAuthUrl() {
    const date = new Date().toUTCString();
    const requestLine = `GET ${PATH} HTTP/1.1`;

    // signature_origin
    const signatureOrigin = `host: ${HOST}\ndate: ${date}\n${requestLine}`;

    // HMAC-SHA256
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(API_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signatureBuffer = await crypto.subtle.sign(
      'HMAC', key, encoder.encode(signatureOrigin)
    );
    const signature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));

    // authorization_origin
    const authorizationOrigin =
      `api_key="${API_KEY}", algorithm="hmac-sha256", ` +
      `headers="host date request-line", signature="${signature}"`;
    const authorization = btoa(authorizationOrigin);

    const params = new URLSearchParams({ host: HOST, date: date, authorization: authorization });
    return `${WS_URL}?${params.toString()}`;
  }

  /**
   * 将ArrayBuffer转为base64字符串（分块处理避免栈溢出）
   */
  function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, chunk);
    }
    return btoa(binary);
  }

  /**
   * base64解码为UTF-8字符串
   */
  function base64ToUtf8(base64Str) {
    const binary = atob(base64Str);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder('utf-8').decode(bytes);
  }

  /**
   * 调用讯飞评测API（单次，指定题型）
   * @param {string} refText - 参考文本
   * @param {string} audioBase64 - base64编码的音频数据（mp3）
   * @param {string} category - 题型: read_syllable | read_sentence | read_chapter
   * @returns {Promise<object>} 解析后的评测结果
   */
  function evalOnce(refText, audioBase64, category) {
    return new Promise(async (resolve, reject) => {
      let authUrl;
      try {
        authUrl = await buildAuthUrl();
      } catch (e) {
        reject(new Error('鉴权签名生成失败: ' + e.message));
        return;
      }

      const ws = new WebSocket(authUrl);
      let resolved = false;
      let timeoutId = setTimeout(() => {
        if (!resolved) {
          ws.close();
          reject(new Error(`讯飞API超时(${category})，30秒未返回结果`));
        }
      }, 30000);

      ws.onopen = () => {
        // 第1步：参数上传 (cmd=ssb)
        const ssbFrame = {
          common: { app_id: APPID },
          business: {
            sub: 'ise',
            ent: 'cn_vip',
            category: category,
            cmd: 'ssb',
            text: '\uFEFF' + refText,
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
        ws.send(JSON.stringify(ssbFrame));

        // 第2步：音频分帧发送
        // audioBase64 已经是base64字符串，直接分块发送
        // base64每4字符对应3字节，按4的倍数切分确保每块可独立解码
        const maxChunkChars = 16000; // 每帧base64字符数（约12KB原始数据）
        const totalLen = audioBase64.length;
        let offset = 0;
        let isFirst = true;
        let sentAny = false;

        function sendNextChunk() {
          if (offset >= totalLen && sentAny) {
            // 所有音频已发送完毕，不需要再发结束帧
            return;
          }

          if (offset >= totalLen) {
            return;
          }

          // 计算本帧剩余可发送大小
          const remaining = totalLen - offset;
          let chunkLen = Math.min(maxChunkChars, remaining);
          // 确保是4的倍数
          chunkLen = Math.floor(chunkLen / 4) * 4;
          if (chunkLen === 0) chunkLen = Math.min(4, remaining);

          const chunk = audioBase64.substring(offset, offset + chunkLen);
          offset += chunkLen;

          // 判断是否是最后一帧
          const isLast = offset >= totalLen;
          const aus = isFirst ? 1 : (isLast ? 4 : 2);
          const status = isLast ? 2 : 1;

          const frame = {
            business: { cmd: 'auw', aus: aus },
            data: { status: status, data: chunk },
          };
          ws.send(JSON.stringify(frame));
          isFirst = false;
          sentAny = true;

          // 继续发送下一帧
          if (!isLast) {
            setTimeout(sendNextChunk, 10);
          }
        }

        sendNextChunk();
      };

      ws.onmessage = (event) => {
        try {
          const res = JSON.parse(event.data);
          if (res.code !== 0) {
            clearTimeout(timeoutId);
            resolved = true;
            ws.close();
            reject(new Error(`讯飞API错误(code=${res.code}): ${res.message || '未知错误'}`));
            return;
          }

          // 检查是否有最终结果
          if (res.data?.status === 2 && res.data?.data) {
            clearTimeout(timeoutId);
            resolved = true;
            ws.close();

            // 解码base64得到XML
            const xmlStr = base64ToUtf8(res.data.data);
            // 解析XML提取评分
            const scores = parseXmlResult(xmlStr, category);
            resolve(scores);
          }
        } catch (e) {
          // 忽略中间消息的解析错误
        }
      };

      ws.onerror = () => {
        if (!resolved) {
          clearTimeout(timeoutId);
          reject(new Error(`WebSocket连接失败(${category})，请检查网络`));
        }
      };

      ws.onclose = () => {
        clearTimeout(timeoutId);
        if (!resolved) {
          resolved = true;
          reject(new Error(`连接关闭但未收到结果(${category})`));
        }
      };
    });
  }

  /**
   * 解析XML评测结果，提取评分
   * 取原始XML中所有节点的同名属性的平均值：
   *   fluency_score  → 所有fluency_score的平均分
   *   integrity_score → 所有integrity_score的平均分
   *   phone_score    → 所有phone_score的平均分
   *   tone_score     → 所有tone_score的平均分
   *   total_score    → 所有total_score的平均分
   */
  function parseXmlResult(xmlStr, category) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlStr, 'text/xml');

    let rootNode = doc.querySelector('read_syllable, read_sentence, read_chapter');
    if (!rootNode) {
      return { type: category, raw: xmlStr, error: '未找到评测结果节点' };
    }

    // 从XML中收集所有节点的指定属性值，计算平均分
    function avgAttr(attrName) {
      const nodes = doc.querySelectorAll('[' + attrName + ']');
      if (nodes.length === 0) return null;
      let sum = 0;
      let count = 0;
      nodes.forEach(node => {
        const val = parseFloat(node.getAttribute(attrName));
        if (!isNaN(val)) {
          sum += val;
          count++;
        }
      });
      return count > 0 ? Math.round(sum / count * 100) / 100 : null;
    }

    return {
      type: category === 'read_chapter' ? 'paragraph' : 'sentence',
      fluency_score: avgAttr('fluency_score'),
      integrity_score: avgAttr('integrity_score'),
      phone_score: avgAttr('phone_score'),
      tone_score: avgAttr('tone_score'),
      total_score: avgAttr('total_score'),
      is_rejected: rootNode.getAttribute('is_rejected') === 'true',
      except_info: rootNode.getAttribute('except_info') || '0',
      raw: xmlStr,
    };
  }

  /**
   * 完整评测：调用讯飞 read_chapter 评测
   * 仅返回5个评分字段：fluency_score、integrity_score、phone_score、tone_score、total_score
   * @param {string} refText - 参考文本
   * @param {string} audioBase64 - base64编码的MP3音频
   * @returns {Promise<object>} 评测结果
   */
  async function evaluate(refText, audioBase64) {
    // 句篇题型返回字段一致，使用 read_chapter 兼容所有长度
    const result = await evalOnce(refText, audioBase64, 'read_chapter');
    return result;
  }

  return { evaluate, evalOnce, buildAuthUrl };
})();
