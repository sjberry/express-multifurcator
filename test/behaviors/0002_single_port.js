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

let listen = async function(application) {
	let listeners = application.getListeners();

	for (let i = 0; i < listeners.length; i++) {
		let listener = listeners[i];

		listener.app.use([
			listener.handler,

			function(err, req, res, next) { // eslint-disable-line no-unused-vars
				res.sendStatus(err.statusCode);
			}
		]);

		let server = await listener.listen();

		resources.push(server);
	}
};


describe('Behavior: Single-port listeners', function() {
	afterEach(function() {
		for (let i = 0; i < resources.length; i++) {
			resources[i].close();
		}

		resources.length = 0;
	});

	describe('with a single mounted application', function() {
		describe ('when no hostname is specified', function() {
			it('should accept and respond to requests that do not contain a hostname header', async function() {
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
					resolveWithFullResponse: true
				});

				expect(response.statusCode).to.equal(204);
				expect(spy).to.have.been.calledOnce;
			});

			it('should accept and respond to requests that contain a hostname header', async function() {
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
					headers: {
						Host: 'example.com'
					}
				});

				expect(response.statusCode).to.equal(204);
				expect(spy).to.have.been.calledOnce;
			});
		});

		describe('when a hostname is specified', function() {
			it('should raise an error for requests that do not contain a hostname header', async function() {
				let application = new Multifurcator();
				let app = express.Router();
				let spy = sinon.spy();

				app.use(function(req, res) {
					spy();
					res.sendStatus(204);
				});

				application.add(app, 'http://localhost:8000', {
					hostnames: ['example.com']
				});

				await listen(application);

				let response = await request('http://localhost:8000', {
					followRedirect: false,
					simple: false,
					resolveWithFullResponse: true
				});

				expect(response.statusCode).to.equal(404);
				expect(spy).to.not.have.been.called;
			});

			it('should accept and respond to requests that contain a hostname header', async function() {
				let application = new Multifurcator();
				let app = express.Router();
				let spy = sinon.spy();

				app.use(function(req, res) {
					spy();
					res.sendStatus(204);
				});

				application.add(app, 'http://localhost:8000', {
					hostnames: ['example.com']
				});

				await listen(application);

				let response = await request('http://localhost:8000', {
					followRedirect: false,
					simple: false,
					resolveWithFullResponse: true,
					headers: {
						Host: 'example.com'
					}
				});

				expect(response.statusCode).to.equal(204);
				expect(spy).to.have.been.calledOnce;
			});
		});

		describe('when multiple hostnames are specified', function() {
			it('should accept and respond to requests that contain a hostname header', async function() {
				let application = new Multifurcator();
				let app = express.Router();
				let spy = sinon.spy();

				app.use(function(req, res) {
					spy();
					res.sendStatus(204);
				});

				application.add(app, 'http://localhost:8000', {
					hostnames: ['example.com', 'example.org']
				});

				await listen(application);

				let response1 = await request('http://localhost:8000', {
					followRedirect: false,
					simple: false,
					resolveWithFullResponse: true,
					headers: {
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

				expect(response1.statusCode).to.equal(204);
				expect(response2.statusCode).to.equal(204);
				expect(spy).to.have.been.calledTwice;
			});
		});
	});

	describe('with multiple mounted applications', function() {
		it('should route requests to the handler associated with the specified hostname header', async function() {
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

			application.add(app1, 'http://localhost:8000', {
				hostnames: ['example.com']
			});

			application.add(app2, 'http://localhost:8000', {
				hostnames: ['example.org']
			});

			await listen(application);

			let response1 = await request('http://localhost:8000', {
				followRedirect: false,
				simple: false,
				resolveWithFullResponse: true,
				headers: {
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

			expect(response1.statusCode).to.equal(204);
			expect(spy1).to.have.been.calledOnce;
			expect(response2.statusCode).to.equal(204);
			expect(spy2).to.have.been.calledOnce;
			expect(spy1).to.have.been.calledBefore(spy2);
		});
	});
});
