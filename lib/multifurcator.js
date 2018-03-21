'use strict';

let express, httpErrors;

try {
	express = require('express');
} catch(err) {
	express = null;
}

try {
	httpErrors = require('http-errors');
} catch(err) {
	httpErrors = null;
}

const isPlainObject = require('is-plain-object');

const Router = require('./router');
const baseProtocol = require('./util/base-protocol');
const hasOwnProperty = Object.prototype.hasOwnProperty;
const listen = require('./util/listen');
const parseAddress = require('./util/parse-address');


const SUPPORTED_PROTOCOLS = new Set(['http', 'https']);


/**
 *
 */
class Multifurcator {
	/**
	 * @constructor
	 * @param {Object} [options={}] An options configuration object.
	 * @property {Number} [redirectCode=302] A redirect code used for HTTPS and hostname redirection. Can be 301 or 302.
	 * @property {Function} [errors] An error generating function used to create HTTP errors. Will fall back to the
	 *     optional dependency `http-errors` if no error generating function is supplied.
	 */
	constructor(options = {}) {
		options = options || {};

		if (hasOwnProperty.call(options, 'redirectCode') && options.redirectCode !== 301 && options.redirectCode !== 302) {
			throw new Error(`Invalid redirect code: ${options.redirectCode}`);
		}

		if (hasOwnProperty.call(options, 'errors')) {
			if (typeof options.errors !== 'function') {
				throw new TypeError('Configuration option `errors` must be a function.');
			}
			else {
				let testError;
				let toThrow = new Error('Error generating function does not successfully create 404 Error objects.');

				try {
					testError = options.errors(404);
				} catch(e) {
					throw toThrow;
				}

				if (!(testError instanceof Error)) {
					throw toThrow;
				}
			}
		}
		else if (httpErrors === null) {
			throw new Error('Invalid error module. Either supply an error generating function or install the peer dependency `http-errors` as a fallback.');
		}

		Object.defineProperties(this, {
			_redirectCode: {
				value: options.redirectCode || 302,
				writable: false
			},

			_errors: {
				value: options.errors || httpErrors,
				writable: false
			},

			_listeners: {
				value: new Map(),
				writable: false
			}
		});
	}

	/**
	 * Mounts an app middleware function. Multiple apps can be mounted and requests will be routed according to the
	 * indicated hostnames, protocol, and mount addresses.
	 *
	 * Example:
	 *
	 *      > let application = new Multifurcator();
	 *      > let app = express.Router();
	 *      > application.add(app, 'http://localhost:8000');
	 *
	 * @param {Function} app The middleware function to add as an application.
	 * @param {String} address The network address on which to add the application.
	 * @param {Object} [options] An options configuration object.
	 * @property {String|Array<String>} [options.hostnames] An array of hostnames that should be associated with the
	 *     added app. Can also be a single string as shorthand.
	 * @property {Object|String|Array<String>} [options.aliases] An array of hostname aliases that should be associated
	 *     with the added app. A hostname alias serves as a redirection to a primary hostname. Keys take the form of an
	 *     alias, values should be a hostname redirection (e.g. 'https://example.com' or 'example.com'). If no protocol
	 *     is included it will default to the type of listener (http or https). Can be a single string or array of
	 *     strings if `options.hostnames` contains a single hostname. Serves no purpose if `options.hostnames` isn't
	 *     specified.
	 * @property {Number} [options.redirectCode] A number that will be used for a redirection code for hostname aliases
	 *     or insecure redirection. Must be 302 or 301. Defaults to the multifurcator instance redirect code.
	 * @property {Boolean} [options.forceTLS] A boolean flag to indicate whether or not requests to the app should
	 *     enforce encrypted communication. Has no effect if the bound `address` is not a secure protocol (e.g. HTTPS).
	 * @returns {Multifurcator} The Multifurcator instance (chainable method).
	 */
	add(app, address, options = {}) {
		if (!app) {
			throw new Error('Argument `app` is required.');
		}

		if (typeof app !== 'function') {
			throw new TypeError('Argument `app` must be a function.');
		}

		if (!address) {
			throw new Error('Argument `address` is required.');
		}

		if (typeof address !== 'string') {
			throw new Error('Argument `address` must be a string.');
		}

		options = options || {};

		if (typeof options !== 'object') {
			throw new TypeError('Optional argument `options` must be an object.');
		}

		if (hasOwnProperty.call(options, 'redirectCode') && options.redirectCode !== 301 && options.redirectCode !== 302) {
			throw new Error(`Invalid redirect code: ${options.redirectCode}`);
		}

		let hostnames;

		if (hasOwnProperty.call(options, 'hostnames')) {
			hostnames = Array.isArray(options.hostnames) ? options.hostnames : [options.hostnames];
		}
		else {
			hostnames = ['*'];
		}

		let binding = parseAddress(address);

		if (!binding.domainSocket && !binding.port) {
			throw new Error('Bind port required.');
		}

		if (!SUPPORTED_PROTOCOLS.has(binding.protocol)) {
			throw new Error(`Unsupported protocol: ${binding.protocol}`);
		}

		let identifier = binding.interface + (binding.port ? ':' + binding.port : '');
		let router;

		if (this._listeners.has(identifier)) {
			router = this._listeners.get(identifier);
		}
		else {
			router = new Router();

			router._binding = {
				protocol: baseProtocol(binding.protocol),
				interface: binding.interface,
				port: binding.port
			};

			router._container = this;
		}

		let routerOptions = {
			redirectCode: options.redirectCode || this._redirectCode,
			forceTLS: options.forceTLS === true
		};

		for (let i = 0; i < hostnames.length; i++) {
			let hostname = parseAddress(hostnames[i]);

			if (hostname.domainSocket) {
				throw new Error('Invalid hostname: ' + hostnames[i]);
			}

			router.add(app, binding.protocol, hostname.interface + (hostname.port ? ':' + hostname.port : ''), routerOptions);
		}

		this._listeners.set(identifier, router);

		return this;
	}

