'use strict';

const secureProtocol = require('../util/secure-protocol');


function redirectSecure(code = 302) {
	if (code !== 301 && code !== 302) {
		throw new Error(`Invalid redirect code: ${code}`);
	}

	return function(req, res, next) {
		if (res.finished) {
			return next();
		}

		// We have to bypass `req.hostname` here because we actually need the port.

		let trust = req.app.get('trust proxy fn');
		let host = req.get('X-Forwarded-Host');

		if (!host || !trust(req.connection.remoteAddress, 0)) {
			host = req.get('Host');
		}

		res.redirect(code, (secureProtocol(req.protocol) || 'https') + '://' + host + req.originalUrl);
	};
}


module.exports = redirectSecure;
