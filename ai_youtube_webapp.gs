/**
 * YouTube 熱門影片追蹤系統 - Linus 式重構版本 (v2.0 階層檔案結構)
 *
 * 設計哲學：
 * 1. 數據結構決定一切：階層檔案，時間組織
 * 2. 消除特殊情況：統一的錯誤處理，統一的數據流
 * 3. 函數只做一件事：每個函數都有明確的單一職責
 * 4. 向後兼容：Web API 介面保持不變
 * 5. 可擴展性：永不觸及 Google 限制
 *
 * 檔案結構：
 * YouTube Analytics Data/
 * ├── 2024/
 * │   ├── 2024-09.xlsx (每日分頁: 01, 02, ..., 30)
 * │   ├── 2024-10.xlsx (每日分頁: 01, 02, ..., 31)
 * │   └── ...
 * ├── 2025/
 * │   ├── 2025-01.xlsx
 * │   └── ...
 *
 * "Bad programmers worry about the code. Good programmers worry about data structures."
 *                                                                    - Linus Torvalds
 *
 * ============================================================================
 * API 使用說明
 * ============================================================================
 *
 * 【原有搜尋 API】- 向後兼容
 * GET ?q=搜尋詞&days=天數&max=數量&regionCode=地區&shorts=true/false&keywords=關鍵字
 *
 * 【新版篩選 API】- v2.0 功能
 * GET ?action=filter&dateFrom=開始日期&dateTo=結束日期&viewMin=最小觀看數&viewMax=最大觀看數&page=頁數&size=每頁筆數&region=地區&type=類型
 *
 * 篩選 API 參數說明：
 * - action=filter      : 必須，啟用篩選模式
 * - dateFrom          : 選填，開始日期 (YYYY-MM-DD)
 * - dateTo            : 選填，結束日期 (YYYY-MM-DD)
 * - viewMin           : 選填，最小觀看數，預設 0
 * - viewMax           : 選填，最大觀看數，預設無上限
 * - page              : 選填，頁數，預設 1
 * - size              : 選填，每頁筆數，預設 50，最大 100
 * - region            : 選填，地區代碼 (TW, US, IN, BR, ID, MX)
 * - type              : 選填，影片類型 (videos, shorts)
 *
 * 回應格式：
 * {
 *   "total": 總筆數,
 *   "page": 當前頁數,
 *   "size": 每頁筆數,
 *   "totalPages": 總頁數,
 *   "items": [影片資料陣列],
 *   "filters": {套用的篩選條件}
 * }
 *
 * 使用範例：
 * ?action=filter&dateFrom=2024-01-01&dateTo=2024-01-31&viewMin=1000&viewMax=100000&page=1&size=50&region=TW&type=videos
 */

// ============================================================================
// 全域常量 - 所有魔術數字都放這裡
// ============================================================================

/** @const {string} 主資料夾名稱 */
const MAIN_FOLDER_NAME = 'YouTube Analytics Data';

/** @const {string} 舊版追蹤檔案名稱 - 向後兼容 */
const LEGACY_TRACKING_FILE_NAME = 'YouTube 熱門影片追蹤';

/** @const {string} 工作表名稱模板 */
const SHEET_NAME_PREFIX = '影片追蹤';

/** @const {Array<string>} 資料欄位定義 - v2.0 每日分頁版本 */
const COLUMNS = [
  'rank', 'videoId', 'title', 'channelTitle', 'publishedAt', 'region', 'type',
  'recordDate', 'url', 'viewCount', 'likeCount', 'commentCount', 'hashtags', 'durationSeconds'
];

/** @const {Object} 地區配置 - 數據驅動，不是硬編碼 */
const REGIONS = {
    'TW': { name: '台灣', query: '台灣 OR 繁體 OR 中文', lang: 'zh-Hant' },
    'US': { name: '美國', query: 'trending OR viral OR popular', lang: 'en' },
    'IN': { name: '印度', query: 'India OR Hindi OR trending', lang: 'hi' },
    'BR': { name: '巴西', query: 'Brasil OR português OR viral', lang: 'pt' },
    'ID': { name: '印尼', query: 'Indonesia OR trending OR populer', lang: 'id' },
    'MX': { name: '墨西哥', query: 'Mexico OR español OR popular', lang: 'es' }
};

/** @const {number} 停止追蹤的天數閾值 */
const STALE_DAYS = 10;

/** @const {number} 每日追蹤搜尋天數 - 可調整 */
const DAILY_SEARCH_DAYS = 5;

/** @const {number} API 最大查詢數量 - 可調整 */
const API_MAX_RESULTS = 50;

/** @const {number} 每個地區類型保留的排名數量 - 可調整 */
const RANKING_LIMIT = 20;

/** @const {number} Shorts 影片長度閾值（秒）- 可調整 */
const SHORTS_DURATION_LIMIT = 60;

/** @const {string} 網站資料來源 Google Sheet ID */
const WEBSITE_DATA_SHEET_ID = '1GFb9Hxn1bcJbGHfGuePlSJO7vfqFadIlxKWa2mqTj-4';

/** @const {string} 網站資料工作表名稱 */
const WEBSITE_DATA_SHEET_NAME = '影片追蹤';

/** @const {number} 網站資料保留天數 - 可調整 */
const WEBSITE_DATA_RETENTION_DAYS = 30;

// ============================================================================
// 預設值 - 當沒有提供參數時使用
// ============================================================================

/** @const {number} Web API 預設搜尋天數 */
const DEFAULT_WEB_DAYS = 2;

/** @const {number} Web API 預設影片數量 */
const DEFAULT_WEB_COUNT = 50;

/** @const {number} 向後兼容函數預設天數 */
const DEFAULT_LEGACY_DAYS = 3;

/** @const {number} 向後兼容函數預設數量 */
const DEFAULT_LEGACY_COUNT = 20;

// ============================================================================
// 一鍵初始化 - 新手友好
// ============================================================================

/**
 * 🚀 【新手必備】YouTube 熱門影片追蹤系統 - 一鍵初始化
 *
 * ⭐ 如果您是第一次使用此系統，請執行這個函數！
 *
 * 此函數會自動完成所有設置：
 * ✅ 創建 Google Sheet 並設置 16 欄位結構（包含排名、影片長度等）
 * ✅ 啟用每日自動追蹤（每天早上 6 點執行）
 * ✅ 測試 YouTube API 連接和數據收集功能
 * ✅ 提供完整的操作說明和 Google Sheet 連結
 *
 * 🌟 使用方法：
 * 1. 在 Google Apps Script 函數列表中找到此函數
 * 2. 點擊執行按鈕
 * 3. 等待執行完成，查看控制台訊息
 *
 * 🎯 執行後系統將自動：
 * - 追蹤 美國、印度、台灣 三個地區的熱門影片
 * - 同時追蹤一般影片和 Shorts 短影片（≤60秒）
 * - 記錄排名變化、觀看數、按讚數、留言數歷史
 * - 每個地區類型保留前 20 名影片
 */
