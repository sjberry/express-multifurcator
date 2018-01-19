'use strict';

const chai = require('chai');
const expect = require('chai').expect;

const tokenizeHostname = require('../../../lib/util/tokenize-hostname');


chai.use(require('chai-as-promised'));


describe('util/tokenize-hostname', function() {
	it('should split a hostname string into an array of components', function() {
		let result = tokenizeHostname('foo.bar.baz.com');

		expect(result).to.deep.equal(['foo', 'bar', 'baz', 'com']);
	});

	it('should raise an error when a wildcard is not the leading or trailing domain name segment', function() {
		function fn() {
			tokenizeHostname('foo.*.bar');
		}

		expect(fn).to.throw(Error);
	});

	it('should raise an error when a wildcard is the leading domain name segment but is ALSO used elsewhere', function() {
		function fn() {
			tokenizeHostname('*.*.bar');
		}

		expect(fn).to.throw(Error);
	});

	it('should raise an error when a wildcard is the trailing domain name segment but is ALSO used elsewhere', function() {
		function fn() {
			tokenizeHostname('foo.*.*');
		}

		expect(fn).to.throw(Error);
	});

	it('should raise an error when a wildcard is the leading domain name segment AND the trailing domain name segment', function() {
		function fn() {
			tokenizeHostname('*.foo.*');
		}

		expect(fn).to.throw(Error);
	});

	// TODO: This is a temporary measure to accomodate a shortcoming in the hostname identification algorithm.
	it('should raise an error when a wildcard is the trailing domain name segment', function() {
		function fn() {
			tokenizeHostname('foo.bar.*');
		}

		expect(fn).to.throw(Error);
	});
});
