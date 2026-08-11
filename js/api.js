/**
 * API 层
 * 评测逻辑：调用讯飞语音评测(流式版) WebSocket API
 * API地址: wss://ise-api.xfyun.cn/v2/open-ise
 * 调用失败直接报错，不兜底
 */
window.MockAPI = (function () {

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 根据讯飞评测结果生成评测描述
   */
  function buildDetails(r) {
    const parts = [];
    parts.push(`总分${r.total_score}分`);
    parts.push(`流利度${r.fluency_score}分`);
    parts.push(`完整度${r.integrity_score}分`);
    parts.push(`声韵分${r.phone_score}分`);
    parts.push(`调型分${r.tone_score}分`);
    return parts.join('，');
  }

  /**
   * 根据评测结果生成改进建议
   */
  function buildSuggestion(r) {
    const tips = [];
    if (r.phone_score != null && r.phone_score < 80) {
      tips.push('发音准确度需提升，注意声母韵母的准确发音');
    }
    if (r.tone_score != null && r.tone_score < 80) {
      tips.push('声调得分偏低，注意四声的准确区分');
    }
    if (r.fluency_score != null && r.fluency_score < 80) {
      tips.push('流利度有待提高，注意减少停顿和重复');
    }
    if (r.integrity_score != null && r.integrity_score < 80) {
      tips.push('完整度不足，注意朗读不要遗漏内容');
    }
    if (tips.length === 0) {
      return '整体表现良好，建议继续保持，可在细节处进一步提升。';
    }
    return tips.join('；') + '。';
  }

  return {
    /**
     * 提交评测
     * 调用讯飞语音评测API，执行字/句/段三种评测
     * 调用失败直接报错，不兜底
     */
    async submitEvaluation(params) {
      const { questionText, recorder } = params;

      // 获取MP3 base64
      let mp3Base64;
      if (recorder) {
        mp3Base64 = await recorder.getMp3Base64();
      }

      if (!mp3Base64) {
        throw new Error('音频编码失败，无法进行评测');
      }

      // 调用讯飞评测API（仅使用read_chapter一次调用）
      const evalResult = await XfEval.evaluate(questionText, mp3Base64);

      // 把请求时发送的base64音频数据存入结果，供接口日志展示
      evalResult.requestAudioBase64 = mp3Base64;

      return {
        code: 0,
        data: {
          score: evalResult.total_score ?? 0,
          dimensions: {
            fluency: evalResult.fluency_score ?? 0,
            completeness: evalResult.integrity_score ?? 0,
            pronunciation: evalResult.phone_score ?? 0,
            intonation: evalResult.tone_score ?? 0,
          },
          xfEvaluation: evalResult,
          details: buildDetails(evalResult),
          suggestion: buildSuggestion(evalResult),
          source: '讯飞语音评测(流式版)',
        },
      };
    },

    /**
     * 获取评测记录列表
     */
    async getRecords(params) {
      await delay(300);
      let records = Store.getRecords();

      if (params.userId) {
        records = records.filter(r => r.userId === params.userId);
      }
      if (params.keyword) {
        const kw = params.keyword.toLowerCase();
        records = records.filter(r =>
          r.userName.toLowerCase().includes(kw) ||
          r.userId.toLowerCase().includes(kw) ||
          r.questionTitle.toLowerCase().includes(kw)
        );
      }
      if (params.startDate) {
        records = records.filter(r => r.createdAt >= params.startDate);
      }
      if (params.endDate) {
        records = records.filter(r => r.createdAt <= params.endDate + ' 23:59:59');
      }
      if (params.minScore !== undefined && params.minScore !== null) {
        records = records.filter(r => r.totalScore >= params.minScore);
      }
      if (params.maxScore !== undefined && params.maxScore !== null) {
        records = records.filter(r => r.totalScore <= params.maxScore);
      }
      if (params.category) {
        records = records.filter(r => {
          const q = Store.getQuestion(r.questionId);
          return q && q.category === params.category;
        });
      }

      if (params.sortBy === 'score_desc') {
        records = records.sort((a, b) => b.totalScore - a.totalScore);
      } else if (params.sortBy === 'score_asc') {
        records = records.sort((a, b) => a.totalScore - b.totalScore);
      } else if (params.sortBy === 'time_asc') {
        records = records.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      } else {
        records = records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      }

      const total = records.length;
      const page = params.page || 1;
      const size = params.size || 20;
      const start = (page - 1) * size;
      const list = records.slice(start, start + size);

      return { code: 0, data: { list, total, page, size } };
    },

    async getRecordDetail(id) {
      await delay(200);
      const record = Store.getRecord(id);
      return { code: 0, data: record };
    },

    async deleteRecord(id) {
      await delay(200);
      Store.deleteRecord(id);
      return { code: 0, data: true };
    },

    async getQuestions(params) {
      await delay(300);
      let questions = Store.getQuestions();

      if (params.keyword) {
        const kw = params.keyword.toLowerCase();
        questions = questions.filter(q =>
          q.title.toLowerCase().includes(kw) ||
          q.content.toLowerCase().includes(kw)
        );
      }
      if (params.category && params.category !== '全部') {
        questions = questions.filter(q => q.category === params.category);
      }
      if (params.difficulty) {
        questions = questions.filter(q => q.difficulty === Number(params.difficulty));
      }
      if (params.status !== undefined && params.status !== null && params.status !== '') {
        questions = questions.filter(q => q.status === Number(params.status));
      }

      questions = questions.sort((a, b) => a.sortOrder - b.sortOrder);

      const total = questions.length;
      const page = params.page || 1;
      const size = params.size || 20;
      const start = (page - 1) * size;
      const list = questions.slice(start, start + size);

      return { code: 0, data: { list, total, page, size } };
    },

    async addQuestion(data) {
      await delay(300);
      const question = Store.addQuestion(data);
      return { code: 0, data: question };
    },

    async updateQuestion(id, data) {
      await delay(300);
      const question = Store.updateQuestion(id, data);
      return { code: 0, data: question };
    },

    async deleteQuestion(id) {
      await delay(200);
      Store.deleteQuestion(id);
      return { code: 0, data: true };
    },

    async deleteQuestions(ids) {
      await delay(300);
      Store.deleteQuestions(ids);
      return { code: 0, data: true };
    },

    async importQuestions(items) {
      await delay(500);
      const count = Store.batchImportQuestions(items);
      return { code: 0, data: { imported: count } };
    },

    async updateSort(orders) {
      await delay(200);
      Store.updateSort(orders);
      return { code: 0, data: true };
    },

    getCategories() {
      const questions = Store.getQuestions();
      const categories = {};
      questions.forEach(q => {
        if (q.category) {
          categories[q.category] = (categories[q.category] || 0) + 1;
        }
      });
      return categories;
    },

    getStatistics(options = {}) {
      let records = Store.getRecords();
      if (options.userId) {
        records = records.filter(r => r.userId === options.userId);
      }
      const total = records.length;
      const avgScore = total > 0
        ? Math.round(records.reduce((sum, r) => sum + r.totalScore, 0) / total * 10) / 10
        : 0;
      const passCount = records.filter(r => r.totalScore >= 60).length;
      const passRate = total > 0 ? Math.round(passCount / total * 100) : 0;
      const excellentCount = records.filter(r => r.totalScore >= 90).length;

      const dimensions = total > 0 ? {
        pronunciation: Math.round(records.reduce((s, r) => s + r.pronunciationScore, 0) / total),
        fluency: Math.round(records.reduce((s, r) => s + r.fluencyScore, 0) / total),
        completeness: Math.round(records.reduce((s, r) => s + r.completenessScore, 0) / total),
        intonation: Math.round(records.reduce((s, r) => s + r.intonationScore, 0) / total),
      } : { pronunciation: 0, fluency: 0, completeness: 0, intonation: 0 };

      const distribution = {
        '90-100': records.filter(r => r.totalScore >= 90).length,
        '80-89': records.filter(r => r.totalScore >= 80 && r.totalScore < 90).length,
        '70-79': records.filter(r => r.totalScore >= 70 && r.totalScore < 80).length,
        '60-69': records.filter(r => r.totalScore >= 60 && r.totalScore < 70).length,
        '<60': records.filter(r => r.totalScore < 60).length,
      };

      return { total, avgScore, passRate, excellentCount, dimensions, distribution };
    },
  };
})();