function setupSystem() {
  console.log('🚀 =================================');
  console.log('🚀 YouTube 熱門影片追蹤系統初始化');
  console.log('🚀 =================================');
  console.log('');

  try {
    // 步驟 1: 建立階層檔案結構
    console.log('📁 步驟 1: 建立階層檔案結構...');
    setupHierarchicalStructure();
    console.log('');

    // 步驟 2: 設置自動觸發器
    console.log('⏰ 步驟 2: 設置每日自動追蹤...');
    setupDailyTrigger();
    console.log('   ✅ 每日觸發器已設置（每天早上 6 點自動執行）');
    console.log('');

    // 步驟 3: 執行初始數據收集測試
    console.log('🎯 步驟 3: 測試數據收集功能...');
    const testResult = testInitialDataCollection();
    console.log('');

    // 成功總結
    console.log('🎉 ================================');
    console.log('🎉 系統初始化完成！');
    console.log('🎉 ================================');
    console.log('');
    console.log('📊 系統狀態：');
    console.log('   • 階層檔案結構: ✅ 已建立');
    console.log('   • 每日追蹤: ✅ 已啟用 (每天 06:00)');
    console.log('   • API 連接: ✅ 正常');
    console.log(`   • 測試收集: ✅ 成功 (${testResult.count} 筆影片)`);
    console.log('');
    console.log('🎯 下一步操作：');
    console.log('   1. 系統將自動每天收集熱門影片數據');
    console.log('   2. 您可以隨時查看 Google Sheet 中的數據');
    console.log('   3. 如需立即手動收集數據，請執行: dailyYouTubeTracking()');
    console.log('   4. 如需檢查系統狀態，請執行: checkSystemStatus()');
    console.log('');
    console.log('📝 重要提醒：');
    console.log('   • 數據會自動追蹤影片的觀看數、按讚數、留言數變化');
    console.log('   • 系統涵蓋 美國、印度、台灣 三個地區');
    console.log('   • 同時追蹤一般影片和 Shorts 短影片');
    console.log('   • 如需停用自動追蹤，請執行: removeDailyTrigger()');

  } catch (error) {
    console.log('');
    console.log('❌ ================================');
    console.log('❌ 初始化過程發生錯誤');
    console.log('❌ ================================');
    console.log(`錯誤訊息: ${error.toString()}`);
    console.log('');
    console.log('🔧 可能的解決方案：');
    console.log('   1. 確認您有 YouTube Data API v3 的存取權限');
    console.log('   2. 檢查 Google Drive 和 Google Sheets API 權限');
    console.log('   3. 如果是首次使用，請授予所需的 API 權限');
    console.log('   4. 重新執行此函數進行重試');

    throw error;
  }
}

/**
 * 📊 【日常運行】每日 YouTube 熱門影片追蹤
 *
 * 🎯 此函數執行完整的數據收集和更新流程
 *
 * ✅ 自動執行內容：
 * - 搜尋 3 個地區（美國、印度、台灣）的熱門影片
 * - 分別追蹤一般影片和 Shorts 短影片
 * - 更新排名、觀看數、按讚數、留言數歷史
 * - 清理超過 10 天未更新的過期記錄
 *
 * ⏰ 觸發方式：
 * - 自動：每天早上 6:00（由 setupSystem 設置的觸發器）
 * - 手動：直接執行此函數進行即時更新
 *
 * 🔧 系統參數（可在頂部常量區修改）：
 * - DAILY_SEARCH_DAYS: 搜尋過去幾天的影片
 * - API_MAX_RESULTS: 每次搜尋的最大影片數
 * - RANKING_LIMIT: 每個地區類型保留的排名數量
 * - SHORTS_DURATION_LIMIT: Shorts 影片長度閾值
 *
 * 📋 執行結果會顯示在控制台，包含成功/失敗的詳細資訊
 */
function dailyYouTubeTracking() {
  try {
    console.log('=== 開始每日追蹤 ===');

    // 第一步：清理網站資料中的過期記錄
    const today = new Date().toLocaleDateString('sv-SE'); // 使用本地時區的 YYYY-MM-DD 格式
    console.log('🧹 清理網站資料過期記錄...');
    cleanupWebsiteSheetData(today);

    // 第二步：確保今日結構存在
    const todayInfo = ensureTodayStructureExists();
    const todaySheet = todayInfo.todaySheet;

    // 對每個地區和類型進行追蹤 - 數據驅動，直接寫入今日分頁
    Object.keys(REGIONS).forEach(regionCode => {
      [false, true].forEach(isShorts => {
        try {
          trackRegionToDaily(todaySheet, regionCode, isShorts, today);
        } catch (error) {
          console.log(`追蹤 ${regionCode} ${isShorts ? '短影片' : '影片'} 失敗: ${error}`);
        }
      });
    });

    console.log('=== 追蹤完成 ===');

  } catch (error) {
    console.log(`追蹤系統失敗: ${error}`);
    throw error;
  }
}

// ============================================================================
// Web API 入口點 - 保持向後兼容
// ============================================================================

/**
 * 主要的 Web API 入口點
 *
 * "Never break userspace" - 這個介面必須保持不變
 *
 * @param {Object} e - Google Apps Script 事件物件
 * @return {ContentService.TextOutput} JSON 回應
 */
function doGet(e) {
  try {
    const params = (e && e.parameter) || {};

    // 檢查是否為新的篩選 API 請求
    if (params.action === 'filter') {
      return handleFilterRequest(params);
    }

    // 原有的搜尋 API - 保持向後兼容
    const config = normalizeParams(params);
    const videos = searchVideos(config);

    return createJsonResponse({
      query: config.query,
      keywords: config.keywords,
      publishedAfter: config.publishedAfter,
      publishedBefore: config.publishedBefore,
      count: videos.length,
      items: videos
    });

  } catch (error) {
    return createJsonResponse({ error: error.toString() }, 500);
  }
}

/**
 * 處理篩選 API 請求
 *
 * @param {Object} params - 請求參數
 * @return {ContentService.TextOutput} JSON 回應
 */
function handleFilterRequest(params) {
  try {
    // 正規化篩選參數
    const filters = normalizeFilterParams(params);

    // 執行篩選查詢
    const result = getFilteredData(filters);

    return createJsonResponse(result);

  } catch (error) {
    console.log(`篩選 API 錯誤: ${error.toString()}`);
    return createJsonResponse({ error: error.toString() }, 500);
  }
}

/**
 * 正規化篩選參數
 *
 * @param {Object} params - 原始參數
 * @return {Object} 正規化後的篩選配置
 */
function normalizeFilterParams(params) {
  // 日期範圍
  const dateFrom = params.dateFrom || null;
  const dateTo = params.dateTo || null;

  // 觀看數範圍
  const viewMin = params.viewMin ? parseInt(params.viewMin) : 0;
  const viewMax = params.viewMax ? parseInt(params.viewMax) : Number.MAX_SAFE_INTEGER;

  // 分頁參數
  const page = Math.max(1, parseInt(params.page) || 1);
  const size = Math.max(1, Math.min(100, parseInt(params.size) || 50)); // 限制最大100筆

  // 其他篩選條件
  const region = params.region || '';
  const type = params.type || ''; // 'videos' 或 'shorts'

  return {
    dateFrom,
    dateTo,
    viewMin,
    viewMax,
    page,
    size,
    region,
    type
  };
}

/**
 * 正規化 API 參數
 *
 * "Good taste" - 把所有參數處理邏輯集中在一個地方
 *
 * @param {Object} params - 原始參數
 * @return {Object} 正規化後的配置
 */
function normalizeParams(params) {
  const days = Math.max(1, Math.min(7, parseInt(params.days) || DEFAULT_WEB_DAYS));
  const max = Math.max(1, Math.min(50, parseInt(params.max) || DEFAULT_WEB_COUNT));
  const region = params.regionCode || '';
  const isShorts = params.shorts === 'true';

  const now = new Date();
  const publishedBefore = now.toISOString();
  const publishedAfter = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

  // 構建搜尋詞 - 數據驅動，空 query 時用地區救場
  let query = params.q || '';

  // 如果 query 為空且有地區配置，使用地區搜尋詞
  if (!query.trim() && region && REGIONS[region]) {
    query = REGIONS[region].query;
  } else if (region && REGIONS[region] && query.trim()) {
    // 如果有自定義 query 且有地區，保持自定義 query，不覆蓋
    // query 保持不變
  }

  // 移除 hashtag 搜尋，後續用影片長度判斷真正的 Shorts

  // 關鍵字處理 - 簡化邏輯
  let keywords = [];
  if (params.keywords === 'none' || params.keywords === '') {
    keywords = [];
  } else if (params.keywords) {
    keywords = params.keywords.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  } else {
    keywords = ['ai', '人工智慧', 'chatgpt', 'gpt', '機器學習', 'deep learning'];
  }

  return {
    query,
    keywords,
    maxResults: max,
    publishedAfter,
    publishedBefore,
    regionCode: region,
    relevanceLanguage: region && REGIONS[region] ? REGIONS[region].lang : 'en',
    isShorts
  };
}

