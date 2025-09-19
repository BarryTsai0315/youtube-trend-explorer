/**
 * API 合約測試
 *
 * 這些測試驗證 API 端點是否符合 OpenAPI 規格定義。
 * 測試應該在實作前執行（TDD），預期會失敗直到實作完成。
 */

const BASE_URL = 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec';

/**
 * 測試工具函數
 */
class APITester {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  async get(params = {}) {
    const url = new URL(this.baseUrl);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    const response = await fetch(url.toString());
    const data = await response.json();

    return {
      status: response.status,
      headers: response.headers,
      data
    };
  }

  // 驗證回應結構
  validateResponse(response, expectedSchema) {
    const errors = [];

    if (!response.data) {
      errors.push('Response data is missing');
    }

    // 驗證必要欄位
    expectedSchema.required?.forEach(field => {
      if (!(field in response.data)) {
        errors.push(`Required field '${field}' is missing`);
      }
    });

    return errors;
  }
}

const api = new APITester(BASE_URL);

/**
 * 搜尋 API 測試 (action=search 或預設)
 */
describe('Search API Contract Tests', () => {

  test('基本搜尋 - 無參數', async () => {
    const response = await api.get();

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('count');
    expect(response.data).toHaveProperty('items');
    expect(Array.isArray(response.data.items)).toBe(true);
  });

  test('關鍵字搜尋', async () => {
    const response = await api.get({ q: 'music' });

    expect(response.status).toBe(200);
    expect(response.data.query).toBe('music');
    expect(response.data.count).toBeGreaterThanOrEqual(0);

    // 驗證影片結構
    if (response.data.items.length > 0) {
      const video = response.data.items[0];
      expect(video).toHaveProperty('videoId');
      expect(video).toHaveProperty('title');
      expect(video).toHaveProperty('channelTitle');
      expect(video).toHaveProperty('viewCount');
      expect(video).toHaveProperty('url');
    }
  });

  test('地區篩選', async () => {
    const response = await api.get({ regionCode: 'TW' });

    expect(response.status).toBe(200);
    expect(response.data.items.every(video =>
      !video.region || video.region === 'TW'
    )).toBe(true);
  });

  test('Shorts 篩選', async () => {
    const response = await api.get({ shorts: 'true' });

    expect(response.status).toBe(200);
    // 驗證返回的影片都是短影片（如果有 durationSeconds 欄位）
    response.data.items.forEach(video => {
      if (video.durationSeconds) {
        expect(video.durationSeconds).toBeLessThanOrEqual(60);
      }
    });
  });

  test('參數驗證 - 無效的 max 值', async () => {
    const response = await api.get({ max: 999 });

    // 應該自動限制在最大值或返回錯誤
    expect(response.status).toBeOneOf([200, 400]);
    if (response.status === 200) {
      expect(response.data.items.length).toBeLessThanOrEqual(50);
    }
  });
});

/**
 * 篩選 API 測試 (action=filter)
 */
describe('Filter API Contract Tests', () => {

  test('基本篩選功能', async () => {
    const response = await api.get({ action: 'filter' });

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('total');
    expect(response.data).toHaveProperty('page');
    expect(response.data).toHaveProperty('size');
    expect(response.data).toHaveProperty('totalPages');
    expect(response.data).toHaveProperty('items');
    expect(response.data).toHaveProperty('filters');

    expect(Array.isArray(response.data.items)).toBe(true);
    expect(typeof response.data.total).toBe('number');
    expect(typeof response.data.page).toBe('number');
    expect(typeof response.data.size).toBe('number');
  });

  test('日期範圍篩選', async () => {
    const dateFrom = '2025-09-01';
    const dateTo = '2025-09-19';

    const response = await api.get({
      action: 'filter',
      dateFrom,
      dateTo
    });

    expect(response.status).toBe(200);
    expect(response.data.filters.dateFrom).toBe(dateFrom);
    expect(response.data.filters.dateTo).toBe(dateTo);

    // 驗證返回的影片都在日期範圍內
    response.data.items.forEach(video => {
      if (video.recordDate) {
        expect(video.recordDate >= dateFrom).toBe(true);
        expect(video.recordDate <= dateTo).toBe(true);
      }
    });
  });

  test('觀看數範圍篩選', async () => {
    const viewMin = 1000;
    const viewMax = 100000;

    const response = await api.get({
      action: 'filter',
      viewMin,
      viewMax
    });

    expect(response.status).toBe(200);
    expect(response.data.filters.viewMin).toBe(viewMin);
    expect(response.data.filters.viewMax).toBe(viewMax);

    // 驗證返回的影片觀看數都在範圍內
    response.data.items.forEach(video => {
      expect(video.viewCount).toBeGreaterThanOrEqual(viewMin);
      expect(video.viewCount).toBeLessThanOrEqual(viewMax);
    });
  });

  test('分頁功能', async () => {
    const page = 2;
    const size = 10;

    const response = await api.get({
      action: 'filter',
      page,
      size
    });

    expect(response.status).toBe(200);
    expect(response.data.page).toBe(page);
    expect(response.data.size).toBe(size);
    expect(response.data.items.length).toBeLessThanOrEqual(size);

    // 計算分頁資訊
    const expectedTotalPages = Math.ceil(response.data.total / size);
    expect(response.data.totalPages).toBe(expectedTotalPages);
  });

  test('組合篩選條件', async () => {
    const filters = {
      action: 'filter',
      region: 'TW',
      type: 'videos',
      viewMin: 1000,
      page: 1,
      size: 5
    };

    const response = await api.get(filters);

    expect(response.status).toBe(200);
    expect(response.data.filters.region).toBe('TW');
    expect(response.data.filters.type).toBe('videos');

    // 驗證返回的影片符合所有條件
    response.data.items.forEach(video => {
      expect(video.region).toBe('TW');
      expect(video.type).toBe('videos');
      expect(video.viewCount).toBeGreaterThanOrEqual(1000);
    });
  });
});

