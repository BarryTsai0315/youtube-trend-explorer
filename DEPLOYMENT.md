# YouTube 熱門影片搜尋器 - 部署指南

## 概述

本文件提供 YouTube 熱門影片搜尋器的完整部署指南。系統基於 Google Apps Script 和 HTML，提供強大的影片搜尋和篩選功能。

## 系統架構

```
YouTube 搜尋器架構
├── Google Apps Script (後端)
│   ├── youtube-search-app.gs     # 主要 API 邏輯
│   └── YouTube Data API v3       # Google 服務
├── HTML 前端
│   └── youtube-search-frontend.html  # 使用者介面
└── 測試環境
    ├── tests/                    # 測試框架
    └── package.json             # Node.js 配置
```

## 前置需求

### 1. Google 帳戶權限
- Google 帳戶 (gmail.com)
- Google Apps Script 存取權限
- Google Cloud Console 存取權限

### 2. API 金鑰
- YouTube Data API v3 金鑰
- 每日配額：10,000 units (免費)

### 3. 開發工具 (選用)
- 現代網頁瀏覽器
- 文字編輯器 (VS Code 推薦)
- Node.js 16+ (用於測試)

## 部署步驟

### 第一步：設置 YouTube Data API

1. **前往 Google Cloud Console**
   - 訪問 https://console.cloud.google.com/
   - 登入您的 Google 帳戶

2. **建立或選擇專案**
   ```bash
   專案名稱：YouTube Trend Tracker
   專案 ID：youtube-trend-tracker-[隨機數字]
   ```

3. **啟用 YouTube Data API v3**
   - 前往「API 和服務」>「程式庫」
   - 搜尋「YouTube Data API v3」
   - 點擊「啟用」

4. **建立 API 金鑰**
   - 前往「API 和服務」>「憑證」
   - 點擊「建立憑證」>「API 金鑰」
   - 複製生成的 API 金鑰
   - **重要**：限制 API 金鑰僅用於 YouTube Data API

### 第二步：部署 Google Apps Script

1. **建立 Apps Script 專案**
   - 前往 https://script.google.com/
   - 點擊「新專案」
   - 將專案重新命名為「YouTube 熱門影片搜尋器」

2. **複製程式碼**
   - 刪除 `Code.gs` 中的預設程式碼
   - 複製 `youtube-search-app.gs` 的完整內容
   - 貼上到 Apps Script 編輯器

3. **啟用 YouTube Data API 服務**
   - 在 Apps Script 編輯器中，點擊左側「服務」
   - 點擊「新增服務」
   - 選擇「YouTube Data API v3」
   - 點擊「新增」

4. **設定 API 金鑰 (如需要)**
   ```javascript
   // 如果需要，在程式碼頂部加入：
   const API_KEY = 'your-youtube-api-key-here';
   ```

5. **測試 Apps Script**
   ```javascript
   // 在 Apps Script 編輯器中執行測試函數
   function testDeployment() {
     const result = testSearch();
     console.log('Test result:', result);
   }
   ```

6. **部署為網頁應用程式**
   - 點擊「部署」>「新增部署」
   - 類型：選擇「網頁應用程式」
   - 說明：「YouTube 搜尋器 API v1.0」
   - 執行身分：「我」
   - 存取權限：「任何人」
   - 點擊「部署」
   - **複製網頁應用程式 URL** (重要！)

### 第三步：設置前端介面

1. **修改 HTML 檔案**
   - 開啟 `youtube-search-frontend.html`
   - 找到第 197 行：
   ```javascript
   const API_CONFIG = {
       baseUrl: 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec',
       timeout: 15000
   };
   ```

2. **更新 API URL**
   - 將 `YOUR_SCRIPT_ID` 替換為步驟二第6點複製的網頁應用程式 URL
   ```javascript
   const API_CONFIG = {
       baseUrl: 'https://script.google.com/macros/s/AKfycbxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx/exec',
       timeout: 15000
   };
   ```

3. **測試前端介面**
   - 在瀏覽器中開啟 `youtube-search-frontend.html`
   - 檢查是否顯示「準備就緒」狀態
   - 嘗試執行簡單搜尋

### 第四步：驗證部署

1. **API 端點測試**
   ```bash
   # 基本搜尋測試
   curl "YOUR_APPS_SCRIPT_URL?q=music&regionCode=TW"

   # 進階篩選測試
   curl "YOUR_APPS_SCRIPT_URL?action=filter&region=TW&type=videos&page=1&size=10"

   # 建議功能測試
   curl "YOUR_APPS_SCRIPT_URL?action=suggestions&type=keyword"
   ```

2. **前端功能測試**
   - ✅ 關鍵字搜尋
   - ✅ 地區篩選
   - ✅ 影片類型篩選
   - ✅ 日期範圍篩選
   - ✅ 觀看數範圍篩選
   - ✅ 分頁功能
   - ✅ 搜尋建議

3. **效能驗證**
   - API 回應時間 < 3 秒
   - 前端載入時間 < 2 秒
   - 影片卡片動畫流暢