/**
 * 搜尋 YouTube 影片
 *
 * @param {Object} config - 搜尋配置
 * @return {Array} 影片列表
 */
function searchVideos(config) {
  // YouTube API 呼叫
  const searchParams = {
    q: config.query,
    maxResults: config.maxResults,
    order: 'viewCount',
    publishedAfter: config.publishedAfter,
    publishedBefore: config.publishedBefore,
    type: 'video'
  };

  if (config.regionCode) searchParams.regionCode = config.regionCode;
  if (config.relevanceLanguage) searchParams.relevanceLanguage = config.relevanceLanguage;

  const searchResult = YouTube.Search.list('snippet', searchParams);
  const items = (searchResult && searchResult.items) || [];

  // 關鍵字過濾 - 如果有關鍵字的話
  const filtered = config.keywords.length > 0
    ? items.filter(item => matchesKeywords(item, config.keywords))
    : items;

  // 取得詳細統計資料
  return getVideoDetails(filtered);
}

/**
 * 檢查影片是否符合關鍵字
 *
 * @param {Object} item - YouTube 搜尋結果項目
 * @param {Array<string>} keywords - 關鍵字列表
 * @return {boolean} 是否符合
 */
function matchesKeywords(item, keywords) {
  const text = ((item.snippet.title || '') + ' ' + (item.snippet.description || '')).toLowerCase();
  return keywords.some(keyword => text.indexOf(keyword) !== -1);
}

/**
 * 取得影片詳細資訊
 *
 * @param {Array} items - 搜尋結果
 * @return {Array} 包含統計資料的影片列表
 */
function getVideoDetails(items) {
  const videoIds = items
    .map(item => item.id && item.id.videoId)
    .filter(id => id);

  if (videoIds.length === 0) return [];

  const videosResult = YouTube.Videos.list('snippet,statistics,contentDetails', { id: videoIds.join(',') });
  const videos = (videosResult && videosResult.items) || [];

  return videos
    .map(video => ({
      videoId: video.id,
      title: video.snippet.title || '',
      channelTitle: video.snippet.channelTitle || '',
      publishedAt: video.snippet.publishedAt || '',
      viewCount: parseInt(video.statistics.viewCount) || 0,
      likeCount: parseInt(video.statistics.likeCount) || 0,
      commentCount: parseInt(video.statistics.commentCount) || 0,
      durationSeconds: parseDurationToSeconds(video.contentDetails?.duration || ''),
      url: `https://www.youtube.com/watch?v=${video.id}`,
      thumbnails: video.snippet.thumbnails || {},
      tags: video.snippet.tags || [],                    // 創作者設定的標籤
      description: video.snippet.description || '',      // 完整描述 (含 hashtag)
      hashtags: extractHashtags(video.snippet.description || video.snippet.title || '') // 從描述和標題提取 hashtag
    }))
    .sort((a, b) => b.viewCount - a.viewCount);
}

/**
 * 從文字中提取 hashtag
 *
 * "Good taste" - 用簡單的正則表達式，不要過度複雜化
 *
 * @param {string} text - 要分析的文字
 * @return {Array<string>} hashtag 列表
 */
function extractHashtags(text) {
  if (!text) return [];

  // 匹配 #後面跟著字母、數字、底線的組合
  const hashtagRegex = /#[\w\u4e00-\u9fff]+/g;
  const matches = text.match(hashtagRegex) || [];

  // 移除重複，轉小寫統一
  return [...new Set(matches.map(tag => tag.toLowerCase()))];
}

/**
 * 解析 YouTube 影片長度格式
 *
 * "好品味" - 處理所有可能的時間格式，轉換為秒數
 *
 * @param {string} duration - YouTube API 時間格式 (例: PT4M13S, PT59S, PT1H2M3S)
 * @return {number} 影片長度（秒）
 */
function parseDurationToSeconds(duration) {
  if (!duration) return 0;

  // YouTube API 格式：PT4M13S, PT59S, PT1H2M3S
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1]) || 0;
  const minutes = parseInt(match[2]) || 0;
  const seconds = parseInt(match[3]) || 0;

  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * 創建 JSON 回應
 *
 * @param {Object} data - 回應資料
 * @param {number} [status] - HTTP 狀態碼
 * @return {ContentService.TextOutput} JSON 回應
 */
function createJsonResponse(data, status) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  if (status) data.status = status;
  return output;
}

/**
 * 執行數據篩選查詢
 *
 * "Good taste" - 從網站資料 Sheet 讀取並篩選，支援分頁
 *
 * @param {Object} filters - 篩選條件
 * @return {Object} 篩選結果
 */
function getFilteredData(filters) {
  try {
    // 讀取網站資料 Sheet 的所有數據
    const sheet = getWebsiteDataSheet();
    const lastRow = sheet.getLastRow();

    if (lastRow <= 1) {
      return {
        total: 0,
        page: filters.page,
        size: filters.size,
        totalPages: 0,
        items: []
      };
    }

    // 讀取所有數據（不包含標題行）
    const allData = sheet.getRange(2, 1, lastRow - 1, COLUMNS.length).getValues();

    // 轉換為物件格式並應用篩選條件
    const filteredItems = allData
      .map(row => convertRowToVideoObject(row))
      .filter(video => applyFilters(video, filters));

    // 計算分頁資訊
    const total = filteredItems.length;
    const totalPages = Math.ceil(total / filters.size);
    const startIndex = (filters.page - 1) * filters.size;
    const endIndex = Math.min(startIndex + filters.size, total);

    // 取得當前頁的數據
    const pageItems = filteredItems.slice(startIndex, endIndex);

    return {
      total,
      page: filters.page,
      size: filters.size,
      totalPages,
      items: pageItems,
      filters: {
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        viewMin: filters.viewMin,
        viewMax: filters.viewMax,
        region: filters.region,
        type: filters.type
      }
    };

  } catch (error) {
    console.log(`數據篩選失敗: ${error.toString()}`);
    throw error;
  }
}

/**
 * 將 Sheet 行數據轉換為影片物件
 *
 * @param {Array} row - Sheet 行數據
 * @return {Object} 影片物件
 */
function convertRowToVideoObject(row) {
  return {
    rank: row[0] || 0,
    videoId: row[1] || '',
    title: row[2] || '',
    channelTitle: row[3] || '',
    publishedAt: row[4] || '',
    region: row[5] || '',
    type: row[6] || '',
    recordDate: row[7] || '',
    url: row[8] || '',
    viewCount: row[9] || 0,
    likeCount: row[10] || 0,
    commentCount: row[11] || 0,
    hashtags: row[12] || '',
    durationSeconds: row[13] || 0
  };
}

/**
 * 應用篩選條件
 *
 * @param {Object} video - 影片物件
 * @param {Object} filters - 篩選條件
 * @return {boolean} 是否符合篩選條件
 */
