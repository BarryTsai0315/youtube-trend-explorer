# 資料模型設計：YouTube 熱門影片搜尋器

**專案**: YouTube 熱門影片搜尋器
**分支**: `001-users-barry-tsai`
**日期**: 2025-09-19

## 概述

本文件定義了 YouTube 熱門影片搜尋器的核心資料實體、關係和驗證規則。設計基於現有的 Google Sheets 資料結構，並針對新的搜尋和篩選需求進行最佳化。

## 核心實體

### 1. Video Entity (影片實體)

代表單一 YouTube 影片的完整資訊。

**欄位定義**:
```javascript
{
  // 基本識別資訊
  videoId: String,          // YouTube 影片 ID (主鍵)
  title: String,            // 影片標題
  channelTitle: String,     // 頻道名稱
  publishedAt: DateTime,    // 發布時間 (ISO 8601)

  // 統計資料
  viewCount: Number,        // 觀看次數
  likeCount: Number,        // 按讚次數
  commentCount: Number,     // 留言次數
  durationSeconds: Number,  // 影片長度 (秒)

  // 分類資訊
  region: String,           // 地區代碼 (TW, US, IN, BR, ID, MX)
  type: String,             // 影片類型 (videos, shorts)
  hashtags: Array<String>,  // 標籤列表

  // 系統資訊
  recordDate: Date,         // 記錄日期 (YYYY-MM-DD)
  url: String,              // YouTube 連結

  // 顯示資訊
  thumbnails: Object        // 縮圖 URLs
}
```

**驗證規則**:
- `videoId`: 必填，11字元 YouTube ID 格式
- `title`: 必填，最大 100 字元
- `viewCount`, `likeCount`, `commentCount`: 非負整數
- `region`: 必須為預定義地區代碼之一
- `type`: 必須為 'videos' 或 'shorts'
- `durationSeconds`: 正整數，shorts 應 ≤60 秒

**範例**:
```javascript
{
  videoId: "dQw4w9WgXcQ",
  title: "Rick Astley - Never Gonna Give You Up",
  channelTitle: "RickAstleyVEVO",
  publishedAt: "2009-10-25T06:57:33Z",
  viewCount: 1234567890,
  likeCount: 12345678,
  commentCount: 123456,
  durationSeconds: 213,
  region: "US",
  type: "videos",
  hashtags: ["#rickroll", "#classic", "#80s"],
  recordDate: "2025-09-19",
  url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  thumbnails: {
    medium: {
      url: "https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg",
      width: 320,
      height: 180
    }
  }
}
```

### 2. SearchFilter Entity (搜尋篩選器)

代表使用者的搜尋和篩選條件。

**欄位定義**:
```javascript
{
  // 搜尋條件
  keyword: String,          // 關鍵字搜尋

  // 篩選條件
  region: String,           // 地區篩選
  type: String,             // 影片類型篩選
  dateFrom: Date,           // 開始日期
  dateTo: Date,             // 結束日期
  viewMin: Number,          // 最小觀看數
  viewMax: Number,          // 最大觀看數

  // 分頁設定
  page: Number,             // 頁碼 (從 1 開始)
  size: Number,             // 每頁筆數

  // 排序設定
  sortBy: String,           // 排序欄位
  sortOrder: String         // 排序方向 (asc, desc)
}
```

**驗證規則**:
- `page`: 正整數，最小值 1
- `size`: 正整數，範圍 1-100
- `viewMin`, `viewMax`: 非負整數，viewMax ≥ viewMin
- `dateFrom`, `dateTo`: 有效日期，dateTo ≥ dateFrom
- `sortBy`: 可選值 viewCount, likeCount, publishedAt, recordDate
- `sortOrder`: 'asc' 或 'desc'

**預設值**:
```javascript
{
  keyword: "",
  region: "",
  type: "",
  dateFrom: null,
  dateTo: null,
  viewMin: 0,
  viewMax: Number.MAX_SAFE_INTEGER,
  page: 1,
  size: 20,
  sortBy: "viewCount",
  sortOrder: "desc"
}
```

### 3. SearchResult Entity (搜尋結果)

代表搜尋操作的結果集合。

**欄位定義**:
```javascript
{
  // 結果資料
  items: Array<Video>,      // 影片列表

  // 分頁資訊
  total: Number,            // 總筆數
  page: Number,             // 當前頁碼
  size: Number,             // 每頁筆數
  totalPages: Number,       // 總頁數

  // 篩選資訊
  filters: SearchFilter,    // 套用的篩選條件

  // 執行資訊
  executionTime: Number,    // 執行時間 (毫秒)
  cacheHit: Boolean,        // 是否使用快取
  timestamp: DateTime       // 結果產生時間
}
```

