'use strict';

const url = require('url');

const Trie = require('./structures/wildcard-trie');
const getBaseProtocol = require('./util/base-protocol');
const getSecureProtocol = require('./util/secure-protocol');
const parseAddress = require('./util/parse-address');
const redirectHostname = require('./middleware/redirect-hostname');
const redirectSecure = require('./middleware/redirect-secure');
const iterateHostname = require('./util/iterate-hostname');


const SUPPORTED_PROTOCOLS = new Set(['http', 'https']);


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
		this._handlers = new Trie({
			wildcard: '*'
		});
	}

	/**
	 * Mounts an app middleware function. Multiple apps can be mounted and requests will be routed according to the
	 * indicated hostname and protocol.
	 *
	 * @param {Function} app The middleware function to add to the hostname routing tree.
	 * @param {String} protocol The binding protocol for the app middleware.
	 * @param {String} hostname The hostname that should be used to handle the application.
	 * @param {Object} [options={}] An options configuration object.
	 * @property {Number} [options.redirectCode=302] A number that will be used for a redirection code for hostname aliases
	 *     or insecure redirection. Must be 301 or 302.
	 * @property {Boolean} [options.forceTLS] A boolean flag to indicate whether or not requests to the app should
	 *     enforce encrypted communication. Has no effect if `handleInsecureRequests` is `false`. Has no effect if the
	 *     `protocol` is not a secure protocol (e.g. HTTPS).
	 * @returns {Router} The Router instance (chainable method).
	 */
	add(app, protocol, hostname, options = {}) {
		if (!app) {
			throw new Error('Argument `app` is required.');
		}

		if (typeof app !== 'function') {
			throw new TypeError('Argument `app` must be a function.');
		}

		if (!protocol) {
			throw new Error('Argument `protocol` is required.');
		}

		if (typeof protocol !== 'string') {
			throw new TypeError('Argument `protocol` must be a string.');
		}

		if (!hostname) {
			throw new Error('Argument `hostname` is required.');
		}

		if (typeof protocol !== 'string') {
			throw new TypeError('Argument `hostname` must be a string.');
		}

		if (typeof options !== 'object') {
			throw new TypeError('Argument `options` must be an object.');
		}

		if (options.hasOwnProperty('redirectCode') && options.redirectCode !== 301 && options.redirectCode !== 302) {
			throw new Error(`Invalid redirect code: ${options.redirectCode}`);
		}

		protocol = protocol.toLowerCase();

		if (!SUPPORTED_PROTOCOLS.has(protocol)) {
			throw new Error(`Invalid protocol: ${protocol}`);
		}

		let iter = iterateHostname(hostname);
		let handler = this._handlers.find(iter);

		if (handler && handler.has(protocol)) {
			throw new Error('Ambiguous application mount. An application is already mounted to accept the specified hostname and protocol.');
		}

		if (handler == null) {
			handler = new Map();
			iter = iterateHostname(hostname);

			this._handlers.add(iter, handler);
		}

		handler.set(protocol, app);

		if (protocol === getSecureProtocol(protocol) && options.forceTLS === true) {
			let baseProtocol = getBaseProtocol(protocol);

			if (handler.has(baseProtocol)) {
				throw new Error('Ambiguous application mount. Specifying `forceTLS` requires no application to be already mounted on the corresponding insecure protocol.');
			}

			handler.set(baseProtocol, redirectSecure(options.redirectCode || 302));
		}

		return this;
	}

	/**
	 *
	 *
	 * @param {String} from
	 * @param {String|Array<String>} to
	 */
	redirect(protocol, hostname, to, options = {}) {
		if (!protocol) {
			throw new Error('Argument `protocol` is required.');
		}

		if (typeof protocol !== 'string') {
			throw new TypeError('Argument `protocol` must be a string.');
		}

		if (!hostname) {
			throw new Error('Argument `hostname` is required.');
		}

		if (typeof protocol !== 'string') {
			throw new TypeError('Argument `hostname` must be a string.');
		}

		if (!to) {
			throw new Error('Argument `to` is required.');
		}

		if (typeof protocol !== 'string') {
			throw new TypeError('Argument `to` must be a string.');
		}

		if (typeof options !== 'object') {
			throw new TypeError('Argument `options` must be an object.');
		}

		if (options.hasOwnProperty('redirectCode') && options.redirectCode !== 301 && options.redirectCode !== 302) {
			throw new Error(`Invalid redirect code: ${options.redirectCode}`);
		}

		hostname = parseAddress(hostname).interface;
		to = parseAddress(to, protocol);

		if (to.domainSocket) {
			throw new Error('Cannot redirect to a domain socket.');
		}

		if (getBaseProtocol(protocol) !== getBaseProtocol(to.protocol)) {
			throw new Error(`Invalid protocol redirection: ${protocol} to ${to.protocol}`);
		}

		let iter = iterateHostname(hostname);
		let handler = this._handlers.find(iter);

		if (handler && handler.has(protocol)) {
			throw new Error('Ambiguous application mount. An application is already mounted to accept the specified hostname and protocol.');
		}

		if (handler == null) {
			handler = new Map();
			iter = iterateHostname(hostname);

			this._handlers.add(iter, handler);
		}

		let middleware = redirectHostname(url.format({
			protocol: to.protocol,
			hostname: to.interface,
			port: to.port
		}), options.redirectCode || 302);

		handler.set(protocol, middleware);

		if (protocol === getSecureProtocol(protocol) && options.forceTLS === true) {
			let baseProtocol = getBaseProtocol(protocol);

			if (handler.has(baseProtocol)) {
				throw new Error('Ambiguous application mount. Specifying `forceTLS` requires no application to be already mounted on the corresponding insecure protocol.');
			}

			handler.set(baseProtocol, middleware);
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
			if (res.finished) {
				return next();
			}

			let handler;

			// It is possible for malicious, incompatible, or stupid hostnames to be passed to us.
			// Bubble the underlying error.
			try {
				let tokenIterator = iterateHostname(req.hostname);
				handler = self._handlers.find(tokenIterator);
			} catch(err) {
				next(err);
			}

			if (handler == null) {
				return next(self._container._errors(404));
			}

			let protocol = req.protocol;
			let app = handler.get(protocol);

			if (typeof app !== 'function') {
				return next(self._container._errors(404));
			}

			return app.call(this, req, res, next);
		};
	}
}


module.exports = Router;
