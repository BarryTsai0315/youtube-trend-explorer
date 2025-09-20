/**
 * 測試環境設置
 *
 * 為所有測試提供統一的設置和清理功能
 */

const { API_CONFIG, TEST_UTILS } = require('./config');

/**
 * API 測試工具類
 */
class APITestClient {
  constructor(baseUrl = API_CONFIG.baseUrl) {
    this.baseUrl = baseUrl;
    this.timeout = API_CONFIG.timeout;
    this.retries = API_CONFIG.retries;
  }

  /**
   * 發送 GET 請求
   */
  async get(params = {}, options = {}) {
    const url = new URL(this.baseUrl);

    // 添加查詢參數
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        url.searchParams.append(key, value.toString());
      }
    });

    const requestOptions = {
      method: 'GET',
      headers: API_CONFIG.headers,
      ...options
    };

    let lastError;

    // 重試機制
    for (let attempt = 1; attempt <= this.retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(url.toString(), {
          ...requestOptions,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        // 解析回應
        const data = await response.json();

        return {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          data
        };

      } catch (error) {
        lastError = error;

        if (attempt < this.retries) {
          // 指數退避策略
          const delay = Math.pow(2, attempt) * 1000;
          await TEST_UTILS.sleep(delay);
          continue;
        }
      }
    }

    throw lastError;
  }

  /**
   * 驗證回應狀態碼
   */
  expectStatus(response, expectedStatus) {
    if (response.status !== expectedStatus) {
      throw new Error(`Expected status ${expectedStatus}, got ${response.status}: ${response.statusText}`);
    }
    return response;
  }

  /**
   * 驗證回應包含指定欄位
   */
  expectFields(data, fields) {
    const missing = fields.filter(field => !(field in data));
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }
    return data;
  }

  /**
   * 驗證陣列回應
   */
  expectArray(data, field) {
    if (!Array.isArray(data[field])) {
      throw new Error(`Expected ${field} to be an array, got ${typeof data[field]}`);
    }
    return data[field];
  }

  /**
   * 驗證數字範圍
   */
  expectNumberInRange(value, min, max, fieldName = 'value') {
    if (typeof value !== 'number' || value < min || value > max) {
      throw new Error(`Expected ${fieldName} to be a number between ${min} and ${max}, got ${value}`);
    }
    return value;
  }
}

/**
 * 測試數據生成器
 */
class TestDataGenerator {
  /**
   * 生成有效的搜尋參數
   */
  static generateValidSearchParams() {
    return {
      q: 'test music video',
      regionCode: 'TW',
      days: 3,
      max: 10,
      shorts: 'false'
    };
  }

  /**
   * 生成有效的篩選參數
   */
  static generateValidFilterParams() {
    return {
      action: 'filter',
      dateFrom: '2025-09-01',
      dateTo: '2025-09-19',
      viewMin: 1000,
      viewMax: 100000,
      region: 'TW',
      type: 'videos',
      page: 1,
      size: 20
    };
  }

  /**
   * 生成無效的參數組合
   */
  static generateInvalidParams() {
    return [
      { page: 0 },                    // 無效的頁碼
      { size: 999 },                  // 無效的頁面大小
      { viewMin: -1 },                // 負數觀看數
      { dateFrom: 'invalid-date' },   // 無效的日期格式
      { regionCode: 'INVALID' },      // 無效的地區代碼
      { type: 'invalid-type' }        // 無效的影片類型
    ];
  }

  /**
   * 生成測試用的影片資料
   */
  static generateMockVideo() {
    return {
      videoId: TEST_UTILS.generateRandomString(11),
      title: `Test Video ${TEST_UTILS.generateRandomString(8)}`,
      channelTitle: `Test Channel ${TEST_UTILS.generateRandomString(6)}`,
      publishedAt: new Date().toISOString(),
      viewCount: Math.floor(Math.random() * 1000000),
      likeCount: Math.floor(Math.random() * 10000),
      commentCount: Math.floor(Math.random() * 1000),
      durationSeconds: Math.floor(Math.random() * 600) + 30,
      region: 'TW',
      type: 'videos',
      hashtags: ['#test', '#mock'],
      url: `https://www.youtube.com/watch?v=${TEST_UTILS.generateRandomString(11)}`
    };
  }
}

/**
 * 測試斷言工具
 */
class TestAssertions {
  /**
   * 斷言回應為成功狀態
   */
  static assertSuccessResponse(response) {
    if (response.status < 200 || response.status >= 300) {
      throw new Error(`Expected success status, got ${response.status}: ${JSON.stringify(response.data)}`);
    }
  }

  /**
   * 斷言回應為錯誤狀態
   */
  static assertErrorResponse(response) {
    if (response.status < 400) {
      throw new Error(`Expected error status, got ${response.status}`);
    }

    if (!response.data.error) {
      throw new Error('Error response should contain error field');
    }
  }

  /**
   * 斷言影片資料結構正確
   */
  static assertValidVideoData(video) {
    const requiredFields = ['videoId', 'title', 'channelTitle', 'viewCount', 'url'];

    requiredFields.forEach(field => {
      if (!(field in video)) {
        throw new Error(`Video missing required field: ${field}`);
      }
    });

    // 驗證數據類型
    if (typeof video.viewCount !== 'number' || video.viewCount < 0) {
      throw new Error(`Invalid viewCount: ${video.viewCount}`);
    }

    if (typeof video.videoId !== 'string' || video.videoId.length !== 11) {
      throw new Error(`Invalid videoId format: ${video.videoId}`);
    }
  }

  /**
   * 斷言分頁資料正確
   */
  static assertValidPaginationData(data) {
    const requiredFields = ['total', 'page', 'size', 'totalPages'];

    requiredFields.forEach(field => {
      if (!(field in data)) {
        throw new Error(`Pagination missing required field: ${field}`);
      }

      if (typeof data[field] !== 'number' || data[field] < 0) {
        throw new Error(`Invalid ${field}: ${data[field]}`);
      }
    });

    // 驗證分頁邏輯
    const expectedTotalPages = Math.ceil(data.total / data.size);
    if (data.totalPages !== expectedTotalPages) {
      throw new Error(`Invalid totalPages calculation: expected ${expectedTotalPages}, got ${data.totalPages}`);
    }
  }
}

// 全域測試設置
beforeAll(async () => {
  // 設置測試環境
  console.log('🚀 Setting up test environment...');

  // 檢查環境變數
  if (!process.env.TEST_SCRIPT_URL) {
    console.warn('⚠️  TEST_SCRIPT_URL environment variable not set, using default');
  }
});

afterAll(async () => {
  // 清理測試環境
  console.log('🧹 Cleaning up test environment...');
});

// 每個測試前的設置
beforeEach(() => {
  // 重置任何需要的狀態
});

// 每個測試後的清理
afterEach(() => {
  // 清理測試數據
});

module.exports = {
  APITestClient,
  TestDataGenerator,
  TestAssertions
};