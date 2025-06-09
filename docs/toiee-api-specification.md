# Toiee管理API仕様書

## 概要

LibreChatに統合された外部システム向けユーザー管理API。安定したAPIキー認証により、外部システムから安全にユーザーの作成、削除、一覧取得が可能。

## 基本情報

- **ベースURL**: `http://localhost:3080/api/toiee`
- **認証方式**: APIキー認証（推奨）またはJWT認証
- **レスポンス形式**: JSON
- **文字エンコーディング**: UTF-8

## 認証

### APIキー認証（推奨）

外部システムからの安定した利用に最適。

**ヘッダー:**
```
X-API-Key: your-secret-api-key
```

**環境変数設定:**
```bash
TOIEE_API_KEY=your-secret-api-key
```

**特徴:**
- 有効期限なし
- 自動管理者権限
- 簡単な実装

### JWT認証（レガシー）

ブラウザベースの利用向け。

**ヘッダー:**
```
Authorization: Bearer <jwt-token>
```

**制限:**
- 短い有効期限（15分程度）
- 管理者権限必須
- トークン更新が必要

## エンドポイント

### 1. ユーザー作成

新しいユーザーアカウントを作成します。

**エンドポイント:**
```
POST /api/toiee/users
```

**リクエストヘッダー:**
```
X-API-Key: your-secret-api-key
Content-Type: application/json
```

**リクエストボディ:**
```json
{
  "email": "user@example.com",      // 必須: メールアドレス
  "name": "User Name",              // 必須: 表示名
  "username": "username",           // 必須: ユーザー名（ユニーク）
  "password": "password123"         // オプション: 未指定時は自動生成
}
```

**成功レスポンス (201 Created):**
```json
{
  "success": true,
  "message": "User created successfully",
  "user": {
    "id": "64f7b8c9d123456789abcdef",
    "email": "user@example.com",
    "name": "User Name",
    "username": "username"
  },
  "generatedPassword": "m1us3wsqc9"  // passwordが未指定の場合のみ
}
```

**エラーレスポンス:**
```json
// 400 Bad Request - 入力エラー
{
  "success": false,
  "message": "Email, name, and username are required",
  "error": "INVALID_INPUT"
}

// 409 Conflict - ユーザー重複
{
  "success": false,
  "message": "User already exists",
  "error": "USER_EXISTS"
}

// 400 Bad Request - ドメイン制限
{
  "success": false,
  "message": "Email domain not allowed",
  "error": "INVALID_EMAIL"
}
```

### 2. ユーザー一覧取得

登録済みユーザーの一覧を取得します。

**エンドポイント:**
```
GET /api/toiee/users
```

**クエリパラメータ:**
```
?page=1&limit=20
```

| パラメータ | 型 | デフォルト | 説明 |
|-----------|-----|----------|------|
| page | number | 1 | ページ番号（1以上） |
| limit | number | 20 | 1ページあたりの件数（1-100） |

**リクエストヘッダー:**
```
X-API-Key: your-secret-api-key
```

**成功レスポンス (200 OK):**
```json
{
  "success": true,
  "users": [
    {
      "id": "64f7b8c9d123456789abcdef",
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

### 3. パスワード変更

指定ユーザーのパスワードを変更します。

**エンドポイント:**
```
PUT /api/toiee/users/:userId/password
```

**パスパラメータ:**
- `userId`: 対象ユーザーのID

**リクエストヘッダー:**
```
X-API-Key: your-secret-api-key
Content-Type: application/json
```

**リクエストボディ:**
```json
{
  "password": "new_password"        // オプション: 未指定時は自動生成
}
```

**成功レスポンス (200 OK):**
```json
{
  "success": true,
  "message": "Password updated successfully",
  "generatedPassword": "x7k9m2p1q5"  // passwordが未指定の場合のみ
}
```

**エラーレスポンス:**
```json
// 404 Not Found
{
  "success": false,
  "message": "User not found",
  "error": "USER_NOT_FOUND"
}
```

### 4. ユーザー削除

指定ユーザーを削除します。

**エンドポイント:**
```
DELETE /api/toiee/users/:userId
```

**パスパラメータ:**
- `userId`: 削除対象ユーザーのID

**リクエストヘッダー:**
```
X-API-Key: your-secret-api-key
```

**成功レスポンス (200 OK):**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

**エラーレスポンス:**
```json
// 404 Not Found
{
  "success": false,
  "message": "User not found",
  "error": "USER_NOT_FOUND"
}

