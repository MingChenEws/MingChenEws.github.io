/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

var preformatMakeCredReq = (makeCredReq) => {
    console.info("Updating credentials ", makeCredReq)
    makeCredReq.challenge = base64url.decode(makeCredReq.challenge);
    makeCredReq.user.id = base64url.decode(makeCredReq.user.id);
    return makeCredReq
}

var publicKeyCredentialToJSON = (pubKeyCred) => {
    if (pubKeyCred instanceof Array) {
        let arr = [];
        for (let i of pubKeyCred)
            arr.push(publicKeyCredentialToJSON(i));
        return arr
    }

    if (pubKeyCred instanceof ArrayBuffer) {
        return base64url.encode(pubKeyCred)
    }
    if (pubKeyCred instanceof Object) {
        let obj = {};

        for (let key in pubKeyCred) {
            obj[key] = publicKeyCredentialToJSON(pubKeyCred[key])
        }

        return obj
    }

    return pubKeyCred
}

var preformatGetAssertReq = (getAssert) => {
    getAssert.challenge = base64url.decode(getAssert.challenge);
    for (let allowCred of getAssert.allowCredentials) {
        allowCred.id = base64url.decode(allowCred.id);
    }
    return getAssert
}

function init() {
    try {
        PublicKeyCredential;
    } catch (err) {
        displayError("Web Authentication API not found");
    }

    if (document.location.origin.startsWith("http://")) {
        displayError("Loaded outside of a secure context. It shouldn't work.");
    }
    clearSuccess();
    clearError();
    clearLoading();
    hideForms();
    if (isBrowserCompatible()) {
        $("#registerForm").show();
        $("#loginForm").show();
    } else {
        displayError("Incompatible browser.");
    }

    if (typeof (Storage) !== "undefined") {
        //displaySuccess("Code for localStorage/sessionStorage.");
    } else {
        displayError("Sorry! No Web Storage support.");
    }

    $("#registerForm").submit(processRegisterFormLocal);
    $("#loginForm").submit(processLoginFormLocal);
}

function displayError(message) {
    hideForms();
    clearLoading();
    clearSuccess();
    $("#errMessage").text(message);
    $("#error").show();
}

function clearLoading() {
    $("#loadingText").text("");
    $("#loading").hide();
}

function hideForms() {
    $("#registerForm").hide();
    $("#loginForm").hide();
}

function displayLoading(message) {
    hideForms();
    clearSuccess();
    $("#loadingText").text(message);
    $("#loading").show();
}

function clearError() {
    $("#errMessage").text("");
    $("#error").hide();
}

function goHome() {
    clearLoading();
    clearError();
    window.history.back();
}

function displaySuccess(message) {
    hideForms();
    clearLoading();
    $("#successMessage").text(message);
    $("#success").show();
}

function clearSuccess() {
    $("#successMessage").text();
    $("#success").hide();
}

