/**
 * YouTube 熱門影片搜尋器 - 新版實作
 *
 * 基於現有架構的全新搜尋器實作，提供進階搜尋和篩選功能
 *
 * 主要功能：
 * - 關鍵字搜尋
 * - 地區篩選
 * - 日期範圍篩選
 * - 觀看數範圍篩選
 * - 影片類型篩選 (一般/Shorts)
 * - 分頁顯示
 * - 搜尋建議
 */

// ============================================================================
// 全域常量配置
// ============================================================================

/** @const {Object} 地區設定 */
const REGIONS = {
  'TW': { name: '台灣', query: '台灣 OR 繁體 OR 中文', lang: 'zh-Hant' },
  'US': { name: '美國', query: 'trending OR viral OR popular', lang: 'en' },
  'IN': { name: '印度', query: 'India OR Hindi OR trending', lang: 'hi' },
  'BR': { name: '巴西', query: 'Brasil OR português OR viral', lang: 'pt' },
  'ID': { name: '印尼', query: 'Indonesia OR trending OR populer', lang: 'id' },
  'MX': { name: '墨西哥', query: 'Mexico OR español OR popular', lang: 'es' }
};

/** @const {number} API 限制 */
const API_LIMITS = {
  MAX_RESULTS: 50,
  MAX_PAGE_SIZE: 100,
  DEFAULT_PAGE_SIZE: 20,
  CACHE_DURATION: 300 // 5分鐘
};

/** @const {number} Shorts 影片長度閾值 */
const SHORTS_DURATION_LIMIT = 60;

// ============================================================================
// 主要 API 路由處理
// ============================================================================

/**
 * Google Apps Script 主要入口點
 *
 * @param {Object} e - 請求事件物件
 * @return {ContentService.TextOutput} JSON 回應
 */
function doGet(e) {
  try {
    const params = (e && e.parameter) || {};
    const action = params.action || 'search';

    console.log(`API Request: ${action}`, params);

    // 路由分發
    switch (action) {
      case 'search':
        return handleSearchRequest(params);

      case 'filter':
        return handleFilterRequest(params);

      case 'suggestions':
        return handleSuggestionsRequest(params);

      default:
        return createJsonResponse({
          error: `Unknown action: ${action}`,
          supportedActions: ['search', 'filter', 'suggestions']
        }, 400);
    }

  } catch (error) {
    console.error('API Error:', error);
    return createJsonResponse({
      error: error.toString(),
      timestamp: new Date().toISOString()
    }, 500);
  }
}

// ============================================================================
// 搜尋 API 處理 (action=search)
// ============================================================================

/**
 * 處理基本搜尋請求
 *
 * @param {Object} params - 請求參數
 * @return {ContentService.TextOutput} JSON 回應
 */
function handleSearchRequest(params) {
  try {
    // 參數正規化
    const config = normalizeSearchParams(params);

    // 檢查快取
    const cacheKey = generateCacheKey('search', config);
    const cached = getCachedData(cacheKey);
    if (cached) {
      console.log('Returning cached search results');
      return createJsonResponse(cached);
    }

    // 執行搜尋
    const videos = performYouTubeSearch(config);

    // 建立回應
    const response = {
      query: config.query,
      keywords: config.keywords,
      regionCode: config.regionCode,
      publishedAfter: config.publishedAfter,
      publishedBefore: config.publishedBefore,
      count: videos.length,
      items: videos
    };

    // 存入快取
    setCachedData(cacheKey, response);

    return createJsonResponse(response);

  } catch (error) {
    console.error('Search request error:', error);
    return createJsonResponse({
      error: `Search failed: ${error.toString()}`
    }, 500);
  }
}

/**
 * 正規化搜尋參數
 *
 * @param {Object} params - 原始參數
 * @return {Object} 正規化後的配置
 */
