# ⚙️ 進階開發指南 - YouTube 熱門影片搜尋器

> 這份指南專為開發人員設計，提供深度技術細節、架構解析、自訂擴展和部署選項

## 🏗️ 技術架構深度解析

### 系統架構圖

```
┌─────────────────────────────────────────────────┐
│                  前端層 (Frontend)                │
├─────────────────────────────────────────────────┤
│  index.html          │ API Key 管理 & 產品介紹    │
│  youtube-search-      │ 核心搜尋分析器             │
│  frontend.html        │                          │
│  compare.html         │ 獨立競品比較工具           │
└─────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────┐
│               API 抽象層 (API Layer)              │
├─────────────────────────────────────────────────┤
│  youtube-api-utils.js │ 統一 API 調用模組         │
│  ├── Cache Manager    │ LRU 快取管理 (5分鐘)      │
│  ├── Error Handler    │ 統一錯誤處理和用戶提示     │
│  ├── Quota Manager    │ 配額追蹤和限制管理        │
│  └── Request Queue    │ API 請求隊列和重試機制     │
└─────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────┐
│            外部 API (External APIs)              │
├─────────────────────────────────────────────────┤
│  YouTube Data API v3  │ Google 官方 API          │
│  ├── search          │ 影片搜尋端點              │
│  ├── videos          │ 影片詳細資訊端點           │
│  └── channels        │ 頻道資訊端點              │
└─────────────────────────────────────────────────┘
```

### 檔案結構

*   `index.html`: 主入口頁面，用於 API Key 的輸入與管理。
*   `youtube-search-frontend.html`: 核心的影片搜尋與分析介面。
*   `compare.html`: 競品分析工具，用於比較不同關鍵字的影片表現。
*   `youtube-api-utils.js`: 核心的 API 工具庫，封裝了所有與 YouTube Data API 的互動。
*   `package.json`: 定義了專案的依賴與腳本，如測試與程式碼風格檢查。
*   `*.gs`: Google Apps Script 檔案，目前已被廢棄。

### 核心模組詳解

#### 1. API 抽象層 (`youtube-api-utils.js`)

這是整個系統的核心模組，負責所有與 YouTube API 的交互：

```javascript
// 主要功能模組
const YouTubeAPIUtils = {
    // 配置管理
    config: {
        baseURL: 'https://www.googleapis.com/youtube/v3',
        maxResults: 50,
        cacheTimeout: 5 * 60 * 1000 // 5分鐘
    },

    // 快取管理 (LRU 策略)
    cache: new Map(),

    // 配額追蹤
    quotaUsage: {
        today: 0,
        requests: []
    },

    // 核心方法
    searchVideos: async function(params) { /* 影片搜尋 */ },
    getVideoDetails: async function(videoIds) { /* 影片詳情 */ },
    handleError: function(error) { /* 錯誤處理 */ },
    getCacheKey: function(params) { /* 快取鍵生成 */ }
};
```

#### 2. 快取機制設計

採用 LRU (Least Recently Used) 策略的內存快取：

```javascript
class LRUCache {
    constructor(maxSize = 100, ttl = 5 * 60 * 1000) {
        this.cache = new Map();
        this.maxSize = maxSize;
        this.ttl = ttl;
    }

    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;

        // 檢查過期
        if (Date.now() - item.timestamp > this.ttl) {
            this.cache.delete(key);
            return null;
        }

        // LRU: 移到最後
        this.cache.delete(key);
        this.cache.set(key, item);
        return item.data;
    }

    set(key, data) {
        // 清理過期項目
        this.cleanup();

        // 容量管理
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }

        this.cache.set(key, {
            data: data,
            timestamp: Date.now()
        });
    }
}
```

#### 3. 錯誤處理系統

分層錯誤處理機制，提供用戶友善的錯誤訊息：

```javascript
const ErrorHandler = {
    // 錯誤分類
    errorTypes: {
        QUOTA_EXCEEDED: 'quotaExceeded',
        INVALID_API_KEY: 'keyInvalid',
        NETWORK_ERROR: 'networkError',
        RATE_LIMIT: 'rateLimitExceeded'
    },

    // 錯誤訊息映射
    errorMessages: {
        quotaExceeded: '今日 API 配額已用完，請明天再試或升級配額',
        keyInvalid: 'API Key 無效，請檢查設定',
        networkError: '網路連線異常，請檢查網路狀態',
        rateLimitExceeded: '請求頻率過高，請稍後再試'
    },

    handle(error) {
        const errorType = this.categorizeError(error);
        const userMessage = this.errorMessages[errorType];

        // 記錄詳細錯誤
        console.error('API Error:', {
            type: errorType,
            original: error,
            timestamp: new Date().toISOString()
        });

        return {
            type: errorType,
            message: userMessage,
            technical: error.message
        };
    }
};
```

