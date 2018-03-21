'use strict';

const baseProtocol = require('./base-protocol');
const secureProtocol = require('./secure-protocol');


function shareProtocolFamily(a, b) {
	let homogenizedB = String(b).toLowerCase();

	return baseProtocol(a) === homogenizedB || secureProtocol(a) === homogenizedB;
}


module.exports = shareProtocolFamily;