function processRegisterFormLocal(e) {
    if (e.preventDefault) e.preventDefault();
    let accounts = [];
    if (!!localStorage.accounts) {
        accounts = JSON.parse(localStorage.accounts); // Convert the object string back to a JavaScript object.
    } 
    let userName = $("#username").val();
    for (let a of accounts) {
        if (a.username === userName) {
            displayError(userName + " exists already!!");
            return;
        }
    }

    let rpid = window.location.hostname;
    var newUser = { "userid": binToStr(getRandomNumbers(16)), "username": $("#username").val(), "displayName": $("#alias").val() };
	let lst = "";
	alert("Hello1::lst="+lst);
	
	if ((lst === "") || (lst === null)){
	    lst = [];
	}
	alert("Hello1.0::lst="+lst);
    var publicKey = {
        // The challenge is produced by the server; see the Security Considerations
        challenge: getRandomNumbers(32),

        // Relying Party:
        rp: {
            id: rpid,
            name: "EWS WebAuthn Demo"
        },

        // User:
        user: {
            id: strToBin(newUser.userid),
            name: newUser.username,
            displayName: newUser.displayName
        },

        // This Relying Party will accept either an ES256 or RS256 credential, but
        // prefers an ES256 credential.
        pubKeyCredParams: [
            {
                type: "public-key",
                alg: -7 // "ES256" as registered in the IANA COSE Algorithms registry
            }
        ],

        timeout: 60000,  // 1 minute
        //excludeCredentials: lst, // No exclude list of PKCredDescriptors
        extensions: { "loc": true }  // Include location information
        // in attestation
    };
	alert("Hello2");
	
	alert("publicKey="+JSON.stringify(publicKey));
	
	
    hideForms();
    clearSuccess();
    displayLoading("Contacting token... please perform your verification gesture (e.g., touch it, or plug it in)\n\n");

    // Note: The following call will cause the authenticator to display UI.
    navigator.credentials.create({ publicKey })
        .then(function (newCredentialInfo) {
			var nc = newCredentialInfo;
			var ncresponse = publicKeyCredentialToJSON(nc);
			console.info("response = " + JSON.stringify(ncresponse));
			alert("response = " + JSON.stringify(ncresponse));
            // Send new credential info to server for verification and registration. Save locally for now.
			newUser.keyHandle = binToStr(newCredentialInfo.rawId);
            accounts.push(newUser);
            localStorage.accounts = JSON.stringify(accounts); // Convert the object to a string.
            displaySuccess("Account '"+newUser.displayName+"' added!!\n");
            $('#successMessage').append('<a href="./login.html">Click here to log in</a>');
            return true;
        }).catch(function (e) {
            // No acceptable authenticator or user refused consent. Handle appropriately.
            displayError("ERROR: " + e.message);
        });

    return false;
}


var translateMakeCredReq = (makeCredReq) => {
    console.info("Updating credentials ", makeCredReq);
	alert("Updating credentials:::"+makeCredReq);
    makeCredReq.data.challenge = base64url.decode(makeCredReq.data.challenge);
    makeCredReq.data.user.id = base64url.decode(makeCredReq.data.user.id);
	if ((makeCredReq.data.excludeCredentials === "") || (makeCredReq.data.excludeCredentials === null)){
	    makeCredReq.data.excludeCredentials = [];
	}
    return makeCredReq.data;
}

function processRegisterFormRemote(e) {
	if (e.preventDefault) e.preventDefault();
	hideForms();
    clearSuccess();
    displayLoading("Contacting Server, please wait...\n\n");

    let rpid = "https://webauthndemo.ews.com";
	let tmpGuid = getTmpGuid();
	var ewSID = null;
	var replyTo = null;
	
	let formBody = {
		"clientId": "Authentify_Test",
		"clientAcctId": "Allstate",
		"app": "fidoRegistration",
		"license": tmpGuid,
		"data": {
			"rp": {
				  "name": "EWS WebAuthn Demo",
				  "id": rpid
			},
			"user": {
				  "name": $("#username").val(),
				  "displayName": $("#alias").val()
			},
			"credentialName":"EWS WebAuthn Demo "+$("#username").val()+" FIDO Token"
		}
	}

    fetch('https://achqdinf03.authentify.inc/', {
        method: 'POST',
        //credentials: 'include',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(formBody)
    }).then(response => {
            response.json().then(
                data => {
                    if (response.status === 200) {
                        console.log(data);
						ewSID = data.ewSID;
						replyTo = data.replyTo;
                        let v = translateMakeCredReq(data);
						v.timeout = 6000;
                        console.info("Updated Response from FIDO RP server ", v);
						alert("Updated Response from FIDO RP server::: "+v)
                        navigator.credentials.create({publicKey: v})
                            .then(function (aNewCredentialInfo) {
                                var response = publicKeyCredentialToJSON(aNewCredentialInfo);
								response.credentialId = response.rawId;
								console.info("response = " + JSON.stringify(response))
								alert("response = " + JSON.stringify(response))
								let formBody = {
									"ewSID": ewSID,
									"clientId": "Authentify_Test",
									"clientAcctId": "Allstate",
									"app": "fidoRegistration",
									"license": tmpGuid,
									"data": response
								}
								
                                fetch(replyTo, {
                                        method: 'POST',
                                        //credentials: 'include',
                                        headers: {
                                            'Content-Type': 'application/json'
                                        },
                                        body: JSON.stringify(formBody)
                                    }
                                ).then(
                                    response => {
                                        response.json().then(
                                            data => {
												alert("response::: "+JSON.stringify(response));
                                                if (response.status === 200) {
													if (data.data.registered === true) {
                                                    displaySuccess("Successful registration! ")
                                                    $('#successMessage').append('<a href="./login.html">Click here to log in</a>');
													} else {
														displayError("Not Registered!!!");
													}
                                                } else {
                                                    displayError(data)
                                                }
                                            }
                                        )
                                    }
                                )
                            }).catch(function (error) {
                                console.error("respones = " + error)
                            }
                        )
                    }
                    else {
                        displayError(`Server responed with error. The message is: ${response.message}`);
                    }
                }
            )
        }
    )

    return false;
}

