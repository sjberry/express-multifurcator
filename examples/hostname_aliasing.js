'use strict';

const express = require('express');

const Multifurcator = require('express-multifurcator');


let application = new Multifurcator();

let app = express.Router();

app.use(function(req, res) {
	res.sendStatus(204);
});

application.add(app, 'http://localhost:8000', {
	hostnames: ['example.com']
});

application.redirect('http://localhost:8000', {
	'example.org': 'example.com'
});


let listeners = application.getListeners();

for (let i = 0; i < listeners.length; i++) {
	let listener = listeners[i];

	listener.app.use(listener.handler);
	listener.listen();
}


process.stdin.resume();
