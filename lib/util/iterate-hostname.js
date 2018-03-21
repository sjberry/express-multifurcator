'use strict';

const isIPv4 = require('./is-ipv4');


function* iterator(hostname) {
	let port;
	let split = hostname.indexOf(':');

	if (split > -1) {
		port = hostname.slice(split + 1);
		hostname = hostname.slice(0, split);
	}

	if (isIPv4(hostname) || hostname.indexOf('.') === -1) {
		yield hostname;

		if (port) {
			yield port;
		}
	}
	else {
		let end = Infinity;
		let start = hostname.lastIndexOf('.', end);

		while (~start) {
			let segment = hostname.slice(start + 1, end);

			yield segment;

			end = start;
			start = hostname.lastIndexOf('.', end - 1);
		}

		yield hostname.slice(0, end);

		if (port) {
			yield port;
		}
	}
}


/**
 * Taken from nginx (we want our domain parsing to function largely the same way, so this is reproduced for reference).
 *
 * When searching for a virtual server by name, if name matches more than one of the specified variants, e.g. both
 * wildcard name and regular expression match, the first matching variant will be chosen, in the following order of
 * precedence:
 *
 *     1) exact name
 *     2) longest wildcard name starting with an asterisk, e.g. "*.example.org"
 *     3) longest wildcard name ending with an asterisk, e.g. "mail.*"
 *     4) first matching regular expression (in order of appearance in a configuration file)
 *
 * Wildcard names:
 *
 * A wildcard name may contain an asterisk only on the name’s start or end, and only on a dot border. The names
 * "www.*.example.org" and "w*.example.org" are invalid. However, these names can be specified using regular
 * expressions, for example, "~^www\..+\.example\.org$" and "~^w.*\.example\.org$". An asterisk can match several name
 * parts. The name "*.example.org" matches not only www.example.org but www.sub.example.org as well.
 * A special wildcard name in the form ".example.org" can be used to match both the exact name "example.org" and the
 * wildcard name "*.example.org".
 */


/**
 * Splits a hostname into an iteration of domain name segments in reverse order. Wildcards are supported as the leading
 * domain name segment. If a wildcard is specified anywhere else, an error will be thrown.
 *
 * Example:
 *
 *     > iterateHostname('foo.bar.example.com')
 *
 *     > 'com'
 *     > 'example'
 *     > 'bar'
 *     > 'foo'
 *
 * Example:
 *
 *     > tokenizeHostname('*.bar.example.com')
 *
 *     > 'com'
 *     > 'example'
 *     > 'bar'
 *     > '*'
 *
 * @param {String} hostname The domain name to split into segments.
 * @returns {Iterator<String>} An iterator which will yield strings corresponding to domain name segments in reverse
 *     order.
 */
function iterateHostname(hostname) {
	if (typeof hostname !== 'string') {
		throw new Error('Hostname must be a string.');
	}

	if (hostname.length > 1 && hostname.lastIndexOf('*') > 0) {
		throw new Error('Invalid wildcard specification. Wildcards are only permitted as the first domain segment.');
	}

	return iterator(hostname);
}


module.exports = iterateHostname;
