'use strict';

const URL = require('url-parse');
const express = require('express');
const httpErrors = require('http-errors');


class Router {
	constructor(options = {}) {
		let redirectCode = options.redirectCode || 302;

		if (redirectCode !== 301 && redirectCode !== 302) {
			throw new Error('Invalid redirect code.');
		}

		this.redirectCode = redirectCode;
		this.middleware = options.middleware;
		this.forceTLS = options.forceTLS;
	}

	handler() {
		let self = this;

		return function(req, res, next) {
			if (!self.middleware) {
				next(httpErrors(404));
			}
			else if (self.forceTLS && !req.secure) {
				res.redirect(self.redirectCode, 'https://' + req.hostname + req.originalUrl);
			}
			else {
				return self.middleware(req, res, next);
			}
		};
	}
}


class SubdomainRouter extends Router {
	constructor(options) {
		super(options);

		this._hostnameRouting = {};
		this._aliasRouting = {};
	}

	addAlias(hostname, alias) {
		let hostnames = Array.isArray(hostname) ? hostname : [hostname];
		let aliases = Array.isArray(alias) ? alias : [alias];

		for (let i = 0; i < hostnames.length; i++) {
			for (let j = 0; j < aliases.length; j++) {
				if (this._hostnameRouting.hasOwnProperty(aliases[j])) {
					throw new Error('Configured hostname "' + aliases[j] + '" cannot be used as an alias.');
				}

				this._aliasRouting[aliases[j]] = String(hostnames[i]);
			}
		}

		return this;
	}

	addSubdomain(hostname, app) {
		let hostnames = Array.isArray(hostname) ? hostname : [hostname];

		for (let i = 0; i < hostnames.length; i++) {
			if (this._hostnameRouting.hasOwnProperty(hostnames[i])) {
				throw new Error('Hostname "' + hostnames[i] + '" already added.');
			}

			this._hostnameRouting[hostnames[i]] = app;
		}

		return this;
	}

	handler() {
		let self = this;

		return function(req, res, next) {
			if (self._aliasRouting.hasOwnProperty(req.hostname)) {
				let reroute = self._aliasRouting[req.hostname];
				let protocol = self.forceTLS ? 'https' : req.protocol;

				res.redirect(self.redirectCode, protocol + '://' + reroute + req.originalUrl);
			}
			else if (self._hostnameRouting.hasOwnProperty(req.hostname)) {
				if (self.forceTLS && !req.secure) {
					res.redirect(self.redirectCode, 'https://' + req.hostname + req.originalUrl);
				}
				else {
					let middleware = self._hostnameRouting[req.hostname];

					return middleware(req, res, next);
				}
			}
			else {
				next(httpErrors(404));
			}
		};
	}
}


class Multifurcator {
	constructor() {
		this._routers = {};
	}

	add(app, address = null, options = {}) {
		if (!app) {
			throw new Error('Argument `app` is required');
		}

		if (!address) {
			throw new Error('Argument `address` is required.');
		}

		let redirectCode = options.redirectCode || 302;

		if (redirectCode !== 301 && redirectCode !== 302) {
			throw new Error('Invalid redirect code.');
		}

		if (options.aliases && !options.hostnames) {
			throw new Error('Sub-domain aliases require primary hostnames.');
		}

		let url = new URL(address);
		let protocol = url.protocol;

		if (!protocol) {
			throw new Error('Invalid address, protocol required.');
		}

		let port = parseInt(url.port);

		if (isNaN(port)) {
			throw new Error('Bind port required.');
		}

		let hostname = (url.hostname === '0.0.0.0' || url.hostname === '') ? '*' : url.hostname;
		let identifier = hostname + ':' + port;

		if (options.hostnames) {
			let router = this._routers[identifier];

			if (!router) {
				this._routers[identifier] = router = new SubdomainRouter({
					forceTLS: protocol === 'https:',
					redirectCode: redirectCode
				});
			}

			if (!(router instanceof SubdomainRouter)) {
				throw new Error('Non-sub-domained app already associated with the specified address.');
			}

			router.addSubdomain(options.hostnames, app);

			if (options.aliases) {
				router.addAlias(options.hostnames, options.aliases);
			}
		}
		else {
			if (this._routers.hasOwnProperty(identifier)) {
				throw new Error('App already associated with the specified address. Sub-domain specification required to differentiate.');
			}

			this._routers[identifier] = new Router({
				forceTLS: protocol === 'https:',
				redirectCode: redirectCode,
				middleware: app
			});
		}

		return this;
	}

	get listeners() {
		let servers = [];

		for (let identifier in this._routers) {
			if (!this._routers.hasOwnProperty(identifier)) {
				break;
			}

			let [address, port] = identifier.split(':');
			let app = express();

			let listen = function() {
				return new Promise(function(resolve, reject) {
					let server = (address === '*') ? app.listen(port) : app.listen(port, address);

					function Listener$listening() {
						server.removeListener('listening', Listener$listening);
						server.removeListener('error', Listener$error);

						resolve(server);
					}

					function Listener$error(err) {
						server.removeListener('listening', Listener$listening);
						server.removeListener('error', Listener$error);

						reject(err);
					}

					server.on('listening', Listener$listening);
					server.on('error', Listener$error);
				});
			};

			servers.push({
				address: address,
				port: port,
				app: app,
				handler: this._routers[identifier].handler(),
				listen: listen
			});
		}

		return servers;
	}
}


module.exports = Multifurcator;
