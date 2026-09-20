# 拍貼取件頁

校慶拍貼攤位的 QR Code 掃描頁。客人掃紙上的 QR → 開啟 `https://hkhsps.vercel.app/p/編號` → 下載照片。

純靜態網站，沒有建置步驟、沒有後端。

## 運作方式

```
QR 內容:  HTTPS://HKHSPS.VERCEL.APP/P/K7WHMX3B      （大寫，為了讓 QR 更小）
              │
              ▼
vercel.json 把 /p/編號 導到 index.html
              │
              ▼
index.html 讀 <PHOTO_BASE>/K7WHMX3B/manifest.json
              ├─ 404       → 顯示「今晚 8 點前上線」（EXPIRED 時顯示「已到期刪除」）
              ├─ 連線失敗   → 顯示「連線不太順」＋重試
              └─ 有資料     → 顯示成品圖與原始照片，可下載
```

編號一律轉大寫處理，`/p/k7whmx3b` 和 `/P/K7WHMX3B` 是同一個。
編號是 8 碼，字母表不含 I L O 0 1（約 8.5×10¹¹ 種組合）。

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

## 架構：頁面和照片是兩個獨立的 Vercel 專案

```
專案 A  hkhsps          只有網頁程式（這個 repo）。長期保留，QR 指向這裡。
專案 B  hkhsps-photos   只有照片。從本機上傳，保留期限一到就整個刪掉。
```

為什麼要分開：

- **刪照片＝刪專案 B**，一個動作乾淨，頁面完全不用動。
- **專案 A 不要刪。** 刪掉之後 `hkhsps.vercel.app` 這個網址很可能會被釋放
  （我沒查證 Vercel 的實際規則），別人就有機會註冊它，
  讓所有掃舊 QR 的人看到他想給的東西。留著這個只有網頁程式的專案沒有任何隱私風險。
- 照片不進 git：`.gitignore` 擋掉了 `data/` 和所有圖片，就算 repo 改公開也不會外洩。

專案 B 由主系統的 `匯出上線.bat` 產生（縮小、清 EXIF、產生 `vercel.json`），
用 `vercel deploy --prod` 上傳。因為跟頁面不同網站，它的 `vercel.json` 有設 CORS，
只允許 `https://hkhsps.vercel.app` 讀取。

上傳完成後：

1. 把 `config.js` 的 `PHOTO_BASE` 改成 `https://<專案B網址>/data`，推上 GitHub
2. 在主系統資料夾執行 `node export-web.js --check https://<專案B網址>`，
   確認網址通、CORS 對、照片看得到
3. 手機實掃一張 QR 做最後確認

## 保留期限到了之後

1. 到 Vercel 刪掉專案 B（照片就消失了）
2. 把 `config.js` 的 `EXPIRED` 改成 `true`，推上 GitHub
   （客人掃 QR 會看到「照片已經到期刪除」，而不是永遠等不到的「今晚上線」）
3. **不要刪專案 A**，理由見上面

## 頁面怎麼判斷「還沒上傳」

照片在另一個網站時，`fetch` 遇到 404 又沒帶 CORS 標頭，瀏覽器只會回報「失敗」，
跟真的斷網長得一樣。頁面遇到失敗時會再用 `no-cors` 探測一次：
連得上就是「還沒上傳」，連不上才是「網路有問題」。

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

- [x] 大寫路徑 `/P/XXXXXXXX`（QR 實際會用的形式）會到頁面，不是 Vercel 的 404
- [ ] 手機掃一張測試 QR，確認會到這個頁面
- [ ] 上傳一組真的資料，確認會顯示照片，且「下載」「全部下載」都有反應
- [ ] `node export-web.js --check https://<專案B網址>` 全部通過
- [ ] 用一個不存在的編號開，確認顯示「今晚 8 點前上線」而不是「連線不太順」
- [ ] iPhone 與 Android 各測一次「存到相簿或分享」
