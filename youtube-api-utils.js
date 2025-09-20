/**
 * YouTube API Utils - 共用的 YouTube Data API v3 工具模組
 *
 * 提供統一的 API 調用、錯誤處理、快取機制
 * 版本: 1.0.0
 * 最後更新: 2025-09-20
 */

// ==================== 配置和常量 ====================

const YOUTUBE_API_UTILS = {
    // API 配置
    config: {
        baseUrl: 'https://www.googleapis.com/youtube/v3',
        timeout: 15000,
        quotaUnits: {
            search: 100,        // 每次搜尋消耗 100 units
            videos: 1,          // 每個影片詳情查詢消耗 1 unit
            channels: 1         // 每個頻道查詢消耗 1 unit
        }
    },

    // 快取配置
    cache: {
        enabled: true,
        duration: 5 * 60 * 1000,  // 5分鐘
        maxSize: 50               // 最多快取 50 個請求
    },

    // 地區語言映射
    regionLanguageMap: {
        'TW': 'zh-Hant',
        'US': 'en',
        'IN': 'hi',
        'BR': 'pt',
        'ID': 'id',
        'MX': 'es'
    },

    // 內部狀態
    _cache: new Map(),
    _apiKey: null,
    _lastQuotaCheck: 0,
    _quotaUsed: 0
};

// ==================== API Key 管理 ====================

/**
 * 設定 YouTube API Key
 * @param {string} apiKey - YouTube Data API v3 金鑰
 */
YOUTUBE_API_UTILS.setApiKey = function(apiKey) {
    if (!apiKey || typeof apiKey !== 'string') {
        throw new Error('Invalid API key provided');
    }
    this._apiKey = apiKey;
    this.config.apiKey = apiKey;
};

/**
 * 取得當前 API Key
 * @returns {string} API Key
 */
YOUTUBE_API_UTILS.getApiKey = function() {
    return this._apiKey;
};

/**
 * 驗證 API Key 是否已設定
 * @returns {boolean} 是否已設定
 */
YOUTUBE_API_UTILS.hasApiKey = function() {
    return Boolean(this._apiKey);
};

// ==================== 快取機制 ====================

/**
 * 生成快取鍵值
 * @param {string} endpoint - API 端點
 * @param {Object} params - 請求參數
 * @returns {string} 快取鍵值
 */
YOUTUBE_API_UTILS._generateCacheKey = function(endpoint, params) {
    const sortedParams = Object.keys(params)
        .sort()
        .map(key => `${key}=${params[key]}`)
        .join('&');
    return `${endpoint}?${sortedParams}`;
};

/**
 * 從快取取得資料
 * @param {string} cacheKey - 快取鍵值
 * @returns {Object|null} 快取的資料或 null
 */
YOUTUBE_API_UTILS._getFromCache = function(cacheKey) {
    if (!this.cache.enabled) return null;

    const cached = this._cache.get(cacheKey);
    if (!cached) return null;

    // 檢查是否過期
    if (Date.now() - cached.timestamp > this.cache.duration) {
        this._cache.delete(cacheKey);
        return null;
    }

    console.log('Cache hit:', cacheKey);
    return cached.data;
};

/**
 * 儲存資料到快取
 * @param {string} cacheKey - 快取鍵值
 * @param {Object} data - 要快取的資料
 */
YOUTUBE_API_UTILS._setCache = function(cacheKey, data) {
    if (!this.cache.enabled) return;

    // 清理舊快取（LRU 策略）
    if (this._cache.size >= this.cache.maxSize) {
        const firstKey = this._cache.keys().next().value;
        this._cache.delete(firstKey);
    }

    this._cache.set(cacheKey, {
        data: data,
        timestamp: Date.now()
    });

    console.log('Cache set:', cacheKey);
};

/**
 * 清除所有快取
 */
YOUTUBE_API_UTILS.clearCache = function() {
    this._cache.clear();
    console.log('Cache cleared');
};

