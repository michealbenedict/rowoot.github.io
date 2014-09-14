// Gulp
// ====
var gulp        = require('gulp');
var gerror      = require('./gulp_modules/error');
var gutil       = require('gulp-util');

// Other includes
// ==============
var rimraf      = require("rimraf");
var path        = require('path');
var fs          = require('fs');
var moment      = require('moment');

// Gulp plugins
// ============
var concat      = require('gulp-concat');
var jade        = require('gulp-jade');
var sass        = require('gulp-ruby-sass');
var bower       = require('main-bower-files');
var livereload  = require('gulp-livereload');
var markdown    = require('gulp-markdown');
var through     = require('through2');
var frontMatter = require('gulp-front-matter');
var rename      = require('gulp-rename');

// CONSTANTS
// =========
const PUBLIC_DIR        = "./dist";
const PUBLIC_SITE_DIR   = path.join(PUBLIC_DIR);
const PUBLIC_POSTS_DIR  = path.join(PUBLIC_SITE_DIR, 'posts');
const PUBLIC_JS_DIR     = path.join(PUBLIC_DIR, 'js');
const PUBLIC_CSS_DIR    = path.join(PUBLIC_DIR, 'css');
const PUBLIC_VENDOR_DIR = path.join(PUBLIC_DIR, 'vendor');

const APP_DIR       = "./app";
const APP_VIEWS_DIR = "./app/views";
const APP_SASS_DIR  = "./app/sass";
const APP_JS_DIR    = "./app/js";

const POST_DIR = "./posts";

var locals = {
  CSS_PATH: PUBLIC_CSS_DIR,
  JS_PATH: PUBLIC_JS_DIR,
  VENDOR_PATH: PUBLIC_VENDOR_DIR,
  SITE_PATH: '/'
};

// CLEAN TASKS
// ===========
/*
 * @task clean 
 * @description Remove all the files from the public directory
**/
gulp.task('clean', function () {
  rimraf.sync(PUBLIC_DIR);
});

/*
 * @task clean:css
 * @description Remove css from the public directory
**/
gulp.task('clean:css', function () {
  rimraf.sync(PUBLIC_CSS_DIR);
});

/*
 * @task clean:vendor
 * @description Remove vendor from the public directory
**/
gulp.task('clean:vendor', function () {
  rimraf.sync(PUBLIC_VENDOR_DIR);
});

/*
 * @task clean:js
 * @description Remove js from the public directory
**/
gulp.task('clean:js', function () {
  rimraf.sync(PUBLIC_JS_DIR);
});

/*
 * @task clean:posts
 * @description Remove posts from the public directory
**/
gulp.task('clean:posts', function () {
  rimraf.sync(PUBLIC_POSTS_DIR);
});

// BUILD TASKS
// ===========
/*
 * @task build:bower
 * @description All bower files are stored in Vendor. 
 *              Remve the vendor folder and install from bower
**/
gulp.task('build:vendor', ['clean:vendor'], function () {
  return gulp.src(bower(), { base: './bower_components' })
    .pipe(gulp.dest(PUBLIC_VENDOR_DIR))
    .on('error', gerror.onError);
});

/*
 * @task build:sass
 * @description Run the sass preprocessor and concat to a single stylessheet
**/
gulp.task('build:sass', ['clean:css'], function () {
  gulp.src(APP_SASS_DIR + '/global.scss')
    .pipe(sass())
    .pipe(concat('style.css'))
    .pipe(gulp.dest(PUBLIC_CSS_DIR))
    .on('error', gerror.onError);
});

/*
 * @task build:js
 * @description concats js files
**/
gulp.task('build:js', ['clean:js'], function () {
  gulp.src(APP_JS_DIR + '/*.js')
    .pipe(concat('main.js'))
    .pipe(gulp.dest(PUBLIC_JS_DIR))
    .on('error', gerror.onError);
});

/*
 * @task build:templates
 * Generate other pages of the site
**/
gulp.task('build:templates', function () {
  gulp.src([APP_VIEWS_DIR + '/*.jade', '!'+APP_VIEWS_DIR + '/index.jade'])
    .pipe(jade({
      locals: locals
    }))
    .pipe(gulp.dest(PUBLIC_SITE_DIR))
    .on('error', gerror.onError);
});

