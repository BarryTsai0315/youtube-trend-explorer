/**
 * 測試環境配置
 *
 * 為 YouTube 熱門影片搜尋器的測試提供統一配置
 */

// 測試用的 Google Apps Script URL (需要替換為實際部署的 URL)
const TEST_SCRIPT_URL = process.env.TEST_SCRIPT_URL || 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec';

// API 測試配置
const API_CONFIG = {
  baseUrl: TEST_SCRIPT_URL,
  timeout: 10000, // 10秒超時
  retries: 3,     // 重試次數
  headers: {
    'Content-Type': 'application/json'
  }
};

// 測試資料配置
const TEST_DATA = {
  // 測試用的搜尋關鍵字
  keywords: {
    valid: ['music', 'AI', '教學'],
    invalid: ['', null, undefined]
  },

  // 測試用的地區代碼
  regions: {
    valid: ['TW', 'US', 'IN', 'BR', 'ID', 'MX'],
    invalid: ['XX', 'ZZ', '']
  },

  // 測試用的影片類型
  types: {
    valid: ['videos', 'shorts'],
    invalid: ['invalid', '', null]
  },

  // 測試用的日期範圍
  dateRanges: {
    valid: {
      from: '2025-09-01',
      to: '2025-09-19'
    },
    invalid: {
      from: 'invalid-date',
      to: '2025-13-40'
    }
  },

  // 測試用的觀看數範圍
  viewRanges: {
    valid: {
      min: 1000,
      max: 100000
    },
    invalid: {
      min: -1,
      max: 'invalid'
    }
  },

  // 測試用的分頁參數
  pagination: {
    valid: {
      page: 1,
      size: 20
    },
    invalid: {
      page: 0,
      size: 999
    }
  }
};

// 預期的 API 回應結構
const EXPECTED_SCHEMAS = {
  searchResponse: {
    required: ['query', 'count', 'items'],
    optional: ['keywords', 'publishedAfter', 'publishedBefore']
  },

  filterResponse: {
    required: ['total', 'page', 'size', 'totalPages', 'items', 'filters'],
    optional: []
  },

  suggestionsResponse: {
    required: ['suggestions'],
    optional: []
  },

  errorResponse: {
    required: ['error'],
    optional: ['code', 'timestamp', 'details']
  },

  videoObject: {
    required: ['videoId', 'title', 'channelTitle', 'viewCount', 'url'],
    optional: ['publishedAt', 'likeCount', 'commentCount', 'durationSeconds', 'region', 'type', 'hashtags', 'thumbnails']
  }
};

// 測試工具函數
const TEST_UTILS = {
  // 生成隨機測試數據
  generateRandomString: (length = 10) => {
    return Math.random().toString(36).substring(2, length + 2);
  },

  // 生成隨機日期
  generateRandomDate: (daysBack = 30) => {
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * daysBack));
    return date.toISOString().split('T')[0];
  },

  // 驗證回應結構
  validateSchema: (data, schema) => {
    const errors = [];

    // 檢查必要欄位
    schema.required.forEach(field => {
      if (!(field in data)) {
        errors.push(`Missing required field: ${field}`);
      }
    });

    return errors;
  },

  // 等待指定時間
  sleep: (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};

module.exports = {
  API_CONFIG,
  TEST_DATA,
  EXPECTED_SCHEMAS,
  TEST_UTILS
};