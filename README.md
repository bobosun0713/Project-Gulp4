# Gulp 4版本

## 使用說明

1. 需先安裝Node.js - ( NVM-版本管理 ) 

2. node版本 - xxxxxx 測試能正常使用 package.json 裡的套件

3. 安裝完，在終端機輸入指令 **:** npm install gulp-cli -g    (  -g  的意思是在全域環境下安裝)

4. 安裝完成，點開專案在終端機輸入指令 **:** npm i (會把package.json 所需要的npm套件都安裝)

## 執行指令

1. npm run GulpD (開發版本 : 圖片跟 JS 不會進行壓縮，JS 也不進行轉譯)

2. npm run GulpP (生產版本 : 圖片及 JS 會進行壓縮轉譯)

> 如果JS文件要轉譯ES6底層API，需再.babelrc 裡修改corejs 參數，改3能徹底轉譯ES6底層API的程式碼。使用建議 **:** 如需支援IE等瀏覽器，又需以ES6 方式寫如( Promise 、 forEach 等函式 ) 才使用，但編譯出來的JS檔案會比原本大很多.

```
{
  "presets": [
    "@babel/preset-env"
  ],
  "plugins": [
    [
      "@babel/plugin-transform-runtime",
      {
        "corejs": 3
      }
    ]
  ],
  "minified": true
}
```

## 資料結構 - src

1. css - 放套件CSS

2. image - 存放image

3. js - 存放JS文件

4. layout - 區塊( headr 、 footer 、 head )

5. sass - 存放scss地方
   
   > base - 共用scss
   > 
   > layout - 區塊scss
   > 
   > modules - 存放共用元件 ( 如 media , mixin )
   > 
   > page - 各頁面的 scss
   > 
   > **main.scc - 主控制scss的地方 所以個頁面scss前面名稱加__ ，再去main.scss 引入**

> 以下為main.scss 控制結構，如資料改變可自行更改，也要注意Gulp任務流程，視情況自行修改。

```scss
// Modules (元件) =========================
@import "modules/media";
@import "modules/modules";

// Basic  (基本設定) =======================
@import "base/reset"; // 各瀏覽器樣式重置
@import "base/all"; // 共用屬性

// Layout (排版）==========================
@import "layout/header";
@import "layout/footer";

// Page   (分頁) ==========================
@import "page/index";
```

## gulpfile.js 註解版本，專案上面的註解會先移除。

