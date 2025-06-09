const express = require('express');
const { checkAdmin, requireJwtAuth } = require('~/server/middleware');
const toieeApiAuth = require('~/server/middleware/toieeApiAuth');
const { createToieeUser, getToieeUsers, updateToieePassword, deleteToieeUser } = require('~/server/services/ToieeService');
const { logger } = require('~/config');

const router = express.Router();

// 認証方式の選択：APIキーまたはJWT認証
const authMiddleware = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.headers['x-toiee-api-key'];
  
  if (apiKey) {
    // APIキー認証を使用
    toieeApiAuth(req, res, next);
  } else {
    // 従来のJWT認証を使用
    requireJwtAuth(req, res, (err) => {
      if (err) return next(err);
      checkAdmin(req, res, next);
    });
  }
};

// 全ルートに認証を適用
router.use(authMiddleware);

/**
 * POST /api/toiee/users
 * ユーザー作成
 */
router.post('/users', async (req, res) => {
  try {
    const { email, name, username, password } = req.body;
    
    logger.info(`[ToieeAPI] Create user request`, {
      email,
      username,
      adminUser: req.user.email
    });

    const result = await createToieeUser({ email, name, username, password });
    
    if (result.success) {
      res.status(201).json(result);
    } else {
      // エラーコードに応じたHTTPステータスコードを設定
      let statusCode = 400;
      if (result.error === 'USER_EXISTS') {
        statusCode = 409; // Conflict
      } else if (result.error === 'INVALID_EMAIL') {
        statusCode = 400; // Bad Request
      } else if (result.error === 'INTERNAL_ERROR') {
        statusCode = 500; // Internal Server Error
      }
      
      res.status(statusCode).json(result);
    }
  } catch (error) {
    logger.error('[ToieeAPI] Error in POST /users:', error);
    res.status(500).json({
      success: false,
      message: 'Something went wrong',
      error: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /api/toiee/users
 * ユーザー一覧取得
 */
router.get('/users', async (req, res) => {
  try {
    const { page, limit } = req.query;
    
    logger.info(`[ToieeAPI] Get users request`, {
      page,
      limit,
      adminUser: req.user.email
    });

    const result = await getToieeUsers({ page, limit });
    
    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    logger.error('[ToieeAPI] Error in GET /users:', error);
    res.status(500).json({
      success: false,
      message: 'Something went wrong',
      error: 'INTERNAL_ERROR'
    });
  }
});

/**
 * PUT /api/toiee/users/:userId/password
 * ユーザーパスワード変更
 */
router.put('/users/:userId/password', async (req, res) => {
  try {
    const { userId } = req.params;
    const { password } = req.body;
    
    logger.info(`[ToieeAPI] Update password request`, {
      userId,
      hasPassword: !!password,
      adminUser: req.user.email
    });

    const result = await updateToieePassword(userId, password);
    
    if (result.success) {
      res.status(200).json(result);
    } else {
      let statusCode = 400;
      if (result.error === 'USER_NOT_FOUND') {
        statusCode = 404; // Not Found
      } else if (result.error === 'INTERNAL_ERROR') {
        statusCode = 500; // Internal Server Error
      }
      
      res.status(statusCode).json(result);
    }
  } catch (error) {
    logger.error('[ToieeAPI] Error in PUT /users/:userId/password:', error);
    res.status(500).json({
      success: false,
      message: 'Something went wrong',
      error: 'INTERNAL_ERROR'
    });
  }
});

/**
 * DELETE /api/toiee/users/:userId
 * ユーザー削除
 */
router.delete('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    logger.info(`[ToieeAPI] Delete user request`, {
      userId,
      requestUser: req.user.email
    });

    const result = await deleteToieeUser(userId);
    
    if (result.success) {
      res.status(200).json(result);
    } else {
      let statusCode = 400;
      if (result.error === 'USER_NOT_FOUND') {
        statusCode = 404; // Not Found
      } else if (result.error === 'ADMIN_DELETE_FORBIDDEN') {
        statusCode = 403; // Forbidden
      } else if (result.error === 'INTERNAL_ERROR') {
        statusCode = 500; // Internal Server Error
      }
      
      res.status(statusCode).json(result);
    }
  } catch (error) {
    logger.error('[ToieeAPI] Error in DELETE /users/:userId:', error);
    res.status(500).json({
      success: false,
      message: 'Something went wrong',
      error: 'INTERNAL_ERROR'
    });
  }
});

module.exports = router;