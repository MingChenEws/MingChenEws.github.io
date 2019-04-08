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
        alert("accounts found!");
        accounts = JSON.parse(localStorage.accounts); // Convert the object string back to a JavaScript object.
    } else {
        alert("no accounts found!!");
    }
    let userName = $("#username").val();
    for (let a of accounts) {
        if (a.username === userName) {
            displayError(userName + " exists already!!");
            return;
        }
    }
    alert(userName + " not found!!");

    //let rpid = "https://webauthndemo.ews.com/";
    //let rpid = "https://webauthntest.azurewebsites.net";
    let rpid = window.location.hostname;
    var newUser = { "userid": binToStr(getRandomNumbers(16)), "username": $("#username").val(), "displayName": $("#alias").val() };
    alert(">>1 rpid:"+rpid);
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
        excludeCredentials: [], // No exclude list of PKCredDescriptors
        extensions: { "loc": true }  // Include location information
        // in attestation
    };
    alert(">>2, rpid="+publicKey.rp.id);
    hideForms();
    clearSuccess();
    displayLoading("Contacting token... please perform your verification gesture (e.g., touch it, or plug it in)\n\n");

    // Note: The following call will cause the authenticator to display UI.
    navigator.credentials.create({ publicKey })
        .then(function (newCredentialInfo) {
            // Send new credential info to server for verification and registration. Save locally for now.
            alert(">>3.1");
			let cr = newCredentialInfo;
			var response = publicKeyCredentialToJSON(cr);
			alert("response = " + JSON.stringify(response));
			alert(">>3.2");
			if ('id' in newCredentialInfo) {
				alert(">> IN newCredentialInfo.id");
                newUser.keyHandle = newCredentialInfo.id;
				alert(">> newUser.keyHandle("+newUser.keyHandle.length+")::: " + newUser.keyHandle+"#####");
				var iid = base64url.decode(newUser.keyHandle);
				alert(">> 3.3, new iid("+iid.length+")");
			} 
			alert(">>3.4");
			if ('rawId' in newCredentialInfo) {
				alert(">> USE newCredentialInfo.rawId");
				newUser.keyHandle = binToStr(newCredentialInfo.rawId);
				alert(">> newUser.keyHandle("+newUser.keyHandle.length+")::: " + newUser.keyHandle+"#####");
				/*
				var MCbase64 = base64.encode(newCredentialInfo.rawId);
				var MCbase64url = base64url.encode(newCredentialInfo.rawId);
				var MSbase64encode = base64encode(newCredentialInfo.rawId);
				var MSarrayString = arrayBufferToString(newCredentialInfo.rawId);

				alert("newCredentialInfo.id["+newCredentialInfo.id.length+"],"+ 
				"MCbase64["+MCbase64.length+"], compare="+(newCredentialInfo.id===MCbase64));
				alert("newCredentialInfo.id["+newCredentialInfo.id.length+"],"+ 
				"MCbase64url["+MCbase64url.length+"], compare="+(newCredentialInfo.id===MCbase64url));
				alert("newCredentialInfo.id["+newCredentialInfo.id.length+"],"+ 
				"MSbase64encode["+MSbase64encode.length+"], compare="+(newCredentialInfo.id===MSbase64encode));
				alert("newCredentialInfo.id["+newCredentialInfo.id.length+"],"+ 
				"MSarrayString["+MSarrayString.length+"], compare="+(newCredentialInfo.id===MSarrayString));
				*/
			}
			alert(">>4");
            accounts.push(newUser);
            localStorage.accounts = JSON.stringify(accounts); // Convert the object to a string.
            displaySuccess("Account "+newUser.userName+" added!!");
            $('#successMessage').append('<a href="./login.html">Click here to log in</a>');
            return true;
        }).catch(function (e) {
            // No acceptable authenticator or user refused consent. Handle appropriately.
            displayError("ERROR: " + e.message);
            //toast("ERROR: " + e);
        });

    return false;
}

function processLoginFormLocal(e) {
    if (e.preventDefault) e.preventDefault();
    let accounts = [];
    if (!!localStorage.accounts) {
        //alert("accounts found!");
        accounts = JSON.parse(localStorage.accounts); // Convert the object string back to a JavaScript object.
    } else {
        alert("no accounts found!!");
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
	alert(">> 1");
    if (!thisUser) {
        displayError(userName + " not found!!");
        return;
    }

	alert("thisUser:: " + JSON.stringify(thisUser));
						alert(">> 1.0");
	            var userid = strToBin(thisUser.userid);
					alert(">> 1.1");
            var name = thisUser.username;
				alert(">> 1.2");
            var displayName = thisUser.displayName;
				alert(">> 1.3, thisUser.keyHandle("+thisUser.keyHandle.length+")::: " + thisUser.keyHandle+"#####");
			var id = strToBin(thisUser.keyHandle);
				alert(">> 1.4, id("+id.length+")");
	
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
        user: {
            id: strToBin(thisUser.userid),
            name: thisUser.username,
            displayName: thisUser.displayName
        },

        timeout: 60000,  // 1 minute
        allowCredentials: [{ type: "public-key", id: strToBin(thisUser.keyHandle) }]
    };
	alert(">> 2");
    hideForms();
    clearSuccess();
    displayLoading("Contacting token... please perform your verification gesture (e.g., touch it, or plug it in)\n\n");

    navigator.credentials.get({ "publicKey": options })
        .then(function (assertion) {
            // Send assertion to server for verification
			displaySuccess("Account "+thisUser.userName+" authenticated!!");
            $('#successMessage').append('<a href="./index.html">Click here to go HOME</a>');
            return true;
        }).catch(function (e) {
            // No acceptable credential or user refused consent. Handle appropriately.
            displayError("ERROR: " + e.message);
            //toast("ERROR: " + e);
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

            //var account = { username: 'John', displayName: 'Anderson' }; // Create a JavaScript object literal.
        //window.localStorage.person = JSON.stringify(person); // Convert the object to a string.
        //person = JSON.parse(window.localStorage.person); // Convert the object string back to a JavaScript object.


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


//// Microsoft
/**
 * Helper: Base64 encodes an array buffer
 * @param {ArrayBuffer} arrayBuffer 
 */
function base64encode(arrayBuffer) {
	if (!arrayBuffer || arrayBuffer.byteLength == 0)
		return undefined;

	return btoa(String.fromCharCode.apply(null, new Uint8Array(arrayBuffer)));
}

/**
 * Helper: Converts an array buffer to a UTF-8 string
 * @param {ArrayBuffer} arrayBuffer 
 * @returns {string}
 */
function arrayBufferToString(arrayBuffer) {
	return String.fromCharCode.apply(null, new Uint8Array(arrayBuffer));
}

/**
 * Helper: Converts a string to an ArrayBuffer
 * @param {string} str string to convert
 * @returns {ArrayBuffer}
 */
function stringToArrayBuffer(str){
	return Uint8Array.from(str, c => c.charCodeAt(0)).buffer;
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
    //alert("challenge len=" + challenge.length + ", string=" + binToStr(challenge));
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

function makeCredential(challenge) {
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
