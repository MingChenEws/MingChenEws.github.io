/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */


function preload() {
	//enableLocalStorage();
	loadStrings("assets\asset.txt", loadSuc, loadErr, true);
}

function setup() {
}

function loadSuc(result) {
	alert(">>loadSuc");
	alert("result.len="+result.length);
	alert("data="+result[0]);
	alert("<<loadSuc");
}
 
function loadErr(err) {
	alert(">>loadErr");
	alert("err="+err);
	alert("<<loadErr");
}

function draw() {
  ellipse(50, 50, 80, 80);
}