function processLoginFormLocal(e) {
    if (e.preventDefault) e.preventDefault();
    let accounts = [];
    if (!!localStorage.accounts) {
        accounts = JSON.parse(localStorage.accounts); // Convert the object string back to a JavaScript object.
    } 
    let userName = $("#loginUsername").val();
    var thisUser = null;
    for (let a of accounts) {
		if (!thisUser) {
			if (a.username === userName) {
				$("#successMessage").text(userName + " found!!");
				$("#success").show();
				thisUser = a;
			}
		}
    }
    if (!thisUser) {
        displayError(userName + " not found!!");
        return;
    }

    //let rpid = "https://webauthndemo.ews.com";
    let rpid = window.location.hostname;
    var options = {
        // The challenge is produced by the server; see the Security Considerations
        challenge: getRandomNumbers(32),

        // Relying Party:
        rp: {
            id: rpid,
            name: "EWS WebAuthn Demo"
        },

        // User:
        //user: {
        //    id: strToBin(thisUser.userid),
        //    name: thisUser.username,
        //    displayName: thisUser.displayName
        //},

        timeout: 60000,  // 1 minute
        allowCredentials: [{ type: "public-key", id: strToBin(thisUser.keyHandle) }]
    };
	alert("options="+JSON.stringify(options));
		
    hideForms();
    clearSuccess();
    displayLoading("Contacting token... please perform your verification gesture (e.g., touch it, or plug it in)\n\n");

    navigator.credentials.get({ "publicKey": options })
        .then(function (assertion) {
			var nc = assertion;
			//alert("nc.rawId.length="+nc.rawId.byteLength);
			var iid = base64url.decode(nc.id);
			//alert("iid.length="+iid.byteLength);
			var ncresponse = publicKeyCredentialToJSON(nc);
			console.info("response = " + JSON.stringify(ncresponse));
			alert("response = " + JSON.stringify(ncresponse));
            // Send assertion to server for verification
			displaySuccess("Account '"+thisUser.displayName+"' authenticated!!\n");
            $('#successMessage').append('<a href="./index.html">Click here to go HOME</a>');
            return true;
        }).catch(function (e) {
            // No acceptable credential or user refused consent. Handle appropriately.
            displayError("ERROR: " + e.message);
        });
    return false;
}

var translateGetAssertReq = (getAssert) => {
    getAssert.data.challenge = base64url.decode(getAssert.data.challenge);
    for (let allowCred of getAssert.data.allowCredentials) {
        allowCred.id = base64url.decode(allowCred.id);
    }
    return getAssert.data;
}