## 🛠️ 開發環境設置

### 本地開發設置

```bash
# 1. 複製專案
git clone https://github.com/BarryTsai0315/youtube-trend-explorer.git
cd youtube-trend-explorer

# 2. 啟動本地伺服器 (選擇一種)
# 使用 Python 3
python -m http.server 8000

# 使用 Node.js
npx serve . -p 8000

# 使用 PHP
php -S localhost:8000

# 3. 開啟瀏覽器
open http://localhost:8000
```

### 開發工具建議

```json
// .vscode/settings.json
{
    "liveServer.settings.port": 8000,
    "liveServer.settings.root": "/",
    "javascript.preferences.quoteStyle": "single",
    "html.format.indentInnerHtml": true,
    "css.validate": true
}
```

### 程式碼品質工具

```json
// package.json
{
    "devDependencies": {
        "eslint": "^8.0.0",
        "prettier": "^2.0.0",
        "html-validate": "^7.0.0"
    },
    "scripts": {
        "lint": "eslint *.js",
        "format": "prettier --write *.html *.js *.css",
        "validate": "html-validate *.html"
    }
}
```

## 🔧 自訂和擴展指南

### 1. 新增搜尋參數

要新增新的搜尋篩選條件：

```javascript
// 在 youtube-api-utils.js 中擴展 buildSearchParams 函數
function buildSearchParams(filters) {
    const params = {
        part: 'snippet',
        type: 'video',
        maxResults: filters.maxResults || 50,
        order: 'viewCount',
        // 新增自訂參數
        videoDuration: filters.duration || 'any', // short, medium, long
        videoDefinition: filters.definition || 'any' // standard, high
    };

    // 其他參數處理...
    return params;
}
```

```html
<!-- 在前端新增對應的 UI 控制項 -->
<select id="videoDuration">
    <option value="any">任何長度</option>
    <option value="short">短影片 (< 4分鐘)</option>
    <option value="medium">中等長度 (4-20分鐘)</option>
    <option value="long">長影片 (> 20分鐘)</option>
</select>
```

### 2. 自訂圖表類型

新增新的 Chart.js 圖表：

```javascript
// 新增散點圖範例
function createCustomScatterChart(data) {
    const ctx = document.getElementById('customChart').getContext('2d');

    return new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: '觀看數 vs 發布天數',
                data: data.map(video => ({
                    x: getDaysFromPublish(video.publishedAt),
                    y: parseInt(video.viewCount)
                })),
                backgroundColor: 'rgba(75, 192, 192, 0.6)'
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    title: {
                        display: true,
                        text: '發布天數'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: '觀看次數'
                    }
                }
            }
        }
    });
}
```

### 3. 資料匯出格式擴展

新增 JSON 或其他格式的匯出：

```javascript
function exportToJSON(data) {
    const jsonData = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `youtube-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function exportToXML(data) {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<videos>\n';

    data.forEach(video => {
        xml += `  <video>\n`;
        xml += `    <id>${video.videoId}</id>\n`;
        xml += `    <title><![CDATA[${video.title}]]></title>\n`;
        xml += `    <viewCount>${video.viewCount}</viewCount>\n`;
        xml += `    <publishedAt>${video.publishedAt}</publishedAt>\n`;
        xml += `  </video>\n`;
    });

    xml += '</videos>';

    const blob = new Blob([xml], { type: 'application/xml' });
    // 下載邏輯同上...
}
```

### 4. 新增語言本地化

實作多語言支援：

```javascript
// i18n.js
const translations = {
    'zh-TW': {
        'search.placeholder': '輸入搜尋關鍵字...',
        'search.button': '搜尋',
        'filter.region': '地區',
        'export.csv': '匯出 CSV'
    },
    'en-US': {
        'search.placeholder': 'Enter search keywords...',
        'search.button': 'Search',
        'filter.region': 'Region',
        'export.csv': 'Export CSV'
    }
};

function t(key, lang = 'zh-TW') {
    return translations[lang][key] || key;
}

// 使用範例
document.getElementById('searchButton').textContent = t('search.button');
```

## 🚀 部署選項

### 1. GitHub Pages (推薦)

```yaml
# .github/workflows/deploy.yml
name: 部署到 GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3

    - name: 部署到 GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./
        exclude_assets: '.github,README.md,DEVELOPER_GUIDE.md'