// 403 Forbidden - 管理者削除禁止
{
  "success": false,
  "message": "Cannot delete admin user",
  "error": "ADMIN_DELETE_FORBIDDEN"
}
```

## エラーコード一覧

| エラーコード | 説明 | 対処法 |
|-------------|------|--------|
| `INVALID_INPUT` | 必須フィールド不足 | リクエストデータを確認 |
| `INVALID_EMAIL` | 無効なメール形式またはドメイン制限 | メールアドレスを確認 |
| `USER_EXISTS` | ユーザー重複 | 異なるメール/ユーザー名を使用 |
| `USER_NOT_FOUND` | ユーザーが存在しない | ユーザーIDを確認 |
| `ADMIN_DELETE_FORBIDDEN` | 管理者削除禁止 | 管理者以外のユーザーを指定 |
| `MISSING_API_KEY` | APIキー未提供 | X-API-Keyヘッダーを設定 |
| `INVALID_API_KEY` | 無効なAPIキー | 正しいAPIキーを確認 |
| `CONFIGURATION_ERROR` | サーバー設定エラー | 管理者に連絡 |
| `INTERNAL_ERROR` | サーバー内部エラー | 管理者に連絡 |

## Python実装例

### 基本クラス

```python
import requests
from typing import Optional, Dict, Any

class LibreChatToieeAPI:
    """LibreChat Toiee管理API クライアント"""
    
    def __init__(self, base_url: str, api_key: str):
        """
        初期化
        
        Args:
            base_url: LibreChatのベースURL (例: "http://localhost:3080")
            api_key: Toiee管理APIキー
        """
        self.base_url = base_url.rstrip('/')
        self.headers = {
            'X-API-Key': api_key,
            'Content-Type': 'application/json'
        }
    
    def create_user(self, email: str, name: str, username: str, 
                   password: Optional[str] = None) -> Dict[str, Any]:
        """
        ユーザー作成
        
        Args:
            email: メールアドレス
            name: 表示名
            username: ユーザー名
            password: パスワード（省略時は自動生成）
            
        Returns:
            APIレスポンス辞書
            
        Raises:
            requests.RequestException: API呼び出しエラー
        """
        url = f"{self.base_url}/api/toiee/users"
        data = {
            "email": email,
            "name": name,
            "username": username
        }
        if password:
            data["password"] = password
            
        response = requests.post(url, headers=self.headers, json=data)
        response.raise_for_status()
        return response.json()
    
    def list_users(self, page: int = 1, limit: int = 20) -> Dict[str, Any]:
        """
        ユーザー一覧取得
        
        Args:
            page: ページ番号（1以上）
            limit: 1ページあたりの件数（1-100）
            
        Returns:
            APIレスポンス辞書
        """
        url = f"{self.base_url}/api/toiee/users"
        params = {"page": page, "limit": limit}
        
        response = requests.get(url, headers=self.headers, params=params)
        response.raise_for_status()
        return response.json()
    
    def update_password(self, user_id: str, 
                       password: Optional[str] = None) -> Dict[str, Any]:
        """
        パスワード変更
        
        Args:
            user_id: ユーザーID
            password: 新しいパスワード（省略時は自動生成）
            
        Returns:
            APIレスポンス辞書
        """
        url = f"{self.base_url}/api/toiee/users/{user_id}/password"
        data = {}
        if password:
            data["password"] = password
            
        response = requests.put(url, headers=self.headers, json=data)
        response.raise_for_status()
        return response.json()
    
    def delete_user(self, user_id: str) -> Dict[str, Any]:
        """
        ユーザー削除
        
        Args:
            user_id: 削除するユーザーのID
            
        Returns:
            APIレスポンス辞書
        """
        url = f"{self.base_url}/api/toiee/users/{user_id}"
        
        response = requests.delete(url, headers=self.headers)
        response.raise_for_status()
        return response.json()