function processLoginFormRemote(e) {
    if (e.preventDefault) e.preventDefault();
	
	hideForms();
    clearSuccess();
    displayLoading("Contacting Server, please wait...\n\n");

    let rpid = "https://webauthndemo.ews.com";
	let tmpGuid = getTmpGuid();
	var ewSID = null;
	var replyTo = null;
	
	let formBody = {
		"clientId": "Authentify_Test",
		"clientAcctId": "Allstate",
		"app": "fidoRegistration",
		"license": tmpGuid,
		"data": {
			"rp": {
				  "id": rpid
			},
			"user": {
				  "name": $("#username").val(),
			},
		}
	}
	
	fetch('https://achqdinf03.authentify.inc/', {
        method: 'POST',
        //credentials: 'include',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(formBody)
    }).then(response => {
            response.json().then(
                data => {
                    if (response.status === 200) {
                        console.log(data);
						ewSID = data.ewSID;
						replyTo = data.replyTo;
                        let v = translateGetAssertReq(data);
						v.timeout = 6000;
                        console.info("Updated Response from FIDO RP server ", v);
						alert("Updated Response from FIDO RP server::: "+v)
                        navigator.credentials.create({publicKey: v})
                            .then(function (aNewCredentialInfo) {
                                var response = publicKeyCredentialToJSON(aNewCredentialInfo);
								response.credentialId = response.rawId;
								console.info("response = " + JSON.stringify(response))
								alert("response = " + JSON.stringify(response))
								let formBody = {
									"ewSID": ewSID,
									"clientId": "Authentify_Test",
									"clientAcctId": "Allstate",
									"app": "fidoRegistration",
									"license": tmpGuid,
									"data": response
								}
								
                                fetch(replyTo, {
                                        method: 'POST',
                                        //credentials: 'include',
                                        headers: {
                                            'Content-Type': 'application/json'
                                        },
                                        body: JSON.stringify(formBody)
                                    }
                                ).then(
                                    response => {
                                        response.json().then(
                                            data => {
												alert("response::: "+JSON.stringify(response));
                                                if (response.status === 200) {
													if (data.data.registered === true) {
                                                    displaySuccess("Successful registration! ")
                                                    $('#successMessage').append('<a href="./login.html">Click here to log in</a>');
													} else {
														displayError("Not Registered!!!");
													}
                                                } else {
                                                    displayError(data)
                                                }
                                            }
                                        )
                                    }
                                )
                            }).catch(function (error) {
                                console.error("respones = " + error)
                            }
                        )
                    }
                    else {
                        displayError(`Server responed with error. The message is: ${response.message}`);
                    }
                }
            )
        }
    )
	
	
	
	
    navigator.credentials.get({ "publicKey": options })
        .then(function (assertion) {
			var nc = assertion;
			//alert("nc.rawId.length="+nc.rawId.byteLength);
			var iid = base64url.decode(nc.id);
			//alert("iid.length="+iid.byteLength);
			var ncresponse = publicKeyCredentialToJSON(nc);
			console.info("response = " + JSON.stringify(ncresponse));
			alert("response = " + JSON.stringify(ncresponse));
            // Send assertion to server for verification
			displaySuccess("Account '"+thisUser.displayName+"' authenticated!!\n");
            $('#successMessage').append('<a href="./index.html">Click here to go HOME</a>');
            return true;
        }).catch(function (e) {
            // No acceptable credential or user refused consent. Handle appropriately.
            displayError("ERROR: " + e.message);
        });
    return false;
}

function processRegisterForm(e) {
    if (e.preventDefault) e.preventDefault();
    hideForms();
    clearSuccess();
    displayLoading("Contacting token... please perform your verification gesture (e.g., touch it, or plug it in)\n\n");

    let rpid = "https://webauthndemo.ews.com";
    //let rpid = document.domain;
    let formBody = { "username": $("#username").val(), "displayName": $("#alias").val(), keyHandle:"" };

    fetch('/attestation/options', {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(formBody)
    }).then(
        response => {
            response.json().then(
                data => {
                    if (response.status === 200) {
                        console.log(data);
                        let v = preformatMakeCredReq(data);
                        console.info("Updated Response from FIDO RP server ", v)
                        console.info("RP Domain = ", rpid)
                        v.rp.id = rpid;
                        navigator.credentials.create({publicKey: v})
                            .then(function (aNewCredentialInfo) {
                                var response = publicKeyCredentialToJSON(aNewCredentialInfo);
                                console.info("response = " + response)
                                console.info("response = " + JSON.stringify(response))
                                fetch('/attestation/result', {
                                        method: 'POST',
                                        credentials: 'include',
                                        headers: {
                                            'Content-Type': 'application/json'
                                        },
                                        body: JSON.stringify(response)
                                    }
                                ).then(
                                    response => {
                                        response.json().then(
                                            data => {
                                                if (response.status === 200) {
                                                    displaySuccess("Successful registration! ")
                                                    $('#successMessage').append('<a href="./login.html">Click here to log in</a>');
                                                } else {
                                                    displayError(data)
                                                }
                                            }
                                        )
                                    }
                                )
                            }).catch(function (error) {
                                console.error("respones = " + error)
                            }
                        )
                    }
                    else {
                        displayError(`Server responed with error. The message is: ${response.message}`);
                    }
                }
            )
        }
    )
    return false;
}

