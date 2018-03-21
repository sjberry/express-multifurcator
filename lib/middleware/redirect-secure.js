'use strict';

const getHostname = require('../util/get-hostname');
const secureProtocol = require('../util/secure-protocol');


function redirectSecure(code = 302) {
	if (code !== 301 && code !== 302) {
		throw new Error(`Invalid redirect code: ${code}`);
	}

	return function(req, res, next) {
		if (res.finished) {
			return next();
		}

		let host = getHostname(req);

		res.redirect(code, (secureProtocol(req.protocol) || 'https') + '://' + host + req.originalUrl);
	};
}


module.exports = redirectSecure;