// ==================== 錯誤處理 ====================

/**
 * 處理 YouTube API 錯誤
 * @param {Error} error - 原始錯誤
 * @param {Object} context - 錯誤上下文資訊
 * @returns {Error} 處理後的錯誤
 */
YOUTUBE_API_UTILS._handleApiError = function(error, context = {}) {
    let userMessage = '搜尋失敗，請稍後再試';
    let errorType = 'UNKNOWN_ERROR';

    if (error.message.includes('403')) {
        if (error.message.includes('quotaExceeded')) {
            userMessage = 'API 配額已用完，請明天再試或使用其他 API Key';
            errorType = 'QUOTA_EXCEEDED';
        } else if (error.message.includes('keyInvalid')) {
            userMessage = 'API Key 無效，請檢查設定';
            errorType = 'INVALID_API_KEY';
        } else {
            userMessage = '無權限存取，請檢查 API Key 設定';
            errorType = 'PERMISSION_DENIED';
        }
    } else if (error.message.includes('400')) {
        userMessage = '搜尋參數有誤，請調整條件後重試';
        errorType = 'BAD_REQUEST';
    } else if (error.message.includes('404')) {
        userMessage = '找不到相關資源';
        errorType = 'NOT_FOUND';
    } else if (error.message.includes('429')) {
        userMessage = '請求過於頻繁，請稍後再試';
        errorType = 'RATE_LIMIT';
    } else if (error.message.includes('500')) {
        userMessage = 'YouTube 服務暫時無法使用，請稍後再試';
        errorType = 'SERVER_ERROR';
    } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
        userMessage = '網路連線問題，請檢查網路設定';
        errorType = 'NETWORK_ERROR';
    }

    const enhancedError = new Error(userMessage);
    enhancedError.originalError = error;
    enhancedError.errorType = errorType;
    enhancedError.context = context;

    console.error('YouTube API Error:', {
        type: errorType,
        message: userMessage,
        original: error.message,
        context: context
    });

    return enhancedError;
};

// ==================== 核心 API 調用函數 ====================

/**
 * YouTube API 基礎調用函數（含快取和錯誤處理）
 * @param {string} endpoint - API 端點 (search, videos, channels)
 * @param {Object} params - 請求參數
 * @param {Object} options - 額外選項 {useCache: boolean, timeout: number}
 * @returns {Promise<Object>} API 回應資料
 */
YOUTUBE_API_UTILS.callApi = async function(endpoint, params = {}, options = {}) {
    if (!this.hasApiKey()) {
        throw new Error('API Key 未設定，請先設定 YouTube API Key');
    }

    // 設定預設選項
    const opts = {
        useCache: true,
        timeout: this.config.timeout,
        ...options
    };

    // 準備請求參數
    const requestParams = {
        key: this._apiKey,
        ...params
    };

    // 檢查快取
    const cacheKey = this._generateCacheKey(endpoint, requestParams);
    if (opts.useCache) {
        const cached = this._getFromCache(cacheKey);
        if (cached) return cached;
    }

    // 建立請求 URL
    const url = new URL(`${this.config.baseUrl}/${endpoint}`);
    Object.entries(requestParams).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
            url.searchParams.append(key, value);
        }
    });

    console.log('YouTube API Request:', url.toString());

    try {
        // 執行請求
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), opts.timeout);

        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'Accept': 'application/json'
            }
        });

        clearTimeout(timeoutId);

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        // 更新配額使用量
        this._updateQuotaUsage(endpoint, params);

        // 儲存到快取
        if (opts.useCache) {
            this._setCache(cacheKey, data);
        }

        return data;

    } catch (error) {
        throw this._handleApiError(error, { endpoint, params });
    }
};

// ==================== 特化 API 函數 ====================

/**
 * 搜尋 YouTube 影片
 * @param {Object} searchParams - 搜尋參數
 * @returns {Promise<Object>} 搜尋結果
 */
