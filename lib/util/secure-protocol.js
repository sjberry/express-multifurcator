'use strict';

const PROTOCOL_MAP = {
	'http': 'https',
	'https': 'https'
};


function secureProtocol(protocol) {
	let homogenized = String(protocol).toLowerCase();

	return PROTOCOL_MAP[homogenized] || null;
}


module.exports = secureProtocol;
