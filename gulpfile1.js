const gulp = require('gulp');
const sass = require('gulp-sass');
const sourcemaps = require('gulp-sourcemaps');
const babel = require('gulp-babel');
const postcss = require('gulp-postcss');
const autoprefixer = require('autoprefixer');

gulp.task('test', () => {
  return gulp.src('./index.html').pipe(gulp.dest('./public'))
})


// 編譯SCSS
gulp.task('sass', () => {
  return gulp
    .src('./src/sass/*.scss')
    .pipe(sourcemaps.init()) // 初始化 sourcemaps
    /* (模式選擇) outputStyle：nested (預設) | expanded (縮排)| compact (壓縮CSS，但不處理空白compressed (壓縮CSS，處理空白)*/
    .pipe(sass({ outputStyle: 'nested' }).on('error', sass.logError)) // 使用 gulp-sass 進行編譯
    .pipe(postcss([autoprefixer()]))  // 編譯完的CSS ， 做 postcss 處理
    .pipe(sourcemaps.write('./')) // 創建sorcemap文件
    .pipe(gulp.dest('./public/css')); // 編譯完成輸出路徑
});

// 編譯JS ES6 轉 ES5 版本
gulp.task(
  'babel', () => {
    return gulp
      .src('./src/js/*.js') // javascript 檔案路徑
      .pipe(
        babel()
      )
      .pipe(gulp.dest('./public/js/')) // 編譯完成輸出路徑
  });


// 隨時監控scss
// gulp.task('watch', () => {
//   gulp.watch('./source/**/*.scss', gulp.series('sass'));
// });