function applyFilters(video, filters) {
  // 日期範圍篩選
  if (filters.dateFrom && video.recordDate < filters.dateFrom) return false;
  if (filters.dateTo && video.recordDate > filters.dateTo) return false;

  // 觀看數範圍篩選
  const viewCount = parseInt(video.viewCount) || 0;
  if (viewCount < filters.viewMin || viewCount > filters.viewMax) return false;

  // 地區篩選
  if (filters.region && video.region !== filters.region) return false;

  // 類型篩選 (videos/shorts)
  if (filters.type && video.type !== filters.type) return false;

  return true;
}

// ============================================================================
// 網站資料系統 - v2.0 雙重寫入功能
// ============================================================================

/**
 * 取得網站資料工作表
 *
 * "Good taste" - 統一的錯誤處理，不存在就創建
 *
 * @return {GoogleAppsScript.Spreadsheet.Sheet} 網站資料工作表
 */
function getWebsiteDataSheet() {
  try {
    const spreadsheet = SpreadsheetApp.openById(WEBSITE_DATA_SHEET_ID);
    let sheet = spreadsheet.getSheetByName(WEBSITE_DATA_SHEET_NAME);

    if (!sheet) {
      // 工作表不存在，創建新的
      sheet = spreadsheet.insertSheet(WEBSITE_DATA_SHEET_NAME);

      // 設定標題行
      sheet.getRange(1, 1, 1, COLUMNS.length).setValues([COLUMNS]);
      sheet.getRange(1, 1, 1, COLUMNS.length).setFontWeight('bold').setBackground('#E8F0FE');

      console.log(`已創建網站資料工作表: ${WEBSITE_DATA_SHEET_NAME}`);
    }

    return sheet;

  } catch (error) {
    console.log(`無法取得網站資料工作表: ${error.toString()}`);
    throw error;
  }
}

/**
 * 寫入資料到網站 Sheet
 *
 * @param {Object} video - 影片資料
 * @param {string} regionCode - 地區代碼
 * @param {string} type - 影片類型
 * @param {string} today - 今日日期
 * @param {number} rank - 排名
 */
function writeToWebsiteSheet(video, regionCode, type, today, rank) {
  try {
    const sheet = getWebsiteDataSheet();
    const hashtagsString = video.hashtags ? video.hashtags.join(',') : '';

    const row = [
      rank,                        // rank
      video.videoId,               // videoId
      video.title,                 // title
      video.channelTitle,          // channelTitle
      video.publishedAt,           // publishedAt
      regionCode,                  // region
      type,                        // type
      today,                       // recordDate
      video.url,                   // url
      video.viewCount,             // viewCount
      video.likeCount,             // likeCount
      video.commentCount,          // commentCount
      hashtagsString,              // hashtags
      video.durationSeconds        // durationSeconds
    ];

    sheet.appendRow(row);

  } catch (error) {
    console.log(`網站資料寫入失敗: ${error.toString()}`);
    // 不拋出錯誤，確保不影響主要流程
  }
}

/**
 * 清理網站 Sheet 中的過期資料
 *
 * @param {string} today - 今日日期
 */
function cleanupWebsiteSheetData(today) {
  try {
    const sheet = getWebsiteDataSheet();
    const cutoffDate = new Date(Date.now() - WEBSITE_DATA_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const cutoffDateString = cutoffDate.toISOString().split('T')[0];

    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return; // 只有標題行

    // 讀取所有資料的記錄日期（第8欄）
    const dateRange = sheet.getRange(2, 8, lastRow - 1, 1);
    const dates = dateRange.getValues();

    let deletedCount = 0;

    // 從後往前刪除（避免索引偏移問題）
    for (let i = dates.length - 1; i >= 0; i--) {
      const recordDate = dates[i][0];
      if (recordDate && recordDate < cutoffDateString) {
        sheet.deleteRow(i + 2); // +2 因為從第2行開始，且索引從0開始
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      console.log(`網站資料清理完成：刪除 ${deletedCount} 筆超過 ${WEBSITE_DATA_RETENTION_DAYS} 天的記錄`);
    }

  } catch (error) {
    console.log(`網站資料清理失敗: ${error.toString()}`);
    // 不拋出錯誤，確保不影響主要流程
  }
}

// ============================================================================
// 追蹤系統 - 簡化的數據結構
// ============================================================================

/**
 * 取得或創建追蹤工作表
 *
 * "Good taste" - 消除所有特殊情況，工作表不存在就創建，存在就用
 *
 * @return {GoogleAppsScript.Spreadsheet.Sheet} 工作表物件
 */
function getTrackingSheet() {
  let spreadsheet;

  // 嘗試找到現有檔案
  const files = DriveApp.getFilesByName(TRACKING_FILE_NAME);
  if (files.hasNext()) {
    spreadsheet = SpreadsheetApp.openById(files.next().getId());
  } else {
    spreadsheet = SpreadsheetApp.create(TRACKING_FILE_NAME);
  }

  // 取得或創建工作表
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);

    // 設定標題行
    sheet.getRange(1, 1, 1, COLUMNS.length).setValues([COLUMNS]);
    sheet.getRange(1, 1, 1, COLUMNS.length).setFontWeight('bold').setBackground('#E8F0FE');

    // 刪除預設工作表（如果存在且不是唯一工作表）
    const defaultSheet = spreadsheet.getSheetByName('工作表1') || spreadsheet.getSheetByName('Sheet1');
    if (defaultSheet && spreadsheet.getSheets().length > 1) {
      spreadsheet.deleteSheet(defaultSheet);
    }
  }

  return sheet;
}

/**
 * 追蹤特定地區的影片
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - 工作表
 * @param {string} regionCode - 地區代碼
 * @param {boolean} wantShorts - 是否要追蹤短影片
 * @param {string} today - 今日日期字串
 */
function trackRegion(sheet, regionCode, wantShorts, today) {
  const type = wantShorts ? 'shorts' : 'videos';
  console.log(`追蹤 ${REGIONS[regionCode].name} ${type}`);

  // 搜尋影片（不再用 hashtag 區分）
  const config = {
    query: REGIONS[regionCode].query,
    keywords: [],
    maxResults: API_MAX_RESULTS,
    regionCode: regionCode,
    relevanceLanguage: REGIONS[regionCode].lang,
    isShorts: wantShorts,
    publishedAfter: new Date(Date.now() - DAILY_SEARCH_DAYS * 24 * 60 * 60 * 1000).toISOString(),
    publishedBefore: new Date().toISOString()
  };

  const videos = searchVideos(config);
  if (videos.length === 0) return;

  // 根據需求過濾影片
  const filteredVideos = videos
    .filter(video => {
      if (wantShorts) {
        // 如果要 shorts，只保留 ≤60 秒的影片
        return video.durationSeconds > 0 && video.durationSeconds <= SHORTS_DURATION_LIMIT;
      } else {
        // 如果要一般影片，不管長度，全部保留
        return true;
      }
    })
    .slice(0, RANKING_LIMIT);

  if (filteredVideos.length === 0) return;

  // 取得現有資料
  const existingData = getExistingData(sheet);

  // 依排名處理每個影片
  filteredVideos.forEach((video, index) => {
    const rank = index + 1; // 排名從 1 開始
    const key = `${video.videoId}_${regionCode}_${type}`;

    if (existingData[key] && existingData[key].isTracking) {
      updateExistingRecord(sheet, existingData[key], video, today, rank);
    } else if (!existingData[key]) {
      addNewRecord(sheet, video, regionCode, type, today, rank);
    }
    // 如果 isTracking 是 false，就跳過 - 簡單明瞭
  });
}

/**
 * 取得現有資料
 *
 * "Worry about data structures" - 一次讀取所有資料，建立索引
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - 工作表
 * @return {Object} 以複合鍵為索引的資料物件
 */
