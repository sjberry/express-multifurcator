# express-multifurcator

`express-multifurcator` is an application routing library that enables mounting multiple "applications" onto ExpressJS HTTP servers and dynamic runtime configuration using 12-factor standards.
It also provides a more expressive and standards-compliant interface for listening to interfaces with ExpressJS servers.
No callbacks!


## Motivation

Serving several applications (e.g. subdomains, microservices, etc.) from a single application server configuration with ExpressJS is entirely possible, but it might involve a significant amount of boilerplate engineering in your `app.js` script.
This boilerplate is exacerbated if you're subscribing to 12-factor standards and need your runtime environments to behave differently.

You might be thinking: "This is absurd, I already have a solution. Why wouldn't I just compartmentalize my NodeJS applications in separate processes and/or code repositories?"

There's nothing necessarily wrong with that paradigm, especially if the applications are managed and deployed by separate teams or subject to different CI or review processes.

However consider the following scenario:

  * You have a your primary website set up on `example.com`.
  * You have your authentication service set up on `auth.example.com`.
  * Your authentication service shares a significant amount of code with your primary website (e.g. middleware) and it makes "source code sense" to keep the two services in the same repository.
  * Running two NodeJS processes (or more if you're clustering each application) may incur unacceptable overhead.

Consider another scenario:

  * Your API and your web portal share a significant amount of business logic and are reviewed/developed by the same team.
  * You've put your API and your web portal in the same codebase accordingly.
  * In development you want to listen on a single port and run both your API and web portal.
  * On production you want to deploy the same codebase to two different boxes and have one box run the API and the other box run the web portal.
  * You want to keep your `app.js` clean, 12-factor compliant, and boot your services according to an external JSON configuration.

Cases such as these might result in an unmaintainable mess of boilerplate, and this is the sort of problem `express-multifurcator` was designed to resolve.


## Installation

Installation is fairly straightforward, but may require additional steps.

```
npm install express-multifurcator express
```

ExpressJS is listed as a peer dependency.
It is technically possible to install and work with `express-multifurcator` without installing ExpressJS.
The middleware generated with `express-multifurcator` can be mounted in any application that subscribes to the same request handling pattern as ExpressJS.
However this is not recommended as certain ExpressJS features are assumed internally, particularly in obtaining a request's hostname, original URL, etc.

Installing optional dependencies is recommended:

```
npm install http-errors
```

The `http-errors` module is used internally to generate 404 errors when an inbound request doesn't match a mounted application.
However, any error generating function can be used in lieu of `http-errors` as described in the [API docs](/docs/API.md).


## Usage

Let's cover some use case examples.
If you'd like more specific or detailed examples, be sure to check out the [`/examples`](/examples) directory.

### Basic

Consider the most basic use case.
So basic that it might not clearly indicate why this library isn't more trouble than it's worth.

```js
const Multifurcator = require('express-multifurcator');
const express = require('express');

// Create a Multifurcator container.
let container = new Multifurcator();

// Our basic "application." Instead of a full ExpressJS app we instantiate a Router.
// Don't worry, `.getListeners()` will create the necessary ExpressJS apps that you're used to!
let app = express.Router();

// We need a basic middleware function added to our "application" so it will do something.
app.use(function(req, res) {
    res.sendStatus(204);
});

// All right, now let's add our "application" to the container using an address.
// This address could very well have come from `config.app.address` or some other externally configured parameter. 
container.add(app, 'http://localhost:8000');

// We don't have any other apps to add in this, the simplest of cases!

// Now we can obtain an array of generated "listener" objects. This array will contain more than one element if multiple
// applications are mounted with different addresses (detailed below).
let listeners = container.getListeners();

for (let i = 0; i < listeners.length; i++) {
    let listener = listeners[i];

    // Each listener object contains the binding information (interface, protocol, port), an instantiated ExpressJS
    // application, the generated application routing middleware function, and a listen function unique to the
    // instantiated ExpressJS application.

    // Our generated handler function is NOT automatically mounted on the ExpressJS application. This is because you
    // might want to mount your own middleware ahead of the multifurcator routing middleware (e.g. body parsing, cookie
    // parsing, logging, etc.). In this case we don't have any other middleware, so we'll just mount the handler.
    listener.app.use(listener.handler);

    listener.listen() // Boots the listener. Returns a Promise, no callbacks necessary! Hurray!
        .then(function(server) {
            // Resolves with the HTTP server, equivalent to ExpressJS's native app.listen().
        }); 
}
```

### Hostname Redirection

Let's say we wanted to mount a single application but filter hostnames, or even better, redirect alias hostnames to our primary hostname.

```js
let app = express.Router();

...

container.add(app, 'http://localhost:8000', {
    hostnames: ['example.com', 'example.org'],
    aliases: {
        'www.example.com': 'example.com',
        'blog.example.com': 'example.com'
    }
});

...
```

In this case we're accepting the hostnames `example.com` and `example.org`.
Requests that specify either of these will not be subject to redirection at the application level (your webserver might still be configured to rewrite them or redirect them).
We're also establishing an alias of `www.example.com` and `blog.example.com` both for `example.com`.
Requests that specify either of these subdomains will be redirected at the application level to `example.com`.
Any other hostnames will 404.

The redirection will default to HTTP since `app` was added to `container` using an HTTP address.
This might be a minor inefficiency resulting in two redirects if you've intended all requests to `example.com` to be handled over HTTPS.
So we could override this behavior explicitly as such:

```js
let app = express.Router();

...

container.add(app, 'http://localhost:8000', {
    hostnames: ['example.com', 'example.org'],
    aliases: {
        'www.example.com': 'example.com',
        'blog.example.com': 'https://example.com'
    }
});

...
```

If we're only using one primary hostname we can use shorthand notation for behavior logically equivalent to the first example in this sub-section.
Note that shorthand notation doesn't support protocol modification.

```js
let app = express.Router();

...

container.add(app, 'http://localhost:8000', {
    hostnames: ['example.com'], // or 'example.com' as a literal string (i.e. you don't need to wrap it in an array)
    aliases: ['www.example.com', 'blog.example.com']
});

...
```

Wildcards are currently supported as the **first domain segment only** (e.g. `*.example.com`).

```js
let app = express.Router();

...

container.add(app, 'http://localhost:8000', {
    hostnames: ['example.com'],
    aliases: ['*.example.com']
});

...
```


### Mounting multiple applications

Consider the case where we actually want to mount multiple applications.
We have a few options.
We can:

  * Mount each application on a different interface or port.
  * Mount all applications on the same port distinguished by hostnames.
  * Any permutation thereof.

The only requirement is if you're adding an application with the same address you cannot specify a hostname that has already been mounted.
Keep in mind specifying no hostname is equivalent to the literal `*`, or logically equivalent to all hostnames.

```js
let app1 = express.Router(); // Some application.
let app2 = express.Router(); // Another application.
let app3 = express.Router(); // Maybe a sub-application.
let app4 = express.Router(); // Fancy microservice.

...

container.add(app1, 'http://localhost:8000');

container.add(app2, 'http://localhost:8001', {
    hostnames: 'example.org'
});

container.add(app3, 'http://localhost:8001', {
    hostnames: 'subdomain.example.org'
});

container.add(app4, 'http://localhost:8002');

...
```


### HTTPS Redirection

Depending on your proxy servers, HTTPS redirection may only be possible at the application layer.
With this as the case you are able to mount an application on an HTTPS address and automatically redirect HTTP requests to HTTPS.
This will NOT establish an encrypted connection for inbound requests inherently.
That task is still left to your webserver.

A request is deemed secure (HTTPS) using `req.secure` so it typically depends on the HTTP header:

```
X-Forwarded-Proto: https
```

This header is settable by most proxy servers (e.g. AWS load balancers, Nginx, etc.) if configured correctly.
Your web application will likely need to trust your proxy server in order for the header to be taken for granted.
Be sure to check the [ExpressJS docs on this topic](https://expressjs.com/en/guide/behind-proxies.html).

Mounting the applications on an HTTPS listener is marginally different:

```js
let app = express.Router();

...

container.add(app, 'https://localhost:8000');

...
```

Keep in mind that hostname redirection will now use HTTPS as the default redirection protocol rather than HTTP.
So if you actually want to redirect to HTTP you'll need to set it up slightly differently.

```js
let app = express.Router();

...

container.add(app, 'https://localhost:8000', {
    hostnames: ['example.com'],
    aliases: {
        'blog.example.com': 'http://example.com'
    }
});

...
```

Multiple applications can be mounted with mixed HTTP/HTTPS addresses in the same way as seen under "Mounting multiple applications."


### UNIX domain socket binding

If you're using UNIX domain sockets instead of IPv4/6 addresses you need to adhere to a specific address format:

```js
let app = express.Router();

...

container.add(app, 'https://unix:/path/to/socket');

...
```

Relative paths are also supported and are relative from the current working directory (`process.cwd()`):

```js
let app = express.Router();

...

container.add(app, 'https://unix:./relative/path/to/socket');

...
```


### Standalone `.listen()` usage

The function used internally for generating the `.listen()` function on the results of `.getListeners()` can also be used independently.

```js
const express = require('express');
const listen = require('express-multifurcator').listen;

let app = express();

listen(app, 'http://localhost:8000')
    .then(function(server) {
        // Resolves with the HTTP server, equivalent to ExpressJS's native app.listen().
    });
```
