'use strict';

const path = require('path');

const chai = require('chai');
const expect = require('chai').expect;
const express = require('express');
const request = require('request-promise-native');
const sinon = require('sinon');

const Multifurcator = require('../../main');


chai.use(require('sinon-chai'));
chai.use(require('chai-as-promised'));


let resources = [];

let listen = async function(application) {
	let listeners = application.getListeners();

	for (let i = 0; i < listeners.length; i++) {
		let listener = listeners[i];

		listener.app.use([
			listener.handler,

			function(err, req, res, next) { // eslint-disable-line no-unused-vars
				res.sendStatus(err.statusCode || 500);
			}
		]);

		let server = await listener.listen();

		resources.push(server);
	}
};


describe('Behavior: Generated listeners', function() {
	afterEach(function() {
		for (let i = 0; i < resources.length; i++) {
			resources[i].close();
		}

		resources.length = 0;
	});

	it('should bind to TCP ports limited to localhost', async function() {
		let application = new Multifurcator();
		let app = express.Router();
		let spy = sinon.spy();

		app.use(function(req, res) {
			spy();
			res.sendStatus(204);
		});

		application.add(app, 'http://localhost:8000');

		await listen(application);

		let response = await request('http://localhost:8000', {
			followRedirect: false,
			simple: false,
			resolveWithFullResponse: true,
		});

		expect(response.statusCode).to.equal(204);
		expect(spy).to.have.been.calledOnce;
	});

	it('should bind to absolute-pathed UNIX domain sockets', async function() {
		let application = new Multifurcator();
		let app = express.Router();
		let spy = sinon.spy();

		app.use(function(req, res) {
			spy();
			res.sendStatus(204);
		});

		application.add(app, 'http://unix:' + path.join(process.cwd(), 'test', 'sockets', 'binding.sock'));

		await listen(application);

		let response = await request('http://unix:' + path.join(process.cwd(), 'test', 'sockets', 'binding.sock'), {
			followRedirect: false,
			simple: false,
			resolveWithFullResponse: true,
			headers: {
				Host: 'localhost'
			}
		});

		expect(response.statusCode).to.equal(204);
		expect(spy).to.have.been.calledOnce;
	});

	it('should bind to relative-pathed (starting with the current directory) UNIX domain sockets', async function() {
		let application = new Multifurcator();
		let app = express.Router();
		let spy = sinon.spy();

		app.use(function(req, res) {
			spy();
			res.sendStatus(204);
		});

		application.add(app, 'http://unix:./test/sockets/binding.sock');

		await listen(application);

		let response = await request('http://unix:' + path.join(process.cwd(), 'test', 'sockets', 'binding.sock'), {
			followRedirect: false,
			simple: false,
			resolveWithFullResponse: true,
			headers: {
				Host: 'localhost'
			}
		});

		expect(response.statusCode).to.equal(204);
		expect(spy).to.have.been.calledOnce;
	});

	it('should bind to relative-pathed (starting with the parent directory) UNIX domain sockets', async function() {
		let application = new Multifurcator();
		let app = express.Router();
		let spy = sinon.spy();
		let cwd = process.cwd();

		process.chdir(path.join(cwd, 'test'));

		app.use(function(req, res) {
			spy();
			res.sendStatus(204);
		});

		application.add(app, 'http://unix:../test/sockets/binding.sock');

		await listen(application);

		let response = await request('http://unix:' + path.join(process.cwd(), '..', 'test', 'sockets', 'binding.sock'), {
			followRedirect: false,
			simple: false,
			resolveWithFullResponse: true,
			headers: {
				Host: 'localhost'
			}
		});

		process.chdir(cwd);

		expect(response.statusCode).to.equal(204);
		expect(spy).to.have.been.calledOnce;
	});
});