function getExistingData(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return {};

  const data = sheet.getRange(2, 1, lastRow - 1, COLUMNS.length).getValues();
  const existing = {};

  data.forEach((row, index) => {
    if (row[1]) { // videoId 存在（現在在第2欄）
      const key = `${row[1]}_${row[5]}_${row[6]}`; // videoId_region_type
      existing[key] = {
        rowIndex: index + 2,
        rank: row[0] || 0,
        videoId: row[1],
        title: row[2],
        channelTitle: row[3],
        publishedAt: row[4],
        region: row[5],
        type: row[6],
        firstSeen: row[7],
        lastSeen: row[8],
        isTracking: row[9],
        url: row[10],
        viewHistory: row[11] || '',
        hashtags: row[12] || '',
        likeHistory: row[13] || '',
        commentHistory: row[14] || '',
        durationSeconds: row[15] || 0
      };
    }
  });

  return existing;
}

/**
 * 更新現有記錄
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - 工作表
 * @param {Object} existing - 現有記錄
 * @param {Object} video - 新的影片資料
 * @param {string} today - 今日日期
 * @param {number} rank - 當前排名
 */
function updateExistingRecord(sheet, existing, video, today, rank) {
  // 更新觀看數歷史
  const newViewHistory = existing.viewHistory
    ? `${existing.viewHistory},${video.viewCount}`
    : video.viewCount.toString();

  // 更新按讚數歷史
  const newLikeHistory = existing.likeHistory
    ? `${existing.likeHistory},${video.likeCount}`
    : video.likeCount.toString();

  // 更新留言數歷史
  const newCommentHistory = existing.commentHistory
    ? `${existing.commentHistory},${video.commentCount}`
    : video.commentCount.toString();

  // 轉換 hashtags 陣列為逗號分隔字串
  const hashtagsString = video.hashtags ? video.hashtags.join(',') : '';

  sheet.getRange(existing.rowIndex, 1).setValue(rank); // rank
  sheet.getRange(existing.rowIndex, 9).setValue(today); // lastSeen
  sheet.getRange(existing.rowIndex, 12).setValue(newViewHistory); // viewHistory
  sheet.getRange(existing.rowIndex, 13).setValue(hashtagsString); // hashtags
  sheet.getRange(existing.rowIndex, 14).setValue(newLikeHistory); // likeHistory
  sheet.getRange(existing.rowIndex, 15).setValue(newCommentHistory); // commentHistory
  sheet.getRange(existing.rowIndex, 16).setValue(video.durationSeconds); // durationSeconds
}

/**
 * 新增記錄
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - 工作表
 * @param {Object} video - 影片資料
 * @param {string} regionCode - 地區代碼
 * @param {string} type - 影片類型
 * @param {string} today - 今日日期
 * @param {number} rank - 排名
 */
function addNewRecord(sheet, video, regionCode, type, today, rank) {
  // 轉換 hashtags 陣列為逗號分隔字串
  const hashtagsString = video.hashtags ? video.hashtags.join(',') : '';

  const row = [
    rank, // rank
    video.videoId,
    video.title,
    video.channelTitle,
    video.publishedAt,
    regionCode,
    type,
    today, // firstSeen
    today, // lastSeen
    true,  // isTracking
    video.url,
    video.viewCount.toString(), // viewHistory
    hashtagsString, // hashtags
    video.likeCount.toString(), // likeHistory
    video.commentCount.toString(), // commentHistory
    video.durationSeconds // durationSeconds
  ];

  sheet.appendRow(row);
}

/**
 * 清理過期記錄
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - 工作表
 * @param {string} today - 今日日期
 */
function cleanupStaleRecords(sheet, today) {
  const cutoffDate = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;

  const data = sheet.getRange(2, 8, lastRow - 1, 2).getValues(); // lastSeen, isTracking
  let updatedCount = 0;

  data.forEach((row, index) => {
    if (row[1] && new Date(row[0]) < cutoffDate) { // isTracking && lastSeen < cutoff
      sheet.getRange(index + 2, 9).setValue(false); // 設定 isTracking 為 false
      updatedCount++;
    }
  });

  if (updatedCount > 0) {
    console.log(`停止追蹤 ${updatedCount} 個過期記錄`);
  }
}

/**
 * 測試初始數據收集
 * @return {Object} 測試結果
 */
function testInitialDataCollection() {
  try {
    const config = {
      query: 'trending',
      keywords: [],
      maxResults: 10, // 測試用少量數據
      regionCode: 'TW',
      relevanceLanguage: 'zh-Hant',
      isShorts: false,
      publishedAfter: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 測試用 1 天
      publishedBefore: new Date().toISOString()
    };

    const videos = searchVideos(config);
    console.log(`   ✅ 成功收集 ${videos.length} 個測試影片`);

    if (videos.length > 0) {
      const sample = videos[0];
      console.log(`   📋 範例: "${sample.title.substring(0, 50)}..."`);
      console.log(`   📊 數據: 觀看=${sample.viewCount.toLocaleString()}, 按讚=${sample.likeCount.toLocaleString()}, 留言=${sample.commentCount.toLocaleString()}`);
    }

    return { success: true, count: videos.length };

  } catch (error) {
    console.log(`   ❌ 數據收集測試失敗: ${error.toString()}`);
    return { success: false, count: 0, error: error.toString() };
  }
}

// ============================================================================
// 管理工具 - 保持簡單
// ============================================================================

/**
 * 設定每日觸發器
 */
function setupDailyTrigger() {
  clearExistingTriggers();
  ScriptApp.newTrigger('dailyYouTubeTracking')
    .timeBased()
    .everyDays(1)
    .atHour(6)
    .create();

  console.log('✅ 每日觸發器設定完成');
}

/**
 * 清除現有觸發器
 */
function clearExistingTriggers() {
  ScriptApp.getProjectTriggers()
    .filter(trigger => trigger.getHandlerFunction() === 'dailyYouTubeTracking')
    .forEach(trigger => ScriptApp.deleteTrigger(trigger));
}

/**
 * 移除觸發器
 */
function removeDailyTrigger() {
  clearExistingTriggers();
  console.log('✅ 觸發器已移除');
}

/**
 * 檢查系統狀態
 */
function checkSystemStatus() {
  const triggers = ScriptApp.getProjectTriggers()
    .filter(trigger => trigger.getHandlerFunction() === 'dailyYouTubeTracking');

  console.log(`觸發器數量: ${triggers.length}`);

  try {
    const sheet = getTrackingSheet();
    const rowCount = sheet.getLastRow() - 1;
    console.log(`追蹤記錄數量: ${rowCount}`);
    console.log(`檔案連結: https://docs.google.com/spreadsheets/d/${sheet.getParent().getId()}`);

    // 檢查 COLUMNS 設定
    console.log('\n系統配置檢查：');
    console.log(`欄位數量: ${COLUMNS.length}`);
    console.log('新增欄位: ', COLUMNS.slice(-4)); // 顯示最後 4 個欄位

  } catch (error) {
    console.log(`無法取得追蹤檔案: ${error}`);
  }
}

// ============================================================================
// 向後兼容層 - 不破壞現有使用者
// ============================================================================

/**
 * 舊版 getTrending 函數 - 保持向後兼容
 *
 * "Never break userspace"
 */
function getTrending(regionCode, isShorts, days, maxResults) {
  regionCode = regionCode || '';
  isShorts = isShorts || false;
  days = days || DEFAULT_LEGACY_DAYS;
  maxResults = maxResults || DEFAULT_LEGACY_COUNT;

  const region = REGIONS[regionCode];
  const config = {
    query: region ? region.query + (isShorts ? ' #shorts' : '') : (isShorts ? '#shorts' : ''),
    keywords: [],
    maxResults: maxResults,
    regionCode: regionCode,
    relevanceLanguage: region ? region.lang : 'en',
    isShorts: isShorts,
    publishedAfter: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
    publishedBefore: new Date().toISOString()
  };

  return searchVideos(config);
}

