(function(){
	"use strict";
	
	angular.module('pumpApp').controller('landingController', ['$scope', '$state', '$rootScope', '$timeout',
		function($scope, $state, $rootScope, $timeout) {
			if (navigator.splashscreen)
			{
                navigator.splashscreen.show();
			}
			
			$scope.onLoad = function(meObj) {
				$rootScope.onStart();
			}
			
			$timeout(function(){
				$rootScope.me.init = true;
				$('#landingInit').click();
			},1000);
	}]);
})();