function getTmpGuid() {	
	return 'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT';	
}

function processLoginForm(e) {
    if (e.preventDefault) e.preventDefault();
    hideForms();
    clearSuccess();
    displayLoading("Contacting token... please perform your verification gesture (e.g., touch it, or plug it in)\n\n");

    $("#getOut").text("");

    $("#getOut").text("Contacting token... please perform your verification gesture (e.g., touch it, or plug it in)\n\n");

    //let rpid = document.domain;
    let rpid = "https://webauthndemo.ews.com";
    let formBody = {"username": $("#loginUsername").val(), "documentDomain": rpid};

    fetch('/assertion/options', {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(formBody)
    }).then(
        response => {
            response.json().then(
                data => {
                    if (response.status === 200) {
                        console.info("Updated Response from FIDO RP server ", data)
                        var resp = preformatGetAssertReq(data)
                        console.info("Updated Response from FIDO RP server ", resp)
                        var key = navigator.credentials.get({publicKey: resp})
                        key.then(aAssertion => {
                            console.log(aAssertion)
                            var resp = JSON.stringify(publicKeyCredentialToJSON(aAssertion));
                            console.info("Get Assertion Response " + data);
                            fetch('/assertion/result', {
                                method: 'POST',
                                credentials: 'include',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: resp
                            }).then(
                                response => {
                                    response.json().then(
                                        data => {
                                            if (response.status === 200) {
                                                displaySuccess("Successful match [" + data.status + "]");
                                            } else {
                                                displayError("Failure [" + data.status + "-" + data.errorMessage + "]");
                                            }
                                        }
                                    )
                                }
                            )
                        }).catch(function (aErr) {
                            displayError("Unable to get Assertion Response ", JSON.stringify(aErr));
                        });
                    } else {
                        displayError(`Server responed with error. The message is: ${data.errorMessage}`);
                    }
                }
            )
        }
    )
}


function isBrowserCompatible() {
    return navigator && navigator.credentials && typeof (navigator.credentials.create) === 'function';
}

//// Google

function strToBin(str) {
    return Uint8Array.from(atob(str), c => c.charCodeAt(0));
}

function binToStr(bin) {
    return btoa(new Uint8Array(bin).reduce(
        (s, byte) => s + String.fromCharCode(byte), ''
    ));
}

function hexToBytes(hex) {
    for (var bytes = [], c = 0; c < hex.length; c += 2)
        bytes.push(parseInt(hex.substr(c, 2), 16));
    return bytes;
}

function bytesToHex(byteArray) {
    return Array.from(byteArray, function (byte) {
        return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }).join('').toUpperCase();
}

function getRandomNumbers(siz) {
    var challenge = new Uint8Array(siz);
    for (var i = 0; i < 32; i++) {
        challenge[i] = Math.floor(Math.random() * 256);
    }

    return challenge;

    /**
    return rest_get(
        "/challenge"
    ).then(response => {
        return response.json();
    }).then(response => {
        if (response.error) {
            return Promise.reject(error);
        }
        else {
            var challenge = Uint8Array.from(response.result, c => c.charCodeAt(0)).buffer;
            return Promise.resolve(challenge);
        }
    });
    **/
}

