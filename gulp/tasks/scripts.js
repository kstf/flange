const gulp = require('gulp');
const config = require('../config');
// const sourcemaps = require('gulp-sourcemaps');
const babel = require('gulp-babel');

function build() {
  return gulp.src(config.scripts, { cwd: config.src })
  // .pipe(sourcemaps.init())
  .pipe(babel({
    presets: ['es2015', 'stage-0'],
    plugins: ['transform-es2015-modules-commonjs', 'add-module-exports'],
  }))
  // .pipe(sourcemaps.write())
  .pipe(gulp.dest(config.dest));
}

gulp.task('build', build);

module.exports = build;
