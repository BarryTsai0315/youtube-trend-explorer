# 部署指南

本專案為靜態網站，可以部署到任何靜態網站託管服務。以下是一些常見的選項。

## 選項一：GitHub Pages (推薦)

GitHub Pages 提供免費且簡易的方式，讓您直接從 GitHub 儲存庫託管您的專案。

1.  **將程式碼推送到 GitHub 儲存庫。**
2.  **啟用 GitHub Pages：**
    *   在您的儲存庫中，前往 **Settings > Pages**。
    *   在 "Branch" 下，選擇您要部署的分支 (例如 `main`)。
    *   點擊 **Save**。
3.  您的網站將會發布於 `https://<您的使用者名稱>.github.io/<您的儲存庫名稱>/`。

## 選項二：Netlify

Netlify 提供簡單的拖放介面來部署靜態網站。

1.  前往 [Netlify](https://app.netlify.com/)。
2.  將專案資料夾拖放到 Netlify 的儀表板中。
3.  您的網站將會被部署並提供一個隨機的 URL，您可以後續自訂網域名稱。

## 選項三：Vercel

Vercel 是另一個部署靜態網站的絕佳平台。

1.  安裝 Vercel CLI：`npm install -g vercel`
2.  在您的終端機中，切換到專案目錄。
3.  執行指令 `vercel`。
4.  依照螢幕上的提示來部署您的網站。

## 選項四：本地網頁伺服器

若要在本地進行測試或個人使用，您可以在專案目錄中啟動一個簡單的網頁伺服器。

如果您已安裝 Python，可以執行：

```bash
# 適用於 Python 3
python -m http.server
```

或者，如果您已安裝 Node.js，您可以使用 `serve` 套件：

```bash
# 全域安裝 serve
npm install -g serve

# 啟動伺服器
serve
```

啟動伺服器後，您可以在 `http://localhost:8000` (或伺服器指定的其他埠號) 存取應用程式。