function createCredential(challenge) {
    if (!navigator.credentials)
        return Promise.reject("Error: WebAuthn APIs are not present on this device");

    var makeCredentialOptions = {
        rp: {
            name: "WebAuthn Test Server",
            icon: "https://example.com/rpIcon.png"
        },
        user: {
            icon: "https://example.com/userIcon.png"
        },
        challenge: challenge,
        pubKeyCredParams: [],
        timeout: 90000,
        excludeCredentials: [],
        authenticatorSelection: {},
        attestation: undefined,
        extensions: {
            hmacCreateSecret: true,
            authenticatorProtection: "UserVerificationOptional"
        }
    };

    switch ($('#create_rpInfo').val()) {
        case "normal":
            makeCredentialOptions.rp.id = window.location.hostname;
            break;
        case "suffix":
            makeCredentialOptions.rp.id = "suffix." + window.location.hostname;
            break;
        case "securityerror":
            makeCredentialOptions.rp.id = "foo.com";
            break;
        case "emptyrpid":
            makeCredentialOptions.rp.id = "";
            break;
        case "emptyrpname":
            makeCredentialOptions.rp.name = undefined;
            break;
        case "emptyrpicon":
            makeCredentialOptions.rp.icon = undefined;
        case "undefined":
        default:
            break;
    }

    switch ($('#create_userInfo').val()) {
        case "empty":
            makeCredentialOptions.user.displayName = "";
            makeCredentialOptions.user.name = "";
            break;
        case "alice":
            makeCredentialOptions.user.displayName = "Alice Doe";
            makeCredentialOptions.user.name = "alice@example.com";
            break;
        case "stella":
            makeCredentialOptions.user.displayName = "Stella Ipsum";
            makeCredentialOptions.user.name = "stella@example.com";
            break;
        case "john":
            makeCredentialOptions.user.displayName = "John Smith";
            makeCredentialOptions.user.name = "john@example.com";
            break;
        case "mike":
            makeCredentialOptions.user.displayName = "Mike Marlowe";
            makeCredentialOptions.user.name = "mike@example.com";
            break;
        case "bob":
        default:
            makeCredentialOptions.user.displayName = "Bob Smith";
            makeCredentialOptions.user.name = "bob@example.com";
            break;
    }
    //don't do this in production code. User ID is PII
    makeCredentialOptions.user.id = Uint8Array.from(makeCredentialOptions.user.name
        .split(''), c => c.charCodeAt(0));

    if ($('#create_ES256').is(":checked")) {
        makeCredentialOptions.pubKeyCredParams.push({
            type: "public-key",
            alg: -7
        });
    }
    if ($('#create_RS256').is(":checked")) {
        makeCredentialOptions.pubKeyCredParams.push({
            type: "public-key",
            alg: -257
        });
    }

    if ($('#create_excludeCredentials').is(":checked")) {
        var excludeCredentials = window.credentials.map(cred => {
            return {
                type: "public-key",
                id: Uint8Array.from(atob(cred.id), c => c.charCodeAt(0))
            };
        });

        makeCredentialOptions.excludeCredentials = excludeCredentials;
    }

    if ($('#create_authenticatorAttachment').val() !== "undefined") {
        makeCredentialOptions.authenticatorSelection.authenticatorAttachment = $('#create_authenticatorAttachment').val();
    }

    if ($('#create_userVerification').val() !== "undefined") {
        makeCredentialOptions.authenticatorSelection.userVerification = $('#create_userVerification').val();
    }

    if ($('#create_attestation').val() !== "undefined") {
        makeCredentialOptions.attestation = $('#create_attestation').val();
    }

    if ($('#create_requireResidentKey').val() !== "undefined") {
        var requireResidentKey = ($('#create_requireResidentKey').val() == "true");
        makeCredentialOptions.authenticatorSelection.requireResidentKey = requireResidentKey;
    }

    return navigator.credentials.create({
        publicKey: makeCredentialOptions
    }).then(attestation => {
        var credential = {
            id: binToStr(attestation.rawId),
            clientDataJSON: arrayBufferToString(attestation.response.clientDataJSON),
            attestationObject: binToStr(attestation.response.attestationObject),
            metadata: {
                rpId: makeCredentialOptions.rp.id,
                userName: makeCredentialOptions.user.name,
                requireResidentKey: makeCredentialOptions.authenticatorSelection.requireResidentKey
            },
        };

        console.log("=== Attestation response ===");
        logVariable("id (base64)", credential.id);
        logVariable("clientDataJSON", credential.clientDataJSON);
        logVariable("attestationObject (base64)", credential.attestationObject);

        return rest_put("/credentials", credential);
    }).then(response => {
        return response.json();
    }).then(response => {
        if (response.error) {
            return Promise.reject(response.error);
        } else {
            return Promise.resolve(response.result);
        }
    });
}