/**
 * 建議 API 測試 (action=suggestions)
 */
describe('Suggestions API Contract Tests', () => {

  test('基本建議功能', async () => {
    const response = await api.get({ action: 'suggestions' });

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('suggestions');
    expect(Array.isArray(response.data.suggestions)).toBe(true);

    // 驗證建議項目結構
    response.data.suggestions.forEach(suggestion => {
      expect(suggestion).toHaveProperty('text');
      expect(suggestion).toHaveProperty('type');
      expect(['keyword', 'channel', 'hashtag']).toContain(suggestion.type);

      if (suggestion.count !== undefined) {
        expect(typeof suggestion.count).toBe('number');
      }
    });
  });

  test('關鍵字建議', async () => {
    const response = await api.get({
      action: 'suggestions',
      type: 'keyword'
    });

    expect(response.status).toBe(200);
    const keywordSuggestions = response.data.suggestions.filter(
      s => s.type === 'keyword'
    );
    expect(keywordSuggestions.length).toBeGreaterThan(0);
  });
});

/**
 * 錯誤處理測試
 */
describe('Error Handling Contract Tests', () => {

  test('無效的日期格式', async () => {
    const response = await api.get({
      action: 'filter',
      dateFrom: 'invalid-date'
    });

    expect(response.status).toBeOneOf([400, 500]);
    expect(response.data).toHaveProperty('error');
    expect(typeof response.data.error).toBe('string');
  });

  test('無效的頁碼', async () => {
    const response = await api.get({
      action: 'filter',
      page: 0
    });

    expect(response.status).toBeOneOf([200, 400]);
    if (response.status === 400) {
      expect(response.data).toHaveProperty('error');
    }
  });

  test('超出範圍的 size 參數', async () => {
    const response = await api.get({
      action: 'filter',
      size: 999
    });

    expect(response.status).toBe(200);
    // size 應該被自動限制在最大值
    expect(response.data.size).toBeLessThanOrEqual(100);
  });

  test('觀看數範圍邏輯錯誤', async () => {
    const response = await api.get({
      action: 'filter',
      viewMin: 100000,
      viewMax: 1000
    });

    // 應該返回錯誤或自動修正
    expect(response.status).toBeOneOf([200, 400]);
    if (response.status === 400) {
      expect(response.data).toHaveProperty('error');
    }
  });
});

/**
 * 效能測試
 */
describe('Performance Contract Tests', () => {

  test('回應時間應在合理範圍內', async () => {
    const startTime = Date.now();

    const response = await api.get({ action: 'filter', size: 10 });

    const responseTime = Date.now() - startTime;
    expect(response.status).toBe(200);
    expect(responseTime).toBeLessThan(5000); // 5秒內
  });

  test('大量資料分頁效能', async () => {
    const startTime = Date.now();

    const response = await api.get({
      action: 'filter',
      page: 10,
      size: 50
    });

    const responseTime = Date.now() - startTime;
    expect(response.status).toBe(200);
    expect(responseTime).toBeLessThan(3000); // 3秒內
  });
});

/**
 * 自訂匹配器
 */
expect.extend({
  toBeOneOf(received, array) {
    const pass = array.includes(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be one of ${array.join(', ')}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be one of ${array.join(', ')}`,
        pass: false,
      };
    }
  },
});

/**
 * 測試配置
 */
beforeAll(() => {
  // 檢查 BASE_URL 是否正確設定
  if (BASE_URL.includes('YOUR_SCRIPT_ID')) {
    console.warn('請更新 BASE_URL 中的 YOUR_SCRIPT_ID');
  }
});

// 設定測試超時時間
jest.setTimeout(10000);

module.exports = {
  APITester,
  BASE_URL
};