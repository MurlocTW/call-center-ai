# Web Mic 部署步驟

## 重新部署到 Azure

```bash
# 1. 切換到 Linux 環境的項目目錄
cd ~/call-center-ai

# 2. 確認修改已同步（如果使用 Windows + Linux 雙環境）
# 建議使用 git pull 或直接在 Linux 環境編輯

# 3. 重新部署
make deploy

# 4. 等待部署完成（約 5-10 分鐘）
# 看到 "🚀 Call Center AI is running on https://..." 即完成
```

## 驗證部署

### 1. 測試根路徑
訪問：`https://call-center-ai.happyground-10bf97cb.swedencentral.azurecontainerapps.io`

**預期結果：**
- ✅ 看到 "Call Center AI - Web Microphone Test Interface" 頁面
- ✅ 紫色漸變背景
- ✅ "Start Conversation" 按鈕

### 2. 測試靜態文件
訪問：`https://call-center-ai.happyground-10bf97cb.swedencentral.azurecontainerapps.io/static/app.js`

**預期結果：**
- ✅ 返回 JavaScript 代碼內容
- ✅ 包含 `startRecording()` 等函數

### 3. 測試 WebSocket
1. 點擊 "Start Conversation"
2. 允許麥克風訪問
3. 說話測試

**預期結果：**
- ✅ 狀態顯示 "Connected - Speak now..."
- ✅ AI 能聽到並回應

## 如果仍然 404

### 檢查容器日誌
```bash
# 查看應用日誌
az containerapp logs show \
  --name <container-app-name> \
  --resource-group <resource-group> \
  --follow
```

### 檢查文件是否存在
```bash
# 登入容器
az containerapp exec \
  --name <container-app-name> \
  --resource-group <resource-group>

# 在容器內檢查
ls -la /app/public/
cat /app/public/index.html
```

### 驗證路由註冊
查看應用啟動日誌，確認 `GET /` 路由已註冊。

## 關鍵修復點

### 1. 路徑修正（已完成）
```python
# 使用正確的相對路徑
_public_dir = str(Path(__file__).parent.parent / "public")
```

### 2. Mount 順序修正（已完成）
```python
# 在文件最後 mount，而不是開頭
# Line 1268-1271
api.mount("/static", StaticFiles(directory=_public_dir), name="static")
```

## 快速測試（本地）

在部署前，可以在本地測試：

```bash
# Linux/Mac
cd ~/call-center-ai
python -m app.main

# Windows
cd C:\Github\call-center-ai
python -m app.main

# 訪問 http://localhost:8080
```

## 故障排除

### 問題：仍然 404
**可能原因：**
1. 代碼未正確同步到部署環境
2. 容器構建緩存問題
3. public 目錄未包含在鏡像中

**解決方案：**
```bash
# 強制重新構建
make deploy --always-make
```

### 問題：靜態文件 404
**可能原因：**
Mount 路徑錯誤或順序錯誤

**解決方案：**
確認 `api.mount()` 在文件最後一行

### 問題：WebSocket 連接失敗
**可能原因：**
Azure Container Apps 需要配置 WebSocket 支持

**解決方案：**
檢查 Azure Container Apps 配置是否啟用 WebSocket