function getAssertion(challenge) {
    if (!navigator.credentials)
        return Promise.reject("Error: WebAuthn APIs are not present on this device");

    var getAssertionOptions = {
        rpId: undefined,
        timeout: 90000,
        challenge: challenge,
        allowCredentials: [],
        userVerification: undefined
    };

    switch ($('#get_rpId').val()) {
        case "normal":
            getAssertionOptions.rpId = window.location.hostname;
            break;
        case "suffix":
            getAssertionOptions.rpId = "suffix." + window.location.hostname;
            break;
        case "securityerror":
            getAssertionOptions.rpId = "foo.com";
            break;
        case "undefined":
        default:
            break;
    }

    if ($('#get_allowCredentials').is(":checked")) {
        var allowCredentials = window.credentials.map(cred => {
            return {
                type: "public-key",
                id: Uint8Array.from(atob(cred.id), c => c.charCodeAt(0))
            };
        });

        getAssertionOptions.allowCredentials = allowCredentials;
    }

    if ($('#get_userVerification').val() !== "undefined") {
        getAssertionOptions.userVerification = $('#get_userVerification').val();
    }

    return navigator.credentials.get({
        publicKey: getAssertionOptions
    }).then(assertion => {
        var credential = {
            rpId: getAssertionOptions.rpId,
            id: binToStr(assertion.rawId),
            clientDataJSON: arrayBufferToString(assertion.response.clientDataJSON),
            userHandle: binToStr(assertion.response.userHandle),
            signature: binToStr(assertion.response.signature),
            authenticatorData: binToStr(assertion.response.authenticatorData)
        };

        console.log("=== Assertion response ===");
        logVariable("id (base64)", credential.id);
        logVariable("userHandle (base64)", credential.userHandle);
        logVariable("authenticatorData (base64)", credential.authenticatorData);
        logVariable("clientDataJSON", credential.clientDataJSON);
        logVariable("signature (base64)", credential.signature);

        return rest_put("/assertion", credential);
    }).then(response => {
        return response.json();
    }).then(response => {
        if (response.error) {
            return Promise.reject(response.error);
        } else {
            return Promise.resolve(response.result);
        }
    });
}

function deleteCredential(id) {
    return rest_delete(
        "/credentials",
        {
            id: id
        }
    ).then((response) => {
        return response.json();
    }).then((response) => {
        if (response.error) {
            return Promise.reject(response.error);
        }
        else {
            return updateCredentials();
        }
    });
}



$(document).ready(function () {
    init();

    $("#getButton").click(function () {

    });
});


