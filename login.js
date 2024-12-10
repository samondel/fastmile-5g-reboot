#!/usr/bin/env node

const http = require('http');
const sjcl = require('sjcl');
const CryptoJS = require('crypto-js');

var sha256 = function (val1, val2) {
    var out = sjcl.hash.sha256.hash(val1 + ":" + val2);
    return sjcl.codec.base64.fromBits(out);
};

var sha256url = function (val1, val2) {
    return base64url_escape(sha256(val1, val2));
};

var base64url_escape = function (b64) {
    var out = "";
    for (i = 0; i < b64.length; i++) {
      var c = b64.charAt(i);
      if (c == "+") {
        out += "-";
      } else if (c == "/") {
        out += "_";
      } else if (c == "=") {
        out += ".";
      } else {
        out += c;
      }
    }
    return out;
};

function F(R) {
	            return "function" == typeof R.constructor ? R.constructor.name : null
	        }

function getNonce(hostname) {
	return new Promise( (resolve, reject) => {
		const options = {
			hostname: hostname,
			path: '/login_web_app.cgi?nonce',
			method: 'GET',
		};

		var req = http.request(options, result => {

		        let rawData = '';

		        result.on('data', chunk => {
                		rawData += chunk;
		        });

		        result.on('end', () => {
                		parsedData = JSON.parse(rawData);
				resolve(parsedData);
		        });

			result.on('error', () => {
				reject(error);
			});
		});
		req.end();
	});
};

function postSalt(hostname, username, nonceResponse) {
	return new Promise( (resolve, reject) => {
		const nonceUrl = base64url_escape(nonceResponse.nonce);
		const userHash = sha256url(username, nonceResponse.nonce);
		const postBody = `userhash=${userHash}&nonce=${nonceUrl}`;
		const options = {
			hostname: hostname,
			path: '/login_web_app.cgi?salt',
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Content-Length': postBody.length,
			},
		};
		var req = http.request(options, result => {
			let rawData = '';

			result.on('data', chunk => {
				rawData += chunk;
			});

			result.on('end', () => {
				parsedData = JSON.parse(rawData);
				resolve(parsedData);
			});

			result.on('error', () => {
				reject(error);
			});
		});
		req.write(postBody);
		req.end();
	});
};

function login(hostname, username, password, nonceResponse, saltResponse) {
	return new Promise( (resolve, reject) => {
		const nonceUrl = base64url_escape(nonceResponse.nonce);
		const userhash = sha256url(username, nonceResponse.nonce);
		const randomKeyHash = sha256url(nonceResponse.randomKey, nonceResponse.nonce);
		var hashedPassword = nonceResponse.iterations >= 1 ? CryptoJS.SHA256(saltResponse.alati + password).toString() : saltResponse.alati + password;
		for (let iteration = 1; iteration < nonceResponse.iterations; iteration++) {
			var thisPass = CryptoJS.enc.Hex.parse(hashedPassword);
			hashedPassword = CryptoJS.SHA256(thisPass).toString();
		};
		const response = sha256url(sha256(username, hashedPassword.toLowerCase()), nonceResponse.nonce);
		var postBody = `userhash=${userhash}&RandomKeyhash=${randomKeyHash}&response=${response}&nonce=${nonceUrl}`;
		const enckey = sjcl.codec.base64.fromBits(sjcl.random.randomWords(4, 0))
		const enciv = sjcl.codec.base64.fromBits(sjcl.random.randomWords(4, 0));
		postBody += `&enckey=${base64url_escape(enckey)}`;
		postBody += `&enciv=${base64url_escape(enciv)}`;
                const options = {
			hostname: hostname,
			path: '/login_web_app.cgi?salt',
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Content-Length': postBody.length,
			},
		};
		var req = http.request(options, result => {
		        let rawData = '';

	                result.on('data', chunk => {
				rawData += chunk;
			});

                        result.on('end', () => {
				parsedData = JSON.parse(rawData);
				resolve(parsedData);
			});

			result.on('error', () => {
			        reject(error);
			});
		});
		req.write(postBody);
		req.end();
	});
}; 

function reboot(hostname, loginResponse) {
	return new Promise( (resolve, reject) => {
		const postBody = `csrf_token=${loginResponse.token}`;
		const options = {
			hostname: hostname,
			path: '/reboot_web_app.cgi',
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Content-Length': postBody.length,
				Cookie: `sid=${loginResponse.sid}`,
			},
		};
		console.log(options);
		console.log(postBody);
		var req = http.request(options, result => {
			let rawData = '';

			result.on('data', chunk => {
				rawData += chunk;
			});

			result.on('end', () => {
				resolve(rawData);
			});

			result.on('error', () => {
				reject(error);
			});
		});
		req.write(postBody);
		req.end();
	});
};

if (process.argv.length != 5) {
	console.log("Incorrect arguments, usage 'node login.js <hostname> <username> <password>'");
	return;
}
var hostname = process.argv[2];
var username = process.argv[3];
var password = process.argv[4];
var nonceResponse = '';
var saltResponse = '';
var loginResponse = '';

getNonce(hostname)
	.then(response => { nonceResponse = response; return postSalt(hostname, username, nonceResponse); } )
	.then(response => { saltResponse = response; return login(hostname, username, password, nonceResponse, saltResponse); } )
	.then(response => { loginResponse = response; return reboot(hostname, loginResponse); } )
	.then(response => console.log(response));

