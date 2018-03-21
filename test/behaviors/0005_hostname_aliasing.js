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

async function listen(application) {
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
}

describe('Behavior: Hostname aliasing', function() {
	afterEach(function() {
		for (let i = 0; i < resources.length; i++) {
			resources[i].close();
		}

		resources.length = 0;
	});

	it('should support verbose redirection arguments', async function() {
		let application = new Multifurcator();

		application.redirect('http://localhost:8000', 'example.org', 'example.com');

		await listen(application);

		let response = await request('http://localhost:8000', {
			followRedirect: false,
			simple: false,
			resolveWithFullResponse: true,
			headers: {
				Host: 'example.org'
			}
		});

		expect(response.statusCode).to.equal(302);
		expect(response.headers.location).to.equal('http://example.com/');
	});

	it('should support verbose redirection arguments with multiple "from" hostnames', async function() {
		let application = new Multifurcator();

		application.redirect('http://localhost:8000', ['example.net', 'example.org'], 'example.com');

		await listen(application);

		let response = await request('http://localhost:8000', {
			followRedirect: false,
			simple: false,
			resolveWithFullResponse: true,
			headers: {
				Host: 'example.org'
			}
		});

		expect(response.statusCode).to.equal(302);
		expect(response.headers.location).to.equal('http://example.com/');

		response = await request('http://localhost:8000', {
			followRedirect: false,
			simple: false,
			resolveWithFullResponse: true,
			headers: {
				Host: 'example.net'
			}
		});

		expect(response.statusCode).to.equal(302);
		expect(response.headers.location).to.equal('http://example.com/');
	});

	it('should support verbose redirection arguments', async function() {
		let application = new Multifurcator();

		application.redirect('http://localhost:8000', 'example.org', 'example.com');

		await listen(application);

		let response = await request('http://localhost:8000', {
			followRedirect: false,
			simple: false,
			resolveWithFullResponse: true,
			headers: {
				Host: 'example.org'
			}
		});

		expect(response.statusCode).to.equal(302);
		expect(response.headers.location).to.equal('http://example.com/');
	});

	it('should redirect hostname aliases to a specified hostname', async function() {
		let application = new Multifurcator();

		application.redirect('http://localhost:8000', {
			'example.org': 'example.com'
		});

		await listen(application);

		let response = await request('http://localhost:8000', {
			followRedirect: false,
			simple: false,
			resolveWithFullResponse: true,
			headers: {
				Host: 'example.org'
			}
		});

		expect(response.statusCode).to.equal(302);
		expect(response.headers.location).to.equal('http://example.com/');
	});

	it('should support port specification in the alias redirection specification', async function() {
		let application = new Multifurcator();
		let app = express.Router();
		let spy = sinon.spy();

		app.use(function(req, res) {
			spy();
			res.sendStatus(204);
		});

		application.redirect('http://localhost:8000', {
			'example.org': 'http://example.com:8000'
		});

		await listen(application);

		let response = await request('http://localhost:8000', {
			followRedirect: false,
			simple: false,
			resolveWithFullResponse: true,
			headers: {
				Host: 'example.org'
			}
		});

		expect(spy).to.not.have.been.called;
		expect(response.statusCode).to.equal(302);
		expect(response.headers.location).to.equal('http://example.com:8000/');
	});
});
