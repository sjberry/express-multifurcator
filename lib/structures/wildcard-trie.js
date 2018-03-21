'use strict';


/**
 * A basic Tree Node implementation that supports multiple children.
 *
 * @private
 * @class
 */
class TrieNode {
	/**
	 * @constructor
	 */
	constructor() {
		this._children = new Map();
	}
}


/**
 * A basic Tree implementation that supports multiple children. Tree instances are used internally for application
 * hostname routing both when the initial data structures are constructed and when inbound requests are processed and
 * matched against their appropriate handler.
 *
 * @class
 */
class Trie {
	/**
	 * @constructor
	 */
	constructor(options = {}) {
		this._root = new TrieNode();
		this._items = new Map();
		this._wildcard = options.wildcard || null;
	}

	/**
	 * Adds the specified path to the Tree. Instantiates a new Node at the specified location and returns it. If a Node
	 * already exists at the specified location, that Node is returned instead.
	 *
	 * @param {Array<String>} tokens A string array of domain segments used to uniquely locate a new Node in the Tree.
	 * @returns {Node} The newly created or pre-existing Node at the specified location.
	 */
	add(iterator, item) {
		let root = this._root;

		for (let token of iterator) {
			if (root._children.has(token)) {
				root = root._children.get(token);
			}
			else {
				let node = new TrieNode();

				root._children.set(token, node);

				root = node;
			}
		}

		if (this._items.has(root)) {
			throw new Error('Trie contains mapped element for specified path.');
		}

		this._items.set(root, item);
	}

	/**
	 * Finds a Node specified by the path in the Tree.
	 *
	 * @param {Array<String>} tokens A string array of domain segments used to uniquely locate an existing Node in the Tree.
	 * @returns {Node} The Node that exists at the specified location or `null`.
	 */
	find(iterator) {
		let root = this._root;

		for (let token of iterator) {
			let child = root._children.get(token);

			if (child == null) {
				if (this._wildcard) {
					let wildcard = root._children.get(this._wildcard);

					if (wildcard == null) {
						return null;
					}

					return this._items.get(wildcard);
				}
				else {
					return null;
				}
			}

			root = child;
		}

		return this._items.get(root);
	}
}


module.exports = Trie;