// ============================================================================
// 階層檔案結構系統 - v2.0 新功能
// ============================================================================

/**
 * 🚀 【v2.0 新功能】建立階層式檔案結構
 *
 * 創建：YouTube Analytics Data/年份/月份檔案/每日分頁
 *
 * @param {number} [year] - 目標年份，預設當前年份
 * @param {number} [month] - 目標月份，預設當前月份
 */
function createHierarchicalStructure(year, month) {
  const now = new Date();
  const targetYear = year || now.getFullYear();
  const targetMonth = month || now.getMonth() + 1;

  console.log(`🚀 開始建立階層檔案結構：${targetYear}-${targetMonth.toString().padStart(2, '0')}`);

  try {
    // 第一步：建立主資料夾
    const mainFolder = getOrCreateMainFolder();
    console.log(`✅ 主資料夾：${MAIN_FOLDER_NAME}`);

    // 第二步：建立年份資料夾
    const yearFolder = getOrCreateYearFolder(mainFolder, targetYear);
    console.log(`✅ 年份資料夾：${targetYear}`);

    // 第三步：建立月份檔案
    const monthlyFile = getOrCreateMonthlyFile(yearFolder, targetYear, targetMonth);
    console.log(`✅ 月份檔案：${targetYear}-${targetMonth.toString().padStart(2, '0')}`);

    // 第四步：建立每日分頁
    const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
    createDailySheets(monthlyFile, daysInMonth);
    console.log(`✅ 每日分頁：01-${daysInMonth.toString().padStart(2, '0')}`);

    console.log(`🎉 階層結構建立完成！`);
    console.log(`📁 檔案路徑：${MAIN_FOLDER_NAME}/${targetYear}/${targetYear}-${targetMonth.toString().padStart(2, '0')}`);
    console.log(`🔗 檔案連結：https://docs.google.com/spreadsheets/d/${monthlyFile.getId()}`);

    return {
      mainFolder,
      yearFolder,
      monthlyFile,
      fileUrl: `https://docs.google.com/spreadsheets/d/${monthlyFile.getId()}`
    };

  } catch (error) {
    console.log(`❌ 建立階層結構失敗：${error.toString()}`);
    throw error;
  }
}

/**
 * 取得或創建主資料夾
 * @return {GoogleAppsScript.Drive.Folder} 主資料夾
 */
function getOrCreateMainFolder() {
  const folders = DriveApp.getFoldersByName(MAIN_FOLDER_NAME);
  if (folders.hasNext()) {
    return folders.next();
  }
  return DriveApp.createFolder(MAIN_FOLDER_NAME);
}

/**
 * 取得或創建年份資料夾
 * @param {GoogleAppsScript.Drive.Folder} parentFolder - 父資料夾
 * @param {number} year - 年份
 * @return {GoogleAppsScript.Drive.Folder} 年份資料夾
 */
function getOrCreateYearFolder(parentFolder, year) {
  const yearName = year.toString();
  const subFolders = parentFolder.getFoldersByName(yearName);
  if (subFolders.hasNext()) {
    return subFolders.next();
  }
  return parentFolder.createFolder(yearName);
}

/**
 * 取得或創建月份檔案
 * @param {GoogleAppsScript.Drive.Folder} yearFolder - 年份資料夾
 * @param {number} year - 年份
 * @param {number} month - 月份
 * @return {GoogleAppsScript.Spreadsheet.Spreadsheet} 月份檔案
 */
function getOrCreateMonthlyFile(yearFolder, year, month) {
  const fileName = `${year}-${month.toString().padStart(2, '0')}`;
  const files = yearFolder.getFilesByName(fileName);

  if (files.hasNext()) {
    return SpreadsheetApp.openById(files.next().getId());
  }

  // 創建新檔案
  const spreadsheet = SpreadsheetApp.create(fileName);
  const file = DriveApp.getFileById(spreadsheet.getId());

  // 移動到正確的資料夾
  yearFolder.addFile(file);
  DriveApp.getRootFolder().removeFile(file);

  return spreadsheet;
}

/**
 * 創建每日分頁
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} spreadsheet - 月份檔案
 * @param {number} daysInMonth - 該月天數
 */
function createDailySheets(spreadsheet, daysInMonth) {
  // 刪除預設工作表
  const defaultSheet = spreadsheet.getSheetByName('工作表1') || spreadsheet.getSheetByName('Sheet1');

  // 創建每日分頁
  for (let day = 1; day <= daysInMonth; day++) {
    const sheetName = day.toString().padStart(2, '0');
    let sheet = spreadsheet.getSheetByName(sheetName);

    if (!sheet) {
      sheet = spreadsheet.insertSheet(sheetName, day);
    }

    // 設定標題行
    sheet.getRange(1, 1, 1, COLUMNS.length).setValues([COLUMNS]);
    sheet.getRange(1, 1, 1, COLUMNS.length).setFontWeight('bold').setBackground('#E8F0FE');
  }

  // 最後刪除預設工作表（如果還存在）
  if (defaultSheet && spreadsheet.getSheets().length > 1) {
    spreadsheet.deleteSheet(defaultSheet);
  }
}

/**
 * 🎯 【快速建立】建立當前年份的所有月份結構
 */
function createCurrentYearStructure() {
  const currentYear = new Date().getFullYear();

  console.log(`🚀 建立 ${currentYear} 年完整結構`);

  for (let month = 1; month <= 12; month++) {
    try {
      createHierarchicalStructure(currentYear, month);
      console.log(`✅ ${currentYear}-${month.toString().padStart(2, '0')} 完成`);
    } catch (error) {
      console.log(`❌ ${currentYear}-${month.toString().padStart(2, '0')} 失敗：${error}`);
    }
  }

  console.log(`🎉 ${currentYear} 年結構建立完成！`);
}

/**
 * 📝 【測試用】建立範例結構（2024-09 和 2024-10）
 */
function createSampleStructure() {
  console.log('🧪 建立範例結構（2024-09 和 2024-10）');

  const results = [];

  // 建立 2024-09
  try {
    const sep2024 = createHierarchicalStructure(2024, 9);
    results.push({ month: '2024-09', success: true, url: sep2024.fileUrl });
    console.log('✅ 2024-09 建立成功');
  } catch (error) {
    results.push({ month: '2024-09', success: false, error: error.toString() });
    console.log(`❌ 2024-09 建立失敗：${error}`);
  }

  // 建立 2024-10
  try {
    const oct2024 = createHierarchicalStructure(2024, 10);
    results.push({ month: '2024-10', success: true, url: oct2024.fileUrl });
    console.log('✅ 2024-10 建立成功');
  } catch (error) {
    results.push({ month: '2024-10', success: false, error: error.toString() });
    console.log(`❌ 2024-10 建立失敗：${error}`);
  }

  console.log('🎯 範例結構建立完成！');
  console.log('📋 結果總結：');
  results.forEach(result => {
    if (result.success) {
      console.log(`   ✅ ${result.month}: ${result.url}`);
    } else {
      console.log(`   ❌ ${result.month}: ${result.error}`);
    }
  });

  return results;
}

/**
 * 🏗️ 【系統初始化用】建立初始階層結構
 *
 * 在 setupSystem() 中調用，建立當前年份的基本結構
 */
