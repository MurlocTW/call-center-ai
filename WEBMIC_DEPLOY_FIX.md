# Web Mic 部署修復說明

## 問題描述

初次部署後，訪問根路徑 `/` 返回 404 Not Found 錯誤。

## 根本原因

靜態文件路徑使用了 `resources_dir("../public")`，在容器環境中解析為錯誤的路徑：
- **錯誤路徑**: `/app/app/public` (不存在)
- **正確路徑**: `/app/public` (實際位置)

## 修復內容

### app/main.py 的修改

#### 1. 添加 Path 導入 (Line 9)
```python
from pathlib import Path
```

#### 2. 修正靜態文件目錄路徑 (Line 184-185)
```python
# 修復前
api.mount("/static", StaticFiles(directory=resources_dir("../public")), name="static")

# 修復後
_public_dir = str(Path(__file__).parent.parent / "public")
api.mount("/static", StaticFiles(directory=_public_dir), name="static")
```

#### 3. 修正 index.html 路徑 (Line 197)
```python
# 修復前
return FileResponse(resources_dir("../public/index.html"))

# 修復後
return FileResponse(str(Path(_public_dir) / "index.html"))
```

### 路徑解析邏輯

```
__file__               = /app/app/main.py
Path(__file__).parent  = /app/app
Path(__file__).parent.parent = /app
Path(__file__).parent.parent / "public" = /app/public ✓
```

## 重新部署

```bash
# 1. 提交修改（如果使用 git）
git add app/main.py
git commit -m "fix: correct static files path for container deployment"

# 2. 重新部署到 Azure
make deploy

# 3. 驗證部署
# 訪問 https://your-app.azurecontainerapps.io
# 應該看到 Web Mic 測試頁面
```

## 驗證修復

部署完成後，訪問根路徑應該看到：
- ✅ "Call Center AI - Web Microphone Test Interface" 頁面
- ✅ "Start Conversation" 按鈕
- ✅ 樣式正確加載（漸變背景）

## 技術細節

### 容器文件結構
```
/app/                      # 工作目錄 (WORKDIR)
├── app/                   # Python 應用
│   ├── main.py           # FastAPI 應用 (__file__ 位置)
│   ├── helpers/
│   └── models/
├── public/               # 靜態文件 (修復後的正確路徑)
│   ├── index.html
│   ├── app.js
│   └── style.css
├── resources/            # 其他資源
└── pyproject.toml
```

### Dockerfile 相關行
```dockerfile
WORKDIR /app              # 設置工作目錄
COPY . .                  # 複製所有文件到 /app
```

## 本地開發 vs 容器環境

| 環境 | 工作目錄 | public 路徑 | 解析結果 |
|------|----------|-------------|----------|
| 本地開發 | `/home/user/call-center-ai` | `{cwd}/public` | ✓ 正確 |
| 容器 (修復前) | `/app` | `/app/app/public` | ✗ 錯誤 |
| 容器 (修復後) | `/app` | `/app/public` | ✓ 正確 |

## 相關文件

- `app/main.py` - 主要修改文件
- `cicd/Dockerfile` - 容器構建配置
- `public/` - 靜態文件目錄
- `WEBMIC_TEST.md` - 測試指南