function normalizeSearchParams(params) {
  // 基本參數
  const query = params.q || '';
  const regionCode = params.regionCode || '';
  const days = Math.max(1, Math.min(7, parseInt(params.days) || 3));
  const maxResults = Math.max(1, Math.min(API_LIMITS.MAX_RESULTS, parseInt(params.max) || 20));
  const isShorts = params.shorts === 'true';

  // 時間範圍
  const now = new Date();
  const publishedBefore = now.toISOString();
  const publishedAfter = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

  // 關鍵字處理
  let keywords = [];
  if (params.keywords && params.keywords !== 'none') {
    keywords = params.keywords.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  }

  // 地區查詢增強
  let enhancedQuery = query;
  if (!query && regionCode && REGIONS[regionCode]) {
    enhancedQuery = REGIONS[regionCode].query;
  }

  return {
    query: enhancedQuery,
    keywords,
    maxResults,
    publishedAfter,
    publishedBefore,
    regionCode,
    relevanceLanguage: regionCode && REGIONS[regionCode] ? REGIONS[regionCode].lang : 'en',
    isShorts
  };
}

// ============================================================================
// 篩選 API 處理 (action=filter)
// ============================================================================

/**
 * 處理進階篩選請求
 *
 * @param {Object} params - 請求參數
 * @return {ContentService.TextOutput} JSON 回應
 */
function handleFilterRequest(params) {
  try {
    // 參數正規化
    const filters = normalizeFilterParams(params);

    // 檢查快取
    const cacheKey = generateCacheKey('filter', filters);
    const cached = getCachedData(cacheKey);
    if (cached) {
      console.log('Returning cached filter results');
      return createJsonResponse(cached);
    }

    // 執行篩選查詢
    const result = performFilteredSearch(filters);

    // 存入快取
    setCachedData(cacheKey, result);

    return createJsonResponse(result);

  } catch (error) {
    console.error('Filter request error:', error);
    return createJsonResponse({
      error: `Filter failed: ${error.toString()}`
    }, 500);
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
  const viewMin = params.viewMin ? Math.max(0, parseInt(params.viewMin)) : 0;
  const viewMax = params.viewMax ? Math.max(0, parseInt(params.viewMax)) : Number.MAX_SAFE_INTEGER;

  // 分頁參數
  const page = Math.max(1, parseInt(params.page) || 1);
  const size = Math.max(1, Math.min(API_LIMITS.MAX_PAGE_SIZE, parseInt(params.size) || API_LIMITS.DEFAULT_PAGE_SIZE));

  // 其他篩選條件
  const region = params.region || '';
  const type = params.type || '';
  const keyword = params.keyword || '';

  return {
    dateFrom,
    dateTo,
    viewMin,
    viewMax,
    page,
    size,
    region,
    type,
    keyword
  };
}

/**
 * 執行篩選搜尋
 *
 * @param {Object} filters - 篩選條件
 * @return {Object} 篩選結果
 */
function performFilteredSearch(filters) {
  // 構建搜尋配置
  const searchConfig = {
    query: filters.keyword || (filters.region && REGIONS[filters.region] ? REGIONS[filters.region].query : 'trending'),
    keywords: [],
    maxResults: Math.min(API_LIMITS.MAX_RESULTS, filters.size * 3), // 多搜尋一些以便篩選
    regionCode: filters.region,
    relevanceLanguage: filters.region && REGIONS[filters.region] ? REGIONS[filters.region].lang : 'en',
    isShorts: filters.type === 'shorts',
    publishedAfter: filters.dateFrom ? new Date(filters.dateFrom).toISOString() : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    publishedBefore: filters.dateTo ? new Date(filters.dateTo).toISOString() : new Date().toISOString()
  };

  // 執行 YouTube 搜尋
  const allVideos = performYouTubeSearch(searchConfig);

  // 應用篩選條件
  const filteredVideos = allVideos.filter(video => applyVideoFilters(video, filters));

  // 分頁處理
  const total = filteredVideos.length;
  const totalPages = Math.ceil(total / filters.size);
  const startIndex = (filters.page - 1) * filters.size;
  const endIndex = Math.min(startIndex + filters.size, total);
  const pageItems = filteredVideos.slice(startIndex, endIndex);

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
      viewMax: filters.viewMax === Number.MAX_SAFE_INTEGER ? null : filters.viewMax,
      region: filters.region,
      type: filters.type,
      keyword: filters.keyword
    }
  };
}

/**
 * 應用影片篩選條件
 *
 * @param {Object} video - 影片資料
 * @param {Object} filters - 篩選條件
 * @return {boolean} 是否符合條件
 */