YOUTUBE_API_UTILS.searchVideos = async function(searchParams) {
    const params = {
        part: 'snippet',
        type: 'video',
        maxResults: searchParams.size || 20,
        order: 'viewCount',
        safeSearch: 'moderate',
        videoEmbeddable: 'true'
    };

    // 關鍵字搜尋
    if (searchParams.keyword) {
        params.q = searchParams.keyword;
    }

    // 地區設定
    if (searchParams.region) {
        params.regionCode = searchParams.region;
        params.relevanceLanguage = this.regionLanguageMap[searchParams.region] || 'en';
    }

    // 日期範圍
    if (searchParams.dateFrom) {
        params.publishedAfter = new Date(searchParams.dateFrom).toISOString();
    }
    if (searchParams.dateTo) {
        params.publishedBefore = new Date(searchParams.dateTo + 'T23:59:59').toISOString();
    }

    // 影片長度篩選
    if (searchParams.type === 'shorts') {
        params.videoDuration = 'short';  // <4 分鐘
    } else if (searchParams.type === 'videos') {
        params.videoDuration = 'medium';  // 4-20 分鐘
    }

    // 分頁處理
    if (searchParams.pageToken) {
        params.pageToken = searchParams.pageToken;
    }

    return await this.callApi('search', params);
};

/**
 * 取得影片詳細資訊
 * @param {Array<string>} videoIds - 影片 ID 陣列
 * @returns {Promise<Object>} 影片詳細資訊
 */
YOUTUBE_API_UTILS.getVideoDetails = async function(videoIds) {
    if (!videoIds || videoIds.length === 0) {
        return { items: [] };
    }

    // YouTube API 單次最多支援 50 個 ID
    if (videoIds.length > 50) {
        console.warn('影片 ID 數量超過 50，將只處理前 50 個');
        videoIds = videoIds.slice(0, 50);
    }

    const params = {
        part: 'snippet,statistics,contentDetails',
        id: videoIds.join(',')
    };

    return await this.callApi('videos', params);
};

/**
 * 取得頻道資訊
 * @param {Array<string>} channelIds - 頻道 ID 陣列
 * @returns {Promise<Object>} 頻道資訊
 */
YOUTUBE_API_UTILS.getChannelDetails = async function(channelIds) {
    if (!channelIds || channelIds.length === 0) {
        return { items: [] };
    }

    const params = {
        part: 'snippet,statistics',
        id: channelIds.join(',')
    };

    return await this.callApi('channels', params);
};

// ==================== 資料處理工具函數 ====================

/**
 * 解析 YouTube duration 格式 (PT4M13S -> 253 seconds)
 * @param {string} duration - YouTube 時長格式
 * @returns {number} 秒數
 */
YOUTUBE_API_UTILS.parseDuration = function(duration) {
    if (!duration) return 0;

    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;

    const hours = parseInt(match[1]) || 0;
    const minutes = parseInt(match[2]) || 0;
    const seconds = parseInt(match[3]) || 0;

    return hours * 3600 + minutes * 60 + seconds;
};

/**
 * 從影片描述中提取 hashtags
 * @param {string} description - 影片描述
 * @returns {Array<string>} hashtag 陣列
 */
YOUTUBE_API_UTILS.extractHashtags = function(description) {
    if (!description) return [];

    const hashtagRegex = /#[\w\u4e00-\u9fff]+/g;
    const hashtags = description.match(hashtagRegex);

    return hashtags ? hashtags.slice(0, 5) : [];
};

/**
 * 合併搜尋結果和影片詳細資訊
 * @param {Array} searchItems - 搜尋結果項目
 * @param {Array} videoDetails - 影片詳細資訊
 * @returns {Array} 合併後的影片資料
 */
