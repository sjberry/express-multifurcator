'use strict';

const express = require('express');

const Multifurcator = require('express-multifurcator');


let application = new Multifurcator();

let app1 = express.Router();
let app2 = express.Router();

app1.use(function(req, res) {
	process.stdout.write('Application 1\n');
	res.sendStatus(204);
});

app2.use(function(req, res) {
	process.stdout.write('Application 2\n');
	res.sendStatus(204);
});

application.add(app1, 'http://localhost:8000');
application.add(app2, 'http://localhost:8001');


let listeners = application.getListeners();

for (let i = 0; i < listeners.length; i++) {
	let listener = listeners[i];

	listener.app.use(listener.handler);
	listener.listen();
}


process.stdin.resume();
