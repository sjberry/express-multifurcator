'use strict';

const path = require('path');

const chai = require('chai');
const expect = require('chai').expect;

const parseAddress = require('../../../lib/util/parse-address');


chai.use(require('chai-as-promised'));


const CWD = process.cwd();


describe('util/parse-address', function() {
	it('should process a fully qualified IPv4 address', function() {
		let result = parseAddress('http://127.0.0.1:8000');

		expect(result).to.deep.equal({
			protocol: 'http',
			interface: '127.0.0.1',
			port: 8000
		});
	});

	it('should raise an error when an IPv4 address is specified without a port binding', function() {
		function fn() {
			parseAddress('http://127.0.0.1');
		}

		expect(fn).to.throw;
	});

	it('should support shorthand "all-interfaces" binding with the "*" character as a hostname', function() {
		let result = parseAddress('http://*:8000');

		expect(result).to.deep.equal({
			protocol: 'http',
			interface: '*',
			port: 8000
		});
	});

	it('should support shorthand "all-interfaces" binding with the address "0.0.0.0" as a hostname', function() {
		let result = parseAddress('http://0.0.0.0:8000');

		expect(result).to.deep.equal({
			protocol: 'http',
			interface: '*',
			port: 8000
		});
	});

	it('should process an absolute path UNIX domain socket', function() {
		let result = parseAddress('http://unix:/foo/bar');

		expect(result).to.deep.equal({
			protocol: 'http',
			interface: path.sep + path.join('foo', 'bar'),
			port: null
		});
	});

	it('should process a relative path UNIX domain socket from the process current working directory', function() {
		let result = parseAddress('http://unix:./foo/bar');

		expect(result).to.deep.equal({
			protocol: 'http',
			interface: path.join(CWD, 'foo', 'bar'),
			port: null
		});
	});

	it('should raise an error when an absolute path UNIX domain socket is specified without the appropriate prefix format', function() {
		function fn() {
			parseAddress('http:///foo/bar');
		}

		expect(fn).to.throw;
	});

	it('should raise an error when a relative path UNIX domain socket is specified without the appropriate prefix format', function() {
		function fn() {
			parseAddress('http://./foo/bar');
		}

		expect(fn).to.throw;
	});

	it('should parse the correct protocol from a provided address string', function() {
		let result = parseAddress('https://unix:./foo/bar');

		expect(result).to.deep.equal({
			protocol: 'https',
			interface: path.join(CWD, 'foo', 'bar'),
			port: null
		});
	});
});
