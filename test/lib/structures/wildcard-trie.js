'use strict';

const expect = require('chai').expect;

const Trie = require('../../../lib/structures/wildcard-trie');
const iterateHostname = require('../../../lib/util/iterate-hostname');


describe('WildcardTrie', function() {
	describe('instance method', function() {
		describe('add', function() {
			it('should throw if a specified path already contains an item', function() {
				let trie = new Trie();
				let hostname = 'example.com';

				function fn() {
					trie.add(iterateHostname(hostname), {});
					trie.add(iterateHostname(hostname), {});
				}

				expect(fn).to.throw(Error);
			});
		});

		describe('find', function() {
			it('should retrieve items associated with strictly matching nodes from a trie with a depth > 1', function() {
				let trie = new Trie();

				let com = {};
				let org = {};

				trie.add(iterateHostname('example.com'), com);
				trie.add(iterateHostname('example.org'), org);

				let result1 = trie.find(iterateHostname('example.com'));
				let result2 = trie.find(iterateHostname('example.org'));

				expect(result1).to.equal(com);
				expect(result2).to.equal(org);
			});

			it('should retrieve strictly matching nodes from a trie containing branches of different depths', function() {
				let trie = new Trie();

				trie.add(iterateHostname('example.com'));
				trie.add(iterateHostname('example.org'));

				let mail = {};

				trie.add(iterateHostname('mail.example.com'), mail);

				let result = trie.find(iterateHostname('mail.example.com'));

				expect(result).to.equal(mail);
			});

			it('should return `null` when no nodes strictly match and there are no wildcard nodes', function() {
				let trie = new Trie();

				trie.add(iterateHostname('example.com'), {});
				trie.add(iterateHostname('example.org'), {});

				let result = trie.find(iterateHostname('mail.example.com'));

				expect(result).to.be.null;
			});

			it('should return a simple wildcard match when configured with a wildcard and no nodes strictly match', function() {
				let trie = new Trie({
					wildcard: '*'
				});

				trie.add(iterateHostname('example.com'), {});
				trie.add(iterateHostname('example.org'), {});

				let wildcard = {};

				trie.add(iterateHostname('*.example.com'), wildcard);
				trie.add(iterateHostname('ftp.example.com'), {});

				let result = trie.find(iterateHostname('mail.example.com'));

				expect(result).to.equal(wildcard);
			});

			it('should return the most specific wildcard match when no nodes strictly match', function() {
				let trie = new Trie({
					wildcard: '*'
				});

				trie.add(iterateHostname('example.com'));
				trie.add(iterateHostname('example.org'));
				trie.add(iterateHostname('ftp.us-east.example.com'));

				let wildcard0 = {};
				let wildcard1 = {};
				let wildcard2 = {};
				let wildcard3 = {};

				trie.add(iterateHostname('*'), wildcard0);
				trie.add(iterateHostname('*.com'), wildcard1);
				trie.add(iterateHostname('*.example.com'), wildcard2);
				trie.add(iterateHostname('*.us-east.example.com'), wildcard3);

				let result0 = trie.find(iterateHostname('find.me'));
				let result1 = trie.find(iterateHostname('test.com'));
				let result2 = trie.find(iterateHostname('mail.example.com'));
				let result3 = trie.find(iterateHostname('mail.us-east.example.com'));

				expect(result0).to.equal(wildcard0);
				expect(result1).to.equal(wildcard1);
				expect(result2).to.equal(wildcard2);
				expect(result3).to.equal(wildcard3);
			});
		});
	});
});
