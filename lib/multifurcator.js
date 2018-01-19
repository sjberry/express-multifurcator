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

const Router = require('./router');
const listen = require('./util/listen');
const parseAddress = require('./util/parse-address');


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
		if (options.hasOwnProperty('redirectCode') && options.redirectCode !== 301 && options.redirectCode !== 302) {
			throw new Error(`Invalid redirect code: ${options.redirectCode}`);
		}

		this.redirectCode = options.redirectCode || 302;

		if (typeof options.errors !== 'function' && httpErrors === null) {
			throw new Error('Invalid error module. Either supply an error generating function or install the peer dependency `http-errors` as a fallback.');
		}

		this.errors = (typeof options.errors === 'function') ? options.errors : httpErrors;

		this._routers = {};
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
	 * @param {String} [address='*'] The network address on which to add the application.
	 * @param {Object} [options] An options configuration object.
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
	 * @returns {Multifurcator} The Multifurcator instance (chainable method).
	 */
	add(app, address = '*', options = {}) {
		if (!app) {
			throw new Error('Argument `app` is required');
		}

		if (typeof address === 'object') {
			options = address;
			address = '*';
		}

		if (!address) {
			throw new Error('Argument `address` is required.');
		}

		if (options.hasOwnProperty('redirectCode') && options.redirectCode !== 301 && options.redirectCode !== 302) {
			throw new Error(`Invalid redirect code: ${options.redirectCode}`);
		}

		let binding = parseAddress(address);
		let identifier = binding.interface + (binding.port ? ':' + binding.port : '');
		let router = this._routers[identifier];

		if (!router) {
			router = this._routers[identifier] = new Router();

			router.interface = binding.interface;
			router.port = binding.port;
			router._container = this;
		}

		router.add(app, {
			hostnames: options.hostnames || ['*'],
			aliases: options.aliases || null,
			redirectCode: options.redirectCode || this.redirectCode,
			forceTLS: binding.protocol === 'https'
		});

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

		for (let identifier in this._routers) {
			if (!this._routers.hasOwnProperty(identifier)) {
				break;
			}

			let router = this._routers[identifier];
			let app, listenFn;

			if (express) {
				app = express();
				listenFn = function() {
					return listen(app, {
						interface: router.interface,
						port: router.port
					});
				};
			}

			let listener = {
				binding: {
					protocol: router.protocol,
					interface: router.interface,
					port: router.port
				}
			};

			if (app) {
				listener.app = app;
			}

			listener.handler = router.handler();

			if (listenFn) {
				listener.listen = listenFn;
			}

			listeners.push(listener);
		}

		return listeners;
	}
}


module.exports = Multifurcator;
