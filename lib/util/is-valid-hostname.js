'use strict';


const RE_VALID_HOSTNAME = /^(?:[a-zA-z0-9][a-zA-Z0-9\-_]*(?:\.(?!$))?)*$/;


function isValidHostname(str) {
	return RE_VALID_HOSTNAME.test(String(str));
}


module.exports = isValidHostname;
