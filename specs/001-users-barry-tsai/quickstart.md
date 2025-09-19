# 快速開始指南：YouTube 熱門影片搜尋器

**專案**: YouTube 熱門影片搜尋器
**分支**: `001-users-barry-tsai`
**日期**: 2025-09-19

## 概述

本指南將帶您快速設置和使用 YouTube 熱門影片搜尋器。這個應用程式基於 Google Apps Script 和現代網頁技術，提供強大的影片搜尋和篩選功能。

## 系統需求

### 開發環境
- 現代網頁瀏覽器 (Chrome 90+, Firefox 88+, Safari 14+)
- Google 帳戶 (用於 Google Apps Script 和 Google Sheets)
- 文字編輯器 (推薦 VS Code)

### API 需求
- YouTube Data API v3 金鑰
- Google Apps Script 執行權限
- Google Sheets 讀寫權限

## 安裝步驟

### 1. 設置 Google Apps Script

1. **建立新專案**:
   - 前往 [Google Apps Script](https://script.google.com)
   - 點擊「新專案」
   - 將專案命名為「YouTube 熱門影片搜尋器」

2. **複製現有程式碼**:
   ```bash
   # 複製 ai_youtube_webapp.gs 的內容到 Apps Script 編輯器
   ```

3. **啟用 YouTube Data API**:
   - 在 Apps Script 編輯器中，點擊「服務」
   - 選擇「YouTube Data API v3」
   - 點擊「新增」

4. **部署為網頁應用程式**:
   - 點擊「部署」→「新增部署」
   - 類型選擇「網頁應用程式」
   - 執行身分：選擇您的帳戶
   - 存取權限：「任何人」
   - 點擊「部署」並複製網址

### 2. 設置前端介面

1. **複製 HTML 檔案**:
   ```bash
   # 使用 video-search.html 作為基礎範本
   cp video-search.html youtube-search.html
   ```

2. **更新 API 端點**:
   ```javascript
   // 在 HTML 檔案中更新 APPS_SCRIPT_URL
   const APPS_SCRIPT_URL = 'YOUR_DEPLOYED_SCRIPT_URL';
   ```

3. **本地開發伺服器** (可選):
   ```bash
   # 使用 Python 簡單伺服器
   python -m http.server 8000

   # 或使用 Node.js
   npx serve .
   ```

### 3. 資料存儲設置

1. **建立 Google Sheet**:
   - 建立新的 Google Sheets 檔案
   - 將 Sheet ID 更新到 Apps Script 中的 `WEBSITE_DATA_SHEET_ID`

2. **設置權限**:
   - 確保 Apps Script 有權限存取 Google Sheets
   - 設置適當的共享權限

## 驗證安裝

### 1. 後端 API 測試

使用瀏覽器或 curl 測試 API 端點：

```bash
# 基本健康檢查
curl "YOUR_SCRIPT_URL"

# 測試搜尋功能
curl "YOUR_SCRIPT_URL?q=music&regionCode=TW"

# 測試篩選功能
curl "YOUR_SCRIPT_URL?action=filter&region=TW&type=videos"
```

**預期結果**:
```json
{
  "total": 150,
  "page": 1,
  "size": 20,
  "items": [
    {
      "videoId": "abc123",
      "title": "範例影片",
      "viewCount": 12345,
      "region": "TW"
    }
  ]
}
```

### 2. 前端功能測試

1. **開啟網頁**: 在瀏覽器中開啟 `youtube-search.html`

2. **測試搜尋**:
   - 輸入關鍵字「音樂」
   - 選擇地區「台灣」
   - 點擊搜尋按鈕

3. **測試篩選**:
   - 設定日期範圍
   - 調整觀看數範圍
   - 驗證結果篩選

4. **測試分頁**:
   - 瀏覽多個頁面
   - 驗證頁碼導航

## 基本使用方法

### 搜尋影片

1. **關鍵字搜尋**:
   ```javascript
   // API 呼叫範例
   fetch('YOUR_SCRIPT_URL?q=AI教學&regionCode=TW')
     .then(response => response.json())
     .then(data => console.log(data));
   ```

2. **地區篩選**:
   - 台灣 (TW)
   - 美國 (US)
   - 印度 (IN)
   - 巴西 (BR)
   - 印尼 (ID)
   - 墨西哥 (MX)

3. **影片類型篩選**:
   - 一般影片 (`videos`)
   - Shorts 短影片 (`shorts`)

### 進階篩選

1. **日期範圍**:
   ```javascript
   const params = {
     action: 'filter',
     dateFrom: '2025-09-01',
     dateTo: '2025-09-19'
   };
   ```

2. **觀看數範圍**:
   ```javascript
   const params = {
     action: 'filter',
     viewMin: 1000,
     viewMax: 100000
   };
   ```

3. **分頁控制**:
   ```javascript
   const params = {
     action: 'filter',
     page: 2,
     size: 50
   };
   ```

### 回應資料結構

```javascript
{
  // 分頁資訊
  "total": 150,           // 總筆數
  "page": 1,              // 當前頁碼
  "size": 20,             // 每頁筆數
  "totalPages": 8,        // 總頁數

  // 影片資料
  "items": [
    {
      "videoId": "abc123",
      "title": "影片標題",
      "channelTitle": "頻道名稱",
      "viewCount": 12345,
      "likeCount": 678,
      "commentCount": 90,
      "region": "TW",
      "type": "videos",
      "hashtags": ["#tag1", "#tag2"],
      "url": "https://www.youtube.com/watch?v=abc123"
    }
  ],

  // 篩選條件
  "filters": {
    "region": "TW",
    "type": "videos"
  }
}
```

## 常見問題解決

### API 錯誤

1. **403 Forbidden**:
   - 檢查 Apps Script 部署權限
   - 確認 YouTube API 金鑰有效

2. **429 Too Many Requests**:
   - YouTube API 配額耗盡
   - 等待配額重置或申請提高限制

3. **500 Internal Server Error**:
   - 檢查 Apps Script 日誌
   - 驗證 Google Sheets 權限

### 前端問題

1. **CORS 錯誤**:
   - 確保 Apps Script 正確設置 CORS
   - 使用 HTTPS 協定

2. **載入緩慢**:
   - 檢查網路連接
   - 驗證 API 回應時間

3. **搜尋無結果**:
   - 檢查篩選條件是否過嚴
   - 驗證資料庫是否有資料

## 進階配置

### 自訂地區設定

```javascript
// 在 ai_youtube_webapp.gs 中修改 REGIONS 常數
const REGIONS = {
  'TW': { name: '台灣', query: '台灣 OR 繁體', lang: 'zh-Hant' },
  'JP': { name: '日本', query: '日本 OR 日語', lang: 'ja' },
  // 新增其他地區...
};
```

### 調整快取策略

```javascript
// 修改快取時間設定
const WEBSITE_DATA_RETENTION_DAYS = 30;  // 資料保留天數
const CACHE_DURATION = 5 * 60 * 1000;    // 5分鐘快取
```

### 效能最佳化

1. **分頁大小調整**:
   ```javascript
   const DEFAULT_PAGE_SIZE = 20;  // 預設每頁筆數
   const MAX_PAGE_SIZE = 100;     // 最大每頁筆數
   ```

2. **API 配額管理**:
   ```javascript
   const DAILY_QUOTA_LIMIT = 10000;  // 每日配額限制
   const QUOTA_WARNING_THRESHOLD = 8000;  // 警告閾值
   ```

## 監控和維護

### 日誌檢查

1. **Apps Script 日誌**:
   - 前往 Apps Script 編輯器
   - 點擊「執行」→「檢視執行記錄」

2. **API 使用量監控**:
   - 檢查 YouTube API 控制台
   - 監控每日配額使用量

### 定期維護

1. **資料清理**:
   - 每月清理過期資料
   - 最佳化 Google Sheets 效能

2. **效能監控**:
   - 監控 API 回應時間
   - 檢查錯誤率和成功率

## 下一步

完成基本設置後，您可以：

1. **擴展功能**: 新增更多篩選條件
2. **客製化 UI**: 調整介面設計和佈局
3. **資料分析**: 建立趨勢分析和報表功能
4. **自動化**: 設置定期資料收集和更新

## 支援資源

- **技術文件**: 參考 `research.md` 和 `data-model.md`
- **API 規格**: 參考 `contracts/api-contract.yaml`
- **問題回報**: 在專案 repository 建立 issue

---

這個快速開始指南應該能幫您在 30 分鐘內完成基本設置和驗證。如有任何問題，請參考技術文件或聯繫開發團隊。