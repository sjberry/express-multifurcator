'use strict';


const RE_IS_IPV4 = /(?:(?:[0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])(?:\.|$)){4}/;


function isIPv4(str) {
	return RE_IS_IPV4.test(String(str));
}


module.exports = isIPv4;
