'use strict';

const PROTOCOL_MAP = {
	'https': 'http',
	'http': 'http'
};


function baseProtocol(protocol) {
	let homogenized = String(protocol).toLowerCase();

	return PROTOCOL_MAP[homogenized] || null;
}


module.exports = baseProtocol;