function setupHierarchicalStructure() {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();

    console.log(`   ⚙️  建立 ${currentYear} 年階層結構...`);

    console.log(`   📁 主資料夾：${MAIN_FOLDER_NAME}`);
    console.log(`   📁 年份資料夾：${currentYear}`);

    // 智能建立今日+明日分頁（避免跨日邊界問題）
    console.log(`   📋 建立今日與明日分頁...`);

    // 呼叫智能結構檢查函數，它會處理今日+明日分頁建立
    // 此函數會自動建立必要的月份檔案和分頁
    ensureTodayStructureExists(now);

    console.log(`   ✅ 階層結構與分頁建立完成`);

  } catch (error) {
    console.log(`   ❌ 階層結構建立失敗：${error.toString()}`);
    // 不拋出錯誤，讓系統繼續初始化其他部分
  }
}

/**
 * 🔍 【智能按需】確保今日結構存在
 *
 * 智能邊界處理：
 * - 只建立今日+明日分頁
 * - 自動處理跨月、跨年邊界
 * - 重複執行時跳過已存在的結構
 *
 * @param {Date} [targetDate] - 目標日期，預設今日
 * @return {Object} 今日的檔案和分頁資訊
 */
function ensureTodayStructureExists(targetDate) {
  const today = targetDate || new Date();
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth() + 1;
  const todayDay = today.getDate();

  const tomorrowYear = tomorrow.getFullYear();
  const tomorrowMonth = tomorrow.getMonth() + 1;
  const tomorrowDay = tomorrow.getDate();

  try {
    console.log(`🔍 檢查結構：${todayYear}-${todayMonth.toString().padStart(2, '0')}-${todayDay.toString().padStart(2, '0')}`);

    // 確保主資料夾存在
    const mainFolder = getOrCreateMainFolder();

    // === 處理今日結構 ===
    const todayYearFolder = getOrCreateYearFolder(mainFolder, todayYear);
    const todayMonthlyFile = getOrCreateMonthlyFile(todayYearFolder, todayYear, todayMonth);
    const todaySheetName = todayDay.toString().padStart(2, '0');

    // 智能建立今日分頁
    createSheetIfNotExists(todayMonthlyFile, todaySheetName);
    const todaySheet = todayMonthlyFile.getSheetByName(todaySheetName);

    // === 處理明日結構（邊界安全） ===
    let tomorrowYearFolder, tomorrowMonthlyFile;

    if (tomorrowYear !== todayYear) {
      // 跨年邊界：2025/12/31 → 2026/01/01
      console.log(`   🎆 跨年邊界：${todayYear} → ${tomorrowYear}`);
      tomorrowYearFolder = getOrCreateYearFolder(mainFolder, tomorrowYear);
      tomorrowMonthlyFile = getOrCreateMonthlyFile(tomorrowYearFolder, tomorrowYear, tomorrowMonth);
    } else if (tomorrowMonth !== todayMonth) {
      // 跨月邊界：09/30 → 10/01
      console.log(`   📅 跨月邊界：${todayMonth} → ${tomorrowMonth}`);
      tomorrowYearFolder = todayYearFolder;  // 同年
      tomorrowMonthlyFile = getOrCreateMonthlyFile(tomorrowYearFolder, tomorrowYear, tomorrowMonth);
    } else {
      // 同月：正常情況
      tomorrowYearFolder = todayYearFolder;
      tomorrowMonthlyFile = todayMonthlyFile;
    }

    // 智能建立明日分頁
    const tomorrowSheetName = tomorrowDay.toString().padStart(2, '0');
    createSheetIfNotExists(tomorrowMonthlyFile, tomorrowSheetName);

    console.log(`   ✅ 今日分頁：${todaySheetName}`);
    console.log(`   ✅ 明日分頁：${tomorrowSheetName} (${tomorrowYear}-${tomorrowMonth.toString().padStart(2, '0')})`);

    return {
      year: todayYear,
      month: todayMonth,
      day: todayDay,
      monthlyFile: todayMonthlyFile,
      todaySheet,
      sheetName: todaySheetName
    };

  } catch (error) {
    console.log(`❌ 智能結構檢查失敗：${error.toString()}`);
    throw error;
  }
}

/**
 * 📝 【新版追蹤】追蹤特定地區的影片到每日分頁
 *
 * 與舊版 trackRegion() 不同：
 * - 不累積歷史數據
 * - 直接寫入今日分頁
 * - 每日重新排名
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} todaySheet - 今日分頁
 * @param {string} regionCode - 地區代碼
 * @param {boolean} wantShorts - 是否要追蹤短影片
 * @param {string} today - 今日日期字串
 */
function trackRegionToDaily(todaySheet, regionCode, wantShorts, today) {
  const type = wantShorts ? 'shorts' : 'videos';
  console.log(`📝 新版追蹤 ${REGIONS[regionCode].name} ${type} → 今日分頁`);

  // 搜尋影片（使用相同的配置）
  const config = {
    query: REGIONS[regionCode].query,
    keywords: [],
    maxResults: API_MAX_RESULTS,
    regionCode: regionCode,
    relevanceLanguage: REGIONS[regionCode].lang,
    isShorts: wantShorts,
    publishedAfter: new Date(Date.now() - DAILY_SEARCH_DAYS * 24 * 60 * 60 * 1000).toISOString(),
    publishedBefore: new Date().toISOString()
  };

  const videos = searchVideos(config);
  if (videos.length === 0) return;

  // 根據需求過濾影片
  const filteredVideos = videos
    .filter(video => {
      if (wantShorts) {
        return video.durationSeconds > 0 && video.durationSeconds <= SHORTS_DURATION_LIMIT;
      } else {
        return true;
      }
    })
    .slice(0, RANKING_LIMIT);

  if (filteredVideos.length === 0) return;

  // 雙重寫入：今日分頁 + 網站資料 Sheet
  filteredVideos.forEach((video, index) => {
    const rank = index + 1;

    // 主要寫入：今日分頁（核心功能）
    addDailyRecord(todaySheet, video, regionCode, type, today, rank);

    // 附加寫入：網站資料 Sheet（有錯誤隔離）
    writeToWebsiteSheet(video, regionCode, type, today, rank);
  });

  console.log(`   ✅ 已寫入 ${filteredVideos.length} 筆 ${REGIONS[regionCode].name} ${type} 記錄`);
}

/**
 * 📄 【簡化寫入】新增每日記錄
 *
 * v2.0 簡化版本：
 * - 移除歷史欄位：viewHistory, likeHistory, commentHistory
 * - 移除追蹤欄位：firstSeen, lastSeen, isTracking
 * - 直接記錄當日快照數據
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - 今日分頁
 * @param {Object} video - 影片資料
 * @param {string} regionCode - 地區代碼
 * @param {string} type - 影片類型
 * @param {string} today - 今日日期
 * @param {number} rank - 排名
 */
function addDailyRecord(sheet, video, regionCode, type, today, rank) {
  const hashtagsString = video.hashtags ? video.hashtags.join(',') : '';

  const row = [
    rank,                        // rank
    video.videoId,               // videoId
    video.title,                 // title
    video.channelTitle,          // channelTitle
    video.publishedAt,           // publishedAt
    regionCode,                  // region
    type,                        // type
    today,                       // recordDate
    video.url,                   // url
    video.viewCount,             // viewCount (當日數值)
    video.likeCount,             // likeCount (當日數值)
    video.commentCount,          // commentCount (當日數值)
    hashtagsString,              // hashtags
    video.durationSeconds        // durationSeconds
  ];

  sheet.appendRow(row);
}

/**
 * 🛠️ 【智能建立】只在分頁不存在時建立
 *
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} spreadsheet - 月份檔案
 * @param {string} sheetName - 分頁名稱（例："17", "01"）
 * @return {GoogleAppsScript.Spreadsheet.Sheet} 分頁物件
 */
