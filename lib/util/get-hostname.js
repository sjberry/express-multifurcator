'use strict';


function getHostname(req) {
	// We have to bypass `req.hostname` here because we actually need the port.

	let trust = req.app.get('trust proxy fn');
	let host = req.get('X-Forwarded-Host');

	if (!host || !trust(req.connection.remoteAddress, 0)) {
		host = req.get('Host');
	}

	return host;
}


module.exports = getHostname;
