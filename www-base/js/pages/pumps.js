(function(){
	"use strict";
	
	angular.module('pumpApp').controller('pumpsController', ['$scope', '$state', '$rootScope', '$http', '$interval',
		function($scope, $state, $rootScope, $http, $interval) {
			$rootScope.page = 'pumps';
			$rootScope.footerVisible = true;
			$rootScope.isRootBack = true;
			//$rootScope.isCloudOnline = false;

			$rootScope.selectedPump = null;
			$scope.getPumpRetries = 0;
			$scope.getPumpInterval = null;
			$scope.getSsidInterval = null;
			$scope.waitingForPumps = false;
			$scope.waitingForResponse = false;
			$scope.retrieveRetry = 3;
			$scope.onlineInterval = 5000;
			$scope.offlineInterval = 30000;
			//$rootScope.setupPump.connectiondata = '';
			
			if (!angular.isDefined($rootScope.pumps.length)) {
				$rootScope.pumps = [];
			}
			$scope.getSessionData3 = function()  {
				var loginData = PumpApp.Request.Builder.Login();
				$rootScope.makeRequest(loginData).then(
					function (response){
						if (response.data[0] === 'success') {
							$rootScope.setupPump.connectiondata = response.data[1];
							$scope.getPumpList();
							$scope.getPumpInterval = $interval(function() {
								if (!$scope.waitingForResponse) {
									$scope.getPumpList();
								}
							}, $scope.onlineInterval);
						} else {
							$rootScope.isCloudOnline = false;
						}
					},
					function error(e){
						if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
							$rootScope.showError('getSessionData::query error:'+e.status);
						$rootScope.isCloudOnline = false;
						//debugger;
					}
				);
			};

			$scope.getPumpList3 = function() {
				if ($rootScope.setupPump.connectiondata.length === 0) {
					$scope.getSessionData();
					return;
				}
				if ($scope.pumpIds.length == 0) {
						if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO) {
							alert('No pump configured');
						}
					return;
				}

				var dat='[';
				for (var i = 0; i < $scope.pumpIds.length; i++) {
						if (i != 0) dat += ',';
						dat += ('"'+$scope.pumpIds[i]+'"');
				}
        dat += ']';
				//alert('dat='+dat);

				if (true) {
					var getData = PumpApp.Request.Builder.GetPumpByUUID
								($rootScope.setupPump.connectiondata, $rootScope.me.deviceuuid);
					//var getData = PumpApp.Request.Builder.GetPumpByIds($rootScope.setupPump.connectiondata, $scope.pumpIds);
				} else {
					// Having problem passing pumpids array into builder, so manually format the query
					var getData='[["GET", "'+$rootScope.setupPump.connectiondata+'"], ["//0x02/0x01", '+dat+', "@INDEX,1,2,9,5,6,19,22,24,21"]]';
				}
				if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
					alert('getData='+getData);
				$rootScope.makeRequest(getData).then(
					function(response) {
				if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
					alert('getPumpList::response.data[0]='+response.data[0]);
						$scope.waitingForResponse = false;

						if (response.data[0] === 'success') {
							$rootScope.isCloudOnline = true;
							if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
								alert('processRawPumps::response.data[1]='+response.data[1]);
							$scope.processRawPumps(response.data[1]);
						} else {
							$rootScope.isCloudOnline = false;
							$rootScope.setupPump.connectiondata = '';
						}
					},
					function error(e){
						if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
							$rootScope.showError('getPumpList::query error:'+e.status);
						$rootScope.isCloudOnline = false;
						$scope.waitingForResponse = false;
						$rootScope.setupPump.connectiondata = '';
						//debugger;
					}
				);
			};

			$rootScope.clickCloudIconCallback = $scope.getPumpList;

			$scope.processRawPumps = function(rawPumps) {
				for(var j=0; j<$rootScope.pumps.length; j++) {
					$rootScope.pumps[j].isPaid = true;
					$rootScope.pumps[j].isInPump = false;
					$rootScope.pumps[j].isAccessible = false;
					for (var i = 0; i < rawPumps.length; i++) {
					    //if (rawPumps[i][1] === $rootScope.pumps[j].id) {
							var mac = rawPumps[i][2].slice(2, 14);
							if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
								alert('Raw['+i+'][1]='+rawPumps[i][0]+', mac='+mac);
					    if (mac === $rootScope.pumps[j].macaddress) {

								if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
									alert('updateFromData:::rawPumps['+i+'][2]='+mac+', $rootScope.pumps['+j+'].macaddress='+$rootScope.pumps[j].macaddress);
								//if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
								//	alert('process Pumps['+j+']::Raw['+i+']=='+rawPumps[i]);

								PumpApp.PumpUtil.updateFromData($rootScope.pumps[j], 
									rawPumps[i], $rootScope.unverifiedSSID);

								//if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
								//	alert('$rootScope.pumps['+j+'].statusFlag=['+$rootScope.pumps[j].statusFlag+'], isFirmwareUpgadeAvailable='+$rootScope.pumps[j].isFirmwareUpgadeAvailable);
					    }
					}
				}
			};
			
			$scope.gotoPumpDetails = function(pump) {
//alert('gotoPumpDetails, isAccessible='+pump.isAccessible);
				if (pump.isAccessible === true) {
					$rootScope.selectedPump = pump;
				if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
					alert('gotoPumpDetails('+$rootScope.selectedPump.id+', '+$rootScope.selectedPump.macaddress+')');
					$rootScope.navigateToPage('pumpdetails', { pumpId:pump.id });
				}
			};
			
			$scope.gotoPumpMessages = function(pump) {
//alert('gotoPumpMessages, isAccessible='+pump.isAccessible);
				if (pump.isAccessible === true) {
					$rootScope.selectedPump = pump;
					$rootScope.navigateToPage('messages');
				}
			};

			$scope.gotoAllPumpMessages = function() {
				// Do nothing
			};
			
			$scope.getAllPumpStatus = function() {
				var errorCount = 0;
				for (var i = 0; i < $rootScope.pumps.length; i++) {
					if ($rootScope.pumps[i].error !== '') {
						if ($rootScope.pumps[i].error !== '00')
							errorCount++;
					}
				}
				
				if (errorCount === 1) {
					return errorCount+' pump has an alarm';
				}
				else if (errorCount > 1) {
					return errorCount+' pumps have an alarm';
				}
				
				return 'All normal';
			};
			
			$scope.$on("$destroy",
				function() {
					if ($scope.getPumpInterval !== null) {
						$interval.cancel($scope.getPumpInterval);
					}
					if ($scope.getSsidInterval !== null) {
						$interval.cancel($scope.getSsidInterval);
					}
					if ($scope.watchPumpsSyncedCount !== null && $scope.watchPumpsSyncedCount !== undefined) {
						$scope.watchPumpsSyncedCount();
					}
				}
			);
			
			$scope.scanSuccess = function(result) {
				$scope.$apply(function(){
					$rootScope.clearScanState();
				});
				alert("We got a barcode\n" +
					"Result: " + result.text + "\n" +
					"Format: " + result.format + "\n" +
					"Cancelled: " + result.cancelled);
			};
			
			$scope.scanError = function(error) {
				alert("Scanning failed: " + error);
			};
			
			$rootScope.createMenu([
				//{
				//	icon:'fas fa-search',
				//	title:'Scan',
				//	callback:$rootScope.scan,
				//	args:{
				//		page:'pumps',
				//		success:$scope.scanSuccess,
				//		error:$scope.scanError
				//	}
				//}
			]);



//////////////////////////////////////////////////////////////////
/// NEW PUMPS LOGICS ADDED 10/04/2018

			$scope.resetRetrieveRetry = function() {
				if ($rootScope.isCloudOnline === true)
					return;
				$rootScope.isCloudOnline = true;
				$scope.retrieveRetry = 3;

				if ($scope.getPumpInterval !== null) {
					$interval.cancel($scope.getPumpInterval);
					$scope.getPumpInterval = null;
				}
				$scope.getPumpInterval = $interval(function() {
					if (!$scope.waitingForResponse) {
						$scope.getPumpList();
					}
				}, $scope.onlineInterval);
			};

			$scope.checkRetrieveRetry = function() {
				if ($rootScope.isCloudOnline === false)
					return;
				if ($scope.retrieveRetry <= 0) {
					$rootScope.isCloudOnline = false;

					if ($scope.getPumpInterval !== null) {
						$interval.cancel($scope.getPumpInterval);
						$scope.getPumpInterval = null;
					}
					$scope.getPumpInterval = $interval(function() {
						if (!$scope.waitingForResponse) {
							$scope.getPumpList();
						}
					}, $scope.offlineInterval);
				} else {
					$scope.retrieveRetry--;
				}
			};

			$scope.getSessionData = function() {
				var loginData = PumpApp.Request.Builder.Login();
				$rootScope.makeRequest(loginData).then(
					function (response){
						if (response.data[0] === 'success') {
							$rootScope.setupPump.connectiondata = response.data[1];
							$scope.getPumpList();
						} else {
							$scope.checkRetrieveRetry();
						}
					},
					function error(e){
						if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
							$rootScope.showError('getSessionData::query error:'+e.status);
							$scope.checkRetrieveRetry();
					}
				);
			};

			$scope.getPumpList = function() {
				if ($scope.pumpIds.length == 0) {
						if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO) {
							alert('No pump configured');
						}
					return;
				}
				if ($rootScope.setupPump.connectiondata.length === 0) {
					$scope.getSessionData();
					return;
				}
				$scope.waitingForResponse = true;
				var dat='[';
				for (var i = 0; i < $scope.pumpIds.length; i++) {
						if (i != 0) dat += ',';
						dat += ('"'+$scope.pumpIds[i]+'"');
				}
        dat += ']';
				//alert('dat='+dat);

				if (true) {
					var getData = PumpApp.Request.Builder.GetPumpByUUID
								($rootScope.setupPump.connectiondata, $rootScope.me.deviceuuid);
					//var getData = PumpApp.Request.Builder.GetPumpByIds($rootScope.setupPump.connectiondata, $scope.pumpIds);
				} else {
					// Having problem passing pumpids array into builder, so manually format the query
					var getData='[["GET", "'+$rootScope.setupPump.connectiondata+'"], ["//0x02/0x01", '+dat+', "@INDEX,1,2,9,5,6,19,22,24,21"]]';
				}
				if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
					alert('getData='+getData);
				$rootScope.makeRequest(getData).then(
					function(response) {
						if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
							alert('getPumpList::response.data[0]='+response.data[0]);
						$scope.waitingForResponse = false;

						if (response.data[0] === 'success') {
							if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
								alert('processRawPumps::response.data[1]='+response.data[1]);
							$scope.resetRetrieveRetry();
							$scope.processRawPumps(response.data[1]);
						} else {
							$scope.checkRetrieveRetry();
						}
					},
					function error(e){
						if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
							$rootScope.showError('getPumpList::query error:'+e.status);
						$scope.waitingForResponse = false;
						$rootScope.setupPump.connectiondata = '';
						$scope.checkRetrieveRetry();
					}
				);
			};

			$scope.getSsid = function() {
				DeviceUtility.getCurrentSSID(
				function (s){
					$rootScope.unverifiedSSID = s.replace(/"/g,'');
//alert('$scope.getSsid, $rootScope.unverifiedSSID ='+$rootScope.unverifiedSSID);
				}, {} );
			};

//////////////////////////////////////////////////////////////////
/// pumps screen operations - start
//////////////////////////////////////////////////////////////////

			$scope.pumpIds = [];
				for (var i = 0; i < $rootScope.pumps.length; i++) {
					if ($rootScope.pumps[i].id !== '') {
							$scope.pumpIds.push($rootScope.pumps[i].id);
					}
				}

			$scope.getPumpList();
			var timeInterval = ($rootScope.isCloudOnline === true) ? $scope.onlineInterval : $scope.offlineInterval;
			$scope.getPumpInterval = $interval(function() {
				if (!$scope.waitingForResponse) {
					$scope.getPumpList();
				}
			}, timeInterval);

			$scope.getSsidInterval = $interval(function() {
					$scope.getSsid();
			}, $scope.onlineInterval*3);

//////////////////////////////////////////////////////////////////
/// pumps screen operations - end
//////////////////////////////////////////////////////////////////
	}]);
})();
