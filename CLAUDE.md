# LibreChat 外部管理API拡張 仕様書

## 概要

LibreChatに外部システムからユーザー管理を可能にする管理APIを追加する。現在のLibreChatの機能に影響を与えることなく、最小限の機能で実装する。

## 要件

### 基本方針
- 既存のLibreChatコードへの影響を最小限に抑制
- シンプルで必要最小限の機能のみ実装
- 将来のLibreChat公式機能との名前衝突を避けるため `toiee` プレフィックスを使用

### 実装する機能
1. ユーザーの追加
2. ユーザーのパスワード変更
3. ユーザーの一覧取得

## API仕様

### ベースURL
```
/api/toiee
```

### 認証
- 管理者権限（ADMIN role）を持つユーザーのJWT認証が必要
- Authorization: Bearer <jwt-token> ヘッダーで認証

### エンドポイント

#### 1. ユーザー作成
```
POST /api/toiee/users
```

**リクエストボディ:**
```json
{
  "email": "user@example.com",     // 必須
  "name": "User Name",             // 必須
  "username": "username",          // 必須
  "password": "password"           // オプション（未指定時は自動生成）
}
```

**レスポンス (201 Created):**
```json
{
  "success": true,
  "message": "User created successfully",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "User Name",
    "username": "username"
  },
  "generatedPassword": "auto_generated_password" // passwordが未指定の場合のみ
}
```

**エラーレスポンス:**
```json
{
  "success": false,
  "message": "Error message",
  "error": "ERROR_CODE"
}
```

#### 2. ユーザー一覧取得
```
GET /api/toiee/users
```

**クエリパラメータ:**
- `page` (number, optional): ページ番号（デフォルト: 1）
- `limit` (number, optional): 1ページあたりの件数（デフォルト: 20、最大: 100）

**レスポンス (200 OK):**
```json
{
  "success": true,
  "users": [
    {
      "id": "user_id",
      "email": "user@example.com",
      "name": "User Name",
      "username": "username",
      "role": "USER",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalUsers": 87,
    "hasNext": true,
    "hasPrev": false
  }
}
```

#### 3. ユーザーパスワード変更
```
PUT /api/toiee/users/:userId/password
```

**リクエストボディ:**
```json
{
  "password": "new_password"       // オプション（未指定時は自動生成）
}
```

**レスポンス (200 OK):**
```json
{
  "success": true,
  "message": "Password updated successfully",
  "generatedPassword": "auto_generated_password" // passwordが未指定の場合のみ
}
```

## 実装構造

### 1. ファイル構成
```
api/server/
├── services/
│   └── ToieeService.js          // 新規作成
├── routes/
│   └── toiee.js                 // 新規作成
└── middleware/
    └── toieeAuth.js             // 新規作成（必要に応じて）
```

### 2. 既存ファイルの変更
最小限の変更のみ：

**api/server/routes/index.js:**
```javascript
// 追加
const toiee = require('./toiee');

module.exports = {
  // 既存のエクスポート...
  toiee,  // 追加
};
```

**api/server/index.js:**
```javascript
// 追加（適切な場所に）
app.use('/api/toiee', routes.toiee);
```

### 3. サービス層 (ToieeService.js)
```javascript
/**
 * 外部管理用のシンプルなユーザー管理サービス
 * 既存のAuthServiceとmodelsを活用
 */

const createUser = async (userData) => {
  // 既存のregisterUser機能を活用
  // パスワード自動生成機能を追加
};

const getUsers = async (options) => {
  // 既存のfindUser機能を活用
  // ページネーション対応
};

const updatePassword = async (userId, password) => {
  // 既存のupdateUser機能を活用
  // パスワードハッシュ化処理
};
```

### 4. ルート層 (toiee.js)
```javascript
/**
 * 外部管理API用ルート
 * 既存のcheckAdmin middlewareを活用
 */

const router = express.Router();

// 全ルートに管理者認証を適用
router.use(requireJwtAuth);
router.use(checkAdmin);

router.post('/users', createUserHandler);
router.get('/users', getUsersHandler);
router.put('/users/:userId/password', updatePasswordHandler);
```

## セキュリティ考慮事項