```

### 2. Netlify 部署

```toml
# netlify.toml
[build]
  publish = "."

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200
```

### 3. Vercel 部署

```json
// vercel.json
{
  "functions": {
    "api/*.js": {
      "runtime": "nodejs18.x"
    }
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        }
      ]
    }
  ]
}
```

### 4. Docker 容器化

```dockerfile
# Dockerfile
FROM nginx:alpine

# 複製靜態檔案
COPY . /usr/share/nginx/html

# 自訂 nginx 配置
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

```nginx
# nginx.conf
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # 啟用 gzip 壓縮
    gzip on;
    gzip_types text/css application/javascript application/json;

    # 快取靜態檔案
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA 路由支援
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## ⚡ 效能優化

### 1. API 調用最佳化

```javascript
// 批次處理 API 請求
async function batchVideoDetails(videoIds) {
    const batchSize = 50; // YouTube API 限制
    const batches = [];

    for (let i = 0; i < videoIds.length; i += batchSize) {
        const batch = videoIds.slice(i, i + batchSize);
        batches.push(batch);
    }

    const results = await Promise.all(
        batches.map(batch =>
            YouTubeAPIUtils.getVideoDetails(batch.join(','))
        )
    );

    return results.flat();
}
```

### 2. 前端效能優化

```html
<!-- 資源預載入 -->
<link rel="preload" href="https://cdn.jsdelivr.net/npm/chart.js" as="script">
<link rel="preload" href="https://cdn.tailwindcss.com" as="style">

<!-- 延遲載入非關鍵資源 -->
<script defer src="youtube-api-utils.js"></script>
<script defer src="chart-configs.js"></script>
```

```javascript
// 虛擬滾動實作 (處理大量數據)
class VirtualScroll {
    constructor(container, itemHeight, renderItem) {
        this.container = container;
        this.itemHeight = itemHeight;
        this.renderItem = renderItem;
        this.scrollTop = 0;
        this.containerHeight = container.clientHeight;
        this.visibleCount = Math.ceil(this.containerHeight / itemHeight) + 2;
    }

    render(items) {
        const startIndex = Math.floor(this.scrollTop / this.itemHeight);
        const endIndex = Math.min(startIndex + this.visibleCount, items.length);

        this.container.innerHTML = '';
        this.container.style.height = `${items.length * this.itemHeight}px`;

        for (let i = startIndex; i < endIndex; i++) {
            const element = this.renderItem(items[i], i);
            element.style.position = 'absolute';
            element.style.top = `${i * this.itemHeight}px`;
            this.container.appendChild(element);
        }
    }
}
```

### 3. 記憶體管理

```javascript
// 清理未使用的 Chart.js 實例
function destroyCharts() {
    Chart.helpers.each(Chart.instances, (instance) => {
        instance.destroy();
    });
}

// 清理快取
function cleanupCache() {
    const now = Date.now();
    for (const [key, item] of YouTubeAPIUtils.cache.entries()) {
        if (now - item.timestamp > YouTubeAPIUtils.config.cacheTimeout) {
            YouTubeAPIUtils.cache.delete(key);
        }
    }
}

// 定期清理
setInterval(cleanupCache, 10 * 60 * 1000); // 每10分鐘清理一次
```

## 🔒 安全性考量

### 1. API Key 保護

```javascript
// API Key 驗證和清理
function sanitizeApiKey(apiKey) {
    // 移除空格和特殊字符
    const cleaned = apiKey.trim().replace(/[^a-zA-Z0-9_-]/g, '');

    // 驗證格式 (Google API Key 格式)
    const apiKeyPattern = /^[A-Za-z0-9_-]{39}$/;

    if (!apiKeyPattern.test(cleaned)) {
        throw new Error('Invalid API Key format');
    }

    return cleaned;
}

// 安全儲存
function secureStoreApiKey(apiKey) {
    const sanitized = sanitizeApiKey(apiKey);

    // 加密儲存 (簡單範例，實際應用建議使用更強的加密)
    const encrypted = btoa(sanitized);
    localStorage.setItem('yt_api_key', encrypted);
}
```

### 2. XSS 防護

```javascript
// 內容清理函數
function sanitizeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// 安全的 DOM 更新
function safeUpdateContent(element, content) {
    element.textContent = ''; // 清空內容
    element.appendChild(document.createTextNode(content));
}
```

### 3. CSP 配置

```html
<!-- Content Security Policy -->
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self';
               script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdn.tailwindcss.com;
               style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com;
               img-src 'self' data: https://i.ytimg.com https://yt3.ggpht.com;
               connect-src 'self' https://www.googleapis.com;">
