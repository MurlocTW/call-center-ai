# Web Mic 測試指南

## 概述

Web Mic 功能允許您直接透過瀏覽器麥克風測試 Call Center AI，無需實際撥打電話。

## 架構說明

```
瀏覽器麥克風
    ↓ (WebSocket: /webmic/wss)
    ↓ (PCM 16-bit, 16 kHz, mono)
Azure Speech Services STT
    ↓
Azure OpenAI GPT-4.1
    ↓
Azure Speech Services TTS
    ↓ (WebSocket: /webmic/wss)
    ↓ (PCM 16-bit, 16 kHz, mono)
瀏覽器播放
```

## 如何測試

### 本地測試

#### 1. 啟動應用程式

```bash
cd /path/to/call-center-ai
python -m app.main
```

#### 2. 開啟瀏覽器

訪問：`http://localhost:8080`

### Azure 部署測試

#### 1. 重新部署應用

```bash
cd /path/to/call-center-ai
make deploy
```

#### 2. 開啟瀏覽器

訪問您的 Azure Container Apps URL，例如：
`https://call-center-ai.happyground-10bf97cb.swedencentral.azurecontainerapps.io`

### 3. 測試步驟

1. 點擊「Start Conversation」按鈕
2. 允許瀏覽器訪問麥克風
3. 看到「Connected - Speak now...」訊息後開始說話
4. AI 會透過您的揚聲器回應
5. 點擊「Stop Conversation」結束測試

## 技術細節

### 前端文件
- `public/index.html` - Web UI 頁面
- `public/app.js` - 音頻捕獲和 WebSocket 邏輯
- `public/style.css` - 樣式

### 後端端點
- `GET /` - 提供測試頁面
- `GET /static/*` - 提供靜態資源
- `WebSocket /webmic/wss` - 音頻串流端點

### 音頻格式
- **採樣率**: 16 kHz（與 ACS 相同）
- **位元深度**: 16-bit PCM
- **聲道**: 單聲道 (Mono)
- **傳輸格式**: 原始二進制數據（非 Base64）

### 與 ACS 的差異

| 項目 | ACS 電話 | Web Mic |
|------|----------|---------|
| 音頻來源 | 電話線路 | 瀏覽器麥克風 |
| 連線方式 | Azure Communication Services | WebSocket 直連 |
| 電話號碼 | 真實號碼 | 虛擬測試號碼 (+00000000000) |
| 音頻處理 | 完全相同 (STT → LLM → TTS) | 完全相同 (STT → LLM → TTS) |

## 故障排除

### 麥克風無法訪問
- 確保瀏覽器有麥克風權限
- 檢查作業系統的隱私設定
- 嘗試使用 HTTPS（某些瀏覽器要求）

### 沒有音頻輸出
- 檢查瀏覽器控制台的錯誤訊息
- 確認 Azure Speech Services 配置正確
- 檢查後端日誌 `logger.info/logger.error`

### WebSocket 連線失敗
- 確認應用程式正在運行
- 檢查防火牆設定
- 查看後端日誌中的錯誤訊息

## 注意事項

1. **不影響現有 ACS 功能** - Web Mic 是完全獨立的測試介面
2. **使用相同的 LLM 配置** - 會話邏輯、工具、提示詞都與 ACS 相同
3. **測試用途** - 這是為了方便測試而設計，生產環境仍使用 ACS
4. **資源消耗** - 與真實電話呼叫消耗相同的 Azure 資源（Speech Services, OpenAI, etc.）

## 開發參考

### 關鍵文件
- `app/main.py:719-814` - WebSocket 端點實現
- `app/main.py:184` - 靜態文件掛載
- `app/main.py:187-195` - 根路徑處理
- `app/helpers/call_events.py` - 音頻處理管道（與 ACS 共用）

### 音頻流處理
WebSocket 端點複用了 `on_audio_connected()` 函數，該函數處理：
1. 音頻輸入隊列 → Azure Speech STT
2. 語音識別結果 → LLM 推理
3. LLM 回應 → Azure Speech TTS
4. TTS 音頻 → 音頻輸出隊列

這與 ACS 電話呼叫使用完全相同的處理邏輯。