	/**
	 *
	 * @param address
	 * @param from
	 * @param to
	 * @param options
	 * @returns {Multifurcator}
	 */
	redirect(address, from, to, options = {}) {
		if (arguments.length === 3 && isPlainObject(from)) {
			options = to;
			to = null;
		}

		let binding = parseAddress(address);

		if (!binding.domainSocket && !binding.port) {
			throw new Error('Bind port required.');
		}

		if (!SUPPORTED_PROTOCOLS.has(binding.protocol)) {
			throw new Error(`Unsupported protocol: ${binding.protocol}`);
		}

		let aliases;

		if (isPlainObject(from)) {
			aliases = from;
		}
		else {
			if (!to) {
				throw new Error('Argument `to` is required.');
			}

			if (typeof to !== 'string') {
				throw new TypeError('Argument `to` must be a string.');
			}

			let aliasArray = Array.isArray(from) ? from : [from];

			aliases = {};

			for (let i = 0; i < aliasArray.length; i++) {
				aliases[aliasArray[i]] = to;
			}
		}

		let identifier = binding.interface + (binding.port ? ':' + binding.port : '');
		let router;

		if (this._listeners.has(identifier)) {
			router = this._listeners.get(identifier);
		}
		else {
			router = new Router();

			router._binding = {
				protocol: baseProtocol(binding.protocol),
				interface: binding.interface,
				port: binding.port
			};

			router._container = this;
		}

		let routerOptions = {
			redirectCode: options.redirectCode || this._redirectCode,
			forceTLS: options.forceTLS === true
		};

		for (let alias in aliases) {
			if (!aliases.hasOwnProperty(alias)) {
				break;
			}

			let hostname = parseAddress(alias);

			if (hostname.domainSocket) {
				throw new Error('Invalid hostname: ' + alias);
			}

			router.redirect(binding.protocol, hostname.interface + (hostname.port ? ':' + hostname.port : ''), aliases[alias], routerOptions);
		}

		this._listeners.set(identifier, router);

		return this;
	}

	/**
	 * Returns an array of "listener" plain objects. Each listener contains binding information and a corresponding
	 * handler and, if ExpressJS is found as a dependency, an instantiated ExpressJS application is included in the
	 * listener object along with a proxy `listen` function which returns a Promise that resolves or rejects depending
	 * on binding success or failure.
	 *
	 * @returns {Array} An array of "listener" objects.
	 */
	getListeners() {
		let listeners = [];

		for (let listener of this._listeners) {
			let [, router] = listener;

			let app = null;
			let listenFn = null;

			if (express) {
				app = express();
				listenFn = function() {
					return listen(app, {
						interface: router._binding.interface,
						port: router._binding.port
					});
				};
			}

			listeners.push({
				binding: {
					protocol: router._binding.protocol,
					interface: router._binding.interface,
					port: router._binding.port
				},
				app: app,
				handler: router.handler(),
				listen: listenFn
			});
		}

		return listeners;
	}
}


module.exports = Multifurcator;
