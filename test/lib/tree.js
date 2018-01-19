'use strict';

const expect = require('chai').expect;

const Tree = require('../../lib/tree');


describe('Tree', function() {
	describe('instance method', function() {
		describe('add', function() {
			it('should return an existing node if it already exists at the specified path', function() {
				let tree = new Tree();

				let com = tree.add(['example', 'com']);
				let duplicate = tree.add(['example', 'com']);

				expect(com).to.equal(duplicate);
			});

			it('should return an existing node if it already exists at the specified path and is a wildcard', function() {
				let tree = new Tree();

				let wildcard = tree.add(['*']);
				let duplicate = tree.add(['*']);

				expect(wildcard).to.equal(duplicate);
			});
		});

		describe('find', function() {
			it('should retrieve strictly matching nodes from a tree with a depth > 1', function() {
				let tree = new Tree();

				let com = tree.add(['example', 'com']);
				let org = tree.add(['example', 'org']);

				let result1 = tree.find(['example', 'com']);
				let result2 = tree.find(['example', 'org']);

				expect(result1).to.equal(com);
				expect(result2).to.equal(org);
			});

			it('should retrieve strictly matching nodes from a tree containing branches of different depths', function() {
				let tree = new Tree();

				tree.add(['example', 'com']);
				tree.add(['example', 'org']);
				let mail = tree.add(['mail', 'example', 'com']);

				let result = tree.find(['mail', 'example', 'com']);

				expect(result).to.equal(mail);
			});

			it('should return `null` when no nodes strictly match and there are no wildcard nodes', function() {
				let tree = new Tree();

				tree.add(['example', 'com']);
				tree.add(['example', 'org']);

				let result = tree.find(['mail', 'example', 'com']);

				expect(result).to.be.null;
			});

			it('should return a simple wildcard match when no nodes strictly match', function() {
				let tree = new Tree();

				tree.add(['example', 'com']);
				tree.add(['example', 'org']);
				let wildcard = tree.add(['*', 'example', 'com']);
				tree.add(['ftp', 'example', 'com']);

				let result = tree.find(['mail', 'example', 'com']);

				expect(result).to.equal(wildcard);
			});

			it('should return the most specific wildcard match when no nodes strictly match', function() {
				let tree = new Tree();

				tree.add(['example', 'com']);
				tree.add(['example', 'org']);
				tree.add(['ftp', 'us-east', 'example', 'com']);

				let wildcard0 = tree.add(['*']);
				let wildcard1 = tree.add(['*', 'com']);
				let wildcard2 = tree.add(['*', 'example', 'com']);
				let wildcard3 = tree.add(['*', 'us-east', 'example', 'com']);

				let result0 = tree.find(['find', 'me']);
				let result1 = tree.find(['test', 'com']);
				let result2 = tree.find(['mail', 'example', 'com']);
				let result3 = tree.find(['mail', 'us-east', 'example', 'com']);

				expect(result0).to.equal(wildcard0);
				expect(result1).to.equal(wildcard1);
				expect(result2).to.equal(wildcard2);
				expect(result3).to.equal(wildcard3);
			});
		});
	});
});