### 認証・認可
- JWT認証必須
- ADMIN role必須
- 適切なエラーメッセージ（情報漏洩防止）

### 入力検証
- 既存のvalidation schemaを活用
- メールアドレス形式チェック
- パスワード強度チェック（オプション）

### ログ記録
- 全API操作のログ記録
- 管理者ユーザーの特定
- セキュリティ監査対応

## パフォーマンス考慮事項

### ページネーション
- デフォルト20件、最大100件制限
- MongoDB効率的クエリ使用

### キャッシュ戦略
- 必要に応じてRedisキャッシュ活用
- ユーザー一覧の適切なキャッシュTTL設定

## エラーハンドリング

### エラーコード
- `USER_EXISTS`: ユーザーが既に存在
- `INVALID_EMAIL`: 無効なメールアドレス
- `USER_NOT_FOUND`: ユーザーが見つからない
- `WEAK_PASSWORD`: パスワードが弱い
- `INVALID_INPUT`: 入力データが無効

### ログレベル
- INFO: 正常操作
- WARN: 入力エラー、権限エラー
- ERROR: システムエラー

## テスト戦略

### 単体テスト
- ToieeService各メソッドのテスト
- モック使用でDB依存を排除

### 統合テスト
- APIエンドポイントのテスト
- 認証・認可のテスト
- エラーハンドリングのテスト

### E2Eテスト
- 実際のFlaskシステムからの呼び出しテスト

## デプロイメント

### 環境設定
```bash
# .env に追加設定項目なし（既存設定を活用）
# 必要に応じて:
# TOIEE_API_ENABLED=true
# TOIEE_PASSWORD_MIN_LENGTH=8
```

### マイグレーション
- データベース変更なし
- 既存ユーザーデータ構造をそのまま使用

## 使用例（Flask連携）

```python
import requests

class LibreChatToieeAPI:
    def __init__(self, base_url, admin_token):
        self.base_url = base_url
        self.headers = {
            'Authorization': f'Bearer {admin_token}',
            'Content-Type': 'application/json'
        }
    
    def create_user(self, email, name, username, password=None):
        """ユーザー作成"""
        url = f"{self.base_url}/api/toiee/users"
        data = {
            "email": email,
            "name": name,
            "username": username
        }
        if password:
            data["password"] = password
        
        response = requests.post(url, headers=self.headers, json=data)
        return response.json()
    
    def get_users(self, page=1, limit=20):
        """ユーザー一覧取得"""
        url = f"{self.base_url}/api/toiee/users"
        params = {"page": page, "limit": limit}
        
        response = requests.get(url, headers=self.headers, params=params)
        return response.json()
    
    def update_password(self, user_id, password=None):
        """パスワード変更"""
        url = f"{self.base_url}/api/toiee/users/{user_id}/password"
        data = {}
        if password:
            data["password"] = password
        
        response = requests.put(url, headers=self.headers, json=data)
        return response.json()

# 使用例
api = LibreChatToieeAPI("http://localhost:3080", "admin-jwt-token")

# 学生アカウント作成
result = api.create_user(
    email="student@example.com",
    name="田中太郎", 
    username="tanaka"
)
print(f"作成結果: {result}")

# ユーザー一覧取得
users = api.get_users(page=1, limit=10)
print(f"ユーザー数: {users['pagination']['totalUsers']}")

# パスワード変更
password_result = api.update_password(user_id="user123")
print(f"新しいパスワード: {password_result.get('generatedPassword')}")
```

## 保守・運用

### モニタリング
- API呼び出し頻度の監視
- エラー率の監視
- レスポンス時間の監視

### ログ分析
- 管理者操作の監査ログ
- セキュリティインシデントの検出

### アップデート対応
- LibreChatのバージョンアップ時の影響確認
- 後方互換性の維持

## 将来の拡張可能性

### 段階的機能追加
1. 現在の最小機能での実装・検証
2. 必要に応じて以下機能を追加:
   - ユーザー削除
   - ユーザー情報更新
   - 一括操作
   - 高度な検索・フィルタリング

### 設計原則
- 単一責任の原則
- 既存機能への非影響
- 拡張性の確保
- セキュリティファースト