/*************************
Resource: platform

Method: POST

 

Request

 

{

  "clientId": "Authentify_Test",

  "clientAcctId": "Allstate",

  "app": "fidoRegistration",

  "license": "3360a6d7-7f15-4739-bb95-2fa402e0c4ee",

  "data": {

    "rp": {

      "name": "Yubico WebAuthn demo",

      "id": "localhost"

    },

    "user": {

      "name": "Julie",

      "displayName": "some name"

    },

    "credentialName": "JulieIsAwesome"

  }

}

 

 

Response

 

{

  "clientId": "Authentify_Test",

  "app": "fidoRegistration",

  "clientAcctId": "Allstate",

  "ewSID": "55e5dc2c-cc06-4e2e-9667-a0eee83291e8",

  "replyTo": "https://achqdinf03.authentify.inc/getSessionStatus?id=12d444b4eac20175de8746a42f0bf051664f3064",

  "timestampISO8601": "2019-05-31T15:16:42Z",

  "event": "ParmsOK",

  "statusCode": "7000",

  "data": {

    "rp": {

      "id": "localhost",

      "name": "Yubico WebAuthn demo"

   },

    "user": {

      "displayName": "some name",

      "icon": "https://example.com/profiles/userLogo.png",

      "id": "authentify_test_sflasdlkajsdfl;ak",

      "name": "Julie"

    },

    "credentialName": "JulieIsAwesome",

    "pubKeyCredParams": [

      {

        "alg": "-7",

        "type": "public-key"

      },

      {

        "alg": "-257",

        "type": "public-key"

      }

    ],

    "excludeCredentials": "",

    "attestation": "direct",

    "challenge": "QuAY4y3kgS-WnJcIXBi9SAY7_HfRnS8zou96duWWrG8"

  }

}

 

 

 

Registration finish

Resource: getSessionStatus?id=<xxxxxxxxxxxxxxxxxxxxxxxx>  //from registration start response

Method: POST

 

Request

 

{

"ewSID": "55e5dc2c-cc06-4e2e-9667-a0eee83291e8",

  "clientId": "Authentify_Test",

  "clientAcctId": "Allstate",

  "app": "fidoRegistration",

  "license": "3360a6d7-7f15-4739-bb95-2fa402e0c4ee",

  "data": {

  "credentialId": "V14GKV1kEK8focddHun787NHkAgzxRN5VeOwJpOyh4CkXAWOl3tk9zLnC74cKdod1MLEhDsniQITo_4Qx0-RdQ",

  "response": {

    "attestationObject": "o2NmbXRoZmlkby11MmZnYXR0U3RtdKJjc2lnWEgwRgIhALMz48bJR0ph1nUEd48ST__OXQUFqIaHl2TDvVwLWN5WAiEA6tECjW7t_7kk7Hmu3bZn9Adfj0hXq1Cxc3hz2vRg_BZjeDVjgVkCUzCCAk8wggE3oAMCAQICBDxoKU0wDQYJKoZIhvcNAQELBQAwLjEsMCoGA1UEAxMjWXViaWNvIFUyRiBSb290IENBIFNlcmlhbCA0NTcyMDA2MzEwIBcNMTQwODAxMDAwMDAwWhgPMjA1MDA5MDQwMDAwMDBaMDExLzAtBgNVBAMMJll1YmljbyBVMkYgRUUgU2VyaWFsIDIzOTI1NzM0ODExMTE3OTAxMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEvd9nk9t3lMNQMXHtLE1FStlzZnUaSLql2fm1ajoggXlrTt8rzXuSehSTEPvEaEdv_FeSqX22L6Aoa8ajIAIOY6M7MDkwIgYJKwYBBAGCxAoC…-3_o7yR7ZP_GpiFKwdm-czb94POoGD-TS1IYdfXj94mAr5cKWx4EKjh210uovu_pLdLjc8xkQciUrXzZpPR9rT2k_q9HkZhHU-NaCJzky-PTyDbq0KKnzqVhWtfkSBCGw3ezZkTS-5lrvOKbIa24lfeTgu7FST5OwTPCFn8HcfWZMXMSD_KNU-iBqJdAwTLPPDRoLLvPTl29weCAIh-HUpmBQd0UltcPOrA_LFvAf61oYXV0aERhdGFYxEmWDeWIDoxodDQXD2R2YFuP5K65ooYyx5lc87qDHZdjQQAAAAAAAAAAAAAAAAAAAAAAAAAAAEBXXgYpXWQQrx-hx10e6fvzs0eQCDPFE3lV47Amk7KHgKRcBY6Xe2T3MucLvhwp2h3UwsSEOyeJAhOj_hDHT5F1pQECAyYgASFYIMM6KtZGFfNGeMtaa84TIqXr5zyXJu-aWOn6QHLnAfeyIlgg0WHFcgQ0J9aBjYph2FhhJCC3K0H134gdsk73OQYcde8",

    "clientDataJSON": "eyJjaGFsbGVuZ2UiOiJlWXUzZ0t2bmxVamFMTDRmTFB5Ry16Uk5GUVhubEtRWVZwTERDWnFpOGVNIiwiY2xpZW50RXh0ZW5zaW9ucyI6e30sImhhc2hBbGdvcml0aG0iOiJTSEEtMjU2Iiwib3JpZ2luIjoiaHR0cHM6Ly9sb2NhbGhvc3Q6ODQ0MyIsInR5cGUiOiJ3ZWJhdXRobi5jcmVhdGUifQ",

    "type": "public-key"

  }

}

}

 

 

Response

 

{
  "clientId": "Authentify_Test",
  "app": "fidoRegistration",
  "clientAcctId": "Allstate",
  "ewSID": "55e5dc2c-cc06-4e2e-9667-a0eee83291e8",
  "replyTo": "https://achqdinf03.authentify.inc/getSessionStatus?id=12d444b4eac20175de8746a42f0bf051664f3064",
  "timestampISO8601": "2019-05-31T15:31:16Z",
  "statusCode": "0",
  "data": {
    "credentialId": "V14GKV1kEK8focddHun787NHkAgzxRN5VeOwJpOyh4CkXAWOl3tk9zLnC74cKdod1MLEhDsniQITo_4Qx0-RdQ",  //I just have this in here for testing purposes
    "registered": "true"
  }
}
**************************/
