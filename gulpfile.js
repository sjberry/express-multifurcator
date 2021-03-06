'use strict';

const gulp = require('gulp');
const sequence = require('run-sequence');


let pkg = require('./package.json');


gulp.task('default', function(done) {
	sequence('build', done);
});


gulp.task('build', function(done) {
	sequence('lint', 'test', 'clean', 'package', done);
});


gulp.task('clean', function() {
	const clean = require('gulp-clean');

	return gulp.src([
		'dist/'
	], {
		read: false
	})
		.pipe(clean({
			force: true
		}));
});


gulp.task('lint', ['lint:js', 'lint:json']);


gulp.task('lint:js', function() {
	const eslint = require('gulp-eslint');

	return gulp.src([
		'examples/**/*.js',
		'lib/**/*.js',
		'test/**/*.js',
		'gulpfile.js',
		'main.js'
	])
		.pipe(eslint({
			configFile: 'eslint.json'
		}))
		.pipe(eslint.formatEach());
});


gulp.task('lint:json', function() {
	const jsonlint = require('gulp-jsonlint');

	return gulp.src([
		'*.json'
	])
		.pipe(jsonlint())
		.pipe(jsonlint.failOnError())
		.pipe(jsonlint.reporter());
});


gulp.task('package', function() {
	const path = require('path');

	const gzip = require('gulp-gzip');
	const rename = require('gulp-rename');
	const tar = require('gulp-tar');

	let basename = path.basename(process.cwd());
	let renameExpression = new RegExp('^' + basename);

	return gulp.src([
		'lib/**',
		'main.js',
		'package.json',
		'LICENSE',
		'README.md'
	], {
		nodir: true,
		base: '..'
	})
		.pipe(rename(function(location) {
			location.dirname = location.dirname.replace(renameExpression, pkg.name);

			return location;
		}))
		.pipe(tar(pkg.name + '-' + pkg.version + '.tar'))
		.pipe(gzip())
		.pipe(rename(function(location) {
			location.dirname = path.join(pkg.name, pkg.version, location.dirname);

			return location;
		}))
		.pipe(gulp.dest('dist'));
});


gulp.task('test', function() {
	const mocha = require('gulp-mocha');

	gulp.src([
		'test/**/*.js'
	], {
		nodir: true,
		read: false
	})
		.pipe(mocha({
			reporter: 'dot'
		}));
});

gulp.task('test:verbose', function() {
	const mocha = require('gulp-mocha');

	gulp.src([
		'test/**/*.js'
	], {
		nodir: true,
		read: false
	})
		.pipe(mocha());
});
