/**
 * 拼音标注工具
 * 将中文文本转换为带 ruby 注音的 HTML
 */
window.PinyinUtil = {
  /**
   * 为文本生成带拼音注音的 HTML
   * @param {string} text - 中文文本
   * @param {boolean} showPinyin - 是否显示拼音
   * @returns {string} HTML 字符串
   */
  annotate(text, showPinyin) {
    if (!showPinyin) {
      // 转义 HTML
      return this.escapeHtml(text).replace(/\n/g, '<br>');
    }
    let result = '';
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '\n') {
        result += '<br>';
        continue;
      }
      const pinyin = window.PINYIN_DATA[char];
      if (pinyin) {
        result += `<ruby>${char}<rt>${pinyin}</rt></ruby>`;
      } else {
        result += this.escapeHtml(char);
      }
    }
    return result;
  },

  /**
   * HTML 转义
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  /**
   * 获取单个字的拼音
   */
  getPinyin(char) {
    return window.PINYIN_DATA[char] || '';
  }
};
