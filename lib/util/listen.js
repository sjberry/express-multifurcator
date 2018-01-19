'use strict';

const isPlainObject = require('is-plain-object');

const parseAddress = require('./parse-address');


function listen(app, address) {
	if (typeof app !== 'function') {
		throw new TypeError('Invalid application argument.');
	}

	if (address == null) {
		throw new TypeError('Bind address required.');
	}

	let binding;

	if (typeof address === 'string') {
		binding = parseAddress(address);
	}
	else if (isPlainObject(address)) {
		binding = address;
	}
	else {
		throw new TypeError('Invalid address.');
	}

	return new Promise(function(resolve, reject) {
		let server;

		if (binding.interface === '*') {
			server = app.listen(binding.port);
		}
		else if (binding.port) {
			server = app.listen(binding.port, binding.interface);
		}
		else {
			server = app.listen(binding.interface);
		}

		function Listener$listening() {
			server.removeListener('listening', Listener$listening);
			server.removeListener('error', Listener$error);

			resolve(server);
		}

		function Listener$error(err) {
			server.removeListener('listening', Listener$listening);
			server.removeListener('error', Listener$error);

			reject(err);
		}

		server.on('listening', Listener$listening);
		server.on('error', Listener$error);
	});
}


module.exports = listen;