```javascript
const { src, dest, watch, series } = require("gulp");

// 文件鏡象
const sourcemaps = require("gulp-sourcemaps");

// 合併文件
const cancat = require("gulp-concat");

// HTML
const include = require("gulp-file-include");

// JS轉譯
const babel = require("gulp-babel");
const browserify = require('browserify')
const buffer = require('vinyl-buffer')
const stream = require('vinyl-source-stream')

// 多個JS文件 打包模組
const es = require('event-stream')
const fs = require('fs')
const join = require('path').join
function findSync(startPath) {
  let result = []
  function finder(path) {
    let files = fs.readdirSync(path)
    files.forEach(val => {
      let fPath = join(path, val)
      let stats = fs.statSync(fPath)
      if (stats.isDirectory()) finder(fPath)
      if (stats.isFile()) result.push({ path: './' + fPath, name: val })
    })
  }
  finder(startPath)
  let res = result.map(item => {
    item.path = item.path.replace(/\\/g, '/')
    return item
  })
  return res
}

// CSS / Sass
const cleanCss = require("gulp-clean-css"); //未用到
const sass = require("gulp-sass");
const postcss = require("gulp-postcss");
const autoprefixer = require("autoprefixer");

// 瀏覽器(預覽)
const browserSync = require("browser-sync");
const reload = browserSync.reload;

// 清空資料夾
const del = require("del");

// 圖片
const imgMin = require("gulp-imagemin");
const gifsicle = require("imagemin-mozjpeg");
const mozjpeg = require("imagemin-mozjpeg");
const optipng = require("imagemin-optipng");
const svgo = require("imagemin-svgo");

// 判斷環境
const $if = require("gulp-if");
const parseArgs = require("minimist");
// 環境變數
const env = parseArgs(process.argv.slice(2)).env;
console.log("測試環境", env);

// 路徑
const web = {
  html: ["./src/*.html", "./src/**/*.html"],
  sass: ["./src/sass/*.scss", "./src/sass/**/*.scss"],
  css: ["./src/css/*.css"],
  js: ["./src/js/*.js", "./src/js/**/*.js"],
  img: ["./src/image/*.*", "./src/image/**/*.*"],
};

/* ======================== 以下為執行任務 ================================= */

// 搬移html
function html() {
  return src("./src/*.html")
    .pipe(
      include({
        prefix: "@@",
        basepath: "@file",
      })
    )
    .pipe(dest("./public"));
}

// 搬移套件CSS
function Kitcss() {
  return (
    src(web.css)
      /*
        compatibility：*、ie9、ie8、ie7 (兼容模式)。
        level：0、1、2 (優化等級)。
      */
      // .pipe(cleanCss({ compatibility: "ie8", level: 2 }))
      .pipe(cancat("MiniCss.css"))
      .pipe(dest("./public/css"))
  );
}

// 編譯scss
function scss() {
  return (
    src("./src/sass/*.scss")
      .pipe(sourcemaps.init()) // 初始化 sourcemaps
      /* (模式選擇) outputStyle：nested (預設) | expanded (縮排)| compact (壓縮CSS，但不處理空白) | compressed (壓縮CSS，處理空白)*/
      .pipe(sass({ outputStyle: "nested" }).on("error", sass.logError)) // 使用 gulp-sass 進行編譯
      .pipe(postcss([autoprefixer()])) // 編譯完的CSS ， 做 postcss 處理
      .pipe(sourcemaps.write("./")) // 創建sorcemap文件
      .pipe(dest("./public/css"))
  );
}

/* 編譯JS ES6轉ES5 / require轉譯 **********************************/
function js() {
  return src(web.js) // javascript 檔案路徑
    .pipe($if(env === "pro", babel()))
    .pipe(dest("./public/js/")); // 編譯完成輸出路徑
}

// 多個JS文件入口腳本編譯
function reqjs(cb) {
  let files = findSync('./public/js/')
  let task = files.map(entry => {
    return browserify({
      entries: entry.path,
      debug: true
    })
      .bundle()
      .on('error', function (error) {
        console.log(error.toString())
      })
      .pipe(stream(entry.name))
      .pipe(buffer())
      .pipe(dest('./public/js/'))
  })
  es.merge.apply(null, task)
  cb();
}



/* ***************************************************************/

// 壓縮照片
function img() {
  return src("./src/image/*")
    .pipe(
      $if(
        env === "pro",
        imgMin([
          /*
        gifsicle：GIF 圖片優化器 (imagemin-gifsicle)
        mozjpeg：JPEG 圖片優化器 (imagemin-mozjpeg)
        optipng：PNG 圖片優化器  (imagemin-optipng)
        svgo：SVG 圖片優化器     (imagemin-svgo)
        個別壓縮品值如需使用，可先至最上面宣告名稱，使用方式如下
      */
          mozjpeg({
            quality: 75, // 壓縮JPG品質
          }),
          gifsicle({
            quality: 75, // 壓縮JPG品質
          }),
          svgo({
            quality: 75, // 壓縮JPG品質
          }),
          optipng({
            // 雖然是優化PNG 但也能支援優化 GIF , JPEG , PNG , SVG
            quality: 75,
            optimizationLevel: 3, // 優化級別
          }),
        ])
      )
    ) // 執行優化(壓縮)
    .pipe(dest("public/image"));
}

// 執行gulp時先清除原先，清空public保持最新
function delContent() {
  return del(["./public"]);
}

// 預覽
function browser() {
  browserSync.init({
    server: {
      baseDir: "./public",
      index: "index.html",
    },
    port: 3000,
  });

  watch(web.html, html).on("change", reload);
  watch(web.css, Kitcss).on("change", reload);
  watch(web.sass, scss).on("change", reload);
  $if(env === 'dev', watch(web.js, js).on("change", reload));
  $if(env === 'pro', watch(web.js, series(js, reqjs)).on("change", reload));
  watch(web.img, img).on("change", reload);
}

exports.default = series(delContent, html, scss, Kitcss, js, reqjs, img, browser);
```
