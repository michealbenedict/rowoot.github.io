// Includes
var gulp        = require('gulp');
var gutil       = require('gulp-util');

const ERROR_LEVELS = ['error', 'warning'];

/*
  @method isFatal
  @params level {String} - This is an ENUM. Acceptable values are ['info', 'warning', 'error']
  @returns {Boolean}
  @api private 
*/
function isFatal(level) {
  return ERROR_LEVELS.indexOf(level) <= ERROR_LEVELS.indexOf(fatalLevel || 'error');
}

/*
  @method handleError
  @params level {String} - This is an ENUM. Acceptable values are ['info', 'warning', 'error']
  @params error {String} - Error string
  @api private 
*/
function handleError(level, error) {
   gutil.log(error.message);
   if (isFatal(level)) {
      process.exit(1);
   }
}

/* 
  @method onError
  @description Handles error
  @params error {String}
  @api public 
*/
function onError(error) { 
  handleError.call(this, 'error', error);
}

/* 
  @method onWarnings
  @description Handles warnings
  @params error {String}
  @api public 
*/
function onWarning(error) { 
  handleError.call(this, 'warning', error);
}

// Export public APIs
module.exports.onError = onError;
module.exports.onWarning = onWarning;