```

## 🧪 測試策略

### 1. 單元測試

```javascript
// test/youtube-api-utils.test.js
describe('YouTube API 工具', () => {
    test('buildSearchParams 應能處理基本參數', () => {
        const filters = {
            keyword: 'test',
            region: 'TW',
            maxResults: 10
        };

        const params = YouTubeAPIUtils.buildSearchParams(filters);

        expect(params.q).toBe('test');
        expect(params.regionCode).toBe('TW');
        expect(params.maxResults).toBe(10);
    });

    test('快取應能正確儲存和讀取資料', () => {
        const testData = { test: 'data' };
        YouTubeAPIUtils.cache.set('test-key', testData);

        const retrieved = YouTubeAPIUtils.cache.get('test-key');
        expect(retrieved).toEqual(testData);
    });
});
```

### 2. 整合測試

```javascript
// test/integration.test.js
describe('整合測試', () => {
    test('搜尋流程應能端到端正常運作', async () => {
        // 模擬 API 回應
        const mockResponse = {
            items: [
                {
                    id: { videoId: 'test123' },
                    snippet: { title: 'Test Video' }
                }
            ]
        };

        // 使用測試 API Key
        process.env.TEST_API_KEY = 'test-key';

        const results = await YouTubeAPIUtils.searchVideos({
            keyword: 'test'
        });

        expect(results.length).toBeGreaterThan(0);
    });
});
```

### 3. E2E 測試

```javascript
// test/e2e.test.js (使用 Playwright)
const { test, expect } = require('@playwright/test');

test('使用者可以搜尋影片', async ({ page }) => {
    await page.goto('http://localhost:8000');

    // 設定 API Key
    await page.fill('#apiKeyInput', process.env.TEST_API_KEY);
    await page.click('#validateKey');

    // 進入搜尋頁面
    await page.click('text=開始搜尋影片');

    // 搜尋影片
    await page.fill('#searchInput', 'test keyword');
    await page.click('#searchButton');

    // 驗證結果
    await expect(page.locator('.video-card')).toHaveCount.greaterThan(0);
});
```

## 📊 監控和分析

### 1. 錯誤追蹤

```javascript
// 錯誤報告系統
class ErrorReporter {
    static report(error, context = {}) {
        const errorData = {
            message: error.message,
            stack: error.stack,
            context: context,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };

        // 發送到錯誤追蹤服務 (例如 Sentry)
        console.error('回報錯誤:', errorData);

        // 可選：發送到 Google Analytics 事件
        if (typeof gtag !== 'undefined') {
            gtag('event', 'exception', {
                description: error.message,
                fatal: false
            });
        }
    }
}

// 全域錯誤處理
window.addEventListener('error', (event) => {
    ErrorReporter.report(event.error, {
        type: 'javascript_error',
        filename: event.filename,
        lineno: event.lineno
    });
});
```

### 2. 效能監控

```javascript
// 效能指標收集
class PerformanceMonitor {
    static trackAPICall(endpoint, duration, success) {
        const metric = {
            endpoint: endpoint,
            duration: duration,
            success: success,
            timestamp: Date.now()
        };

        // 儲存到本地分析
        this.storeMetric(metric);

        // 發送到分析服務
        if (typeof gtag !== 'undefined') {
            gtag('event', 'api_call', {
                event_category: 'performance',
                event_label: endpoint,
                value: duration
            });
        }
    }

    static storeMetric(metric) {
        const metrics = JSON.parse(localStorage.getItem('performance_metrics') || '[]');
        metrics.push(metric);

        // 只保留最近 100 筆記錄
        if (metrics.length > 100) {
            metrics.splice(0, metrics.length - 100);
        }

        localStorage.setItem('performance_metrics', JSON.stringify(metrics));
    }
}
```

## 🔄 持續整合/部署

### GitHub Actions 工作流程

```yaml
# .github/workflows/ci.yml
name: CI/CD 工作流程

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3

    - name: 設定 Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'

    - name: 安裝依賴
      run: npm ci

    - name: 執行程式碼檢查
      run: npm run lint

    - name: 執行測試
      run: npm test

    - name: HTML 驗證
      run: npm run validate

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
    - uses: actions/checkout@v3

    - name: 部署到 GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./
```

## 📚 相關資源

### 官方文檔
- [YouTube Data API v3](https://developers.google.com/youtube/v3/docs)
- [Chart.js 文檔](https://www.chartjs.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)

### 社群資源
- [YouTube API Explorer](https://developers.google.com/youtube/v3/docs/search/list)
- [Stack Overflow - YouTube API](https://stackoverflow.com/questions/tagged/youtube-api)

### 開發工具
- [Postman Collection](https://www.postman.com/youtube-api)
- [API 測試工具](https://developers.google.com/youtube/v3/docs/search/list#try-it)

---

**最後更新**: 2025-09-20
**維護者**: Barry Tsai
**版本**: 2.0.0