'use strict';

const chai = require('chai');
const expect = require('chai').expect;

const iterateHostname = require('../../../lib/util/iterate-hostname');


chai.use(require('chai-as-promised'));


describe('util/iterate-hostname', function() {
	it('should split a wildcard hostname string into an iterator of components streamed in reverse order', function() {
		let it = iterateHostname('*.foo.bar.baz.com');

		expect(it.next()).to.deep.equal({
			value: 'com',
			done: false
		});

		expect(it.next()).to.deep.equal({
			value: 'baz',
			done: false
		});

		expect(it.next()).to.deep.equal({
			value: 'bar',
			done: false
		});

		expect(it.next()).to.deep.equal({
			value: 'foo',
			done: false
		});

		expect(it.next()).to.deep.equal({
			value: '*',
			done: false
		});

		expect(it.next()).to.deep.equal({
			value: void(0),
			done: true
		});
	});

	it('should split a port value from a wildcard hostname string into an iterator of components streamed in reverse order followed by the port', function() {
		let it = iterateHostname('*.foo.bar.baz.com:8000');

		expect(it.next()).to.deep.equal({
			value: 'com',
			done: false
		});

		expect(it.next()).to.deep.equal({
			value: 'baz',
			done: false
		});

		expect(it.next()).to.deep.equal({
			value: 'bar',
			done: false
		});

		expect(it.next()).to.deep.equal({
			value: 'foo',
			done: false
		});

		expect(it.next()).to.deep.equal({
			value: '*',
			done: false
		});

		expect(it.next()).to.deep.equal({
			value: '8000',
			done: false
		});

		expect(it.next()).to.deep.equal({
			value: void(0),
			done: true
		});
	});

	it('should split a non-wildcard hostname string into an iterator of components streamed in reverse order', function() {
		let it = iterateHostname('foo.bar.baz.com');

		expect(it.next()).to.deep.equal({
			value: 'com',
			done: false
		});

		expect(it.next()).to.deep.equal({
			value: 'baz',
			done: false
		});

		expect(it.next()).to.deep.equal({
			value: 'bar',
			done: false
		});

		expect(it.next()).to.deep.equal({
			value: 'foo',
			done: false
		});

		expect(it.next()).to.deep.equal({
			value: void(0),
			done: true
		});
	});

	it('should split a port value from a non-wildcard hostname string into an iterator of components streamed in reverse order followed by the port', function() {
		let it = iterateHostname('foo.bar.baz.com:8000');

		expect(it.next()).to.deep.equal({
			value: 'com',
			done: false
		});

		expect(it.next()).to.deep.equal({
			value: 'baz',
			done: false
		});

		expect(it.next()).to.deep.equal({
			value: 'bar',
			done: false
		});

		expect(it.next()).to.deep.equal({
			value: 'foo',
			done: false
		});

		expect(it.next()).to.deep.equal({
			value: '8000',
			done: false
		});

		expect(it.next()).to.deep.equal({
			value: void(0),
			done: true
		});
	});

	it('should not split IPv4 addresses', function() {
		let it = iterateHostname('192.168.1.1');

		expect(it.next()).to.deep.equal({
			value: '192.168.1.1',
			done: false
		});

		expect(it.next()).to.deep.equal({
			value: void(0),
			done: true
		});
	});

	it('should split port values from IPv4 addresses', function() {
		let it = iterateHostname('192.168.1.1:8000');

		expect(it.next()).to.deep.equal({
			value: '192.168.1.1',
			done: false
		});

		expect(it.next()).to.deep.equal({
			value: '8000',
			done: false
		});

		expect(it.next()).to.deep.equal({
			value: void(0),
			done: true
		});
	});

	it('should raise an error when a wildcard is not the leading or trailing domain name segment', function() {
		function fn() {
			iterateHostname('foo.*.bar');
		}

		expect(fn).to.throw(Error);
	});

	it('should raise an error when a wildcard is the leading domain name segment and is ALSO used elsewhere', function() {
		function fn() {
			iterateHostname('*.*.bar');
		}

		expect(fn).to.throw(Error);
	});

	it('should raise an error when a wildcard is the trailing domain name segment and is ALSO used elsewhere', function() {
		function fn() {
			iterateHostname('foo.*.*');
		}

		expect(fn).to.throw(Error);
	});

	it('should raise an error when a wildcard is the leading domain name segment AND the trailing domain name segment', function() {
		function fn() {
			iterateHostname('*.foo.*');
		}

		expect(fn).to.throw(Error);
	});

	// TODO: This is a temporary measure to accomodate a shortcoming in the hostname identification algorithm.
	it('should raise an error when a wildcard is the trailing domain name segment', function() {
		function fn() {
			iterateHostname('foo.bar.*');
		}

		expect(fn).to.throw(Error);
	});
});
