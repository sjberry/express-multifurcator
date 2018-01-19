'use strict';

const RE_VALID_DNS_SEGMENT = /^[a-zA-z0-9][a-zA-Z0-9\-_]*$/;


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
 * Splits a hostname into an array of domain name segments. Wildcards are supported as the leading domain name segment.
 * If a wildcard is specified anywhere else, an error will be thrown.
 *
 * Example:
 *
 *     > tokenizeHostname('foo.bar.example.com')
 *
 *     ['foo', 'bar', 'example', 'com']
 *
 * Example:
 *
 *     > tokenizeHostname('*.bar.example.com')
 *
 *     ['*', 'bar', 'example', 'com']
 *
 * @param {String} hostname The domain name to split into segments.
 * @returns {Array<String>} An array of strings corresponding to domain name segments.
 */
function tokenizeHostname(hostname) {
	if (typeof hostname !== 'string') {
		throw new Error('Hostname must be a string.');
	}

	let tokens = hostname.split('.');

	if (tokens.length > 1 && tokens[0] === '*' && tokens[tokens.length - 1] === '*') {
		throw new Error('Invalid wildcard specification. Wildcards are only permitted as the first domain segment.');
	}

	// TODO: Temporary measure to preclude trailing wildcards until they're supported elsewhere in the code.
	if (tokens.length > 1 && tokens[tokens.length - 1] === '*') {
		throw new Error('Invalid wildcard specification. Wildcards are only permitted as the first domain segment.');
	}

	let head = 0;
	let tail = tokens.length - 1;

	while (head <= tail) {
		if (head > 0 && (tokens[head] === '*' || tokens[tail] === '*')) {
			throw new Error('Invalid wildcard specification. Wildcards are only permitted as the first or last domain segment.');
		}
		else if (tokens[head] !== '*' && !RE_VALID_DNS_SEGMENT.test(tokens[head])) {
			throw new Error(`Invalid domain segment: ${tokens[head]}`);
		}
		else if (tokens[tail] !== '*' && !RE_VALID_DNS_SEGMENT.test(tokens[tail])) {
			throw new Error(`Invalid domain segment: ${tokens[tail]}`);
		}

		head++;
		tail--;
	}

	return tokens;
}


module.exports = tokenizeHostname;