/*
 * @task build:index
 * Build index
**/
gulp.task('build:index', function () {

  gulp.src([POST_DIR + '/*.md'])
    // Extract frontmatter from posts
    .pipe(frontMatter({
      property: 'frontMatter',
      remove: true
    }))
    .pipe(function () {
      // Vars
      var indexFile;
      var listOfPosts = [];

      return through.obj(function (file, enc, callback) {
        if (file.isNull()) {
          this.push(file);
          return callback();
        }

        if (file.isStream()) {
          this.emit("error",
            new gutil.PluginError("indexFile", "Stream content is not supported"));
          return callback();
        }

        if (file.frontMatter.published == false) {
          return callback();
        }

        if (file.isBuffer()) {
          var fileName = path.basename(file.path).split('-');
          fileName.shift();
          fileName = fileName.join('-');
          fileName = fileName.split('.md')[0];
          file.frontMatter.slug = fileName;
          file.frontMatter.date = moment(file.frontMatter.date).format('dddd, MMMM Do YYYY');
          indexFile = file;
          listOfPosts.push(file.frontMatter);
          callback();
        }
      }, function (callback) {
        var postTemplatePath = path.join(process.cwd(), APP_VIEWS_DIR + '/index.jade');
        indexFile.contents = new Buffer(
          require('jade').compile(
            fs.readFileSync(postTemplatePath), {
            filename: postTemplatePath
          })({
            posts: listOfPosts.reverse()
          })
        );
        this.push(indexFile);
        callback();
      });

    }())
    .pipe(rename(function (path) {
      path.basename = 'index';
      path.extname = '.html';
    }))
    .pipe(gulp.dest(PUBLIC_SITE_DIR))

});



/*
 * @task build:posts
 * Process markdown posts and build html files out of it.
**/
gulp.task('build:posts', ['clean:posts'], function () {

  gulp.src([POST_DIR + '/*.md'])
    // Extract frontmatter from posts
    .pipe(frontMatter({
      property: 'frontMatter',
      remove: true
    }))
    // Run through markdown parser and generate html
    .pipe(markdown())
    // Apply html to `post` template
    .pipe(through.obj(function (file, enc, callback) {
      if (file.isNull()) {
        this.push(file);
        return callback();
      }

      if (file.frontMatter.published && file.frontMatter.published == false) {
        return callback();
      }

      if (file.isStream()) {
        this.emit("error",
          new gutil.PluginError("gulp-templatize", "Stream content is not supported"));
        return callback();
      }

      if (file.isBuffer()) {
        var postTemplatePath = path.join(process.cwd(), APP_VIEWS_DIR + '/post.jade');

        file.contents = new Buffer(
          require('jade').compile(
            fs.readFileSync(postTemplatePath), {
            filename: postTemplatePath
          })({
          title: file.frontMatter.title,
          excerpt: file.frontMatter.excerpt,
          date: moment(file.frontMatter.date).format('dddd, MMMM Do YYYY'),
          content: String(file.contents)
        }));
        this.push(file);
        callback();
      }
    }))
    // Rename posts
    .pipe(rename(function (path) {
      var baseName = path.basename.split('-');
      baseName.shift();
      path.basename = baseName.join('-');
    }))
    .pipe(gulp.dest(PUBLIC_POSTS_DIR))
    .on('error', gerror.onError);

});

/*
 * @task build:site
 * Generate the site
**/
gulp.task('build:site',  ['clean', 'build:vendor', 'build:sass', 'build:js', 'build:index', 'build:posts']);


// OTHER TASKS
// ===========
/*
 * @task watch
 * @depends [sass, serve]
 * @description Runs a live-reload server. 
 *              Listens on public foler
 *              Listens on templates folder
**/
gulp.task('watch', ['build:site', 'serve'], function() {
  var server = livereload();

  gulp.watch([APP_DIR + '/**/*', PUBLIC_DIR + '/**/*', POST_DIR + '/**/*'])
    .on('change', function (file) {
      var filePath = './' + path.relative(__dirname, file.path);

      if ( filePath.indexOf(APP_VIEWS_DIR) === 0 || filePath.indexOf(POST_DIR) === 0 ) {
        gulp.run('build:templates');
        gulp.run('build:index');
        gulp.run('build:posts');
      } else if ( filePath.indexOf(APP_SASS_DIR) === 0 ) {
        gulp.run('build:sass');
      } else {
        server.changed(file.path);
      }
    });
});

/*
 * @task serve
 * Runs a static server on port 3000
**/
gulp.task('serve', function () {
  const PORT = 3000;
  var fileServer = new (require('node-static')).Server(PUBLIC_DIR);

  require('http').createServer(function (request, response) {
    request.addListener('end', function () {
      fileServer.serve(request, response);
    }).resume();
  }).listen(PORT);

  gutil.log(gutil.colors.blue('HTTP server listening on port', PORT));
});