function applyVideoFilters(video, filters) {
  // 觀看數範圍
  if (video.viewCount < filters.viewMin || video.viewCount > filters.viewMax) {
    return false;
  }

  // 影片類型篩選
  if (filters.type === 'shorts' && video.durationSeconds > SHORTS_DURATION_LIMIT) {
    return false;
  }
  if (filters.type === 'videos' && video.durationSeconds <= SHORTS_DURATION_LIMIT) {
    return false;
  }

  // 關鍵字篩選
  if (filters.keyword) {
    const searchText = (video.title + ' ' + video.channelTitle + ' ' + (video.hashtags || []).join(' ')).toLowerCase();
    if (searchText.indexOf(filters.keyword.toLowerCase()) === -1) {
      return false;
    }
  }

  return true;
}

// ============================================================================
// 建議 API 處理 (action=suggestions)
// ============================================================================

/**
 * 處理搜尋建議請求
 *
 * @param {Object} params - 請求參數
 * @return {ContentService.TextOutput} JSON 回應
 */
function handleSuggestionsRequest(params) {
  try {
    const suggestions = generateSearchSuggestions(params);

    return createJsonResponse({
      suggestions
    });

  } catch (error) {
    console.error('Suggestions request error:', error);
    return createJsonResponse({
      error: `Suggestions failed: ${error.toString()}`
    }, 500);
  }
}

/**
 * 生成搜尋建議
 *
 * @param {Object} params - 請求參數
 * @return {Array} 建議列表
 */
function generateSearchSuggestions(params) {
  const type = params.type || 'all';
  const region = params.region || '';

  const suggestions = [];

  // 關鍵字建議
  if (type === 'all' || type === 'keyword') {
    const keywordSuggestions = [
      { text: 'AI 教學', type: 'keyword', count: 150 },
      { text: '程式設計', type: 'keyword', count: 230 },
      { text: '音樂', type: 'keyword', count: 450 },
      { text: '遊戲', type: 'keyword', count: 380 },
      { text: '美食', type: 'keyword', count: 320 },
      { text: '旅遊', type: 'keyword', count: 280 }
    ];

    suggestions.push(...keywordSuggestions);
  }

  // 頻道建議
  if (type === 'all' || type === 'channel') {
    const channelSuggestions = [
      { text: '科技頻道', type: 'channel', count: 45 },
      { text: '教學頻道', type: 'channel', count: 67 },
      { text: '音樂頻道', type: 'channel', count: 89 }
    ];

    suggestions.push(...channelSuggestions);
  }

  // Hashtag 建議
  if (type === 'all' || type === 'hashtag') {
    const hashtagSuggestions = [
      { text: '#trending', type: 'hashtag', count: 125 },
      { text: '#viral', type: 'hashtag', count: 98 },
      { text: '#教學', type: 'hashtag', count: 76 },
      { text: '#music', type: 'hashtag', count: 156 }
    ];

    suggestions.push(...hashtagSuggestions);
  }

  // 根據地區調整建議
  if (region && REGIONS[region]) {
    suggestions.forEach(suggestion => {
      if (region === 'TW') {
        suggestion.count = Math.floor(suggestion.count * 0.8); // 台灣市場相對較小
      } else if (region === 'US') {
        suggestion.count = Math.floor(suggestion.count * 1.5); // 美國市場較大
      }
    });
  }

  // 按相關度排序
  return suggestions.sort((a, b) => b.count - a.count).slice(0, 20);
}

// ============================================================================
// YouTube API 整合
// ============================================================================

/**
 * 執行 YouTube 搜尋
 *
 * @param {Object} config - 搜尋配置
 * @return {Array} 影片列表
 */
function performYouTubeSearch(config) {
  try {
    // 構建搜尋參數
    const searchParams = {
      q: config.query,
      maxResults: config.maxResults,
      order: 'viewCount',
      publishedAfter: config.publishedAfter,
      publishedBefore: config.publishedBefore,
      type: 'video',
      safeSearch: 'moderate'
    };

    if (config.regionCode) {
      searchParams.regionCode = config.regionCode;
    }
    if (config.relevanceLanguage) {
      searchParams.relevanceLanguage = config.relevanceLanguage;
    }

    // 執行搜尋
    console.log('Performing YouTube search:', searchParams);
    const searchResult = YouTube.Search.list('snippet', searchParams);
    const items = (searchResult && searchResult.items) || [];

    if (items.length === 0) {
      console.log('No search results found');
      return [];
    }

    // 關鍵字過濾
    const filtered = config.keywords.length > 0
      ? items.filter(item => matchesKeywords(item, config.keywords))
      : items;

    // 取得詳細資訊
    const detailedVideos = getVideoDetails(filtered);

    // 根據 isShorts 篩選
    if (config.isShorts !== undefined) {
      return detailedVideos.filter(video => {
        if (config.isShorts) {
          return video.durationSeconds > 0 && video.durationSeconds <= SHORTS_DURATION_LIMIT;
        } else {
          return video.durationSeconds > SHORTS_DURATION_LIMIT || video.durationSeconds === 0;
        }
      });
    }

    return detailedVideos;

  } catch (error) {
    console.error('YouTube search error:', error);
    throw new Error(`YouTube API error: ${error.toString()}`);
  }
}

