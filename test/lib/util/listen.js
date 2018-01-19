'use strict';

const path = require('path');

const chai = require('chai');
const expect = require('chai').expect;
const express = require('express');
const request = require('request-promise-native');
const sinon = require('sinon');

const Multifurcator = require('../../../main');
const listen = require('../../../lib/util/listen');


chai.use(require('sinon-chai'));
chai.use(require('chai-as-promised'));


describe('util/listen', function() {
	it('should publish as a method property on the main export', function() {
		expect(Multifurcator.listen).to.equal(listen);
	});

	it('should bind to TCP ports limited to localhost', async function() {
		let app = express();
		let spy = sinon.spy();

		app.use(function(req, res) {
			spy();
			res.sendStatus(204);
		});

		let server = await listen(app, 'http://localhost:8000');

		let response = await request('http://localhost:8000', {
			followRedirect: false,
			simple: false,
			resolveWithFullResponse: true,
		});

		server.close();

		expect(response.statusCode).to.equal(204);
		expect(spy).to.have.been.calledOnce;
	});

	it('should bind to absolute-pathed UNIX domain sockets', async function() {
		let app = express();
		let spy = sinon.spy();

		app.use(function(req, res) {
			spy();
			res.sendStatus(204);
		});

		let server = await listen(app, 'http://unix:' + path.join(process.cwd(), 'test', 'sockets', 'binding.sock'));

		let response = await request('http://unix:' + path.join(process.cwd(), 'test', 'sockets', 'binding.sock'), {
			followRedirect: false,
			simple: false,
			resolveWithFullResponse: true,
			headers: {
				Host: 'localhost'
			}
		});

		server.close();

		expect(response.statusCode).to.equal(204);
		expect(spy).to.have.been.calledOnce;
	});

	it('should bind to relative-pathed (starting with the current directory) UNIX domain sockets', async function() {
		let app = express();
		let spy = sinon.spy();

		app.use(function(req, res) {
			spy();
			res.sendStatus(204);
		});

		let server = await listen(app, 'http://unix:./test/sockets/binding.sock');

		let response = await request('http://unix:' + path.join(process.cwd(), 'test', 'sockets', 'binding.sock'), {
			followRedirect: false,
			simple: false,
			resolveWithFullResponse: true,
			headers: {
				Host: 'localhost'
			}
		});

		server.close();

		expect(response.statusCode).to.equal(204);
		expect(spy).to.have.been.calledOnce;
	});

	it('should bind to relative-pathed (starting with the parent directory) UNIX domain sockets', async function() {
		let app = express();
		let spy = sinon.spy();
		let cwd = process.cwd();

		process.chdir(path.join(cwd, 'test'));

		app.use(function(req, res) {
			spy();
			res.sendStatus(204);
		});

		let server = await listen(app, 'http://unix:../test/sockets/binding.sock');

		let response = await request('http://unix:' + path.join(process.cwd(), '..', 'test', 'sockets', 'binding.sock'), {
			followRedirect: false,
			simple: false,
			resolveWithFullResponse: true,
			headers: {
				Host: 'localhost'
			}
		});

		process.chdir(cwd);
		server.close();

		expect(response.statusCode).to.equal(204);
		expect(spy).to.have.been.calledOnce;
	});
});