## 環境配置

### 開發環境
```javascript
// 在 youtube-search-frontend.html 中
const API_CONFIG = {
    baseUrl: 'https://script.google.com/macros/s/YOUR_DEV_SCRIPT_ID/exec',
    timeout: 15000
};
```

### 生產環境
```javascript
// 生產環境配置
const API_CONFIG = {
    baseUrl: 'https://script.google.com/macros/s/YOUR_PROD_SCRIPT_ID/exec',
    timeout: 10000
};
```

## 安全性設置

### 1. API 金鑰保護
- 在 Google Cloud Console 中限制 API 金鑰
- 設定 HTTP 參照網址限制
- 定期輪換 API 金鑰

### 2. Apps Script 權限
- 使用最小權限原則
- 定期審查執行權限
- 監控 API 使用量

### 3. CORS 設定
```javascript
// 已在 Apps Script 中設定
function createJsonResponse(data, status) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  // CORS 自動處理
  return output;
}
```

## 監控和維護

### 1. 使用量監控
- **YouTube API 配額**：每日 10,000 units
- **Apps Script 執行時間**：每次最多 6 分鐘
- **快取效率**：5 分鐘快取週期

### 2. 日誌監控
```javascript
// 在 Apps Script 中查看日誌
function checkLogs() {
  console.log('檢查執行日誌');
  // 前往 Apps Script > 執行作業 查看詳細日誌
}
```

### 3. 錯誤處理
- API 配額耗盡 → 等待重置或申請提高限制
- 執行時間超限 → 最佳化查詢或減少結果數量
- 網路錯誤 → 實作重試機制

## 擴展配置

### 1. 增加支援地區
```javascript
// 在 youtube-search-app.gs 中修改
const REGIONS = {
  'TW': { name: '台灣', query: '台灣 OR 繁體 OR 中文', lang: 'zh-Hant' },
  'JP': { name: '日本', query: '日本 OR 日語', lang: 'ja' },
  'KR': { name: '韓國', query: '韓國 OR 한국', lang: 'ko' },
  // 新增其他地區...
};
```

### 2. 調整快取策略
```javascript
// 修改快取時間
const API_LIMITS = {
  MAX_RESULTS: 50,
  MAX_PAGE_SIZE: 100,
  DEFAULT_PAGE_SIZE: 20,
  CACHE_DURATION: 600 // 改為 10 分鐘
};
```

### 3. 效能最佳化
```javascript
// 增加並行請求處理
function performParallelSearch(configs) {
  const promises = configs.map(config => performYouTubeSearch(config));
  return Promise.all(promises);
}
```

## 故障排除

### 常見問題

1. **「準備就緒」狀態顯示為錯誤**
   ```
   原因：API URL 未正確設定
   解決：檢查 youtube-search-frontend.html 中的 API_CONFIG.baseUrl
   ```

2. **搜尋無結果或載入失敗**
   ```
   原因：YouTube API 配額耗盡或金鑰無效
   解決：檢查 Google Cloud Console 中的 API 配額和金鑰狀態
   ```

3. **Apps Script 執行超時**
   ```
   原因：查詢過於複雜或結果數量過多
   解決：減少 maxResults 參數或優化搜尋條件
   ```

4. **CORS 錯誤**
   ```
   原因：跨域請求被封鎖
   解決：確保使用 HTTPS 並檢查 Apps Script 部署權限
   ```

### 偵錯工具

1. **瀏覽器開發者工具**
   ```javascript
   // 在瀏覽器控制台執行
   console.log('API Config:', API_CONFIG);
   ```

2. **Apps Script 日誌**
   ```javascript
   // 在 Apps Script 編輯器中查看執行記錄
   console.log('Debug info:', params);
   ```

3. **網路請求檢查**
   - 開啟瀏覽器網路標籤
   - 檢查 API 請求和回應
   - 驗證請求參數和回應格式

## 備份和復原

### 1. 程式碼備份
```bash
# 定期備份 Apps Script 程式碼
# 使用 Git 版本控制管理前端程式碼
git add youtube-search-app.gs youtube-search-frontend.html
git commit -m "Backup: YouTube 搜尋器 v1.0"
```

### 2. 設定備份
- Apps Script 專案設定
- Google Cloud Console API 設定
- 部署 URL 和版本記錄

### 3. 災難復原
1. 重新建立 Apps Script 專案
2. 還原程式碼和設定
3. 重新部署並更新前端 URL
4. 驗證所有功能正常運作

---

## 🎉 部署完成

完成上述步驟後，您的 YouTube 熱門影片搜尋器就已經成功部署！

### 功能特色
- ⚡ 即時搜尋和篩選
- 🌍 支援 6 個地區
- 📱 響應式設計
- 🔍 進階篩選選項
- 📄 分頁顯示
- 💨 智慧快取
- 🎯 搜尋建議

### 後續步驟
1. 測試所有功能
2. 根據需求調整參數
3. 監控使用量和效能
4. 定期更新和維護

如有任何問題，請參考故障排除章節或聯繫技術支援團隊。