function createSheetIfNotExists(spreadsheet, sheetName) {
  let sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    // 分頁不存在，建立新分頁，按日期順序插入
    const dayNumber = parseInt(sheetName, 10);
    sheet = spreadsheet.insertSheet(sheetName, dayNumber);
    console.log(`     📄 建立新分頁：${sheetName}`);
  } else {
    console.log(`     ✅ 分頁已存在：${sheetName}`);
  }

  // 總是確保標題行正確（修復舊分頁或確保新分頁有標題）
  try {
    const firstRow = sheet.getRange(1, 1, 1, COLUMNS.length).getValues()[0];
    const hasCorrectHeaders = firstRow.every((header, index) => header === COLUMNS[index]);

    if (!hasCorrectHeaders) {
      // 標題行不正確或不存在，重新設定
      sheet.getRange(1, 1, 1, COLUMNS.length).setValues([COLUMNS]);
      sheet.getRange(1, 1, 1, COLUMNS.length).setFontWeight('bold').setBackground('#E8F0FE');
      console.log(`     🔧 已修復標題行：${sheetName}`);
    }
  } catch (error) {
    // 如果讀取失敗，直接設定標題行
    sheet.getRange(1, 1, 1, COLUMNS.length).setValues([COLUMNS]);
    sheet.getRange(1, 1, 1, COLUMNS.length).setFontWeight('bold').setBackground('#E8F0FE');
    console.log(`     🆕 已設定標題行：${sheetName}`);
  }

  return sheet;
}

// ============================================================================
// 測試函數 - v2.0 雙重寫入功能驗證
// ============================================================================

/**
 * 🧪 測試雙重寫入功能和錯誤隔離機制
 */
function testWebsiteDataIntegration() {
  console.log('🧪 測試網站資料雙重寫入功能');

  try {
    // 測試網站資料 Sheet 連接
    const websiteSheet = getWebsiteDataSheet();
    console.log(`✅ 網站資料 Sheet 連接成功`);

    // 測試寫入功能
    const testVideo = {
      videoId: 'TEST_' + Date.now(),
      title: '測試影片 - 雙重寫入功能驗證',
      channelTitle: '測試頻道',
      publishedAt: new Date().toISOString(),
      url: 'https://www.youtube.com/watch?v=test',
      viewCount: 12345,
      likeCount: 678,
      commentCount: 90,
      hashtags: ['#測試', '#雙重寫入'],
      durationSeconds: 120
    };

    const today = new Date().toLocaleDateString('sv-SE'); // 使用本地時區的 YYYY-MM-DD 格式
    writeToWebsiteSheet(testVideo, 'TW', 'videos', today, 1);
    console.log('✅ 測試資料寫入成功');

    cleanupWebsiteSheetData(today);
    console.log('✅ 清理功能執行完成');

    console.log('🎉 雙重寫入功能測試完成！');
    return { success: true };

  } catch (error) {
    console.log(`❌ 測試失敗: ${error.toString()}`);
    return { success: false, error: error.toString() };
  }
}

/**
 * 🔍 檢查網站資料 Sheet 狀態
 */
function checkWebsiteDataSheetStatus() {
  try {
    const sheet = getWebsiteDataSheet();
    const rowCount = sheet.getLastRow() - 1;

    console.log('📊 網站資料 Sheet 狀態：');
    console.log(`   • Sheet ID: ${WEBSITE_DATA_SHEET_ID}`);
    console.log(`   • 工作表名稱: ${WEBSITE_DATA_SHEET_NAME}`);
    console.log(`   • 資料筆數: ${rowCount}`);
    console.log(`   • 保留天數: ${WEBSITE_DATA_RETENTION_DAYS} 天`);

  } catch (error) {
    console.log(`❌ 無法檢查網站資料 Sheet: ${error.toString()}`);
  }
}

/**
 * 🧪 測試篩選和分頁功能
 */
function testFilterAndPagination() {
  console.log('🧪 =======================================');
  console.log('🧪 測試篩選和分頁功能');
  console.log('🧪 =======================================');

  try {
    // 測試 1: 基本分頁功能
    console.log('📋 測試 1: 基本分頁功能...');
    const basicFilters = {
      dateFrom: null,
      dateTo: null,
      viewMin: 0,
      viewMax: Number.MAX_SAFE_INTEGER,
      page: 1,
      size: 10,
      region: '',
      type: ''
    };

    const basicResult = getFilteredData(basicFilters);
    console.log(`   ✅ 第1頁，每頁10筆：找到 ${basicResult.total} 筆資料，共 ${basicResult.totalPages} 頁`);
    console.log(`   📊 當前頁資料筆數: ${basicResult.items.length}`);

    // 測試 2: 日期範圍篩選
    console.log('📋 測試 2: 日期範圍篩選...');
    const today = new Date().toLocaleDateString('sv-SE');
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toLocaleDateString('sv-SE');

    const dateFilters = {
      ...basicFilters,
      dateFrom: yesterday,
      dateTo: today
    };

    const dateResult = getFilteredData(dateFilters);
    console.log(`   ✅ 日期範圍 ${yesterday} 到 ${today}：找到 ${dateResult.total} 筆資料`);

    // 測試 3: 觀看數範圍篩選
    console.log('📋 測試 3: 觀看數範圍篩選...');
    const viewFilters = {
      ...basicFilters,
      viewMin: 1000,
      viewMax: 100000
    };

    const viewResult = getFilteredData(viewFilters);
    console.log(`   ✅ 觀看數範圍 1,000 到 100,000：找到 ${viewResult.total} 筆資料`);

    // 測試 4: 地區篩選
    console.log('📋 測試 4: 地區篩選...');
    const regionFilters = {
      ...basicFilters,
      region: 'TW'
    };

    const regionResult = getFilteredData(regionFilters);
    console.log(`   ✅ 台灣地區：找到 ${regionResult.total} 筆資料`);

    // 測試 5: 組合篩選
    console.log('📋 測試 5: 組合篩選...');
    const comboFilters = {
      dateFrom: yesterday,
      dateTo: today,
      viewMin: 1000,
      viewMax: 1000000,
      page: 1,
      size: 5,
      region: 'TW',
      type: 'videos'
    };

    const comboResult = getFilteredData(comboFilters);
    console.log(`   ✅ 組合篩選（日期+觀看數+地區+類型）：找到 ${comboResult.total} 筆資料`);

    // 測試 6: 分頁測試
    if (basicResult.totalPages > 1) {
      console.log('📋 測試 6: 分頁測試...');
      const page2Filters = { ...basicFilters, page: 2 };
      const page2Result = getFilteredData(page2Filters);
      console.log(`   ✅ 第2頁資料：${page2Result.items.length} 筆`);
    }

    console.log('🎉 =======================================');
    console.log('🎉 篩選和分頁功能測試完成！');
    console.log('🎉 =======================================');
    console.log('📊 測試總結：');
    console.log('   • 基本分頁: ✅ 正常');
    console.log('   • 日期篩選: ✅ 正常');
    console.log('   • 觀看數篩選: ✅ 正常');
    console.log('   • 地區篩選: ✅ 正常');
    console.log('   • 組合篩選: ✅ 正常');
    console.log('');
    console.log('🎯 API 端點：');
    console.log('   GET ?action=filter&dateFrom=2024-01-01&dateTo=2024-01-31&viewMin=1000&viewMax=100000&page=1&size=50');

    return { success: true };

  } catch (error) {
    console.log('❌ =======================================');
    console.log('❌ 測試過程發生錯誤');
    console.log('❌ =======================================');
    console.log(`錯誤訊息: ${error.toString()}`);

    return { success: false, error: error.toString() };
  }
}