/**
 * 檢查影片是否符合關鍵字
 *
 * @param {Object} item - YouTube 搜尋結果
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

  try {
    const videosResult = YouTube.Videos.list('snippet,statistics,contentDetails', {
      id: videoIds.join(',')
    });

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
        tags: video.snippet.tags || [],
        description: video.snippet.description || '',
        hashtags: extractHashtags(video.snippet.description || video.snippet.title || '')
      }))
      .sort((a, b) => b.viewCount - a.viewCount);

  } catch (error) {
    console.error('Error getting video details:', error);
    throw new Error(`Failed to get video details: ${error.toString()}`);
  }
}

/**
 * 解析 YouTube 影片長度
 *
 * @param {string} duration - YouTube API 時間格式
 * @return {number} 秒數
 */
function parseDurationToSeconds(duration) {
  if (!duration) return 0;

  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1]) || 0;
  const minutes = parseInt(match[2]) || 0;
  const seconds = parseInt(match[3]) || 0;

  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * 從文字中提取 hashtag
 *
 * @param {string} text - 要分析的文字
 * @return {Array<string>} hashtag 列表
 */
function extractHashtags(text) {
  if (!text) return [];

  const hashtagRegex = /#[\w\u4e00-\u9fff]+/g;
  const matches = text.match(hashtagRegex) || [];

  return [...new Set(matches.map(tag => tag.toLowerCase()))];
}

// ============================================================================
// 快取系統
// ============================================================================

/**
 * 生成快取鍵
 *
 * @param {string} type - 快取類型
 * @param {Object} params - 參數物件
 * @return {string} 快取鍵
 */
function generateCacheKey(type, params) {
  const key = `${type}_${JSON.stringify(params)}`;
  return Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, key)
    .map(byte => (byte + 256).toString(16).slice(-2))
    .join('');
}

/**
 * 取得快取資料
 *
 * @param {string} key - 快取鍵
 * @return {Object|null} 快取資料
 */
function getCachedData(key) {
  try {
    const cache = CacheService.getScriptCache();
    const cached = cache.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
}

/**
 * 設定快取資料
 *
 * @param {string} key - 快取鍵
 * @param {Object} data - 要快取的資料
 */
function setCachedData(key, data) {
  try {
    const cache = CacheService.getScriptCache();
    cache.put(key, JSON.stringify(data), API_LIMITS.CACHE_DURATION);
  } catch (error) {
    console.error('Cache set error:', error);
  }
}

// ============================================================================
// 工具函數
// ============================================================================

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

  // 設定 CORS 標頭
  if (status) {
    data.status = status;
  }

  return output;
}

// ============================================================================
// 測試和除錯函數
// ============================================================================

/**
 * 測試搜尋功能
 */
function testSearch() {
  const params = {
    q: 'AI 教學',
    regionCode: 'TW',
    days: '3',
    max: '10'
  };

  const result = handleSearchRequest(params);
  console.log('Test search result:', result.getContent());
}

/**
 * 測試篩選功能
 */
function testFilter() {
  const params = {
    action: 'filter',
    region: 'TW',
    type: 'videos',
    viewMin: '1000',
    viewMax: '100000',
    page: '1',
    size: '10'
  };

  const result = handleFilterRequest(params);
  console.log('Test filter result:', result.getContent());
}

/**
 * 測試建議功能
 */
function testSuggestions() {
  const params = {
    type: 'keyword',
    region: 'TW'
  };

  const result = handleSuggestionsRequest(params);
  console.log('Test suggestions result:', result.getContent());
}