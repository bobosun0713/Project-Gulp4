const { src, dest, watch, series } = require("gulp");
const sourcemaps = require("gulp-sourcemaps");
const cancat = require("gulp-concat");
const include = require("gulp-file-include");
const babel = require("gulp-babel");
const browserify = require('browserify')
const buffer = require('vinyl-buffer')
const stream = require('vinyl-source-stream')
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

const cleanCss = require("gulp-clean-css"); 
const sass = require("gulp-sass");
const postcss = require("gulp-postcss");
const autoprefixer = require("autoprefixer");
const browserSync = require("browser-sync");
const reload = browserSync.reload;
const del = require("del");
const imgMin = require("gulp-imagemin");
const gifsicle = require("imagemin-mozjpeg");
const mozjpeg = require("imagemin-mozjpeg");
const optipng = require("imagemin-optipng");
const svgo = require("imagemin-svgo");

const $if = require("gulp-if");
const parseArgs = require("minimist");
const env = parseArgs(process.argv.slice(2)).env;

const web = {
  html: ["./src/*.html", "./src/**/*.html"],
  sass: ["./src/sass/*.scss", "./src/sass/**/*.scss"],
  css: ["./src/css/*.css"],
  js: ["./src/js/*.js", "./src/js/**/*.js"],
  img: ["./src/image/*.*", "./src/image/**/*.*"],
};

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

function Kitcss() {
  return (
    src(web.css)
      .pipe(cancat("MiniCss.css"))
      .pipe(dest("./public/css"))
  );
}

function scss() {
  return (
    src("./src/sass/*.scss")
      .pipe(sourcemaps.init())
      .pipe(sass({ outputStyle: "nested" }).on("error", sass.logError)) 
      .pipe(postcss([autoprefixer()]))
      .pipe(sourcemaps.write("./"))
      .pipe(dest("./public/css"))
  );
}


function js() {
  return src(web.js)
    .pipe($if(env === "pro", babel()))
    .pipe(dest("./public/js/"));
}

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
