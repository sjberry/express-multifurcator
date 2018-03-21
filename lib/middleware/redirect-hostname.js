'use strict';


const RE_PROTOCOL = /^[a-z]+:\/\//i;


function redirectHostname(to, code = 302) {
	if (code !== 301 && code !== 302) {
		throw new Error(`Invalid redirect code: ${code}`);
	}

	if (RE_PROTOCOL.test(to)) {
		return function(req, res) {
			res.redirect(code, to + req.originalUrl);
		};
	}

	return function(req, res, next) {
		if (res.finished) {
			return next();
		}

		res.redirect(code, req.protocol + '://' + to + req.originalUrl);
	};
}


module.exports = redirectHostname;
