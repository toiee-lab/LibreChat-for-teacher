const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { SystemRoles } = require('librechat-data-provider');
const {
  findUser,
  createUser,
  updateUser,
  countUsers,
  deleteUserById,
} = require('~/models');
const { isEmailDomainAllowed } = require('~/server/services/domains');
const { getBalanceConfig } = require('~/server/services/Config');
const { logger } = require('~/config');

/**
 * 外部管理用のシンプルなユーザー管理サービス
 * 既存のAuthServiceとmodelsを活用
 */

/**
 * 英小文字と数字のみで10桁のパスワードを生成
 * @returns {string} 生成されたパスワード
 */
const generatePassword = () => {
  const charset = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  
  for (let i = 0; i < 10; i++) {
    const randomIndex = crypto.randomInt(0, charset.length);
    password += charset[randomIndex];
  }
  
  return password;
};

/**
 * ユーザー作成
 * @param {Object} userData - ユーザーデータ
 * @param {string} userData.email - メールアドレス（必須）
 * @param {string} userData.name - 名前（必須）
 * @param {string} userData.username - ユーザー名（必須）
 * @param {string} [userData.password] - パスワード（オプション）
 * @returns {Object} 作成結果
 */
const createToieeUser = async (userData) => {
  try {
    const { email, name, username, password } = userData;

    // 必須フィールドの検証
    if (!email || !name || !username) {
      return {
        success: false,
        message: 'Email, name, and username are required',
        error: 'INVALID_INPUT'
      };
    }

    // メールアドレス形式の簡易チェック
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        success: false,
        message: 'Invalid email format',
        error: 'INVALID_EMAIL'
      };
    }

    // 既存ユーザーチェック
    const existingUser = await findUser({ email }, 'email _id');
    if (existingUser) {
      return {
        success: false,
        message: 'User already exists',
        error: 'USER_EXISTS'
      };
    }

    // ユーザー名の重複チェック
    const existingUsername = await findUser({ username }, 'username _id');
    if (existingUsername) {
      return {
        success: false,
        message: 'Username already exists',
        error: 'USER_EXISTS'
      };
    }

    // ドメイン許可チェック
    if (!(await isEmailDomainAllowed(email))) {
      return {
        success: false,
        message: 'Email domain not allowed',
        error: 'INVALID_EMAIL'
      };
    }

    // パスワード処理
    const finalPassword = password || generatePassword();
    const salt = bcrypt.genSaltSync(10);
    
    const newUserData = {
      provider: 'local',
      email,
      username,
      name,
      avatar: null,
      role: SystemRoles.USER,
      password: bcrypt.hashSync(finalPassword, salt),
      emailVerified: true, // 外部管理では自動で検証済みとする
    };

    const balanceConfig = await getBalanceConfig();
    const newUser = await createUser(newUserData, balanceConfig, true, true);

    logger.info(`[ToieeService] User created successfully`, {
      userId: newUser._id,
      email: newUser.email,
      username: newUser.username
    });

    const response = {
      success: true,
      message: 'User created successfully',
      user: {
        id: newUser._id,
        email: newUser.email,
        name: newUser.name,
        username: newUser.username
      }
    };

    // パスワードが自動生成された場合のみレスポンスに含める
    if (!password) {
      response.generatedPassword = finalPassword;
    }

    return response;

  } catch (err) {
    logger.error('[ToieeService] Error in creating user:', err);
    return {
      success: false,
      message: 'Something went wrong',
      error: 'INTERNAL_ERROR'
    };
  }
};

/**
 * ユーザー一覧取得
 * @param {Object} options - 取得オプション
 * @param {number} [options.page=1] - ページ番号
 * @param {number} [options.limit=20] - 1ページあたりの件数
 * @returns {Object} ユーザー一覧と ページネーション情報
 */
const getToieeUsers = async (options = {}) => {
  try {
    const page = Math.max(1, parseInt(options.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(options.limit) || 20));
    const skip = (page - 1) * limit;

    // 総ユーザー数を取得
    const totalUsers = await countUsers();
    const totalPages = Math.ceil(totalUsers / limit);

    // ユーザー一覧を取得（パスワードフィールドは除外）
    const users = await findUser(
      {},
      'email name username role createdAt',
      { skip, limit, sort: { createdAt: -1 } }
    );

    logger.info(`[ToieeService] Users retrieved successfully`, {
      page,
      limit,
      totalUsers,
      returnedCount: users ? users.length : 0
    });

    return {
      success: true,
      users: users || [],
      pagination: {
        currentPage: page,
        totalPages,
        totalUsers,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };

  } catch (err) {
    logger.error('[ToieeService] Error in getting users:', err);
    return {
      success: false,
      message: 'Something went wrong',
      error: 'INTERNAL_ERROR'
    };
  }
};

/**
 * ユーザーパスワード変更
 * @param {string} userId - ユーザーID
 * @param {string} [password] - 新しいパスワード（オプション）
 * @returns {Object} 更新結果
 */
const updateToieePassword = async (userId, password) => {
  try {
    // ユーザー存在チェック
    const user = await findUser({ _id: userId }, '_id email');
    if (!user) {
      return {
        success: false,
        message: 'User not found',
        error: 'USER_NOT_FOUND'
      };
    }

    // パスワード処理
    const finalPassword = password || generatePassword();
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(finalPassword, salt);

    // パスワード更新
    await updateUser(userId, { password: hashedPassword });

    logger.info(`[ToieeService] Password updated successfully`, {
      userId,
      email: user.email
    });

    const response = {
      success: true,
      message: 'Password updated successfully'
    };

    // パスワードが自動生成された場合のみレスポンスに含める
    if (!password) {
      response.generatedPassword = finalPassword;
    }

    return response;

  } catch (err) {
    logger.error('[ToieeService] Error in updating password:', err);
    return {
      success: false,
      message: 'Something went wrong',
      error: 'INTERNAL_ERROR'
    };
  }
};

/**
 * ユーザー削除
 * @param {string} userId - ユーザーID
 * @returns {Object} 削除結果
 */
const deleteToieeUser = async (userId) => {
  try {
    // ユーザー存在チェック
    const user = await findUser({ _id: userId }, '_id email role');
    if (!user) {
      return {
        success: false,
        message: 'User not found',
        error: 'USER_NOT_FOUND'
      };
    }

    // 管理者ユーザーの削除を防ぐ
    if (user.role === SystemRoles.ADMIN) {
      return {
        success: false,
        message: 'Cannot delete admin user',
        error: 'ADMIN_DELETE_FORBIDDEN'
      };
    }

    // ユーザー削除実行
    const result = await deleteUserById(userId);
    
    if (result && result.deletedCount > 0) {
      logger.info(`[ToieeService] User deleted successfully`, {
        userId,
        email: user.email
      });

      return {
        success: true,
        message: 'User deleted successfully'
      };
    } else {
      return {
        success: false,
        message: 'Failed to delete user',
        error: 'DELETE_FAILED'
      };
    }

  } catch (err) {
    logger.error('[ToieeService] Error in deleting user:', err);
    return {
      success: false,
      message: 'Something went wrong',
      error: 'INTERNAL_ERROR'
    };
  }
};

module.exports = {
  createToieeUser,
  getToieeUsers,
  updateToieePassword,
  deleteToieeUser,
  generatePassword, // テスト用にエクスポート
};