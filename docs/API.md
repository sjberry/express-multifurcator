## express-multifurcator API docs

* [Multifurcator](#multifurcatoroptions) - Constructor for the Multifurcator class.
  * [{Multifurcator}.add](#multifurcatoraddapp-address-options) - Adds an application to a Multifurcator instance.
  * [{Multifurcator}.redirect](#multifurcatorredirectaddress-hostnames-options) - Adds a redirection handler to a Multifurcator instance.
  * [{Multifurcator}.getListeners](#multifurcatorgetlisteners) - Returns an array of listener objects after all applications have been added to a Multifurcator instance.
* [Multifurcator.listen](#multifurcatorlistenapp-address) - A utility function that can be used to call ExpressJS `.listen()`, returning a Promise instead of requiring event listening callbacks.

### Multifurcator([options])

Basic usage:

```js
const Multifurcator = require('express-multifurcator');

let container = new Multifurcator();
```

Usage with options specified:

```js
let container = new Multifurcator({
    redirectCode: 302,
    errors: function(code) {
        let err = new Error();
        err.statusCode = code;
    }
});
```

#### options

Type: `Object`

Options to pass to the Multifurcator constructor.
Optional if and only if `http-errors` is installed as an optional dependency.

##### options.redirectCode

Type: `Number`

Default: `302`

The redirect code that should be used for hostname and HTTP to HTTPS redirection.
Must be either `301` or `302`.

```js
let container = new Multifurcator({
    redirectCode: 301
});
```

##### options.errors

Type: `Function`

Default: `require('http-errors')` (If the optional dependency is installed.)

An error generating function that will be used to create HTTP errors, particularly when there is no matching application correlating to a supplied hostname.
If no error generating function is specified, the optional dependency `http-errors` will be used as a fallback.
If `http-errors` is not installed and no error generating function is supplied, an error will be thrown.

```js
let container = new Multifurcator({
    errors: function(code) {
        let err = new Error();
        err.statusCode = code;
    }
});
```

Default behavior is logically equivalent to:

```js
let application = new Multifurcator({
    errors: require('http-errors')
});
```


### {Multifurcator}.add(app, address[, options])

Returns: `Multifurcator` (chainable)

Adds an ExpressJS (or similar) middleware function (e.g. a Router serving as an "application") to the Multifurcator container.

#### app

Type: `Function` (ExpressJS middleware function)

An Express JS application to add on the specified address.
The same app can be added multiple times provided hostname and address uniqueness stipulations are satisfied.

#### address

Type: `String`

The network address to which the application should be added.
Supports IPv4 addresses (with a wildcard) and UNIX domain sockets.
UNIX domain sockets can either be absolutely pathed or relatively pathed from the process current working directory.
HTTP and HTTPS addresses are supported.
Defaults to HTTP if no protocol is specified.

Examples:

```js
let container = new Multifurcator();
let app = express.Router(); // Example of expectations and internal assumptions, not a strict "requirement."

// IPv4
container.add(app, 'http://localhost:8000');

// IPv4 (with a wildcard interface)
container.add(app, 'http://*:8000');

// Unix domain socket usage (absolute path)
container.add(app, 'http://unix:/path/to/socket');

// Unix domain socket usage (relative path)
container.add(app, 'http://unix:./relative/path/to/socket');

// With HTTPS (secure redirection)
container.add(app, 'https://localhost:8000');
```

HTTPS addresses do NOT actually establish secure handshakes with clients but rather will redirect requests deemed insecure to their secure counterparts.
Your webservers (e.g. Nginx, AWS load balancers) should handle TLS handshakes, so this feature will never be supported in this library.

A request is deemed secure (HTTPS) using `req.secure` so it typically depends on the HTTP header:

```
X-Forwarded-Proto: https
```

This header is settable by most proxy servers (e.g. AWS load balancers, Nginx, etc.) if configured correctly.
Your web application will likely need to trust your proxy server in order for the header to be taken for granted.
Be sure to check the [ExpressJS docs on this topic](https://expressjs.com/en/guide/behind-proxies.html).

#### options

Type: `Object`

An options configuration object to pass to the `add` method.
Can be used to configure hostname routing and redirection.

##### options.forceTLS

Type: `Boolean`

A flag indicating whether or not an application should be mounted spanning HTTPS and HTTP.
Has no effect unless the mounted `address` is HTTPS.

A value of `true` manifests in insecure requests being redirected to their secure counterpart.

An error will be thrown if an application has been previously mounted on the same address and hostname with the HTTP protocol.

##### options.hostnames

Type: `String` or `Array<String>`

An optional set of hostnames identifying the given app.
Can contain leading wildcards as an entire segment.
Wildcards within domain name segments are unsupported.
Examples of valid hostnames:

```
*
example.com
*.example.com
www.example.com
```

Examples of **invalid** hostnames:

```
www.*.example.com
*www.example.com
example.*
```

Hostnames can be used to distinguish a mounted app from others mounted at the same address or as a way to reject requests with a non-matching hostname if no other apps are specified.

It is not possible to mount multiple applications using the same address and hostname combination.
So if any other apps are added to the same Multifurcator instance they either must specify an unused address or a hostname (or set of hostnames) previously unused.

If no hostnames are specified, a logically equivalent hostname of `*` is used internally by default.


### {Multifurcator}.redirect(address, hostnames[, options])

##### options.aliases

Type: `String` or `Array<String>`

An optional set of hostname aliases to serve as redirects to a primary hostname.
Hostname format support matches that of `options.hostnames`.

Hostname aliases cannot match primary hostnames.
In other words, a hostname alias effectively "counts" as a primary hostname in the context of uniqueness.

If hostname aliases are specified but there is no primary hostname, this option has no effect.

Example:

```js
let container = new Multifurcator();

container.add(app, 'http://localhost:8000', {
    hostnames: 'example.com',
    aliases: {
        'www.example.com': 'example.com',
        'example.org': 'example.com'
    }
});
```

The redirect protocol will match that of the mount `address`.
It is possible to override this behavior by specifying a protocol in the hostname alias value:

```js
let container = new Multifurcator();

container.add(app, 'http://localhost:8000', {
    hostnames: 'example.com',
    aliases: {
        'www.example.com': 'https://example.com',
        'example.org': 'https://example.com'
    }
});
```

If there is only a single primary hostname specified, the short format is unambiguous and consequently acceptable:

```js
let container = new Multifurcator();

container.add(app, 'http://localhost:8000', {
    hostnames: 'example.com',
    aliases: ['www.example.com', 'example.org']
});
```

Note that if a protocol redirect override is desired, the short format cannot be used.


### {Multifurcator}.getListeners()

Returns: `Array<Object>`

Returns an array of "listener" objects containing the binding information (interface, protocol, port) as a plain object, an instantiated ExpressJS application, the generated application routing middleware function, and a listen function unique to the ExpressJS application..
An element will exist for each unique mount `address` from when applications were added with `.add()`. 

The generated handler function is NOT automatically mounted on the ExpressJS application.
This is because it might be desirable to mount other middleware ahead of the Multifurcator router (e.g. body parsing, cookie parsing, logging, etc.).

Example:

```js
let container = new Multifurcator();
let app = express.Router();

app.use(function(req, res) {
	res.sendStatus(204);
});

container.add(app, 'http://localhost:8000');

let listeners = container.getListeners();

for (let i = 0; i < listeners.length; i++) {
    let listener = listeners[i];
    
    let app = listener.app; // ExpressJS application (instantiated internally with express().
    let handler = listener.handler; // Multifurcator-generated middleware containing dynamic logic for hostname and protocol redirection.
    let listen = listener.listen; // Listen function unique to the corresponding ExpressJS app ("safe" shortcut to Multifurcator.listen).

    app.use(handler); // Mount the middleware.

    listen()
        .then(function(server) {
            // ...
        }); 
}
```


### Multifurcator.listen(app, address)

Returns: `Promise`

Accepts an ExpressJS application and listens on the provided address.
Returns a native Promise resolved with the `HttpServer`.

```js
let app = express();

Multifurcator.listen(app, 'http://localhost:8000')
    .then(function(server) {
        console.log('Server listening!');
    });
```

#### app

Type: `Function` (ExpressJS application)

An Express JS application to bind to the specified address.


#### address

Type: `String`

The network address to which the application should be bound.
Supports IPv4 addresses (with a wildcard) and UNIX domain sockets.
UNIX domain sockets can either be absolutely pathed or relatively pathed from the process current working directory.

Examples:

```js
// IPv4
Multifurcator.listen(app, 'http://localhost:8000');

// IPv4 (with a wildcard interface)
Multifurcator.listen(app, 'http://*:8000');

// Unix domain socket usage (absolute path)
Multifurcator.listen(app, 'http://unix:/path/to/socket');

// Unix domain socket usage (relative path)
Multifurcator.listen(app, 'http://unix:./relative/path/to/socket');
```
