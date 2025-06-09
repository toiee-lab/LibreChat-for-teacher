const { logger } = require('~/config');

/**
 * Toiee API専用認証ミドルウェア
 * 環境変数 TOIEE_API_KEY によるAPIキー認証
 */
const toieeApiAuth = (req, res, next) => {
  try {
    const apiKey = process.env.TOIEE_API_KEY;
    
    // 環境変数にAPIキーが設定されていない場合
    if (!apiKey) {
      logger.error('[ToieeAPI] TOIEE_API_KEY environment variable not set');
      return res.status(500).json({
        success: false,
        message: 'API key not configured',
        error: 'CONFIGURATION_ERROR'
      });
    }

    // リクエストヘッダーからAPIキーを取得
    const providedKey = req.headers['x-api-key'] || req.headers['x-toiee-api-key'];
    
    if (!providedKey) {
      logger.warn('[ToieeAPI] Missing API key in request headers', {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      return res.status(401).json({
        success: false,
        message: 'API key required. Provide X-API-Key header',
        error: 'MISSING_API_KEY'
      });
    }

    // APIキーの検証
    if (providedKey !== apiKey) {
      logger.warn('[ToieeAPI] Invalid API key provided', {
        providedKey: providedKey.substring(0, 8) + '***', // ログには一部のみ記録
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      return res.status(401).json({
        success: false,
        message: 'Invalid API key',
        error: 'INVALID_API_KEY'
      });
    }

    // 認証成功
    logger.info('[ToieeAPI] API key authentication successful', {
      ip: req.ip,
      endpoint: `${req.method} ${req.path}`
    });

    // 管理者権限を模擬（APIキー認証では自動的に管理者とみなす）
    req.user = {
      _id: 'toiee-api-service',
      email: 'toiee-api@system',
      role: 'ADMIN',
      name: 'Toiee API Service'
    };

    next();
  } catch (error) {
    logger.error('[ToieeAPI] Authentication middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication error',
      error: 'INTERNAL_ERROR'
    });
  }
};

module.exports = toieeApiAuth;