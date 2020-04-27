(function(){
	"use strict";
	
	var utils = {};
	
	utils.parseInt = function(data) {
		return parseInt(data);
	};
	
	utils.padLeft = function(data) {
		var paddedStr = "000000".substr(data.toString().length) + data;
		return paddedStr;
	};

	utils.padVer = function(data) {
		var paddedStr = "0000".substr(data.toString().length) + data;
		return paddedStr.slice(0, 2)+'.'+paddedStr.slice(2, 4);
	};
	
	utils.toASCII = function(data) {
		for (var t = data.toString(), i = "", a = 0; a < t.length; a += 2) i += String.fromCharCode(parseInt(t.substr(a, 2), 16));
		var i = i.replace(/\0/g, "");
		return i;
	};
	
	utils.toSomething = function(e, t) {
//alert('toSomething e:'+e+', i:'+parseInt(e, 16)+', i2:'+parseInt(e, 16).toString(2));
		var i = parseInt(e, 16).toString(2);

//alert('toSomething FINAL:'+"00000000000000000000000000000000".substr(i.length)+i);

		if      (32 == t) { i = "00000000000000000000000000000000".substr(i.length) + i; }
		else if (16 == t) { i = "0000000000000000".substr(i.length) + i; }
		else if ( 8 == t) { i = "00000000".substr(i.length) + i; }

//alert('final result, i=='+i);
		return i;
	};
	
	utils.utcNowAsString = function() {
		return moment.utc().format('MM DD YYYY HH:mm:ss ZZ');
	};

	utils.localDateTimeString = function() {
		var datetime = moment().format('YYYY-MM-DD HH:mm:ss:e');

		var yyyy = parseInt(datetime.slice(0,4), 10).toString(16);
		var mm = parseInt(datetime.slice(5,7), 10).toString(16);
		var dd = parseInt(datetime.slice(8,10), 10).toString(16);
		var h = parseInt(datetime.slice(11,13), 10).toString(16);
		var m = parseInt(datetime.slice(14,16), 10).toString(16);
		var s = parseInt(datetime.slice(17,19), 10).toString(16);
		var e = parseInt(datetime.slice(20,21), 10).toString(16);
		return ("0000".substr(yyyy.length) + yyyy) +
					 ("00".substr(mm.length) + mm) +
					 ("00".substr(dd.length) + dd) +
					 ("00".substr(e.length) + e) +
					 ("00".substr(h.length) + h) +
					 ("00".substr(m.length) + m) +
					 ("00".substr(s.length) + s);

	};

	utils.lastUpdateDateTimeString = function(ludt) {
	if (ludt.length === 18) ludt = ludt.slice(2,ludt.length);
	var yyyy = parseInt(ludt.slice(0,4), 16).toString(10);
	var mm = parseInt(ludt.slice(4,6), 16).toString(10);
	var dd = parseInt(ludt.slice(6,8), 16).toString(10);
	var h = parseInt(ludt.slice(10,12), 16).toString(10);
	var m = parseInt(ludt.slice(12,14), 16).toString(10);
	var s = parseInt(ludt.slice(14,16), 16).toString(10);

	return ("0000".substr(yyyy.length) + yyyy) + '-' +
				 ("00".substr(mm.length) + mm) + '-' +
				 ("00".substr(dd.length) + dd) + ' ' +
				 ("00".substr(h.length) + h) + ':' +
				 ("00".substr(m.length) + m) + ':' +
				 ("00".substr(s.length) + s);

	};

	utils.getHistoryLabel = function(period) {
		var dayBefore = moment(new Date()).add((1-period), 'days');
		var daF = [];
		for(var i=0; i<period; i++) {
			daF.push(moment(dayBefore).add(i, 'days').format('MM/DD'));
    }
		return daF;
	};

	utils.utcStringAsLocalTimeString = function(utcDtString) {
		return moment(utcDtString, 'MM DD YYYY HH:mm:ss ZZ').toDate().toLocaleString();
	};
	
	utils.isPhone = function() {
		return navigator.userAgent.match(/(iPhone|iPod|iPad|Android)/);
	};
	
	utils.isIPhone = function() {
		return navigator.userAgent.match(/(iPhone|iPod|iPad)/);
	};
	
	utils.isAndroid = function() {
		return navigator.userAgent.match(/(Android)/);
	};
	
	utils.useLocalDatabase = function() {
		return true;
	};

	utils.useLocalSocket = function() {
		return true;
	};

	utils.sendMsgWithLocalSocket = function() {
		return false;
	};
	
	utils.useLocalStateMachine = function() {
		return true;
	};
	utils.formatUint8Array = function(dataString) {
		var data = new Uint8Array(dataString.length);
		for (var i = 0; i < data.length; i++) {
		  data[i] = dataString.charCodeAt(i);
		}
		return data;
	};

	utils.inlineAllSvgImg = function() {
		$('.pumpsvg').each(function(i,el) {
			$(el).removeClass('pumpsvg');
			var encodedSvg = $(el).css('content').replace('url("data:image/svg+xml,','');
			encodedSvg = encodedSvg.substr(0,encodedSvg.length-2);
			if (encodedSvg === ''){return;}
			var decodedSvg = unescape(encodedSvg);
			var parser = new DOMParser();
			var doc = parser.parseFromString(decodedSvg, "image/svg+xml");
			var svgRoot = doc.getElementsByTagName("svg")[0];
			var svgImg = $(el)[0];
			var attributes = svgImg.attributes;
			
			Array.prototype.slice.call(attributes).forEach(function(attribute) {
				if(attribute.name !== 'src' && attribute.name !== 'alt') {
					svgRoot.setAttribute(attribute.name, attribute.value);
				}
			});
			
			svgImg.parentNode.replaceChild(svgRoot, svgImg);
		});
	};

	window.PumpApp = window.PumpApp || {};
	window.PumpApp.Utils = utils;
})();
