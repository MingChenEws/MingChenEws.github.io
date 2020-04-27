(function(){
	"use strict";
	
	var app = {
		// Application Constructor
		initialize: function() {
			if (PumpApp.Utils.isPhone()) {
				document.addEventListener('deviceready', this.onDeviceReady.bind(this), false);
			} else {
				this.onDeviceReady();
			}
			//this.onDeviceReady();
		},

		// deviceready Event Handler
		//
		// Bind any cordova events here. Common events are:
		// 'pause', 'resume', etc.
		onDeviceReady: function() {
			$('.view').bind("DOMSubtreeModified", PumpApp.Utils.inlineAllSvgImg);
			
			angular.bootstrap(document, ['pumpApp']);
			
			if (PumpApp.Utils.isPhone()) {
				StatusBar.hide();
			}
		}
	};
	
	app.initialize();
})();