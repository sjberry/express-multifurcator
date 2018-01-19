'use strict';


/**
 * Recursive helper function to add a Node instance to a Tree instance using the array of tokens as a path.
 *
 * @private
 * @param {Tree} tree A Tree instance to which a Node should be added.
 * @param {Node} root The current recursive root node.
 * @param {Array<String>} tokens An array of tokens identifying the path for Node addition.
 * @param {Number} i The recursive token index.
 * @returns {Node} The Node instance added to the Tree or the pre-existing Node that exists at the specified path.
 */
function addHelper(tree, root, tokens, i) {
	let token = tokens[i];

	if (i < 0) {
		return root;
	}

	if (token === '*') {
		let node = root.wildchild || new Node(token);

		root.wildchild = node;

		return addHelper(tree, node, tokens, i - 1);
	}

	let tokenIndex = -1;

	for (let j = 0; j < root.children.length; j++) {
		if (root.children[j].value === token) {
			tokenIndex = j;
			break;
		}
	}

	if (tokenIndex > -1) {
		return addHelper(tree, root.children[tokenIndex], tokens, i - 1);
	}

	let node = new Node(token);

	root.children.push(node);

	return addHelper(tree, node, tokens, i - 1);
}


/**
 * Recursive helper function to locate and return a Node instance from a Tree using the array of tokens as a path.
 *
 * @private
 * @param {Tree} tree A Tree instance from which a Node should be found.
 * @param {Node} root The current recursive root node.
 * @param {Array<String>} tokens An array of tokens identifying the path for Node addition.
 * @param {Number} i The recursive token index.
 * @returns {Node} The Node instance found at the specified path.
 */
function findHelper(tree, root, tokens, i) {
	let token = tokens[i];

	if (i < 0) {
		return root;
	}

	let node = null;

	for (let j = 0; j < root.children.length; j++) {
		if (root.children[j].value === token) {
			node = root.children[j];
			break;
		}
	}

	if (!node && root.wildchild) {
		return root.wildchild;
	}

	return findHelper(tree, node, tokens, i - 1);
}


/**
 * A basic Tree implementation that supports multiple children and wildcard children. Tree instances are used internally
 * for application hostname routing both when the initial data structures are constructed and when inbound requests are
 * processed and matched against their appropriate handler.
 *
 * @class
 */
class Tree {
	/**
	 * @constructor
	 */
	constructor() {
		this.root = new Node();
	}

	/**
	 * Adds the specified path to the Tree. Instantiates a new Node at the specified location and returns it. If a Node
	 * already exists at the specified location, that Node is returned instead.
	 *
	 * @param {Array<String>} tokens A string array of domain segments used to uniquely locate a new Node in the Tree.
	 * @returns {Node} The newly created or pre-existing Node at the specified location.
	 */
	add(tokens) {
		if (!Array.isArray(tokens)) {
			throw new TypeError('Invalid array of tokens.');
		}

		return addHelper(this, this.root, tokens, tokens.length - 1);
	}

	/**
	 * Finds a Node specified by the path in the Tree.
	 *
	 * @param {Array<String>} tokens A string array of domain segments used to uniquely locate an existing Node in the Tree.
	 * @returns {Node} The Node that exists at the specified location or `null`.
	 */
	find(tokens) {
		if (!Array.isArray(tokens)) {
			throw new TypeError('Invalid array of tokens.');
		}

		return findHelper(this, this.root, tokens, tokens.length - 1);
	}
}


/**
 * A basic Treenode implementation that supports multiple children.
 *
 * @private
 * @class
 */
class Node {
	/**
	 * @constructor
	 * @param {*} value The value associated with the Node (in the limited internal use cases it will be a domain segment).
	 */
	constructor(value = null) {
		this.value = value;
		this.children = [];
	}
}


module.exports = Tree;