YOUTUBE_API_UTILS.mergeVideoData = function(searchItems, videoDetails) {
    const videoMap = new Map();
    videoDetails.forEach(video => {
        videoMap.set(video.id, video);
    });

    return searchItems.map(searchItem => {
        const videoDetail = videoMap.get(searchItem.id.videoId);
        if (!videoDetail) return null;

        return {
            videoId: searchItem.id.videoId,
            title: videoDetail.snippet.title,
            channelTitle: videoDetail.snippet.channelTitle,
            channelId: videoDetail.snippet.channelId,
            description: videoDetail.snippet.description,
            publishedAt: videoDetail.snippet.publishedAt,
            thumbnails: videoDetail.snippet.thumbnails,

            // 統計資訊
            viewCount: parseInt(videoDetail.statistics.viewCount) || 0,
            likeCount: parseInt(videoDetail.statistics.likeCount) || 0,
            commentCount: parseInt(videoDetail.statistics.commentCount) || 0,

            // 內容詳情
            duration: videoDetail.contentDetails.duration,
            durationSeconds: this.parseDuration(videoDetail.contentDetails.duration),

            // 生成連結
            url: `https://www.youtube.com/watch?v=${searchItem.id.videoId}`,

            // 提取 hashtags
            hashtags: this.extractHashtags(videoDetail.snippet.description)
        };
    }).filter(video => video !== null);
};

// ==================== 配額管理 ====================

/**
 * 更新配額使用量
 * @param {string} endpoint - API 端點
 * @param {Object} params - 請求參數
 */
YOUTUBE_API_UTILS._updateQuotaUsage = function(endpoint, params) {
    const now = Date.now();

    // 每日重置配額計數器
    if (now - this._lastQuotaCheck > 24 * 60 * 60 * 1000) {
        this._quotaUsed = 0;
        this._lastQuotaCheck = now;
    }

    // 計算這次請求的配額消耗
    let quotaCost = this.config.quotaUnits[endpoint] || 1;

    // 特殊處理：videos 端點根據請求的 ID 數量計算
    if (endpoint === 'videos' && params.id) {
        const videoCount = params.id.split(',').length;
        quotaCost = videoCount;
    }

    this._quotaUsed += quotaCost;

    console.log(`配額使用: +${quotaCost}, 總計: ${this._quotaUsed}`);
};

/**
 * 取得配額使用情況
 * @returns {Object} 配額資訊
 */
YOUTUBE_API_UTILS.getQuotaInfo = function() {
    return {
        used: this._quotaUsed,
        limit: 10000,  // YouTube API 預設每日限額
        remaining: Math.max(0, 10000 - this._quotaUsed),
        resetTime: new Date(this._lastQuotaCheck + 24 * 60 * 60 * 1000)
    };
};

// ==================== 初始化和工具函數 ====================

/**
 * 初始化 YouTube API Utils
 * @param {Object} config - 配置選項
 */
YOUTUBE_API_UTILS.init = function(config = {}) {
    // 合併配置
    if (config.apiKey) {
        this.setApiKey(config.apiKey);
    }

    if (config.cache) {
        Object.assign(this.cache, config.cache);
    }

    // 初始化配額計數器
    this._lastQuotaCheck = Date.now();
    this._quotaUsed = 0;

    console.log('YouTube API Utils 初始化完成', {
        hasApiKey: this.hasApiKey(),
        cacheEnabled: this.cache.enabled,
        quotaLimit: this.getQuotaInfo().limit
    });
};

/**
 * 重置所有狀態
 */
YOUTUBE_API_UTILS.reset = function() {
    this._apiKey = null;
    this._cache.clear();
    this._quotaUsed = 0;
    this._lastQuotaCheck = Date.now();
    console.log('YouTube API Utils 已重置');
};

// 導出模組（適用於不同環境）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = YOUTUBE_API_UTILS;
} else if (typeof window !== 'undefined') {
    window.YOUTUBE_API_UTILS = YOUTUBE_API_UTILS;
}