**計算欄位**:
- `totalPages`: `Math.ceil(total / size)`
- `hasNextPage`: `page < totalPages`
- `hasPrevPage`: `page > 1`

### 4. UIState Entity (使用者介面狀態)

代表前端應用程式的狀態。

**欄位定義**:
```javascript
{
  // 載入狀態
  loading: Boolean,         // 是否正在載入
  error: String,            // 錯誤訊息

  // 當前資料
  currentFilters: SearchFilter,  // 當前篩選條件
  currentResults: SearchResult,  // 當前搜尋結果

  // UI 狀態
  showAdvancedFilters: Boolean,  // 顯示進階篩選
  selectedVideos: Array<String>, // 選中的影片 ID

  // 快取狀態
  lastUpdate: DateTime,     // 最後更新時間
  cacheExpiry: DateTime     // 快取過期時間
}
```

## 資料關係

### 主要關係

1. **Video → Region**: 多對一關係
   - 每個影片屬於一個特定地區
   - 地區代碼對應到預定義的地區列表

2. **SearchFilter → SearchResult**: 一對一關係
   - 每個搜尋篩選條件產生一個結果集
   - 結果包含套用的篩選條件快照

3. **SearchResult → Video**: 一對多關係
   - 每個搜尋結果包含多個影片
   - 影片按照排序條件排列

### 資料流

```
User Input → SearchFilter → API Service → SearchResult → UI Display
                ↓
            Cache Check → Google Sheets → YouTube API
```

## 儲存結構

### Google Sheets 結構

基於現有的 `COLUMNS` 定義：

```javascript
const COLUMNS = [
  'rank',           // 排名
  'videoId',        // 影片 ID
  'title',          // 標題
  'channelTitle',   // 頻道
  'publishedAt',    // 發布時間
  'region',         // 地區
  'type',           // 類型
  'recordDate',     // 記錄日期
  'url',            // 連結
  'viewCount',      // 觀看數
  'likeCount',      // 按讚數
  'commentCount',   // 留言數
  'hashtags',       // 標籤 (逗號分隔)
  'durationSeconds' // 長度
];
```

### 索引策略

**主要索引**:
- `videoId + region + type`: 複合主鍵
- `recordDate`: 時間序列查詢
- `viewCount`: 排序查詢

**次要索引**:
- `region`: 地區篩選
- `type`: 類型篩選
- `channelTitle`: 頻道查詢

## 狀態轉換

### Video Entity 狀態
影片資料為靜態快照，無狀態轉換。

### SearchFilter Entity 狀態
```
Initial → Validating → Valid/Invalid → Executing → Completed
```

### UIState Entity 狀態
```
Idle → Loading → Success/Error → Idle
```

## 快取策略

### 資料快取層級

1. **Browser Cache** (前端)
   - 快取時間：5分鐘
   - 儲存：localStorage
   - 範圍：使用者會話

2. **Apps Script Cache** (後端)
   - 快取時間：30分鐘
   - 儲存：Google Apps Script Cache Service
   - 範圍：全域

3. **Sheets Persistence** (資料庫)
   - 快取時間：永久
   - 儲存：Google Sheets
   - 範圍：歷史資料

### 快取鍵策略

```javascript
// 前端快取鍵
const cacheKey = `yt_search_${hashFilters(filters)}`;

// 後端快取鍵
const cacheKey = `video_data_${region}_${type}_${date}`;
```

## 效能考量

### 查詢最佳化

1. **分頁查詢**: 避免一次載入大量資料
2. **篩選下推**: 在資料層執行篩選，減少傳輸量
3. **索引使用**: 利用複合索引加速查詢

### 記憶體管理

1. **分批處理**: 處理大型資料集時使用批次
2. **懶載入**: 延遲載入非關鍵資料
3. **垃圾收集**: 定期清理過期快取

## 擴展性設計

### 水平擴展

1. **地區分片**: 不同地區資料可獨立處理
2. **時間分片**: 歷史資料按月份分割
3. **功能分片**: 不同功能模組獨立部署

### 垂直擴展

1. **快取層**: 增加快取容量和層級
2. **處理能力**: 最佳化演算法和資料結構
3. **儲存最佳化**: 壓縮和歸檔策略

此資料模型設計確保了系統的可擴展性、效能和維護性，同時保持與現有架構的相容性。