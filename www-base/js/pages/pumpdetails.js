(function(){
	"use strict";
	
	angular.module('pumpApp').controller('pumpDetailsController', ['$scope', '$state', '$stateParams', '$rootScope', '$http', '$interval',
		function($scope, $state, $stateParams, $rootScope, $http, $interval) {
			$rootScope.page = 'pumpdetails';
			$rootScope.footerVisible = false;
			$rootScope.isRootBack = false;
			$rootScope.clickCloudIconCallback = null;
			
			$scope.pumpDetail = $rootScope.selectedPump;
			$scope.waitingForResponse = false;
			$scope.getPumpDetailsInterval = null;
			//$rootScope.isCloudOnline = false;
			$scope.onlineInterval = 5000;
			$scope.offlineInterval = 30000;
			$scope.retrieveRetry = 3;

			$scope.pumpStatusLable = [
				'Water Level', 'Run Status', '', 'Switch Status',
				'Sensor Status', 'Power Status', 'Battery Status', 
				'Temperature Status', 'WiFi Status', 'Cloud Status',
				'Locked/Unlocked', '', 'Pump Status', '', '', ''
			];

			$scope.pumpDetailsBasics = [
				{
					title:'Water Level',
					valueKey:'waterLevel',
					collapsed: true,
					hasHistory: false,
					historyTabSelected: false,
					dataidx: 0,
					labels: [],
					data: [[]]
				},
				{
					title:'Flow Rate',
					valueKey:'waterCurrent',
					collapsed: true,
					hasHistory: false,
					historyTabSelected: false,
					dataidx: 0,
					labels: [],
					data: [[]]
				},
				{
					title:'Gallons Pumped Today',
					valueKey:'gallonsPumped',
					collapsed: true,
					hasHistory: true,
					historyTabSelected: false,
					dataidx: 0,
					labels: [],
					data: [[]]
				},


				{
					title:'Amps',
					valueKey:'ampCurrent',
					collapsed: true,
					hasHistory: false,
					historyTabSelected: false,
					dataidx: 0,
					labels: [],
					data: [[]]
				},
				{
					title:'Average Amps Today',
					valueKey:'ampAvg',
					collapsed: true,
					hasHistory: true,
					historyTabSelected: false,
					dataidx: 1,
					labels: [],
					data: [[]]
				},
				{
					title:'Run Cycles Today',
					valueKey:'runCycle',
					collapsed: true,
					hasHistory: true,
					historyTabSelected: false,
					dataidx: 2,
					labels: [],
					data: [[]]
				},
				{
					title:'Average Cycle Time Today',
					valueKey:'cycleTimeAvg',
					collapsed: true,
					hasHistory: true,
					historyTabSelected: false,
					dataidx: 3,
					labels: [],
					data: [[]]
				},
				{
					title:'Lifetime Run Cycles',
					valueKey:'lifetimeCycle',
					collapsed: true,
					hasHistory: false,
					historyTabSelected: false,
					dataidx: 0,
					labels: [],
					data: [[]]
				},
				{
					title:'AC Voltage',
					valueKey:'acVoltage',
					collapsed: true,
					hasHistory: false,
					historyTabSelected: false,
					dataidx: 0,
					labels: [],
					data: [[]]
				},
				{
					title:'Battery Voltage',
					valueKey:'batteryVoltage',
					collapsed: true,
					hasHistory: false,
					historyTabSelected: false,
					dataidx: 0,
					labels: [],
					data: [[]]
				},
				{
					title:'Room Temperature',
					valueKey:'roomTemperature',
					collapsed: true,
					hasHistory: false,
					historyTabSelected: false,
					dataidx: 0,
					labels: [],
					data: [[]]
				},
				{
					title:'Last Update Time',
					valueKey:'lastUpdateTime',
					collapsed: true,
					hasHistory: false,
					historyTabSelected: false,
					dataidx: 0,
					labels: [],
					data: [[]]
				}
			];
			
			$scope.fixItemHeight = function(parentClass, fixClass) {
				var height = $(parentClass).height()*0.11;
				$(fixClass).height(height+'px');
			};
			
			$scope.checkOND = function() {
				if ($rootScope.selectedPump.isFirmwareUpgadeAvailable) {
					if ($rootScope.menuOptions.length == 1) {
						$rootScope.menuOptions.push({
								icon:'fas fa-location-arrow',
								title:'Firmware Upgrade',
								callback:$scope.handleFirmwareUpgrade
						});
					}
				} else {
					if ($rootScope.menuOptions.length == 2) {
						$rootScope.menuOptions.pop();
					}
				}	
			};

			//$rootScope.setupPump.connectiondata = '';
			$scope.getSessionData3 = function()  {
				var loginData = PumpApp.Request.Builder.Login();
				$rootScope.makeRequest(loginData).then(
					function (response){
						if (response.data[0] === 'success') {
							$rootScope.setupPump.connectiondata = response.data[1];
							$scope.getPumpDetails();
							$scope.getPumpInterval = $interval(function() {
								if (!$scope.waitingForResponse) {
									$scope.getPumpDetails();
								}
							},
							$scope.retrieveInterval);
						} else {
							$rootScope.isCloudOnline = false;
						}
					},
					function error(e){
						if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
							$rootScope.showError('getSessionData::query error:'+e.status);
						$rootScope.isCloudOnline = false;
						//debugger;
					}
				);
			};

			$scope.getPumpDetails3 = function() {
				if ($rootScope.setupPump.connectiondata.length === 0) {
					$scope.getSessionData();
					return;
				}

				$scope.waitingForResponse = true;
				var getData = PumpApp.Request.Builder.GetPumpById($rootScope.setupPump.connectiondata, $stateParams.pumpId);
				$rootScope.makeRequest(getData).then(
					function(response) {
						$scope.waitingForResponse = false;

						if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
							alert('getPumpDetails::query response.data[0]:'+response.data[0]+', response.data[1]='+response.data[1]);

						if (response.data[0] === 'success') {
							$rootScope.isCloudOnline = true;
							PumpApp.PumpUtil.updateFromData($scope.pumpDetail, 
									response.data[1], $rootScope.unverifiedSSID);
							$rootScope.selectedPump = $scope.pumpDetail;
							$scope.checkOND();
						} else {
							$rootScope.isCloudOnline = false;
							$rootScope.setupPump.connectiondata = '';
						}	
					},
					function error(e){
						if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
							$rootScope.showError('getPumpDetails::query error:' + e.status);
						$rootScope.isCloudOnline = false;
						$scope.waitingForResponse = false;
						$rootScope.setupPump.connectiondata = '';
						//debugger;
					}
				);
			};

			$scope.getPumpDetailsInterval = $interval(function() {
				if (!$scope.waitingForResponse) {
					$scope.getPumpDetails();
				}
			}, $scope.onlineInterval);
			
			$scope.$on("$destroy",
				function() {
					$rootScope.selectedPump = null;
					if ($scope.getPumpDetailsInterval !== null) {
						$interval.cancel($scope.getPumpDetailsInterval);
					}
				}
			);
			
			$scope.handleHelp = function() {
				
			};
			
			$scope.deletePump = function() {
					$rootScope.toggleMenu();
					$rootScope.togglePopup('popupConfirmDeletePump', 15);
			};
			
			$scope.handleHistory = function() {
				
			};
			
			$rootScope.deletePhone = function(phone) {
				// call JSON to delete from server
				//if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
					alert('deletePhone('+$rootScope.selectedPump.id+', '+phone.slot+')');
				var delPhone = PumpApp.Request.Builder.DelUUID
						($rootScope.setupPump.connectiondata, "0x"+$rootScope.selectedPump.macaddress+"0000", phone.slot);
				//if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
					alert('deletePhone::delPhone=='+delPhone);

				$rootScope.makeRequest(delPhone).then(
					function(response) {
						if (response.data[0] === 'success') {
							//if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
								alert('deletePhone:SUCCESS:Phone Name=='+phone.name+', slot='+phone.slot);
								// remove pump from $rootScope.pumps
								var	pumpsCount = $rootScope.pumps.length;
								for(var j=0; j<pumpsCount; j++) {
										if ($rootScope.selectedPump.id === $rootScope.pumps[j].id) {
											//if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO) {
													alert('REMOVE Pump.name='+$rootScope.selectedPump.name);
													delete $rootScope.pumps[j];
													break;
											//}
										}
								}
								$scope.pumpDetailsBack();
						} else {
							//if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
								alert('deletephoneIndex::'+response.data[0]+', '+response.data[1]+', '+response.data[2]);
							alert('Failed to delete this pump!');
						}
					},
					function error(e){
						//if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
							alert('deletePhone::send error1:');
					}
				);
			};
			
			$rootScope.findSelfInPhoneList = function() {
				alert('findSelfInPhoneList');
				var getPhoneList = PumpApp.Request.Builder.GetPhoneListById
						($rootScope.setupPump.connectiondata, $rootScope.selectedPump.id);
				if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
					alert('findSelfInPhoneList::getPhoneList=='+getPhoneList);
				$rootScope.makeRequest(getPhoneList).then(
					function(response) {
						if (response.data[0] === 'success') {
							var datalength = response.data[1].length;
							if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
								alert('findSelfInPhoneList::SUCCESS:datalength='+datalength);
							for (var i=0; i<datalength; i++) {
								if (response.data[1][i] !== null && response.data[1][i].length > 0
														&& response.data[1][i][0].length > 0) {
									if (response.data[1][i][0] === $rootScope.me.deviceuuid) {
										var phone = { uuid:response.data[1][i][0],
															name:response.data[1][i][1],
															slot:response.data[1][i][2]};
										alert('**FOUND**Phone.name='+phone.name+', slot='+phone.slot+', uuid='+phone.uuid);
										$rootScope.deletePhone(phone);
									}
								} 
							}
						} else {
							if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
								alert('findSelfInPhoneList::error response:'+response.data[1]);
						}
					},
					function error(e){
						if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
							alert('findSelfInPhoneList::send error1:');
					}
				);
			};
			

			$scope.showManagePhoneList = function() {
				$rootScope.toggleMenu();

				var getPhoneList = PumpApp.Request.Builder.GetPhoneListById
						($rootScope.setupPump.connectiondata, $rootScope.selectedPump.id);
				if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
					alert('GetPhoneListById::getPhoneList=='+getPhoneList);
				$rootScope.makeRequest(getPhoneList).then(
					function(response) {
						if (response.data[0] === 'success') {
							var datalength = response.data[1].length;
							if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
								alert('getPhoneList::SUCCESS:datalength='+datalength);
							$rootScope.phonelist = [];
									var found = false;
									$rootScope.freeSlot = -1;
							for (var i=0; i<datalength; i++) {
								if (response.data[1][i] !== null && response.data[1][i].length > 0
														&& response.data[1][i][0].length > 0) {
									$rootScope.phonelist.push({	uuid:response.data[1][i][0],
																							name:response.data[1][i][1],
																							slot:response.data[1][i][2]});
									if (response.data[1][i][0] === $rootScope.me.deviceuuid) {
										found = true;
										$rootScope.freeSlot = i;
									}
								} else {
										if ($rootScope.freeSlot < 0) {
											$rootScope.freeSlot = i;
										}
								}
							}
							if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
								alert('phonelist.length['+$rootScope.phonelist.length+'] < 5, found='+found+', freeSlot='+$rootScope.freeSlot);

							if ($rootScope.phonelist.length > 0) {
//alert('In showManagePhoneList:: toggleManagePhoneList');
								$rootScope.toggleManagePhoneList();
							} else {
								if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
									alert('No phone list!!!');
							}
						} else {
							if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
								alert('GetPhoneListById::error response:'+response.data[1]);
						}
					},
					function error(e){
						if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
							alert('checkPhoneList::send error1:');
					}
				);
			};
			
			$scope.handleFirmwareUpgrade = function() {
				$rootScope.togglePopup('upgradeFirmware');
			};

			$scope.pumpDetailsBack = function() {
				$rootScope.rootBackFunc = $rootScope.masterRootBack;
				//if ($rootScope.pumps.length === 0) {
				//	$rootScope.navigateToPage('me');
				//} else {
					$rootScope.navigateToPage('pumps');
				//}
			};
			$rootScope.rootBackFunc = $scope.pumpDetailsBack;
			

			// If add or delete menu item, plesae change the menuoption.length checking in checkOND()
			$rootScope.createMenu([
/*
				{
					icon:'fas fa-info-circle',
					title:'Help',
					callback:$scope.handleHelp
				},
				{
					icon:'fas fa-clock',
					title:'Alarm Settings',
					callback:$scope.handleAlarmSettings
				},

				{
					icon:'fas fa-trash-alt',
					title:'Delete Pump',
					callback:$scope.deletePump
				},
*/
				{
					icon:'fas fa-address-book',
					title:'Phone List',
					callback:$scope.showManagePhoneList
				}
			]);


			$scope.datasetcolors = ['#75c043', '#ff6384', '#ff8e72'];
			$scope.datasetOverride = [
	   	 	{
					label: "Metric",
					borderWidth: 3,
					hoverBackgroundColor: "rgba(255,99,132,0.4)",
					hoverBorderColor: "rgba(255,99,132,1)",
					type: 'line'
			  },
			  {
					label: "Alerts",
					borderWidth: 1,
					type: 'bar'
			  }
			];

			//$scope.label7 = PumpApp.Utils.getHistoryLabel(7);
			//$scope.label30 = PumpApp.Utils.getHistoryLabel(30);

			//$scope.label7 = ['-6', '-5', '-4', '-3', '-2', '-1', '0'];
			//$scope.label30 = ['-29', '-28', '-27', '-26', '-25', '-24', '-23', '-22', '-21', '-20', '-19', '-18', '-17', '-16', '-15', '-14', '-13', '-12', '-11', '-10', '-9', '-8', '-7', '-6', '-5', '-4', '-3', '-2', '-1', '0' ];

			$scope.label7 = ['', '', '', '', '', '', ''];
			$scope.label30 = ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '' ];

			$scope.data7 = [[[0,0,0,0,0,0,0]],
											[[0,0,0,0,0,0,0]],
											[[0,0,0,0,0,0,0]],
											[[0,0,0,0,0,0,0]]]; 
			$scope.data30 = [ [[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]],
												[[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]],
												[[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]],
												[[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]] ]; 

			$scope.getHistory = function() {
				var loginData = PumpApp.Request.Builder.Login();
				$rootScope.makeRequest(loginData).then(
					function success(response){
						$rootScope.setupPump.connectiondata = response.data[1];
						var pumpId = $stateParams.pumpId;
						//var pumpId = '0x000d';
						var getData = PumpApp.Request.Builder.HistoryStart(response.data[1],pumpId);
						if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
							alert('HistorySTART:::getData='+getData);
						$rootScope.makeRequest(getData).then(
							function(response) {
								if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
									alert('HistorySTART:response[0]='+response.data[0]+':response[1]='+response.data[1]);
								if (response.data[0] === 'success')
									$scope.getHistoryData();
							},
							function error(e){
								if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
									$rootScope.showError('getHistory ERROR: ' + e.status);
							}
						);
					},
					function error(e){
						if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
							$rootScope.showError('getHistory ERROR: ' + e.status);
					}
				);
			};

			$scope.getHistoryData = function() {
				var pumpId = $stateParams.pumpId;
				//pumpId = '0x0026';
				var getData = PumpApp.Request.Builder.GetHistory
											($rootScope.setupPump.connectiondata,pumpId);
				if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
					alert('getHistory:::getData='+getData);
				$rootScope.makeRequest(getData).then(
					function(response) {
						if (response.data[0] === 'success') {
							if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
								alert('response.data[1].length='+response.data[1].length);
							for(var i=0; i<30; i++) {
								$scope.data30[0][0][i] = 0;
								$scope.data30[1][0][i] = 0;
								$scope.data30[2][0][i] = 0;
								$scope.data30[3][0][i] = 0;
							}
							var datalength = 0;
							var datebuf = [];
							var databuf = [];
							for(var i=0; i<response.data[1].length; i++) {
								if (response.data[1][i][0] !== '0xffffffffffffffff') {
									datalength++;
									databuf.push(response.data[1][i][1]);
									datebuf.push(response.data[1][i][0]);
									if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
											alert('response.data[1]['+i+'][0]='+response.data[1][i][0]+
														', data='+response.data[1][i][1]);
								}
							}

							var datastart = 0;
							var dataend = datalength;
							var end=30;
							var start=0;
							if (datalength < 30) {
								start = 30 - datalength;
							} else {
								datastart = datalength - 30;
							}

							var pumpData = '';
							var mm = 0;
							var dd = 0;
							for(; datastart<dataend; start++, datastart++) {
								//pumpData = response.data[1][datastart][1].slice
								//							(2, response.data[1][datastart][1].length);
								pumpData = databuf[datastart].slice(2, databuf[datastart].length);
								$scope.data30[0][0][start] = parseInt(pumpData.slice(12, 16), 16);
								$scope.data30[1][0][start] = parseInt(pumpData.slice(20, 24), 16) / 10;
								$scope.data30[2][0][start] = parseInt(pumpData.slice(48, 52), 16);
								$scope.data30[3][0][start] = parseInt(pumpData.slice(52, 56), 16);


								mm = parseInt(datebuf[datastart].slice(6,8), 16).toString(10);
								dd = parseInt(datebuf[datastart].slice(8, 10), 16).toString(10);	
								$scope.label30[start] = ("00".substr(mm.length) + mm) +
																		 '/' + ("00".substr(dd.length) + dd);
							}

							var copyEnd = (dataend < 7) ? dataend : 7;
							for(var i=0; i<copyEnd; i++) {
								$scope.data7[0][0][(7-copyEnd)+i] = $scope.data30[0][0][(30-copyEnd)+i];
								$scope.data7[1][0][(7-copyEnd)+i] = $scope.data30[1][0][(30-copyEnd)+i];
								$scope.data7[2][0][(7-copyEnd)+i] = $scope.data30[2][0][(30-copyEnd)+i];
								$scope.data7[3][0][(7-copyEnd)+i] = $scope.data30[3][0][(30-copyEnd)+i];
								$scope.label7[(7-copyEnd)+i] 			= $scope.label30[(30-copyEnd)+i];
							}

						} else {
							if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
								alert('ERROR: response.data[0]='+response.data[0]+', response.data[1]='+response.data[1]);
						}
					},
					function error(e){
						if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
							$rootScope.showError('getHistory ERROR: ' + e.status);
					}
				);
			};

			$scope.getHistoricalData = function(metric, timerange, dataidx) {
				if (timerange === '7') {
					$scope.pumpDetailsBasics.filter(pump => pump.valueKey === metric)[0].labels = $scope.label7;
					$scope.pumpDetailsBasics.filter(pump => pump.valueKey === metric)[0].data = $scope.data7[dataidx];
				} else {
					$scope.pumpDetailsBasics.filter(pump => pump.valueKey === metric)[0].labels = $scope.label30;
					$scope.pumpDetailsBasics.filter(pump => pump.valueKey === metric)[0].data = $scope.data30[dataidx];
				}
		      $scope.pumpDetailsBasics.filter(pump => pump.valueKey === metric)[0].chartOptions = {
		        scales: {
		          yAxes: [{ticks: {beginAtZero:true, min: 0}}],
        			xAxes: [{gridLines: {offsetGridLines: false}}]
		        }
		      };
			};
			
//////////////////////////////////////////////////////////////////
/// NEW PUMPS LOGICS ADDED 10/04/2018

			$scope.resetRetrieveRetry = function() {
				if ($rootScope.isCloudOnline === true)
					return;
				$rootScope.isCloudOnline = true;
				$scope.retrieveRetry = 3;

				if ($scope.getPumpDetailsInterval !== null) {
					$interval.cancel($scope.getPumpDetailsInterval);
					$scope.getPumpDetailsInterval = null;
				}
				$scope.getPumpDetailsInterval = $interval(function() {
					if (!$scope.waitingForResponse) {
						$scope.getPumpDetails();
					}
				}, $scope.onlineInterval);
			};

			$scope.checkRetrieveRetry = function() {
				if ($rootScope.isCloudOnline === false)
					return;
				if ($scope.retrieveRetry <= 0) {
					$rootScope.isCloudOnline = false;

					if ($scope.getPumpDetailsInterval !== null) {
						$interval.cancel($scope.getPumpDetailsInterval);
						$scope.getPumpDetailsInterval = null;
					}
					$scope.getPumpDetailsInterval = $interval(function() {
						if (!$scope.waitingForResponse) {
							$scope.getPumpDetails();
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
							$scope.getPumpDetails();
						} else {
							$scope.checkRetrieveRetry();
						}
					},
					function error(e){
						if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
							$rootScope.showError('getSessionData::query error:'+e.status);
							$scope.checkRetrieveRetry();
					}
				);
			};

			$scope.getPumpDetails = function() {
				if ($rootScope.setupPump.connectiondata.length === 0) {
					$scope.getSessionData();
					return;
				}

				$scope.waitingForResponse = true;
				var getData = PumpApp.Request.Builder.GetPumpById($rootScope.setupPump.connectiondata, $stateParams.pumpId);
				$rootScope.makeRequest(getData).then(
					function(response) {
						if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
							alert('getPumpDetails::query response.data[0]:'+response.data[0]);
						$scope.waitingForResponse = false;

						if (response.data[0] === 'success') {
							if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
								alert('getPumpDetails::response.data[1]='+response.data[1]);
							$scope.resetRetrieveRetry();
							PumpApp.PumpUtil.updateFromData($scope.pumpDetail, 
									response.data[1], $rootScope.unverifiedSSID);
							$rootScope.selectedPump = $scope.pumpDetail;
							$scope.checkOND();
						} else {
							$scope.checkRetrieveRetry();
						}	
					},
					function error(e){
						if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
							$rootScope.showError('getPumpDetails::query error:' + e.status);
						$scope.waitingForResponse = false;
						$rootScope.setupPump.connectiondata = '';
						$scope.checkRetrieveRetry();
					}
				);
			};


//////////////////////////////////////////////////////////////////
/// pumps screen operations - start
//////////////////////////////////////////////////////////////////


//20190121 per Mark Xu's request. No need to call NODE_HISOTORY_START first
			//$scope.getHistory();
			$scope.getHistoryData();
			//$scope.getPumpDetails();

//////////////////////////////////////////////////////////////////
/// pumps screen operations - end
//////////////////////////////////////////////////////////////////

	}]);
})();
