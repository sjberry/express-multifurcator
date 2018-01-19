'use strict';

const url = require('url');

const isPlainObject = require('is-plain-object');

const Tree = require('./tree');
const tokenizeHostname = require('./util/tokenize-hostname');


const RE_PROTOCOL = /^[a-z]+:\/\//i;


/**
 * Handles routing requests based on protocol and hostname. Contains internal references to hostname trees and mounted
 * applications. Supports adding multiple applications (i.e. expressJS routers, not full http servers).
 *
 * @class
 */
class Router {
	/**
	 * @constructor
	 * @returns {Router} A new Router instance.
	 */
	constructor() {
		this._tree = new Tree();
		this._apps = new WeakMap();
	}

	/**
	 * Mounts an app middleware function. Multiple apps can be mounted and requests will be routed according to the
	 * indicated hostname and protocol.
	 *
	 * @param {Function} app The middleware function to add to the hostname routing tree.
	 * @param {Object} [options={}] An options configuration object.
	 * @property {String|Array<String>} [options.hostnames] An array of hostnames that should be associated with the
	 *     added app. Can also be a single string as shorthand.
	 * @property {Object|String|Array<String>} [options.aliases] An array of hostname aliases that should be associated
	 *     with the added app. A hostname alias serves as a redirection to a primary hostname. Keys take the form of an
	 *     alias, values should be a hostname redirection (e.g. 'https://example.com' or 'example.com'). If no protocol
	 *     is included it will default to the type of listener (http or https). Can be a single string or array of
	 *     strings if `options.hostnames` contains a single hostname. Serves no purpose if `options.hostnames` isn't
	 *     specified.
	 * @property {Boolean} [options.forceTLS] A boolean flag to indicate whether or not requests to the app should
	 *     enforce encrypted communication.
	 * @returns {Router} The Router instance (chainable method).
	 */
	add(app, options = {}) {
		let hostnames = Array.isArray(options.hostnames) ? options.hostnames : [options.hostnames];

		for (let i = 0; i < hostnames.length; i++) {
			let tokens = tokenizeHostname(hostnames[i]);

			let node = this._tree.add(tokens);

			if (this._apps.has(node)) {
				throw new Error('Ambiguous application mount. Handlers specified with a hostname cannot conflict.');
			}

			node.forceTLS = options.forceTLS;
			node.alias = false;

			this._apps.set(node, app);
		}

		if (options.aliases) {
			let aliases;

			if (isPlainObject(options.aliases)) {
				aliases = options.aliases;
			}
			else {
				if (hostnames.length > 1) {
					throw new Error('Ambiguous hostname aliasing. Application mounted using more than one hostname.');
				}

				if (hostnames[0].indexOf('*') > -1) {
					throw new Error('Ambiguous hostname aliasing. Application mounted using a wildcard hostname.');
				}

				let aliasArray = Array.isArray(options.aliases) ? options.aliases : [options.aliases];

				aliases = {};

				for (let i = 0; i < aliasArray.length; i++) {
					aliases[aliasArray[i]] = hostnames[0];
				}
			}

			for (let alias in aliases) {
				if (!aliases.hasOwnProperty(alias)) {
					break;
				}

				let tokens = tokenizeHostname(alias);

				let node = this._tree.add(tokens);

				if (this._apps.has(node)) {
					throw new Error('Ambiguous application mount. Handlers specified with a hostname cannot conflict.');
				}

				let redirect = aliases[alias];

				if (!RE_PROTOCOL.test(redirect)) {
					redirect = (options.forceTLS ? 'https' : 'http') + '://' + redirect;
				}

				let parsed = url.parse(redirect);

				node.forceTLS = null;
				node.alias = url.format({
					protocol: parsed.protocol,
					hostname: parsed.hostname,
					port: parsed.port,
					pathname: ''
				});

				this._apps.set(node, app);
			}
		}

		return this;
	}

	/**
	 * Manifests the Router instance as a middleware function. The middleware function can be mounted onto an ExpressJS
	 * application to route requests according to the indicated hostname and protocol properties.
	 *
	 * @returns {Function} A middleware function used to route inbound requests to appropriate middleware handlers.
	 */
	handler() {
		let self = this;

		return function(req, res, next) {
			let tokens = tokenizeHostname(req.hostname);
			let node = self._tree.find(tokens);
			let app = self._apps.get(node);

			if (!app) {
				let err = self._container.errors(404);

				next(err);
			}
			else if (node.alias) {
				res.redirect(self._container.redirectCode, node.alias + req.originalUrl);
			}
			else if (!node.forceTLS && req.secure) {
				let err = self._container.errors(404);

				next(err);
			}
			else if (node.forceTLS && !req.secure) {
				let trust = req.app.get('trust proxy fn');
				let host = req.get('X-Forwarded-Host');

				if (!host || !trust(req.connection.remoteAddress, 0)) {
					host = req.get('Host');
				}

				res.redirect(self._container.redirectCode, 'https://' + host + req.originalUrl);
			}
			else {
				return app.call(this, req, res, next);
			}
		};
	}
}


module.exports = Router;