```

### 使用例

```python
# 初期化
api = LibreChatToieeAPI(
    base_url="http://localhost:3080", 
    api_key="toiee-api-secret-key-2025"
)

try:
    # 学生アカウント作成
    result = api.create_user(
        email="student@toiee.jp",
        name="田中太郎",
        username="tanaka"
    )
    print(f"ユーザー作成成功: {result['user']['id']}")
    print(f"自動生成パスワード: {result.get('generatedPassword')}")
    
    # ユーザー一覧取得
    users_data = api.list_users(page=1, limit=10)
    print(f"総ユーザー数: {users_data['pagination']['totalUsers']}")
    
    # パスワード変更
    password_result = api.update_password(result['user']['id'])
    print(f"新パスワード: {password_result.get('generatedPassword')}")
    
    # ユーザー削除
    delete_result = api.delete_user(result['user']['id'])
    print(f"削除結果: {delete_result['message']}")
    
except requests.RequestException as e:
    print(f"API エラー: {e}")
    if hasattr(e, 'response') and e.response is not None:
        print(f"詳細: {e.response.json()}")
```

### エラーハンドリング例

```python
def safe_create_user(api, email, name, username, password=None):
    """安全なユーザー作成（エラーハンドリング付き）"""
    try:
        return api.create_user(email, name, username, password)
    except requests.HTTPError as e:
        if e.response.status_code == 409:
            print(f"ユーザーが既に存在します: {email}")
        elif e.response.status_code == 400:
            error_data = e.response.json()
            if error_data.get('error') == 'INVALID_EMAIL':
                print(f"無効なメールドメイン: {email}")
            else:
                print(f"入力エラー: {error_data.get('message')}")
        else:
            print(f"予期しないエラー: {e}")
        return None
    except requests.RequestException as e:
        print(f"ネットワークエラー: {e}")
        return None
```

## セキュリティ考慮事項

### APIキー管理

- **環境変数での管理**: APIキーはコードに直接記述せず、環境変数で管理
- **定期的な更新**: セキュリティ向上のため、定期的にAPIキーを更新
- **アクセス制限**: APIキーは必要最小限の人員のみに共有

### ネットワークセキュリティ

- **HTTPS使用**: 本番環境では必ずHTTPS通信を使用
- **IP制限**: 可能であれば、特定IPアドレスからのアクセスのみ許可
- **レート制限**: 過度なAPI呼び出しを防ぐためのレート制限を実装

### データ保護

- **パスワード管理**: 自動生成されたパスワードは安全に管理
- **ログ記録**: API操作のログを適切に記録・監査
- **データ最小化**: 必要最小限のユーザーデータのみ取得・保存

## ログとモニタリング

### API操作ログ

すべてのAPI操作は以下の形式でログ記録されます：

```
[ToieeAPI] User created successfully { userId: "...", email: "...", adminUser: "toiee-api@system" }
[ToieeAPI] User deleted successfully { userId: "...", email: "...", requestUser: "toiee-api@system" }
[ToieeAPI] Invalid API key provided { providedKey: "invalid***", ip: "127.0.0.1" }
```

### モニタリング推奨項目

- API呼び出し頻度
- エラー率の監視
- レスポンス時間の測定
- 不正アクセス試行の検出

## 制限事項

### 技術的制限

- **同時接続数**: デフォルトのNode.jsの制限に準拠
- **リクエストサイズ**: 最大3MB
- **レスポンスタイムアウト**: 30秒

### 機能的制限

- **管理者削除**: ADMINロールのユーザーは削除不可
- **ドメイン制限**: 許可されたドメインのメールアドレスのみ
- **ユーザー名重複**: 同一ユーザー名は登録不可

## サポート

### トラブルシューティング

1. **APIキーエラー**: 環境変数 `TOIEE_API_KEY` の設定を確認
2. **ドメインエラー**: LibreChatのドメイン設定を確認
3. **接続エラー**: LibreChatサーバーの稼働状況を確認

### 更新履歴

- **v1.0.0**: 初回リリース
  - APIキー認証システム
  - CRUD操作の完全実装
  - セキュリティ機能の実装

---

*この仕様書はLibreChat Toiee管理API v1.0.0に基づいています。*
*最新の情報については、GitHubリポジトリまたは管理者にお問い合わせください。*