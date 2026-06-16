# ぐるぐる / トーク アバタープログラム

マウスに追従して25方向に振り向き、音声に合わせて口パク・まばたきするブラウザアバター用プログラムです。

この配布フォルダには、キャラクター画像・音声・生成素材は含めていません。自分が権利を持つ素材、または使用許可を得た素材を `public/slices2/` に配置して使ってください。

## セットアップ

必要環境:

- Node.js 22 LTS 推奨
- Vite 8 の要件: Node.js 20.19+ または 22.12+

```bash
npm install
```

## ローカル起動

Windowsなら `start.bat` をダブルクリックすると、ローカルサーバーを起動してブラウザで開きます。

手動で起動する場合は:

```bash
npm run dev
```

手動でアクセスする場合は:

```text
http://127.0.0.1:5173/talk.html
http://127.0.0.1:5173/guruguru.html
```

注意:

- マイク入力は `localhost` または HTTPS でのみ利用できます。
- キャラクター素材を入れるまで、アバター画像は表示されません。

## フレーム画像の配置

このアプリは、キャラクターの向きと表情に応じて `public/slices2/` 内の画像を1枚ずつ切り替えます。

画像パス:

```text
public/slices2/{A-F}/r{行}c{列}.webp
```

例:

```text
public/slices2/A/r2c2.webp
```

### 25方向

5列 × 5行の向き差分です。

- 列: 左向き → 正面 → 右向き
  - `c0`: 左向き
  - `c1`: 左斜め
  - `c2`: 正面
  - `c3`: 右斜め
  - `c4`: 右向き
- 行: 上向き → 水平 → 下向き
  - `r0`: 強く上を見る
  - `r1`: 少し上
  - `r2`: 水平
  - `r3`: 少し下
  - `r4`: 強く下

### 6状態

| フォルダ | 目 | 口 |
|---|---|---|
| `A` | 開け | とじ |
| `B` | 開け | 中間 |
| `C` | 開け | 開け |
| `D` | 閉じ | とじ |
| `E` | 閉じ | 中間 |
| `F` | 閉じ | 開け |

`src/character-config.js` の `basePath` と `ext` で参照先や画像形式を切り替えできます。

## 自分の素材で作るには

最終的に **5×5角度シートを6枚** 用意し、`tools/slice_character_sheets.py` でスライス画像を生成します。

必要な6枚:

```text
A_目開け_口とじ.png
B_目開け_口中間.png
C_目開け_口開け.png
D_目閉じ_口とじ.png
E_目閉じ_口中間.png
F_目閉じ_口開け.png
```

生成後、以下のように配置します。

```text
public/slices2/A/r0c0.webp ... r4c4.webp
public/slices2/B/r0c0.webp ... r4c4.webp
...
public/slices2/F/r0c0.webp ... r4c4.webp
```

合計150枚です。

## ビルド

```bash
npm run build
npm run preview
```

preview はビルド結果をローカルで確認します。

```text
http://127.0.0.1:4173/talk.html
http://127.0.0.1:4173/guruguru.html
```

## ライセンス

プログラムコードは MIT License で公開しています。詳細は `LICENSE` を参照してください。

## 技術スタック

- Vite 8
- React 18
- @vitejs/plugin-react 6
