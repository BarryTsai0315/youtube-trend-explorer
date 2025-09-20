# 🎬 YouTube 熱門影片搜尋器

> 一款基於 YouTube Data API v3 的純前端熱門影片搜尋分析工具，支援多地區搜尋、進階篩選、數據分析與響應式設計。

![授權](https://img.shields.io/badge/license-MIT-blue.svg)
![版本](https://img.shields.io/badge/version-2.0.0-green.svg)
![狀態](https://img.shields.io/badge/status-Active-brightgreen.svg)

## ✨ 功能亮點

🚀 **純前端架構** - 無需後端伺服器，用戶使用自己的 YouTube API 金鑰，配額獨立。
🌍 **多地區支援** - 支援台灣、美國、印度、巴西、印尼、墨西哥等 6 個地區。
📊 **數據視覺化** - 內建 Chart.js 圖表分析，支援 4 種圖表類型。
📁 **數據匯出** - 支援 CSV/Excel 匯出，UTF-8 編碼完整保留中文。
🔍 **競品比較** - 獨立的競品分析工具，支援多關鍵字並排比較。
⚡ **智能快取** - 5 分鐘 API 快取機制，大幅減少配額消耗。

## 📚 文件資源

-   [**新手指南 (Beginner's Guide)**](./docs/BEGINNER_GUIDE.md) - 專為初次使用者準備的快速上手指南。
-   [**開發者指南 (Developer's Guide)**](./docs/DEVELOPER_GUIDE.md) - 提供給開發者的技術細節與架構說明。
-   [**部署指南 (Deployment Guide)**](./docs/DEPLOYMENT.md) - 如何將專案部署到自己的伺服器或 GitHub Pages。
-   [**開發筆記 (Development Notes)**](./docs/note.md) - 專案的開發歷程與待辦事項。

## 🛠️ 核心功能

### 1. 熱門影片搜尋
- 關鍵字搜尋，固定按觀看數排序。
- 多維度篩選：地區、影片類型、日期範圍、觀看數範圍。
- 智能排序：觀看數、按讚數、留言數、發佈時間。

### 2. 進階數據分析
- 觀看數分布圖 (長條圖)
- 發布時間趨勢 (折線圖)
- 影片類型分布 (甜甜圈圖)
- 按讚率 vs 觀看數 (散點圖)

### 3. 數據匯出與分析
- CSV/Excel 格式匯出。
- UTF-8 編碼支援中文。
- 完整的影片元數據和統計資料。

### 4. 競品比較分析
- 多關鍵字並排比較。
- 統計數據對比圖表。
- 競爭強度分析。

### 5. 響應式檢視模式
- 網格檢視：瀏覽影片卡片。
- 圖表分析：數據視覺化。
- 分頁控制：10/20/50 筆顯示選項。

### 6. API 配額管理
- 智能快取機制 (5 分鐘)。
- 配額使用追蹤。
- 友善的錯誤提示。

## 🚀 快速入門

### 1. 申請 YouTube API 金鑰

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)。
2. 建立新專案或選擇現有專案。
3. 啟用 **YouTube Data API v3**。
4. 建立 API 金鑰。
5. **重要：** 限制您的 API 金鑰以防止未經授權的使用。對於網站專案，最常見的限制是 `HTTP 參照網址`。

### 2. 執行專案

#### 選項 A：GitHub Pages (推薦)

1.  Fork 此儲存庫。
2.  在您 Fork 的儲存庫中，前往 **Settings > Pages** 啟用 GitHub Pages。
3.  選擇 `main` 分支作為來源。

#### 選項 B：本地伺服器

1.  下載或複製專案：
    ```bash
    git clone https://github.com/your-username/youtube-trend-explorer.git
    cd youtube-trend-explorer
    ```

2.  啟動本地網頁伺服器。您可以使用 Python 內建的伺服器：
    ```bash
    python -m http.server 8000
    ```

3.  開啟您的瀏覽器並前往 `http://localhost:8000`。

### 3. 設定您的 API 金鑰

1.  在瀏覽器中開啟 `index.html`。
2.  輸入您的 YouTube API 金鑰。
3.  點擊「驗證並儲存」。
4.  您現在可以開始使用搜尋功能。

## 📁 專案結構

```
/
├── index.html
├── youtube-search-frontend.html
├── compare.html
├── video-search.html
├── youtube-api-utils.js
├── README.md
├── CLAUDE.md
├── GEMINI.md
├── package.json
├── docs/
│   ├── BEGINNER_GUIDE.md
│   ├── DEPLOYMENT.md
│   ├── DEVELOPER_GUIDE.md
│   └── note.md
└── specs/
    └── ...
```

## 💻 技術棧

-   **前端**: HTML5 + Tailwind CSS + Vanilla JavaScript
-   **圖表**: Chart.js
-   **圖示**: Material Design Icons
-   **API**: YouTube Data API v3 (純前端呼叫)
-   **儲存**: `localStorage` 用於儲存 API 金鑰，`sessionStorage` 用於暫存資料。

## 🔒 隱私與安全

-   **API 金鑰本地儲存**: 您的 API 金鑰儲存在您瀏覽器的 `localStorage` 中，絕不會傳送到任何伺服器。
-   **純前端架構**: 所有資料處理都在您的瀏覽器中進行。
-   **無後端依賴**: 本應用程式直接呼叫 YouTube API。

## 📋 系統需求

-   現代的網頁瀏覽器 (Chrome, Firefox, Safari, Edge)。
-   一組有效的 YouTube Data API v3 金鑰。
-   網路連線。