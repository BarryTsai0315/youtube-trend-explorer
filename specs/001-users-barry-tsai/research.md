# 技術研究報告：YouTube 熱門影片搜尋器

**專案**: YouTube 熱門影片搜尋器
**分支**: `001-users-barry-tsai`
**日期**: 2025-09-19

## 執行摘要

基於現有的 Google Apps Script 和 HTML 架構，建議採用漸進式改進策略，保持 API 向後相容性的同時，重構內部架構以支援新的搜尋器功能。

## 技術決策

### 1. 後端架構方案

**Decision**: 保持 Google Apps Script 作為後端，擴展現有 doGet() 函數的路由系統

**Rationale**:
- 現有系統已具備良好的 YouTube API 整合和資料管理基礎
- Google Apps Script 提供免費、穩定的雲端執行環境
- 與 Google Sheets 整合無縫，適合資料驅動的應用
- 6分鐘執行時間限制對搜尋功能而言足夠

**Alternatives considered**:
- Node.js + Express: 需要額外的託管成本和部署複雜度
- Serverless Functions: 與現有 Google 生態系統整合度較低

### 2. 前端技術選擇

**Decision**: 基於現有 HTML/CSS/JavaScript 結構，使用原生 JavaScript + 現代 Web APIs

**Rationale**:
- 保持輕量級，無需額外的建置工具
- 現有 Tailwind CSS 和 Material Icons 已提供良好的 UI 基礎
- 避免引入複雜的框架依賴
- 更容易維護和部署

**Alternatives considered**:
- React: 增加建置複雜度，對單頁應用來說過於複雜
- Vue 3: 雖然輕量，但現有架構已足夠滿足需求

### 3. 資料結構優化

**Decision**: 統一資料接入層，簡化多重儲存系統

**Rationale**:
- 現有系統存在三套並行的儲存機制，增加維護複雜度
- 統一接入層可以提供更一致的資料存取體驗
- 保持向後相容性的同時改善內部架構

**Alternatives considered**:
- 完全重寫: 風險太高，會破壞現有功能
- 維持現狀: 技術債務會持續累積

### 4. API 路由擴展策略

**Decision**: 擴展現有 doGet() 函數，使用 action 參數進行路由分發

**Rationale**:
- 現有的 `action=filter` 模式已證明有效
- 保持 RESTful 設計原則
- 容易測試和維護

**實作範例**:
```javascript
function doGet(e) {
  const params = (e && e.parameter) || {};

  switch(params.action) {
    case 'search': return handleSearchRequest(params);
    case 'filter': return handleFilterRequest(params);
    case 'suggestions': return handleSuggestionsRequest(params);
    default: return handleLegacyRequest(params); // 向後相容
  }
}
```

### 5. 快取和效能策略

**Decision**: 實作多層快取機制

**Rationale**:
- YouTube API 有配額限制 (10,000 units/day)
- 搜尋結果在短時間內變化不大
- 前端快取可以改善使用者體驗

**實作策略**:
- 後端: Google Apps Script Cache Service (6小時)
- 前端: Browser localStorage (30分鐘)
- 資料庫: Google Sheets 作為持久化快取

### 6. 錯誤處理和容錯機制

**Decision**: 實作漸進式降級和友善錯誤提示

**Rationale**:
- Google Apps Script 執行環境可能有網路或配額限制
- 使用者體驗需要在錯誤時保持友善
- 提供備用資料來源

**實作方案**:
- API 錯誤 → 從快取提供資料
- 配額限制 → 顯示清楚的錯誤訊息和重試時間
- 網路錯誤 → 提供離線模式

## 技術約束與限制

### Google Apps Script 限制
- **執行時間**: 最長 6 分鐘
- **記憶體**: 有限的 heap size
- **並發**: 最多 30 個同時執行實例
- **配額**: YouTube API 每日 10,000 units

### 解決策略
- 使用批次處理避免長時間執行
- 實作配額監控和智能重試
- 優化 API 呼叫次數

## 實作架構

### 後端組件架構
```
ai_youtube_webapp.gs (擴展)
├── 路由層 (Router)
│   ├── handleSearchRequest()
│   ├── handleFilterRequest()
│   └── handleSuggestionsRequest()
├── 服務層 (Services)
│   ├── VideoSearchService
│   ├── FilterService
│   └── CacheService
├── 資料層 (Data Access)
│   ├── YouTubeAPIClient
│   ├── SheetsDataStore
│   └── CacheStore
└── 工具層 (Utilities)
    ├── ResponseFormatter
    ├── ErrorHandler
    └── QuotaManager
```

### 前端組件架構
```
video-search.html (擴展)
├── 搜尋組件 (SearchComponent)
├── 篩選組件 (FilterComponent)
├── 結果組件 (ResultsComponent)
├── 分頁組件 (PaginationComponent)
└── 狀態管理 (StateManager)
```

## 風險評估

### 高風險項目
1. **API 配額耗盡**: 實作智能快取和配額監控
2. **執行時間超限**: 優化演算法，使用批次處理
3. **向後相容性**: 詳細測試現有 API 端點

### 中風險項目
1. **效能瓶頸**: 實作快取策略
2. **錯誤處理**: 建立完整的錯誤回復機制

### 低風險項目
1. **UI/UX 改進**: 基於現有設計擴展
2. **新功能添加**: 漸進式開發方式

## 後續行動項目

1. **Phase 1**: 擴展後端 API 路由系統
2. **Phase 2**: 優化前端搜尋介面
3. **Phase 3**: 實作快取和效能最佳化
4. **Phase 4**: 添加進階篩選功能
5. **Phase 5**: 整合測試和部署

## 結論

基於現有的穩固基礎，採用漸進式改進策略是最適合的技術路徑。這種方法可以在保持系統穩定性的同時，逐步增強功能和效能。重點是簡化內部架構、統一資料存取層，並建立可擴展的組件系統。