'use strict';

const path = require('path');

const URL = require('url-parse');


const RE_PROTOCOL = /^[a-z]+:\/\//i;
const RE_UNIX_SOCKET_CAPTURE = /^unix:(\.?\.?)$/i;
const PROTOCOL_MAP = {
	http: 'http',
	https: 'http'
};


/**
 * Parses an address string into components used for listener binding: the protocol, interface, and port. Supports UNIX
 * domain sockets via custom syntax. Supports shorthand for the interface 0.0.0.0 (all interfaces) via "*".
 *
 * Example:
 *
 *     > parseAddress('http://localhost:8000')
 *
 *     {
 *         protocol: 'http',
 *         interface: 'localhost',
 *         port: 8000
 *     }
 *
 * Example:
 *
 *     > parseAddress('http://0.0.0.0:8000')
 *
 *     {
 *         protocol: 'http',
 *         interface: '*',
 *         port: 8000
 *     }
 *
 * Example:
 *
 *     > parseAddress('http://unix:/path/to/socket')
 *
 *     {
 *         protocol: 'http',
 *         interface: '/path/to/socket',
 *         port: null
 *     }
 *
 * @param {String} address A network address that
 * @returns {Object} A plain object with keys corresponding to the protocol, interface, and (if applicable) the port
 *     parsed from the string address.
 */
function parseAddress(address) {
	if (!RE_PROTOCOL.test(address)) {
		address = 'http://' + address;
	}

	let url = new URL(address.toLowerCase());
	let protocol = url.protocol.slice(0, -1);

	if (!PROTOCOL_MAP.hasOwnProperty(protocol)) {
		throw new Error(`Invalid protocol: ${protocol}`);
	}

	let parsed = {
		protocol: protocol
	};

	// We're using the pathname for pipe: and unix: "protocols," so in that context a hostname doesn't make sense (and
	// vice versa).
	if (url.pathname && url.hostname && !RE_UNIX_SOCKET_CAPTURE.test(url.hostname)) {
		throw new Error('Address cannot contain a pathname and a hostname.');
	}

	if (url.pathname) {
		let rootPath = RE_UNIX_SOCKET_CAPTURE.exec(url.hostname)[1];

		parsed.interface = rootPath ? path.resolve(path.join(process.cwd(), rootPath, url.pathname)) : url.pathname;
		parsed.port = null;
	}
	else {
		parsed.interface = (url.hostname === '0.0.0.0' || url.hostname === '') ? '*' : url.hostname;

		let port = parseInt(url.port);

		if (!port) {
			throw new Error('Bind port required.');
		}

		parsed.port = port;
	}

	return parsed;
};


module.exports = parseAddress;
