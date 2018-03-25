'use strict';

const express = require('express');

const Multifurcator = require('express-multifurcator');


let application = new Multifurcator();

let app = express.Router();

app.use(function(req, res) {
	res.sendStatus(204);
});

application.add(app, 'https://localhost:8000', {
	forceTLS: true
});


let listeners = application.getListeners();

for (let i = 0; i < listeners.length; i++) {
	let listener = listeners[i];

	listener.app.use(listener.handler);
	// We're not actually listening on HTTPS, we're just checking the req.secure header that can be set by a proxy such as Nginx or AWS load balancers.
	// So we need to make sure we're trusting such proxies when they stipulate a secure connection via an X-Forwarded-Proto header.
	listener.app.set('trust proxy', true);
	listener.listen();
}


process.stdin.resume();
