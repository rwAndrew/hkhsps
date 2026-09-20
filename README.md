# 拍貼取件頁

校慶拍貼攤位的 QR Code 掃描頁。客人掃紙上的 QR → 開啟 `https://hkhsps.vercel.app/p/編號` → 下載照片。

純靜態網站，沒有建置步驟、沒有後端。

## 運作方式

```
QR 內容:  HTTPS://HKHSPS.VERCEL.APP/P/95CA6      （大寫，為了讓 QR 更小）
              │
              ▼
vercel.json 把 /p/編號 導到 index.html
              │
              ▼
index.html 讀 <PHOTO_BASE>/95CA6/manifest.json
              ├─ 404       → 顯示「今晚 8 點前上線」
              ├─ 連線失敗   → 顯示「連線不太順」＋重試
              └─ 有資料     → 顯示成品圖與原始照片，可下載
```

編號一律轉大寫處理，`/p/95ca6` 和 `/P/95CA6` 是同一個。

## 檔案

| 檔案 | 作用 |
|---|---|
| `index.html` | 整個頁面（樣式與邏輯都在裡面） |
| `config.js` | 可改的設定：標題、「上線時間」文字、照片放哪 |
| `vercel.json` | 路由（`/p/:id` → `index.html`）、不被搜尋引擎收錄 |
| `robots.txt` | 同上，雙保險 |

## 介面

白底、單一黑色主按鈕、細線條。手機單欄；螢幕寬 880px 以上改兩欄（左圖右操作）。

| 功能 | 說明 |
|---|---|
| 骨架載入 | 等資料時顯示灰色骨架，不是空白或轉圈 |
| 點圖放大 | 成品圖與每張原始照片都能點開放大，裡面也有下載鈕 |
| 存到相簿或分享 | 只在瀏覽器支援分享檔案時出現（多數手機），可直接「儲存影像」進相簿 |
| 全部下載 | 把原始照片打包成一個 zip（不壓縮，JPEG 本來就壓過了），不需要任何套件 |
| 重新檢查 | 還沒上線時按下去會有回饋（按鈕狀態、提示、檢查時間），不會像沒反應 |

字型用系統字型，沒有載入任何外部字型或腳本。

## 照片資料格式

每組一個資料夾，資料夾名稱就是取件編號（大寫）：

```
data/
└── 95CA6/
    ├── manifest.json
    ├── composite.jpg      成品圖
    ├── 1.jpg              原始照片
    ├── 2.jpg
    └── 3.jpg
```

`manifest.json`：

```json
{
  "composite": "composite.jpg",
  "photos": ["1.jpg", "2.jpg", "3.jpg"]
}
```

- 檔名不能含 `/` 或 `\`，頁面會直接忽略。
- **`manifest.json` 最後才上傳。** 頁面以它存不存在判斷「上線了沒」，
  所以它先於照片出現的話，客人會看到破圖。

## ⚠️ 照片不要放進 git

這個 repo 只放網頁程式。`.gitignore` 已經擋掉 `data/` 和所有圖片檔，
就算之後把 repo 改成公開，來賓的照片也不會跟著公開。

照片量很大（一組成品圖約 3 MB，加上原檔約 30 MB，200 組約 7 GB），
放外部儲存空間比較合適，把 `config.js` 的 `PHOTO_BASE` 改成那邊的網址即可。
外部空間需要設定 CORS，允許 `https://hkhsps.vercel.app` 讀取。

## 部署到 Vercel

1. 登入 [vercel.com](https://vercel.com)（可用 GitHub 帳號）
2. **Add New → Project** → 匯入這個 repo
3. Framework Preset 選 **Other**，Build Command 和 Output Directory 都留空
4. Deploy
5. 到 **Settings → Domains** 確認網址是 `hkhsps.vercel.app`
   （子網域被別人用掉的話會不同，QR 內容要跟著改，見下方）

如果網址不是 `hkhsps.vercel.app`，要改主系統 `config.json` 的 `baseUrl`，
**而且要在印任何 QR 之前改**，印出去的就改不了了。

## 上線前檢查

- [ ] 手機掃一張測試 QR，確認會到這個頁面
- [ ] 隨便放一組假資料，確認會顯示照片與下載按鈕
- [ ] 刪掉假資料，確認回到「今晚 8 點前上線」
- [ ] 用小寫網址 `/p/abcde` 和大寫 `/P/ABCDE` 各開一次
