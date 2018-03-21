'use strict';

const chai = require('chai');
const expect = require('chai').expect;
const express = require('express');
const request = require('request-promise-native');
const sinon = require('sinon');

const Multifurcator = require('../../main');


chai.use(require('sinon-chai'));
chai.use(require('chai-as-promised'));


let resources = [];

async function listen(application, options = {}) {
	let listeners = application.getListeners();

	for (let i = 0; i < listeners.length; i++) {
		let listener = listeners[i];

		listener.app.use([
			listener.handler,

			function(err, req, res, next) { // eslint-disable-line no-unused-vars
				res.sendStatus(err.statusCode || 500);
			}
		]);

		listener.app.set('trust proxy', options.trustProxy === true);

		let server = await listener.listen();

		resources.push(server);
	}
}

describe('Behavior: Insecure Redirection', function() {
	afterEach(function() {
		for (let i = 0; i < resources.length; i++) {
			resources[i].close();
		}

		resources.length = 0;
	});

	describe('for basic listeners', function() {
		it('should accept ostensibly (trust proxy required) secure requests to HTTPS listeners', async function() {
			let application = new Multifurcator();
			let app = express.Router();
			let spy = sinon.spy();

			app.use(function(req, res) {
				spy();
				res.sendStatus(204);
			});

			application.add(app, 'https://localhost:8000');

			await listen(application, {
				trustProxy: true
			});

			let response = await request('http://localhost:8000', {
				followRedirect: false,
				simple: false,
				resolveWithFullResponse: true,
				headers: {
					'X-Forwarded-Proto': 'https'
				}
			});

			expect(spy).to.have.been.called;
			expect(response.statusCode).to.equal(204);
		});

		it('should reject ostensibly (trust proxy required) secure requests to HTTP listeners', async function() {
			let application = new Multifurcator();
			let app = express.Router();
			let spy = sinon.spy();

			app.use(function(req, res) {
				spy();
				res.sendStatus(204);
			});

			application.add(app, 'http://localhost:8000');

			await listen(application, {
				trustProxy: true
			});

			let response = await request('http://localhost:8000', {
				followRedirect: false,
				simple: false,
				resolveWithFullResponse: true,
				headers: {
					'X-Forwarded-Proto': 'https'
				}
			});

			expect(spy).to.not.have.been.called;
			expect(response.statusCode).to.equal(404);
		});

		it('should redirect insecure requests to HTTP listeners', async function() {
			let application = new Multifurcator();
			let app = express.Router();
			let spy = sinon.spy();

			app.use(function(req, res) {
				spy();
				res.sendStatus(204);
			});

			application.add(app, 'https://localhost:8000', {
				forceTLS: true
			});

			await listen(application);

			let response = await request('http://localhost:8000', {
				followRedirect: false,
				simple: false,
				resolveWithFullResponse: true
			});

			expect(spy).to.not.have.been.called;
			expect(response.statusCode).to.equal(302);
			expect(response.headers.location).to.equal('https://localhost:8000/');
		});

		it('should redirect insecure requests using the forwarded hostname if the proxy is trusted', async function() {
			let application = new Multifurcator();
			let app = express.Router();
			let spy = sinon.spy();

			app.use(function(req, res) {
				spy();
				res.sendStatus(204);
			});

			application.add(app, 'https://localhost:8000', {
				forceTLS: true
			});

			await listen(application, {
				trustProxy: true
			});

			let response = await request('http://localhost:8000', {
				followRedirect: false,
				simple: false,
				resolveWithFullResponse: true,
				headers: {
					'X-Forwarded-Host': 'example.com'
				}
			});

			expect(spy).to.not.have.been.called;
			expect(response.statusCode).to.equal(302);
			expect(response.headers.location).to.equal('https://example.com/');
		});

		it('should preserve the port, path, and querystring when redirecting insecure requests', async function() {
			let application = new Multifurcator();
			let app = express.Router();
			let spy = sinon.spy();

			app.use(function(req, res) {
				spy();
				res.sendStatus(204);
			});

			application.add(app, 'https://localhost:8000', {
				forceTLS: true
			});

			await listen(application);

			let response = await request('http://localhost:8000/foo?bar=baz', {
				followRedirect: false,
				simple: false,
				resolveWithFullResponse: true
			});

			expect(spy).to.not.have.been.called;
			expect(response.statusCode).to.equal(302);
			expect(response.headers.location).to.equal('https://localhost:8000/foo?bar=baz');
		});

		it('should accept insecure requests to a particular interface if a separate application has been configured to handle them', async function() {
			let application = new Multifurcator();

			let app1 = express.Router();
			let app2 = express.Router();

			let spy1 = sinon.spy();
			let spy2 = sinon.spy();

			app1.use(function(req, res) {
				spy1();
				res.sendStatus(204);
			});

			app2.use(function(req, res) {
				spy2();
				res.sendStatus(204);
			});

			application.add(app1, 'https://localhost:8000', {
				hostnames: ['example.com']
			});

			application.add(app2, 'http://localhost:8000', {
				hostnames: ['example.org']
			});

			//console.log(application._listeners.get('localhost:8000')._handlers._root);

			await listen(application, {
				trustProxy: true
			});

			let response1 = await request('http://localhost:8000', {
				followRedirect: false,
				simple: false,
				resolveWithFullResponse: true,
				headers: {
					'X-Forwarded-Proto': 'https',
					Host: 'example.com'
				}
			});

			let response2 = await request('http://localhost:8000', {
				followRedirect: false,
				simple: false,
				resolveWithFullResponse: true,
				headers: {
					Host: 'example.org'
				}
			});

			expect(spy1).to.have.been.called;
			expect(response1.statusCode).to.equal(204);
			expect(spy2).to.have.been.called;
			expect(response2.statusCode).to.equal(204);
		});
	});
});
