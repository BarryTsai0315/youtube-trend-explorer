# YouTube 熱門影片搜尋器 - 開發筆記

## 📋 專案概述

基於 Google Apps Script 和 YouTube Data API v3 的熱門影片搜尋工具，支援多地區搜尋、進階篩選、響應式設計。

**重要**: 為保護 API 額度，需要密碼驗證才能使用。

## ✅ 已完成功能

### 1. 核心檔案實作
- **`youtube-search-app.gs`** - Google Apps Script 後端 API
  - 三個端點：search, filter, suggestions
  - 支援 6 個地區（台灣、美國、印度、巴西、印尼、墨西哥）
  - 智慧快取機制（5分鐘）
  - YouTube Data API v3 整合

- **`youtube-search-frontend.html`** - 響應式前端介面
  - 關鍵字搜尋
  - 地區篩選
  - 影片類型篩選（一般/Shorts）
  - 日期範圍篩選
  - 觀看數範圍篩選
  - 分頁顯示
  - 搜尋建議

### 2. 部署相關
- **`DEPLOYMENT.md`** - 完整部署指南
- **`tests/manual-testing.md`** - 手動測試程序

### 3. API 調用優化
- ✅ **移除自動搜尋**: 篩選條件改變時不再自動觸發搜尋
- ✅ **手動觸發**: 只有點擊「搜尋」按鈕才會調用 API
- ✅ **統計資訊排版修正**: icon 不再遮住數字

### 4. GitHub Pages 準備
- **`index.html`** - 專業首頁
  - 功能介紹
  - 使用方式說明
  - 響應式設計
  - ✅ **密碼驗證 Modal** 已實作

### 5. 安全驗證系統（部分完成）
- ✅ **首頁驗證 Modal**:
  - 密碼輸入界面
  - Session Storage 存儲
  - 24小時過期機制
  - 當前密碼: `barry2025!`（可修改 index.html:300）

- ✅ **搜尋頁驗證檢查**:
  - 頁面載入時檢查驗證狀態
  - 未驗證自動跳回首頁
  - 驗證過期自動清除

## 🚧 待完成功能

### 1. 搜尋頁面登出功能
**狀態**: 進行中，需要完成頂部導航修改

**需要做的**:
```javascript
// 在 youtube-search-frontend.html 加入登出功能
function logout() {
    sessionStorage.removeItem('ytSearchAuth');
    sessionStorage.removeItem('ytSearchTime');
    alert('已登出');
    window.location.href = 'index.html';
}
```

**位置**: 需要找到正確的頂部導航結構並加入登出按鈕

### 2. 測試和最佳化
- [ ] 完整功能測試
- [ ] 響應式設計測試
- [ ] 驗證流程測試
- [ ] API 額度監控

### 3. GitHub Pages 部署
- [ ] 建立 GitHub repository
- [ ] 上傳所有檔案
- [ ] 設定 GitHub Pages
- [ ] 測試線上版本

## 🔧 已部署的服務

**Google Apps Script URL**:
```
https://script.google.com/macros/s/AKfycbyKgv3S8n7EJY-Gy4KvTfwIJeZfQ3lJkUlsQAunJT7pG6VG0Xk6s9ogAtjI3Z-ilolb/exec
```

**本地檔案結構**:
```
/Users/barry.tsai/Documents/light-youtube-trend-tracker/
├── index.html                    # GitHub Pages 首頁（含驗證）
├── youtube-search-frontend.html  # 搜尋器主介面（含驗證檢查）
├── youtube-search-app.gs         # Google Apps Script 後端
├── DEPLOYMENT.md                 # 部署指南
├── tests/manual-testing.md       # 測試程序
├── package.json                  # Node.js 配置
└── specs/                        # 規格文件（先前建立）
```

## 🛡️ 安全機制

### 密碼驗證流程
1. 使用者點擊「開始搜尋」
2. 彈出密碼輸入 Modal
3. 輸入正確密碼後建立 Session Storage
4. 跳轉到搜尋頁面
5. 搜尋頁面檢查驗證狀態
6. 24小時後自動過期

### 現有保護措施
- Session Storage 儲存（關閉瀏覽器就失效）
- 24小時自動過期
- 簡單 hash 加密
- 直接訪問搜尋頁面會被攔截

## 📝 重要技術細節

### API 調用優化
- 移除了 `filterElements` 的 `change` 事件監聽
- 保留分頁和每頁顯示數量的自動搜尋（因為是在有結果基礎上調整）
- 使用 debounce 機制避免重複調用

### 前端技術棧
- HTML5 + Tailwind CSS
- Vanilla JavaScript
- Material Design Icons
- 響應式設計

### 後端技術棧
- Google Apps Script
- YouTube Data API v3
- Google Apps Script Cache Service

## 🎯 下次繼續開發要做的事

1. **完成登出功能**:
   - 找到 `youtube-search-frontend.html` 正確的導航結構
   - 加入登出按鈕和 `logout()` 函數

2. **測試完整流程**:
   - 驗證 → 搜尋 → 登出 → 重新驗證

3. **準備 GitHub Pages**:
   - 建立 repository
   - 上傳檔案
   - 測試線上版本

4. **可選改進**:
   - 更強的密碼加密
   - 更精美的 UI
   - 更詳細的錯誤處理

## 💡 用戶使用流程

1. 訪問 GitHub Pages 首頁
2. 點擊「開始搜尋」
3. 輸入密碼: `barry2025!`
4. 進入搜尋器
5. 設定搜尋條件
6. 點擊搜尋按鈕（不會自動搜尋）
7. 瀏覽結果
8. 點擊登出返回首頁

---

**最後更新**: 2025-09-19
**開發者**: Barry Tsai
**專案目標**: 個人使用的 YouTube 熱門影片搜尋工具，保護 API 額度