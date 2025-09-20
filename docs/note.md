# YouTube 熱門影片搜尋器 - 開發筆記

## 📋 專案概述

**基於 YouTube Data API v3 的熱門影片搜尋分析工具套件**，支援多地區搜尋、進階篩選、數據分析、響應式設計。

**✨ 架構轉變**: 從 Google Apps Script 後端轉為純前端架構，用戶使用自己的 YouTube API Key，配額獨立，免費且無需後端伺服器！

## ✅ 已完成功能

### 1. 主要檔案架構

- **`index.html`** - 主入口頁面
  - API Key 設定和管理
  - 產品功能介紹和差異化說明
- **`youtube-search-frontend.html`** - 核心搜尋器
  - 關鍵字搜尋 (固定按觀看數排序)
  - 地區、影片類型、日期、觀看數篩選
  - 智能排序功能 (觀看數、按讚數、留言數、發佈時間)
  - 分頁顯示 (10/20/50 筆)
  - CSV/Excel 匯出功能
  - 圖表分析視覺化 (Chart.js)
- **`compare.html`** - 競品比較工具
    - 多關鍵字搜尋與並排比較
    - 統計數據對比圖表

### 2. 核心功能模組

#### 📊 數據分析功能

- **CSV/Excel 匯出**: 完整影片數據匯出，支援 UTF-8 編碼。
- **圖表視覺化**: 使用 Chart.js 實作多維度圖表 (長條圖、折線圖、甜甜圈圖、散點圖)。
- **數據洞察生成**: 自動分析並提供統計摘要。

#### 🔧 使用者體驗優化

- **智能排序系統**: API 固定觀看數排序 + 前端多維度重排序。
- **響應式檢視模式**: 網格/圖表。
- **API 調用最佳化**: 移除自動搜尋，僅手動觸發，並實作5分鐘 LRU 快取。

#### 🔑 API Key 管理

- **本地儲存管理**: 使用 localStorage 儲存 YouTube API Key。
- **API Key 驗證**: 自動驗證 Key 的有效性。
- **使用指導**: 完整的 API Key 申請和設定教學。

### 3. 技術債務清理

- **程式碼重構**: 創建 `youtube-api-utils.js` 共用模組，統一 API 調用。
- **錯誤處理**: 改善 API 限額和錯誤提示，提供用戶友善訊息。

## 🚧 待辦事項

### 1. 關鍵字熱度 Alert 系統
- **功能規劃**:
  - 關鍵字追蹤清單管理。
  - 觀看數/按讚數門檻設定。
  - 瀏覽器通知或視覺提醒。

### 2. 文件與部署
- **GitHub Pages 部署**：設定自動化部署流程。
- **使用手冊更新與轉換**：將 Markdown 文件轉為 HTML 並提供線上版本。
- **API 成本估算工具**：提供一個簡單工具預估 API 使用量。

## 🏗️ 檔案結構 (目標)

```
/
├── index.html                    # 主入口頁面 (API Key 管理)
├── youtube-search-frontend.html  # 核心搜尋分析器
├── compare.html                  # 競品比較工具
├── video-search.html             # (待整合或確認用途)
├── youtube-api-utils.js          # 共用 YouTube API 模組
├── README.md                     # 專案入口
├── CLAUDE.md                     # AI 協作指令
├── GEMINI.md                     # AI 協作指令
├── package.json                  # Node.js 配置
├── docs/                         # 文件資料夾
│   ├── note.md                   # 開發筆記 (本檔案)
│   ├── BEGINNER_GUIDE.md         # 新手指南
│   ├── DEVELOPER_GUIDE.md        # 開發者指南
│   ├── DEPLOYMENT.md             # 部署指南
│   └── ... (HTML 版本文件)
└── specs/                        # 規格文件
```

## 🔧 技術架構

- **前端**: HTML5 + Tailwind CSS + Vanilla JavaScript
- **圖表**: Chart.js
- **圖標**: Material Design Icons
- **API**: YouTube Data API v3 (直接調用)
- **儲存**: localStorage (API Key) + sessionStorage (臨時數據)
- **模組化**: `youtube-api-utils.js` 共用 API 工具模組

## 🎯 當前任務：文件完善與重組

1.  **[進行中]** 更新 `note.md`。
2.  建立 `docs` 資料夾並遷移相關文件。
3.  更新 `README.md` 的文件連結。
4.  將教學文件轉換為 HTML 格式。
5.  在 `index.html` 中建立教學文件入口。

---
**最後更新**: 2025-09-20
**開發者**: Barry Tsai
**專案目標**: YouTube 影片搜尋分析工具套件，提供搜尋、分析、比較功能。
