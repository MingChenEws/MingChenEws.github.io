(function(){
	"use strict";
	
	
	angular.module('pumpApp').controller('setupController', ['$scope', '$state', '$stateParams', '$rootScope', '$timeout', '$interval',
		function($scope, $state, $stateParams, $rootScope, $timeout, $interval) {
			$rootScope.page = 'setup';
			$rootScope.footerVisible = ($stateParams.stepId==='-2');
			$rootScope.isRootBack = true;
			$rootScope.clickCloudIconCallback = null;

			$rootScope.selectedPump = null;
			$rootScope.setupPump = $rootScope.setupPump || PumpApp.PumpUtil.create();

			$scope.unknownString = 'XXXXXX';
			$scope.ipAddress = 'UNKNOWN';
			$scope.getCurrentSsidTimer =3000;
			$scope.connectToPumpTimer = 1000;
			$scope.getCurrentIpAddrTimer = 5000;
			//$scope.getIpAddrTimer = 2000;

			$scope.firstConnect = false;

			$scope.wifiname = $rootScope.me.wifiname;
			$scope.wifipass = $rootScope.me.wifipass;
			$scope.serialPrefix = PumpApp.Constants.SerialPrefix;

			$scope.macaddr = '';
			$scope.scanMac = function() {
				if (PumpApp.Utils.isPhone()) {
					$rootScope.inBarcodeScanner = true;
					cordova.plugins.barcodeScanner.scan(
						function (result) {
							$scope.scanBarcodeSuccess(result);
						},
						function (error) {
							$scope.scanBarcodeError(error);
						}
					);
				}
			};

			$scope.setupChecks = [
				{
					title:"Install pump and control according to User Manual",
					selected:false
				},
				{
					title:"Plug pump controller in to GFCI outlet per User Manual",
					selected:false
				},
				{
					title:"Confirm phone is on the same WiFi network that will be used to set up pump",
					selected:false
				}
			];

			$scope.initSetupChecks = function () {
				for(var i = 0; i < $rootScope.me.setupChecks.length; i++) {
					$scope.setupChecks[i].selected = $rootScope.me.setupChecks[i].selected;
				}
			};

			$scope.saveSetupChecks = function () {
				for(var i = 0; i < $rootScope.me.setupChecks.length; i++) {
					$rootScope.me.setupChecks[i].selected = $scope.setupChecks[i].selected;
				}
			};

			$scope.allSetupChecksSelected = function() {
				for(var i = 0; i < $scope.setupChecks.length; i++) {
					if ($scope.setupChecks[i].selected === false) {
						return false;
					}
				}
				
				return true;
			};
			$scope.setupChecksNext = function() {
				if(!$scope.allSetupChecksSelected()) {
					return;
				} else {
					$scope.saveSetupChecks();
				}
				
				$scope.goToSetupPage(-1);
			};

			$scope.setupCheckSNandMAC = function() {
				var pumpSNElement = document.getElementById('pumpSerialNumber');
				if (!!pumpSNElement) {
					var serialNumRegex = RegExp('^[0-9]{6}$'); // 6 digits
					if (serialNumRegex.test(pumpSNElement.value) == false) {
						alert('Pump serial number should be 6 digits. Invalid input: ' + pumpSNElement.value);
						return;
					}
					$rootScope.setupPump.serialending = pumpSNElement.value;

					var pumpMacElement = document.getElementById('macaddress');
					if (!!pumpMacElement) {
						var macAddrRegex = RegExp('^[0-9A-Fa-f]{12}$');
						if (macAddrRegex.test(pumpMacElement.value) == false) {
							alert('Invalid MAC address: ' +pumpMacElement.value);
							return;
						}
					}
					$scope.macaddr = pumpMacElement.value;
					$rootScope.setupPump.macaddress = $scope.macaddr.toLowerCase();
					pumpMacElement.value = $rootScope.setupPump.macaddress;
					$rootScope.setupPump.name = PumpApp.Constants.SerialPrefix 
																		+ $rootScope.setupPump.serialending;
				}

				//$scope.checkPhoneList();
				$scope.goToSetupPage(0);
			};

		$scope.checkPhoneList = function() {
alert('checkPhoneList');
				var loginData = PumpApp.Request.Builder.Login();
				$rootScope.makeRequest(loginData).then(
					function success(response){
						var getPhoneList = PumpApp.Request.Builder.GetPhoneListByMac
								(response.data[1], "0x"+$scope.macaddr+"0000");
						if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
							alert('GetPhoneListByMac::getPhoneList=='+getPhoneList);
						$rootScope.makeRequest(getPhoneList).then(
							function(response) {
								if (response.data[0] === 'success') {
									var datalength = response.data[1].length;
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
									if ($rootScope.phonelist.length < 5) {
										if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
											alert('phonelist.length['+$rootScope.phonelist.length+'] < 5, freeSlot='+$rootScope.freeSlot+', found='+found);
										$scope.goToSetupPage(0);
									} else { // === 5
										if (found) {
											if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
												alert('list is full but uuid is already in the phonelist, $rootScope.freeSlot='+$rootScope.freeSlot);
											$scope.goToSetupPage(0);
										} else {
											alert('Pump phone list is full, please remove at least one entry to setup another phone.');
alert('In checkPhoneList:: toggleManagePhoneList');
											$rootScope.toggleManagePhoneList();
										}
									}
								} else {
									if ((response.data[1] === 'uuid list not found') ||
											(response.data[1] === 'node not found')) {
										if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
											alert('list is empty, move on...');
										$rootScope.freeSlot = 0;
										$scope.goToSetupPage(0);
									} else {
										if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
											alert('GetPhoneListByMac::'+response.data[0]+':'+response.data[1]);
									}
								}
							},
							function error(e){
								if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
									alert('GetPhoneListByMac::send error1:');
							}
						);
					},
					function error(e){
							if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
								alert('checkPhoneList::send error2:');
					}
				);

			};

			$scope.setupSetInput = function() {
					$scope.macaddr = $rootScope.setupPump.macaddress;
			};

			$scope.setupCheckInput = function() {
				if ($rootScope.setupPump.serialending.length === 6) {
					if ($scope.macaddr.length === 12) return true;
				}
				return false;
			};
			
			$scope.scanBarcodeSuccess = function(result) {
				$scope.$apply(function(){
					//$rootScope.clearScanState();
					var substr = result.text.split(":", 2); // SN:MAC
					if (substr.length === 2) { // SN & MAC
							if (substr[0].length < 6) {
								$scope.scanBarcodeError("Incorrect serial number format!");
							} else {
								$rootScope.setupPump.serialending = substr[0].slice(-6);
								$scope.macaddr = substr[1].toLowerCase();
								$rootScope.setupPump.macaddress = $scope.macaddr;
							}
					} else {
							$scope.scanBarcodeError("Incorrect QR code format!");
					}
				});

				//alert("We got a barcode\n" +
				//	"Result: " + result.text + "\n" +
				//	"Format: " + result.format + "\n" +
				//	"Cancelled: " + result.cancelled);
			};
			
			$scope.scanBarcodeError = function(error) {
				if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
					alert("Scanning barcode failed, please enter manually - " + error);
			};

			$scope.autoDetectPumpSerial = function() {
				var autoDetectfail = function (e){
					$scope.autoDetectPumpSerialFailure();
				};
			
				var autoDetectsucc = function(ssid) {
				    $scope.$apply(function() {
							var serialNo = ssid.replace(/"/g,'');
							$rootScope.setupPump.serialending = serialNo;
							$scope.autoDetectPumpSerialSuccess();
				    });
				};
			
				var succScan = function() {
					$timeout(function(){
						DeviceUtility.findSSID(PumpApp.Constants.SerialPrefix, autoDetectsucc, autoDetectfail);
					}, 1000*$rootScope.me.setuptimemultiplier);
				};

//alert('autoDetectPumpSerial::$rootScope.setupPump.name = '+$rootScope.setupPump.name);
				if (true) { // Disable Autodetect
					$scope.firstConnect = true;
					$scope.setStatusIcon('none', 'progressSpinner');
					document.getElementById('actionButton').disabled = false;
				} else {
					if (PumpApp.Utils.isAndroid()) {
						DeviceUtility.startScan(succScan, autoDetectfail);
						document.getElementById('pumpSerialNumber').value = $rootScope.setupPump.serialending;
					} else {  // iOS dose not support WiFi scan
						$scope.autoDetectPumpSerialFailure();
						document.getElementById('pumpSerialNumber').value = $rootScope.setupPump.serialending;
					}
				}
				return true;
			};
			
			$scope.autoDetectPumpSerialSuccess = function() {
				$scope.setStatusIcon('none', 'progressSpinner');
				document.getElementById('actionButton').disabled = false;
				$timeout(function(){
					$rootScope.setupPump.serialending = $rootScope.setupPump.serialending;
				}, 100*$rootScope.me.setuptimemultiplier);
			};
			
			$scope.autoDetectPumpSerialFailure = function() {
				$scope.setStatusIcon('none', 'progressSpinner');	
				var subHeader = document.getElementById('subHeader');
				if (!!subHeader) {
					document.getElementById('subHeader').style.display = 'none';
				}
				
				var subHeaderNoAutofill = document.getElementById('subHeaderNoAutofill');
				if (!!subHeaderNoAutofill) {
				 	document.getElementById('subHeaderNoAutofill').style.display = 'unset';
				}	
				document.getElementById('actionButton').disabled = true;
			};

			$scope.openWifiSettings = function() {
				if (window.cordova && window.cordova.plugins.settings) {
					console.log('openSettingsTest is active');
					window.cordova.plugins.settings.open("wifi", 
						function() {
							console.log('opened settings');
						},
						function () {
							console.log('failed to open settings');
						}
					);
				} else {
					console.log('openSettingsTest is not active!');
				}
			};

			$scope.connectToPump = function() {
				$rootScope.setupPump.name = PumpApp.Constants.SerialPrefix 
																	+ $rootScope.setupPump.serialending;
				var pumpConnectSuccess = function() {
					$scope.pumpConnectSuccessUseLocalSocket();
				}; // End of pumpConnectSuccess

				var pumpConnectFailed = function() {
					if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
						alert('**** $scope.performActionFailure(14) ****');
					$rootScope.$apply(function() {
						$rootScope.targetSSID = $rootScope.setupPump.name;
						//$rootScope.togglePopup('popupSetupCannotConnect', 45);
					});
					$scope.enablePumpWifiFailure();
				};

				if (PumpApp.Utils.useLocalSocket()) {
					if (PumpApp.Utils.useLocalStateMachine()) { // StateMachine

						$scope.cleanDisplay2();
						$scope.step2ConnectToPumpRetry = 3; // Allow 3 times to connect to Pump AP
						// Start Step 1;
						$rootScope.SetupWifiStep = 1;
					} else { // Non-StateMachine
						if (PumpApp.Utils.isAndroid()) { //Android
							DeviceUtility.connectNetwork($rootScope.setupPump.name, pumpConnectSuccess, pumpConnectFailed);
						}
						else if (PumpApp.Utils.isIPhone()) { //iOS
							DeviceUtility.iOSConnectNetwork($rootScope.setupPump.name, '', pumpConnectSuccess, $scope.pumpConnectFailed);
						}
					}
				} else {  // use JSON
					// Please replace codes below with JSON routines
					var nodeSearchData = PumpApp.Request.Builder.AppNodeSearch();
					$rootScope.makeRequest(nodeSearchData).then(
						function success(response){
							$rootScope.setupPump.connectiondata = response.data[1];
							var getPropData = PumpApp.Request.Builder.NodePropertyGet($rootScope.setupPump.connectiondata, $rootScope.setupPump.id,'MAC');
							$rootScope.makeRequest(getPropData).then(
								function(response) {
									if (response.data[0] === 'error') {
										if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
											alert('**** $scope.performActionFailure(11) ****');
										$scope.performActionFailure();
									} else {
										$rootScope.setupPump.macaddress = data[1];
										$scope.performActionSuccess();
									}
								},
								function error(e){
									if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
										alert('**** $scope.performActionFailure(12) ****');
									$scope.performActionFailure();
									//debugger;
								}
							);
						},
						function error(e){
							if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
								alert('**** $scope.performActionFailure(13) ****');
							$scope.performActionFailure();
							//debugger;
						}
					);
				}
			};  // End of connectToPump
			
			$scope.savePumpInfo = function() {
				// Attempt to save the basic pump info to the pump (step 2-3)
				// NOT USED
				return true;
			};

			$scope.isAndroid = function() {
				if (PumpApp.Utils.isAndroid()) {
					return true;
				} else {
					return false;
				}
			};

			$scope.scanNetworks = function() {
//alert('$scope.scanNetworks');
				DeviceUtility.getCurrentSSID(
				function (s){
					$rootScope.unverifiedSSID = s.replace(/"/g,'');
					if ($rootScope.setupPump.name.length > 0 && $rootScope.setupPump.name !== $rootScope.unverifiedSSID) {
						if (PumpApp.Utils.isAndroid()) { //Android
							DeviceUtility.connectNetwork
							($rootScope.setupPump.name, $scope.getSsidFromPump, {});
						}
						else if (PumpApp.Utils.isIPhone()) { //iOS
							DeviceUtility.iOSConnectNetwork($rootScope.setupPump.name, '', $scope.getSsidFromPump, {});
						}
					}
				}, {} );

				if (PumpApp.Utils.isAndroid()) {
					$scope.netWorks = [];
					$scope.netWorks.push({ SSID: $scope.wifiname });
				} else {  // iOS
					$scope.netWorks = [];
					$scope.netWorks.push({ SSID: $scope.wifiname });
				}
			};

			$scope.getSsidFromPump = function() {
				$timeout(function(){
					//$scope.retrieveSsidFromPump();
				}, 1000*$rootScope.me.setuptimemultiplier);
			};

			$scope.retrieveSsidFromPump = function() {
				 if (PumpApp.Utils.useLocalSocket()) {
					if (PumpApp.Utils.useLocalStateMachine()) { // StateMachine
						// Start Step 10;
						//$rootScope.SetupWifiStep = 10;  // get ssid list
						$scope.retrieveSsidFromPumpUseLocalSocket();
					} else { // Non-StateMachine
						$scope.retrieveSsidFromPumpUseLocalSocket();
					}
				} else { // Use JSON
				}
			};  // End of retrieveSsidFromPump


			$scope.saveWifiInfo = function() {
				$rootScope.me.wifiname = $scope.wifiname;
				$rootScope.me.wifipass = $scope.wifipass;
				
				var propsToSet = [
					{key:'Name', value:$rootScope.setupPump.name},
					{key:'Description', value:$rootScope.setupPump.description},
					{key:'Zip', value:$rootScope.me.zipcode},
					{key:'Email', value:$rootScope.me.email},
					{key:'Time', value:moment().toString()},
					{key:'SSID', value:$rootScope.me.wifiname},
					{key:'password', value:$rootScope.me.wifipass},
				];
				
				var locationCallback = function(locationString) {
					propsToSet.push({key:'GPS', value:locationString});
					$scope.setPumpProperties(propsToSet);
				};
				
				if ($rootScope.me.allowlocation === true) {			
					propsToSet.push({key:'GPS', value:''});
					$scope.setPumpProperties(propsToSet);
				//$scope.getGPSLocation(locationCallback);  // Don't get GPS NOW
				}
				else {
					propsToSet.push({key:'GPS', value:''});
					$scope.setPumpProperties(propsToSet);
				}
			};

			$scope.setPumpProperties = function(props) {
		    if (PumpApp.Utils.useLocalSocket()) {
					if (PumpApp.Utils.useLocalStateMachine()) { // StateMachine
						// Start Step 6;
						//$rootScope.SetupWifiStep = 6;  // set ssid

						$scope.cleanDisplay2();
						$scope.step2ConnectToPumpRetry = 3; // Allow 3 times to connect to Pump AP
						// Start Step 1;
						$rootScope.SetupWifiStep = 1;
					} else { // Non-StateMachine
						$scope.setPumpPropertiesUseLocalSocket();
					}
		    } else {  // Use JSON to save 

					var failureCase = function() {
						clearTimeout($scope.pumpWifiSaveTimeout);
						$scope.pumpWifiSaveTimeout = null;
						if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
							alert('**** $scope.performActionFailure(16) ****');
						$scope.performActionFailure();
					};

					$scope.pumpWifiSaveCount = 0;
					$scope.pumpWifiExpectedCount = 0;
					$scope.pumpWifiSaveTimeout = null;
					$scope.watchpumpWifiSaveCount = $scope.$watch('pumpWifiSaveCount', function (newValue, oldValue, scope) {
						if ($scope.pumpWifiSaveTimeout !== null && $scope.pumpWifiSaveCount === $scope.pumpWifiExpectedCount) {
							$scope.performActionSuccess();
							if ($scope.pumpWifiSaveTimeout !== null) {
								clearTimeout($scope.pumpWifiSaveTimeout);
								$scope.pumpWifiSaveTimeout = null;
							}
						}
					}, true);

					$rootScope.pumpWifiSaveTimeout = setTimeout(function(){
							if ($rootScope.pumpWifiSaveTimeout != null) {
								$rootScope.pumpWifiSaveTimeout = null;
							if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
								alert('**** $scope.performActionFailure(16.5) ****');
								$scope.performActionFailure();
						}
					}, 30000);  // 30 seconds to finish setPumpProperties

					$scope.pumpWifiExpectedCount = props.length;
					for (var i = 0; i < $scope.pumpWifiExpectedCount; i++) {
						var nodeSetPropertyData = PumpApp.Request.Builder.NodePropertySet($rootScope.setupPump.connectiondata, $rootScope.setupPump.id, props[i].key, props[i].value);
						$rootScope.makeRequest(nodeSetPropertyData).then(
							function success(response){
								if (response.data[0] === 'error') {
									failureCase();
								}
								else {
									$scope.pumpWifiSaveCount++;
								}
							},
							function error(e){
								failureCase();
							}
						);
					}
		    }
			};
			
			$scope.getGPSLocation = function(successCallback) {
				if (PumpApp.Utils.isPhone()) {
					navigator.geolocation.getCurrentPosition(
						function(positionRaw) {
							successCallback(positionRaw.coords.latitude + ',' + positionRaw.coords.longitude);
						},
						function(error) {
							console.error('code: ' + error.code + '\n' + 'message: ' + error.message);
							successCallback('');
						},
						{ timeout: 30000 }
					);
				}
				else {
					successCallback('41.8336479,-87.872046');
				}
			};
			
			$scope.enablePumpWifiSuccess = function() {
				$scope.setStatusIcon('fa-check', 'progressSpinner');
				
				$timeout(function(){
					$scope.goToSetupPage(26);
				},300*$rootScope.me.setuptimemultiplier);
			};
			
			$scope.enablePumpWifiFailure = function() {
				$scope.messageStepWifi	= '';
				$scope.setStatusIcon('fa-times', 'progressSpinner');
				
				var pageText = document.getElementById('pageText');
				if (!!pageText) {
					document.getElementById('pageText').style.display = 'none';
				}
				var pageTextA = document.getElementById('pageTextA');
				if (!!pageTextA) {
					document.getElementById('pageTextA').style.display = 'none';
				}


				var failureText = document.getElementById('failureText');
				if (!!failureText) {
					document.getElementById('failureText').style.display = 'unset';
				}
				
				var backButton = document.getElementsByClassName('backButton')[0];
				if (!!backButton) {
					document.getElementsByClassName('backButton')[0].setAttribute('ng-click', 'goToSetupPage(21)');
				}
				
				var doubleBackButton = document.getElementsByClassName('doubleBackButton')[0];
				if (!!doubleBackButton) {
					document.getElementsByClassName('doubleBackButton')[0].style.display = 'unset';
				}
				
				document.getElementById('actionButton').disabled = true;
			};
			

			$scope.resetCommandSuccess = function() {
			// Connect phone to home wifi network (if phone wifi connection succeeds to home network return TRUE, else FALSE)
				function connSuc(e) {
					$scope.enablePumpWifiSuccess();
				};
				function confail(e) {
					$scope.enablePumpWifiFailure();
				};

				if (PumpApp.Utils.isAndroid()) {
					DeviceUtility.connectNetwork($rootScope.me.wifiname, connSuc, confail);
				}
				else if (PumpApp.Utils.isIPhone()) { //iOS
					DeviceUtility.iOSConnectNetwork($rootScope.me.wifiname, $rootScope.me.wifipass, connSuc, confail);
				}
			};

			$scope.enablePumpWifi = function() {
				document.getElementById('actionButton').disabled = true;
				$scope.setStatusIcon('progressSpinner', 'fa-check');
				$scope.setStatusIcon('progressSpinner', 'fa-times');

				if (PumpApp.Utils.useLocalSocket()) {
					if (PumpApp.Utils.useLocalStateMachine()) {// StateMachine
						// Start Step 8;
						//$rootScope.SetupWifiStep = 8;  // soft reset

						$scope.cleanDisplay2();
						$scope.step2ConnectToPumpRetry = 3; // Allow 3 times to connect to Pump AP
						// Start Step 1;
						$rootScope.SetupWifiStep = 1;
					} else {  // Non-StateMachine
						$scope.softResetUseLocalSocket();
					}
				} else {  // Use JSON
					var resetCommandData = PumpApp.Request.Builder.ExecuteCommand($rootScope.setupPump.connectiondata, $rootScope.setupPump.id, 'soft reset 65529');
					$rootScope.makeRequest(resetCommandData).then(
						function success(response){
							if (response.data[0] === 'error') {
								$scope.enablePumpWifiFailure();
							} else {
								$scope.resetCommandSuccess();
							}
						},
						function error(e){
							$scope.enablePumpWifiFailure();
						}
					);
				}

			};  // End of enablePumpWifi()

			$scope.enablePhoneNotifications = function() {
				$scope.cleanDisplay3();
				if (PumpApp.Utils.useLocalSocket()) {
					if ($rootScope.unverifiedSSID.length == 0) {
						$scope.messageStepPhone	= 'Checking WiFi network...';
						$timeout(function(){
							DeviceUtility.getCurrentSSID(
							function ssidHandler(s){
								$rootScope.unverifiedSSID = s.replace(/"/g,'');
								if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
										alert('$rootScope.me.wifiname='+$rootScope.me.wifiname+
													', $rootScope.unverifiedSSID='+$rootScope.unverifiedSSID);
								if ($rootScope.me.wifiname.length > 0 && $rootScope.me.wifiname !== $rootScope.unverifiedSSID) { // reconnect to HOME wifi again

									if (true) { // go striaght to WiFi Setting
											$rootScope.$apply(function() {
												//$rootScope.togglePopup('popupSetupCannotConnect', 45);
												$scope.goStraightToSettings(false);
											});
									} else {
										$rootScope.unverifiedSSID = '';
										if (PumpApp.Utils.isAndroid()) { //Android
											DeviceUtility.connectNetwork
											($rootScope.setupPump.name, {}, {});
										}
										else if (PumpApp.Utils.isIPhone()) { //iOS
											DeviceUtility.iOSConnectNetwork($rootScope.setupPump.name, '', {}, {});
										}
										if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
											alert('**** $scope.performActionFailure(27.2) ****');
										$scope.performActionFailure();
									}
								} else {
								if (true) {
									$scope.enablePhoneNotificationsUseNetwork();
								} else {
									if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
										alert('enablePhoneNotifications, enablePhoneNotificationsUseLocalSocket');
									$scope.enablePhoneNotificationsUseLocalSocket();
								}
								}
							}, //ssidHandler
							function fail(){
									$rootScope.unverifiedSSID = '';
									if (true) { // go striaght to WiFi Setting
											$rootScope.$apply(function() {
												//$rootScope.togglePopup('popupSetupCannotConnect', 45);
												$scope.goStraightToSettings(false);
											});
									} else {
										if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
											alert('**** $scope.performActionFailure(27.3) ****');
										$scope.performActionFailure();
									}
							});  // getCurrentSSID
						}, 2500*$rootScope.me.setuptimemultiplier);
					} else { // check length
						if (true) {
							$scope.enablePhoneNotificationsUseNetwork();
						} else {
							if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
								alert('enablePhoneNotifications, enablePhoneNotificationsUseLocalSocket');
							$scope.enablePhoneNotificationsUseLocalSocket();
						}
					}
				} else { // use JSON
					var phoneIdentity = $rootScope.me.appTokenId + ':' + $rootScope.me.name;
					var nodeSetPropertyData = PumpApp.Request.Builder.NodePropertySet($rootScope.setupPump.connectiondata, $rootScope.setupPump.id, 'tokenid', phoneIdentity);
					$rootScope.makeRequest(nodeSetPropertyData).then(
						function success(response){
							if (response.data[0] === 'success') {
								var addListData = PumpApp.Request.Builder.ExecuteCommand($rootScope.setupPump.connectiondata, $rootScope.setupPump.id, 'add to list');
								$rootScope.makeRequest(addListData).then(
									function success(response){
										if (response.data[0] === 'success') {
											enableNotificationsSuccess();
										}
										else {
											if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
												alert('**** $scope.performActionFailure(28) ****');
											$scope.performActionFailure();
										}
									},
									function error(e){
										if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
											alert('**** $scope.performActionFailure(29) ****');
										$scope.performActionFailure();
									}
								);
							}
							else {
								if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
									alert('**** $scope.performActionFailure(30) ****');
								$scope.performActionFailure();
							}
						},
						function error(e){
							if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
								alert('**** $scope.performActionFailure(31) ****');
							$scope.performActionFailure();
						}
					);
		    }
			};

			$scope.enableNotificationsSuccess = function() {
					$timeout(function(){
						$scope.saveFcmToken($rootScope.normalizePumpIdentity
										($rootScope.setupPump.id));
					}, 1000*$rootScope.me.setuptimemultiplier);
			};

			$scope.enableNotificationsSuccessContinue = function() {
	    	$scope.$apply(function() {
					$scope.messageStepPhone	= 'Adding phone...';
					$scope.progressBarCurrent = 0;
					var savedId = $rootScope.normalizePumpIdentity
										($rootScope.setupPump.id);
					$rootScope.setupPump.id = savedId;

					$rootScope.setupPump.wifiipaddress = $scope.ipAddress;
					$rootScope.setupPump.wifiname = $rootScope.me.wifiname;
					if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO) {
						alert('$rootScope.setupPump.wifiname=='+$rootScope.setupPump.wifiname);
						alert('$rootScope.setupPump.wifiipaddress=='+$rootScope.setupPump.wifiipaddress);
					}
					var found = false;
					var foundIdx = -1;
					var j = 0;
					var pumpsCount = 0;
					if (!angular.isDefined($rootScope.pumps.length)) {
					} else {
						pumpsCount = $rootScope.pumps.length;

					}

					if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
						alert('Adding phone...pumpsCount='+pumpsCount);

					for(j=0; (!found) &&
							(j<pumpsCount); j++) {
						//if ($rootScope.setupPump.id === $rootScope.pumps[j].id) {
						if ($rootScope.setupPump.macaddress === $rootScope.pumps[j].macaddress) {
							if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO) {
								alert('setupPump.macaddress ['+$rootScope.setupPump.macaddress+'] === $rootScope.pumps['+j+'].macaddress');
								alert('setupPump.description='+$rootScope.setupPump.description);
								alert('setupPump.wifiname='+$rootScope.setupPump.wifiname);
								alert('setupPump.wifiipaddress='+$rootScope.setupPump.wifiipaddress);
								alert('setupPump.name='+$rootScope.setupPump.name);
							}
							foundIdx = j;
							found = true;
							if ($rootScope.setupPump.description !== undefined &&
							    $rootScope.setupPump.description.length !== 0) {
								$rootScope.pumps[j].serialending =
									$rootScope.setupPump.serialending;
								$rootScope.pumps[j].name = 
									$rootScope.setupPump.name;
								$rootScope.pumps[j].description =
									 $rootScope.setupPump.description;
								if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
									alert('pumps['+j+'].description='+$rootScope.pumps[j].description);
								$rootScope.pumps[j].id =
									$rootScope.setupPump.id;
								//$rootScope.pumps[j].macaddress =
								//	$rootScope.setupPump.macaddress;
								$rootScope.pumps[j].wifiipaddress =
									$rootScope.setupPump.wifiipaddress;
								if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
									alert('pumps['+j+'].wifiipaddress='+$rootScope.pumps[j].wifiipaddress);
								$rootScope.pumps[j].wifiname =
									$rootScope.setupPump.wifiname;
								if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
									alert('pumps['+j+'].wifiname='+$rootScope.pumps[j].wifiname);
							}
						}
					}

					if (found) { 
						$rootScope.setupPump = PumpApp.PumpUtil.create(); //new setupPump for next Setup
					} else {
						foundIdx = pumpsCount;
						if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
							alert('setupPump.macaddress ['+$rootScope.setupPump.macaddress+'], name ['+$rootScope.setupPump.name+'] description ['+$rootScope.setupPump.description+'] id ['+$rootScope.setupPump.id+'] ipaddr ['+$rootScope.setupPump.wifiipaddress+']');
						$rootScope.savePump($rootScope.setupPump);
					}

					if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
						alert('Adding phone...found='+found+', foundIdx='+foundIdx);

					$rootScope.selectedPumpIdx = foundIdx;
					if ($rootScope.pumps[$rootScope.selectedPumpIdx].description === undefined ||
							$rootScope.pumps[$rootScope.selectedPumpIdx].description.length === 0) {
						//$scope.retrievePumpSerialNo($rootScope.selectedPumpIdx);
						$timeout(function(){
							if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
								alert('retrievePumpDesc for pump '+$rootScope.pumps[pumpIdx].id);
							$scope.retrievePumpDesc($rootScope.selectedPumpIdx);
						}, 500*$rootScope.me.setuptimemultiplier);
					} else {
						// No need to set description now, it will be done in step 1 aloing with WiFi info
						//if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
						//	alert('setPumpDesc for pump '+$rootScope.pumps[pumpIdx].id);
					// Use property 'Name' to set pump description per email from di xu
						//$scope.setPumpData($rootScope.pumps[$rootScope.selectedPumpIdx].id, 'Name', $rootScope.pumps[$rootScope.selectedPumpIdx].description);
					}

					if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
						alert('Adding phone...DONE, move to next step');

					$scope.messageStepPhone	= '';
					$timeout(function(){
						$scope.goToSetupPage(34);
					}, 1000*$rootScope.me.setuptimemultiplier);
		    });
			};

			$scope.retrievePumpSerialNo = function(pumpIdx) {
				var pumpId = $rootScope.pumps[pumpIdx].id;
				var loginData = PumpApp.Request.Builder.Login();
				if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
					alert('retrievePumpSerialNo::loginData=='+loginData);
				$rootScope.makeRequest(loginData).then(
					function success(response){
						var getPropData = PumpApp.Request.Builder.NodePropertyGet(response.data[1], pumpId, 'SN');
						if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
							alert('retrievePumpSerialNo::getPropData=='+getPropData);
						$rootScope.makeRequest(getPropData).then(
							function(response) {
								if (response.data[0][0] === 'success') {
									var snStr = response.data[0][1];			
									if (snStr === '0xffffffff') {//NO SerailNo Found ::: set to XXXXXX
										if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
										  alert('retrievePumpSerialNo::error response: '+response.data[0][1]);
										$rootScope.pumps[pumpIdx].name = PumpApp.Constants.SerialPrefix + $scope.unknownString;
									} else {
										var snDigits = parseInt(snStr.substring(2, 10), 16).toString();
										var snPadded = "0000000000000000".substr(snDigits.length) + snDigits;
										$rootScope.pumps[pumpIdx].serialending = snPadded.substring(10, 16); // 6 digits
										$rootScope.pumps[pumpIdx].name =
											PumpApp.Constants.SerialPrefix + $rootScope.pumps[pumpIdx].serialending;
										if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
											alert('retrievePumpSerialNo::rootScope.pumps['+pumpId
															+'].name=='+rootScope.pumps[pumpIdx].name);
									}
								} else {
									if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
										alert('retrievePumpSerialNo::error response: '+response.data[0][1]);
									$rootScope.pumps[pumpIdx].name = PumpApp.Constants.SerialPrefix + $scope.unknownString;
								}
							},
							function error(e){
								if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
									alert('retrievePumpSerialNo::send error1');
								$rootScope.pumps[pumpIdx].name = PumpApp.Constants.SerialPrefix + $scope.unknownString;
								//debugger;
							}
						);
					},
					function error(e){
						if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
							alert('retrievePumpSerialNo::send error2');
						$rootScope.pumps[pumpIdx].name = PumpApp.Constants.SerialPrefix + $scope.unknownString;
						//debugger;
					}
				);
			};

			$scope.setPumpData = function(pumpId, propertyName, prpertyValue) {
				$scope.messageStepPhone	= 'Updating datetime...';
				var setPropData = PumpApp.Request.Builder.NodePropertySet
						($rootScope.setupPump.connectiondata, pumpId, propertyName, prpertyValue);
				if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
					alert('setPumpData::setPropData=='+setPropData);
				$rootScope.makeRequest(setPropData).then(
					function(response) {
						if (response.data[0][0] === 'error') {
							if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
								alert('setPumpData::error response: '+response.data[0][1]);
						} else {
							if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
								alert('setPumpData::success response');
						}
					},
					function error(e){
						if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
							alert('setPumpData::send error1:');
						//debugger;
					}
				);

			};

			$scope.retrievePumpDesc = function(pumpIdx) {
				var loginData = PumpApp.Request.Builder.Login();
				if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
					alert('retrievePumpDesc::loginData=='+loginData);
				$rootScope.makeRequest(loginData).then(
					function success(response){
					// Use property 'Name' to get pump description per email from di xu
						var getPropData = PumpApp.Request.Builder.NodePropertyGet(response.data[1], $rootScope.pumps[pumpIdx].id, 'Name');
						if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
							alert('retrievePumpDesc::getPropData=='+getPropData);
						$rootScope.makeRequest(getPropData).then(
							function(response) {
								if (response.data[0][0] === 'success') {
									$rootScope.pumps[pumpIdx].description = response.data[0][1];
									if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
										alert('retrievePumpSerialNo::rootScope.pumps['+pumpIdx+'].description=='+rootScope.pumps[pumpIdx].description);
								} else {
									if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
										alert('retrievePumpDesc::error response:'+response.data[0][1]);
								}
							},
							function error(e){
								if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
									alert('retrievePumpDesc::send error1:');
								//debugger;
							}
						);
					},
					function error(e){
							if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
								alert('retrievePumpDesc::send error2:');
						//debugger;
					}
				);
			};

			$scope.saveFcmToken = function(savedId) {
				$scope.sendPutExtUuid(savedId);
			};

			$scope.sendPutExtUuid = function(savedId) {
				if ($rootScope.freeSlot < 0 || $rootScope.freeSlot > 4) {
					alert('Invalid slot number - '+$rootScope.freeSlot);
					return;
				}

				$scope.messageStepPhone	= 'Sending device id...';
				var loginData = PumpApp.Request.Builder.Login();
				$rootScope.makeRequest(loginData).then(
					function success(response){
						$rootScope.setupPump.connectiondata = response.data[1];
						var getData = PumpApp.Request.Builder.PutExtUuid(response.data[1],
							savedId, $rootScope.me.deviceuuid, $rootScope.me.name, $rootScope.freeSlot.toString());
						if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
							alert('sendPutExtUuid::getData='+getData);
						$rootScope.makeRequest(getData).then(
							function(response) {
								if (response.data[0][0] === 'error') {
									if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
										alert('sendPutExtUuid:ERROR:'+response.data[0][0]+'\nresponse.data[1]=='+response.data[0][1]);
									$scope.performActionFailure();
								} else {
									if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
										alert('sendPutExtUuid:SUCCESS:'+response.data[0][0]+'\nresponse.data[1]=='+response.data[0][1]);
									$timeout(function(){
										$scope.register(savedId);
									}, 500*$rootScope.me.setuptimemultiplier);
								}
							},
							function error(e){
								if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
									alert('ERROR1: sendPutExtUuid');
								$scope.performActionFailure();
								//debugger;
							}
						);
					},
					function error(e){
						if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
							alert('ERROR2: sendPutExtUuid');
						$scope.performActionFailure();
						//debugger;
					}
				);
			};

			$scope.register = function(savedId) {
				$scope.messageStepPhone	= 'Registering phone...';
				var getData = PumpApp.Request.Builder.Register($rootScope.setupPump.connectiondata,
							$rootScope.me.deviceuuid, $rootScope.me.name, $rootScope.me.platform,
							$rootScope.me.fcmtoken);
				if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
					alert('register::getData='+getData);
				$rootScope.makeRequest(getData).then(
					function(response) {
						if (response.data[0] === 'error') {
							if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
								alert('register::'+response.data[0]+'\nresponse.data[1]=='+response.data[1]);
							$scope.performActionFailure();
						} else {
							if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
								alert('register::'+response.data[0]+'\nresponse.data[1]=='+response.data[1]);
							$timeout(function(){
								var datetimestr = PumpApp.Utils.localDateTimeString();
								$scope.setPumpData(savedId, 'DateTime', datetimestr);
								$timeout(function(){
									$scope.searchPumpContinue();
								}, 1500*$rootScope.me.setuptimemultiplier);
							}, 500*$rootScope.me.setuptimemultiplier);
						}
					},
					function error(e){
						if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
							alert('ERROR1: register');
						$scope.performActionFailure();
						//debugger;
					}
				);
			};

			$scope.performActionWiFi = function(actionFunc) {
				if ($rootScope.setupPump.description === undefined) {
					alert('Please enter the pump description (undefined).');
					return;
				}
				if ($rootScope.setupPump.description.length <= 0) {
					alert('Please enter the pump description.');
					return;
				}

				// Disable connect button and show progress spinner icon while attempting to connect
				document.getElementById('actionButton').disabled = true;
				$scope.setStatusIcon('progressSpinner', 'fa-check');
				$scope.setStatusIcon('progressSpinner', 'fa-times');
				
				// Perform action here such as connectToPump, etc
				actionFunc();
			};

			$scope.performAction = function(actionFunc) {
				// Disable connect button and show progress spinner icon while attempting to connect
				document.getElementById('actionButton').disabled = true;
				$scope.setStatusIcon('progressSpinner', 'fa-check');
				$scope.setStatusIcon('progressSpinner', 'fa-times');
				
				// Perform action here such as connectToPump, etc
				actionFunc();
			};
			
			$scope.cleanDisplay2 = function() {
				$scope.messageStepWifi	= '';
				
				var successText = document.getElementById('successText');
				if (!!successText) {
					document.getElementById('successText').style.display = 'none';
				}
				
				var failureText = document.getElementById('failureText');
				if (!!failureText) {
					document.getElementById('failureText').style.display = 'none';
				}
			};

			$scope.cleanDisplay3 = function() {
				$scope.abortSearchPump = false;
				$scope.messageStepPhone	= '';

				var successText = document.getElementById('successText');
				if (!!successText) {
					document.getElementById('successText').style.display = 'none';
				}
				
				var failureText = document.getElementById('failureText');
				if (!!failureText) {
					document.getElementById('failureText').style.display = 'none';
				}
			};

			$scope.performActionSuccess = function() {
				$scope.messageStepWifi	= '';
				$scope.setStatusIcon('fa-check', 'progressSpinner');
				
				var pageText = document.getElementById('pageText');
				if (!!pageText) {
					document.getElementById('pageText').style.display = 'none';
				}
				var pageTextA = document.getElementById('pageTextA');
				if (!!pageTextA) {
					document.getElementById('pageTextA').style.display = 'none';
				}

				var successText = document.getElementById('successText');
				if (!!successText) {
					document.getElementById('successText').style.display = 'unset';
				}
				
				var failureText = document.getElementById('failureText');
				if (!!failureText) {
					document.getElementById('failureText').style.display = 'none';
				}
				
				// Show next button
				document.getElementById('nextButton').style.display = 'unset';
			};
			
			$scope.performActionFailure = function() {	
				$scope.messageStepWifi	= '';
				$scope.messageStepPhone	= '';
				if ($stateParams.stepId==='32'){

				};
				$scope.setStatusIcon('fa-times', 'progressSpinner');

				var pageText = document.getElementById('pageText');
				if (!!pageText) {
					document.getElementById('pageText').style.display = 'none';
				}	
				var pageTextA = document.getElementById('pageTextA');
				if (!!pageTextA) {
					document.getElementById('pageTextA').style.display = 'none';
				}			

				var failureText = document.getElementById('failureText');
				if (!!failureText) {
					document.getElementById('failureText').style.display = 'unset';
				}
				
				var successText = document.getElementById('successText');
				if (!!successText) {
					document.getElementById('successText').style.display = 'none';
				}
				
				document.getElementById('actionButton').disabled = t;
			};
			
			$scope.setStatusIcon = function(showClass, hideClass) {
				if (!!document.getElementsByClassName(hideClass)[0]) {
					document.getElementsByClassName(hideClass)[0].style.display = 'none';
				}
				
				if (!!document.getElementsByClassName(showClass)[0]) {
					document.getElementsByClassName(showClass)[0].style.display = 'unset';
				}
			};
			
			$scope.resizeSetupScreen = function() {
				document.getElementsByClassName('setup-app')[0].style.height = (document.body.scrollHeight * 0.83) + 'px';
			};
			
			$scope.makeTableScroll = function() {
				var maxRows = 5;

				var table = document.getElementById('networkList');
				var wrapper = table.parentNode;
				var rowsInTable = table.rows.length;
				var height = 0;
				if (rowsInTable > maxRows) {
					for (var i = 0; i < maxRows; i++) {
						height += table.rows[i].clientHeight;
					}
					wrapper.style.height = height + "px";
				}
			};
			
			$scope.togglePassword = function(toggle) {
				if (toggle) {
					document.getElementById('networkAccess').setAttribute('type','text');
					document.getElementById('passwordIconShow').style.display = 'none';
					document.getElementById('passwordIconHide').style.display = 'unset';
				}
				else {
					document.getElementById('networkAccess').setAttribute('type','password');
					document.getElementById('passwordIconHide').style.display = 'none';
					document.getElementById('passwordIconShow').style.display = 'unset';
				}
			};
			
			$scope.handleNetworkListClick = function($event, item) {
				var oldSelection = angular.element(document.querySelector('.networkList .selected'));
				oldSelection.removeClass('selected');
				var el = (function(){
					var elem = $event.currentTarget || $event.srcElement;
					if (elem.nodeName === 'TR') {
						return angular.element(elem.children[0]); // get td
					} else {
						return angular.element(elem);          // is td
					}
				})();
				el.addClass('selected');
				
				$scope.wifiname = item.SSID;
			};
			
			$scope.stopAniLeafCycle = null;
			$scope.aniLeafCycleStep = 1;
			$scope.startAniLeafCycle = function() {
				$scope.stopAniLeafCycle = $interval(function() {
					$scope.aniLeafCycleStep++;
					if($scope.aniLeafCycleStep > 3) {
						$scope.aniLeafCycleStep = 1;
					}
				}, 3000);
			}
			
			$scope.goToSetupPage = function(n) {
				if ($stateParams.stepId==='32'){
					$scope.abortSearchPump = true;
				};
				$rootScope.navigateToPage($rootScope.page, {stepId:n});
			};
			
			$scope.setupStatusHelp = function() {
				//debugger;
			}
			
			$scope.restartPumpHelp = function () {
				//debugger;
			}
			
			$scope.$on("$destroy",
				function() {
					$('.view').css('background-color','');
					$('.footerMiddle').css('background-color','');
					if ($scope.pumpWifiSaveTimeout !== null) {
						clearTimeout($scope.pumpWifiSaveTimeout);
					}
					
					if ($scope.watchpumpWifiSaveCount !== null && $scope.watchpumpWifiSaveCount !== undefined) {
						$scope.watchpumpWifiSaveCount();
					}
				
					if ($rootScope.watchSetupWifiStep !== null && $rootScope.watchSetupWifiStep !== undefined) {
						$rootScope.watchSetupWifiStep();
					}

					if ($scope.watchprogressBarCurrent !== null && $scope.watchprogressBarCurrent !== undefined) {
						$scope.watchprogressBarCurrent();
					}

					if ($scope.stopAniLeafCycle !== null) {
						$interval.cancel($scope.stopAniLeafCycle);
						$scope.stopAniLeafCycle = null;
					}
				}
			);
			
			$rootScope.createMenu([]);
			
			$('.view').css('background-color','white');
			$('.footerMiddle').css('background-color','white');


/***************************************************************************************
	Setup Pump with Local Socket routines below
***************************************************************************************/


////!!!!!!!!////!!!!!!!!!!!!!!!!!!!!!////!!!!!!!!!!!!!
//           Step 1 State Machine - START
////!!!!!!!!////!!!!!!!!!!!!!!!!!!!!!////!!!!!!!!!!!!!
			$scope.messageStepWifi	= '';
			$scope.messageStepPhone = '';
			$rootScope.SetupWifiStep = 0;

			if (PumpApp.Utils.useLocalStateMachine()) {
			$rootScope.watchSetupWifiStep = $rootScope.$watch('SetupWifiStep', function (newValue, oldValue, scope) {
					if (!(($stateParams.stepId==='22') || ($stateParams.stepId==='23')			
						 || ($stateParams.stepId==='24')	|| ($stateParams.stepId==='25'))) {return;}

					if (oldValue===newValue) {return;}

					$rootScope.socketStopSocketPingTimer();

					switch(newValue) {
						case 0:
							break;
						case 1:
							$rootScope.stepWifiGetCurrentSsid($scope.getCurrentSsidTimer, 5);
							break;
						case 2:
							$rootScope.stepWifiConnectToPump($scope.connectToPumpTimer);
							break;
						case 3:
							$rootScope.stepWifiGetCurrentIpAddr($scope.getCurrentIpAddrTimer, 5);
							break;
						case 4:
							//$rootScope.stepWifiOpenSocket(2000, 3);
							if ($stateParams.stepId==='22') $scope.connectToPumpAp();
							if ($stateParams.stepId==='23') $scope.setupAndReset(3);
							if ($stateParams.stepId==='24') $scope.setPumpPropertiesUseLocalSocket();
							if ($stateParams.stepId==='25') $scope.softResetUseLocalSocket();
							break;
						case 5:
							$rootScope.socketSendCommand('Connect', 'connect ' + $rootScope.me.deviceuuid);
							break;
						case 6:
							$rootScope.socketSendCommand('ssid', 'ssid ' + $rootScope.me.wifiname);
							break;
						case 7:
							$rootScope.socketSendCommand('pwd', 'pwd ' + $rootScope.me.wifipass);
							break;
						case 8:
							$rootScope.socketSendCommand('', 'soft reset 65529');
							$rootScope.bSuccess = true;
							break;
						case 9:
							$scope.messageStepWifi	= 'Closing pump socket ... ';
							$rootScope.socket.close();
							$scope.resetCommandSuccess();  // closeSocket with RESPONSE
							break;
						case 10:
							$rootScope.socketSendCommand('', 'ssid');
							break;
						default:
							$rootScope.watchSetupWifiStep();
							$timeout(function(){
								if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
									alert('**** $scope.performActionFailure(02) ****');
								$scope.performActionFailure();
							},500*$rootScope.me.setuptimemultiplier);
							break;
					}
				}, true);
			};

			$rootScope.socketStartSocketPingTimer = function (delay) {
				$rootScope.socketPingTimer = setInterval(function(){
					$scope.socketSendCommand('', 'keep alive');
				}, delay*$rootScope.me.setuptimemultiplier);
			};

			$rootScope.socketStopSocketPingTimer = function () {
				if ($rootScope.socketPingTimer != null) {
					clearInterval($rootScope.socketPingTimer);
					$rootScope.socketPingTimer = null;
				}
			};

			$rootScope.updateSetupWifiStep = function (val) {
	    	$rootScope.$apply(function() {
					$rootScope.SetupWifiStep = val; 
				});
			};

			$scope.goStraightToSettings = function(updateStep) {
				$scope.firstConnect = false;
				$scope.messageStepWifi	= '';
				$scope.setStatusIcon('none', 'progressSpinner');
				document.getElementById('actionButton').disabled = false;
				if (updateStep) {
					$rootScope.updateSetupWifiStep(0);
				}
				$scope.openWifiSettings();
			};

			$rootScope.stepWifiGetCurrentSsid = function(delay, retry) {  // Step 1 - 2
				if ($scope.firstConnect === true) {
					DeviceUtility.getCurrentSSID(
					function (s){
						$rootScope.unverifiedSSID = s.replace(/"/g,'');
						if ($rootScope.setupPump.name.length > 0 && $rootScope.setupPump.name === 						$rootScope.unverifiedSSID) {
							if (($stateParams.stepId==='22')||($stateParams.stepId==='23'))
										$rootScope.updateSetupWifiStep(3);  // get current IpAddr
							else 	$rootScope.updateSetupWifiStep(4);  // go open socket
						} else {
							$scope.goStraightToSettings(true);
						}

					}, function (){
						$scope.goStraightToSettings(true);
					} ); // End of getCurrentSSID()
					return;
				}

				retry = retry-1;
				if (!(retry > 0)) {
					$rootScope.updateSetupWifiStep(2);  // try to connect to the pump AP
					return;
				}

				$scope.messageStepWifi	= 'Getting current WiFi name ...';
				$timeout(function(){
					DeviceUtility.getCurrentSSID(
					function (s){
						$rootScope.unverifiedSSID = s.replace(/"/g,'');
						if ($rootScope.setupPump.name.length > 0 && $rootScope.setupPump.name === 						$rootScope.unverifiedSSID) {
							if (($stateParams.stepId==='22')||($stateParams.stepId==='23'))
										$rootScope.updateSetupWifiStep(3);  // get current IpAddr
							else 	$rootScope.updateSetupWifiStep(4);  // go open socket
						} else {
							$rootScope.updateSetupWifiStep(2);  // try to connect to the pump AP
						}

					}, function (){
							$scope.stepWifiGetCurrentSsid($scope.getCurrentSsidTimer, retry);
					} ); // End of getCurrentSSID()
				}, delay*$rootScope.me.setuptimemultiplier);  // End of $timeout
			};

			$rootScope.stepWifiConnectToPump = function(delay) {  // Step 1 - 1
				if (!($scope.step2ConnectToPumpRetry > 0)) {
					$rootScope.targetSSID = $rootScope.setupPump.name;
					//$rootScope.togglePopup('popupSetupCannotConnect', 45);
					if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
						alert('**** $scope.performActionFailure(02.5) ****');
					$scope.enablePumpWifiFailure();
					return;
				}
				$scope.step2ConnectToPumpRetry--;  // decrement the step2ConnectToPumpRetry count
				var connectToPumpSucc = function() {
					$rootScope.updateSetupWifiStep(1);  // go get current SSID
				};
				var connectToPumpFail = function() {
					$rootScope.$apply(function() {
						$rootScope.targetSSID = $rootScope.setupPump.name;
						//$rootScope.togglePopup('popupSetupCannotConnect', 45);
					});
					$scope.$apply(function() {
						if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
							alert('**** $scope.performActionFailure(03) ****');
						$scope.enablePumpWifiFailure();
					});
				};

				$scope.messageStepWifi	= 'Connecting to ['+ $rootScope.setupPump.name+'] ...';
				$timeout(function(){
					if (PumpApp.Utils.isAndroid()) { //Android
						DeviceUtility.connectNetwork($rootScope.setupPump.name,
							connectToPumpSucc, connectToPumpFail);
					} else if (PumpApp.Utils.isIPhone()) { //iOS
						DeviceUtility.iOSConnectNetwork($rootScope.setupPump.name, '',
							connectToPumpSucc, connectToPumpFail);
					}
				}, delay*$rootScope.me.setuptimemultiplier);


			};

			$rootScope.stepWifiGetCurrentIpAddr = function(delay, retry) {  // Step 1 - 3
				retry = retry - 1;
				if (!(retry > 0)) {
					//if (!($scope.step2ConnectToPumpRetry > 0)) {
						$scope.messageStepWifi	= '';
						$scope.enablePumpWifiFailure();
						//$scope.performActionFailure();
					//} else {
					//	$scope.step2ConnectToPumpRetry--;  // decrement the step2ConnectToPumpRetry count
					//	$rootScope.updateSetupWifiStep(1);  // try to connect to get WiFI name again
					//}
					return;
				}

				$scope.messageStepWifi	= 'Getting current IpAddress ...';
				$timeout(function(){
					var params = {};
					$rootScope.getIpAddrTimeout = setTimeout(function(){
						if ($rootScope.getIpAddrTimeout != null) {
							$rootScope.getIpAddrTimeout = null;
							$rootScope.targetSSID = $rootScope.setupPump.name;
							if (true) {
								$scope.stepWifiGetCurrentIpAddr($scope.getCurrentIpAddrTimer, retry);
							} else {
								//$rootScope.togglePopup('popupSetupCannotConnect', 45);
								if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
									alert('**** $scope.performActionFailure(05.5) ****');
								$scope.$apply(function() {
									$scope.messageStepWifi	= '';
									$scope.enablePumpWifiFailure();
								});
							}
						}
					}, $scope.getCurrentIpAddrTimer*$rootScope.me.setuptimemultiplier);

					//}, $scope.getIpAddrTimer*$rootScope.me.setuptimemultiplier);

					addressimpl.request("getIPAddress", JSON.stringify(params), 
						function(ip) {
							if ($rootScope.getIpAddrTimeout != null) {
								clearTimeout($rootScope.getIpAddrTimeout);
								$rootScope.getIpAddrTimeout = null;
							}
							if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
								alert('retry='+retry+', Found ip='+ip+', PumpApIpSubnet='+PumpApp.Constants.PumpApIpSubnet);
							if (ip.includes(PumpApp.Constants.PumpApIpSubnet)) {
							//if (true) {
								$rootScope.updateSetupWifiStep(4);  // go open the socket
							} else {
                $rootScope.targetSSID = $rootScope.setupPump.name;
                //$rootScope.togglePopup('popupSetupCannotConnect', 45);
                if (ip.length < 16) { // IP4 address
                    $scope.stepWifiGetCurrentIpAddr($scope.getCurrentIpAddrTimer, retry);
                } else {
                    if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
                    	alert('**** Invalid IP4 address **** '+ip);
                    $scope.$apply(function() {
                          $scope.messageStepWifi    = '';
                          $scope.enablePumpWifiFailure();
                      });
                }
							}
						}, function() {
							if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
								alert('Failed on get ip address ...');
							if ($rootScope.getIpAddrTimeout != null) {
								clearTimeout($rootScope.getIpAddrTimeout);
								$rootScope.getIpAddrTimeout = null;
							}
							$scope.stepWifiGetCurrentIpAddr($scope.getCurrentIpAddrTimer, retry);
						});

				}, delay*$rootScope.me.setuptimemultiplier);  // TIMER
			};

			$rootScope.sockeOnData = function(data) {
				var dataString = new TextDecoder("utf-8").decode(data);
				dataString = dataString.replace('\r\n','');

				if (($rootScope.keyword.length === 0) || 
						(($rootScope.keyword.length > 0) && (dataString.includes($rootScope.keyword)))) {

					switch($rootScope.SetupWifiStep) {
						case 5: // Connect
							var substr = dataString.substring($rootScope.keyword.length+1).split(":", 2); // MAC:id
    					$rootScope.$apply(function() {
								$rootScope.setupPump.macaddress = substr[0];
								$rootScope.setupPump.idAsNumber = parseInt(substr[1]);
								$rootScope.setupPump.id =$rootScope.convertPumpIdentity(substr[1]);
    					});

							//$scope.$apply(function() {
						    $scope.performActionSuccess();
							//});

							$rootScope.socketStartSocketPingTimer(30000);  // DONE, go to PING mode
							break;
						case 6: // set ssid
						  if ($rootScope.me.wifipass.length) {
								$rootScope.updateSetupWifiStep(7);  // Ok, go set pwd
								//$scope.SetupWifiStep = 7;  // Ok, go set pwd
						  }
							break;
						case 7:  // set pwd
							//$scope.$apply(function() {
						    $scope.performActionSuccess();
							//});
							$rootScope.socketStartSocketPingTimer(30000);  // DONE, go to PING mode
							break;
						case 8: // soft reset
							$rootScope.closeSocket = true;
							$rootScope.updateSetupWifiStep(9);  // DONE, close socket
							break;
						case 9:  // CLOSING Socket
							break;
						case 10:  // Retrieve SSID List
							var splitSsid = dataString.split(/\r?\n/g);
							for(var i = 0; i < splitSsid.length; i ++){
								if (!splitSsid[i].includes('#####')) {
									if (splitSsid[i].length > 0) {
										$scope.$apply(function() {
											$scope.netWorks.push({ SSID: splitSsid[i] });
										});
									}
								}
							}
							if (dataString.includes('#####')) {
								/*$scope.$apply(function() {
									$scope.netWorks = $scope.netWorks;
								});*/
								$timeout(function(){
									$scope.netWorks = $scope.netWorks;
								}, 200*$rootScope.me.setuptimemultiplier);
								$rootScope.socketStartSocketPingTimer(30000);  // DONE, go to PING mode
							}
							break;
						default:
							if ($rootScope.keyword.length > 0) {
								$rootScope.closeSocket = true;
								if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
									alert('**** $scope.performActionFailure(07) ****');
								$scope.$apply(function() {
									$scope.performActionFailure();
								});
							}
							break;
					} // End of Switch
				}  // End of $rootScope.keyword check
			else {
				if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
					alert('ELSE of $rootScope.keyword check');
			}
			};

			$rootScope.socketSendCommand = function(key, cmd) {
				//$timeout(function(){
					$scope.messageStepWifi	= 'Sending pump command ... ' + cmd;
					$rootScope.keyword = key;
					$rootScope.socket.write(PumpApp.Utils.formatUint8Array(cmd+"\r\n"));
				//}, 200);
			};

			$rootScope.stepWifiOpenSocket = function(delay, retry) {  // Step 1 - 4
				$scope.messageStepWifi	= 'Opening pump socket ...';
				$timeout(function(){
							$rootScope.closeSocket = false;
							$rootScope.bSuccess = false;

							$rootScope.socket = new Socket();
							$rootScope.socket.onData = $rootScope.sockeOnData;

							$rootScope.socket.onError = function(errorMessage) {
								if (!$rootScope.closeSocket) {
									if ($rootScope.bSuccess) {
										$rootScope.updateSetupWifiStep(9);  // DONE, close socket
									} else {
										if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
											alert('**** $scope.performActionFailure(08) ****');		
										$scope.performActionFailure();
									}
								}
							};

							$rootScope.socket.onClose = function(hasError) {
								$scope.messageStepWifi	= '';
								$rootScope.closeSocket = true;
								if (hasError) {
									if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
										alert('Connection Closed: ' + hasError);
								}
								if ($rootScope.bSuccess) {
									$scope.resetCommandSuccess();  // closeSocket with NO RESPONSE
								}
							};

							$rootScope.socket.open( PumpApp.Constants.PumpApIpAddress, 
																			PumpApp.Constants.PumpApPortNo,
								function() {
									if ($rootScope.openSocketTimeout != null) {
										clearTimeout($rootScope.openSocketTimeout);
										$rootScope.openSocketTimeout = null;
									}
									$rootScope.updateSetupWifiStep(5);  // send Connect
								},
								function(errorMessage) {
									if ($rootScope.openSocketTimeout != null) {
										clearTimeout($rootScope.openSocketTimeout);
										$rootScope.openSocketTimeout = null;
										if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
											alert('**** $scope.performActionFailure(09) ****');
										$scope.performActionFailure();
									} 
								}
							);

							$rootScope.openSocketTimeout = setTimeout(function(){
								if ($rootScope.openSocketTimeout != null) {
									$rootScope.socket.close();
									$rootScope.openSocketTimeout = null;
									if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
										alert('**** $scope.performActionFailure(10) ****');
									$scope.performActionFailure();
								}
							}, 1000*$rootScope.me.setuptimemultiplier);


				}, delay*$rootScope.me.setuptimemultiplier);  // TIMER
			};


////!!!!!!!!////!!!!!!!!!!!!!!!!!!!!!////!!!!!!!!!!!!!
//           Step 1 State Machine - END
////!!!!!!!!////!!!!!!!!!!!!!!!!!!!!!////!!!!!!!!!!!!!
			$scope.setupAndReset = function(retry) {
				retry = retry - 1;
				if (!(retry > 0)) {
					$scope.messageStepWifi	= 'Connecting to pump ...RETRY EXCEEDED';
					if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
						alert('RETRY EXCEEDED::**** $scope.enablePumpWifiFailure(10.1) ****');
					$scope.enablePumpWifiFailure();
					return;
				}

				var socket = new Socket();
				var cmd = "INITIAL";
				var dataString = "INITIAL";
				var closeSocket = false;

				socket.onData = function(data) {
					dataString = new TextDecoder("utf-8").decode(data);
					dataString = dataString.replace('\r\n','');
					if (dataString.includes(cmd)) {
						switch(cmd) {
							case "Connect":
								var substr = dataString.substring(cmd.length+1).split(":", 2); // MAC:id
	    					$rootScope.$apply(function() {
									$rootScope.setupPump.macaddress = substr[0];
									$rootScope.setupPump.idAsNumber = parseInt(substr[1]);
									$rootScope.setupPump.id =$rootScope.convertPumpIdentity(substr[1]);
	    					});
								if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
									alert('macaddress='+$rootScope.setupPump.macaddress+', idAsNumber='+
										$rootScope.setupPump.idAsNumber+', id='+$rootScope.setupPump.id);
								$timeout(function(){
									cmd = "name";
									$scope.messageStepWifi	= 'Sending Pump description ...';
									if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
										alert('send description');
									socket.write(PumpApp.Utils.formatUint8Array(cmd + " " + $rootScope.setupPump.description + "\r\n"));
								}, 100*$rootScope.me.setuptimemultiplier);
							break;

							case "name":
								$timeout(function(){
									cmd = "cloud";
									$scope.messageStepWifi	= 'Sending cloud ip information ...';
									var str = "cloud ip " + $rootScope.me.requesturlip + ":8090\r\n";
									if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
										alert('send '+str);
									socket.write(PumpApp.Utils.formatUint8Array(str));
								}, 100*$rootScope.me.setuptimemultiplier);
							break;

							case "cloud":
								$timeout(function(){
									cmd = "ssid";
									$scope.messageStepWifi	= 'Sending WiFi information ...';
									if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
										alert('send ssid');
									socket.write(PumpApp.Utils.formatUint8Array(cmd + " " + $rootScope.me.wifiname + "\r\n"));
								}, 100*$rootScope.me.setuptimemultiplier);
							break;

							case "ssid":
							  if ($rootScope.me.wifipass.length) {
									$timeout(function(){
									cmd = "pwd";
									if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
										alert('send pwd');
									socket.write(PumpApp.Utils.formatUint8Array
										(cmd + " " + $rootScope.me.wifipass + "\r\n"));
									}, 100*$rootScope.me.setuptimemultiplier);
							  } else {
									$timeout(function(){
										if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
											alert('send soft reset');
										cmd = "soft reset 65529\r\n";
										socket.write(PumpApp.Utils.formatUint8Array(cmd));
										$scope.bSuccess = true;
									}, 100*$rootScope.me.setuptimemultiplier);
							  }
							  break;

							case "pwd":
								$timeout(function(){
									if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
										alert('send soft reset');
									cmd = "soft reset 65529\r\n";
									$scope.messageStepWifi	= 'Restarting pump ...';
									$scope.bSuccess = true;
									socket.write(PumpApp.Utils.formatUint8Array(cmd));
								}, 100*$rootScope.me.setuptimemultiplier);
							  break;
							default:
								if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
									alert('Response from soft reset');
								closeSocket = true;
							break;
						}
					}
					if (closeSocket) {
						$timeout(function(){
							socket.close();
							$scope.resetCommandSuccess();  // closeSocket with RESPONSE
						}, 400*$rootScope.me.setuptimemultiplier);
					}
				};

				socket.onError = function(errorMessage) {
					if ($rootScope.waitForResetTimeout != null) {
						clearTimeout($rootScope.waitForResetTimeout);
						$rootScope.waitForResetTimeout = null;
						if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
							alert('onError:Kill waitForResetTimeout TIMER');
					}
					if (!closeSocket) {
						if (!$scope.bSuccess) {
							$scope.messageStepWifi	= 'Connecting to pump ...FAILED';
							if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
								alert('onError::**** $scope.enablePumpWifiFailure(08) ****');
							socket.close();
							$scope.setupAndReset(retry);
							//$scope.enablePumpWifiFailure();
						} else {
							if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
								alert('onError::Pump reset without response!!!');
						}
					}
				};

				socket.onClose = function(hasError) {
					if ($rootScope.waitForResetTimeout != null) {
						clearTimeout($rootScope.waitForResetTimeout);
						$rootScope.waitForResetTimeout = null;
						if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
							alert('onClose::Kill waitForResetTimeout TIMER');
					}
					if ($scope.bSuccess) {
						if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
							alert('onClose:Pump socket got closed ['+hasError+'!!!');
						$scope.messageStepWifi	= 'Setup pump WiFi successful';
						$scope.resetCommandSuccess();  // closeSocket with NO RESPONSE
						closeSocket = true;
					}
				};

				if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
					alert('Trying to connect to '+PumpApp.Constants.PumpApIpAddress
																				+'::'+PumpApp.Constants.PumpApPortNo);
				$scope.messageStepWifi	= 'Connecting to pump ...';
				socket.open( PumpApp.Constants.PumpApIpAddress, PumpApp.Constants.PumpApPortNo,
					function() {
						if ($rootScope.openSocketTimeout != null) {
							clearTimeout($rootScope.openSocketTimeout);
							$rootScope.openSocketTimeout = null;
						}

						$timeout(function(){
							if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
								alert('send Connect');
							cmd = "Connect";
							$scope.messageStepWifi	= 'Sending connect ...';
							socket.write(PumpApp.Utils.formatUint8Array
								("connect " + $rootScope.me.deviceuuid + "\r\n"));
						}, 500*$rootScope.me.setuptimemultiplier);

						$rootScope.waitForResetTimeout = setTimeout(function(){
							if ($rootScope.waitForResetTimeout != null) {
								$rootScope.waitForResetTimeout = null;
								socket.close();
								if ($scope.bSuccess) {
									if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
										alert('onTimeout::Pump reset without response!!!');
									$scope.messageStepWifi	= 'Setup pump WiFi successful';
									$scope.resetCommandSuccess();  // closeSocket with RESPONSE
								} else {
									$scope.messageStepWifi	= 'Connecting to pump ...TIMEOUT';
									if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
										alert('onTimeout::**** $scope.enablePumpWifiFailure(10.2) ****\nlast cmd sent::'+cmd+'\nlast rsp rcvd::'+dataString);
									$scope.setupAndReset(retry);
									//$scope.enablePumpWifiFailure();
								}
							}
						}, 10000*$rootScope.me.setuptimemultiplier);

					},
					function(errorMessage) {
						if ($rootScope.openSocketTimeout != null) {
							clearTimeout($rootScope.openSocketTimeout);
							$rootScope.openSocketTimeout = null;
							$scope.messageStepWifi	= 'Connecting to pump ...ERROR';
							if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
								alert('**** $scope.enablePumpWifiFailure(09) ****');
							$scope.setupAndReset(retry);
							//$scope.enablePumpWifiFailure();
						} 
					}
				);

				$rootScope.openSocketTimeout = setTimeout(function(){
					if ($rootScope.openSocketTimeout != null) {
						socket.close();
						$rootScope.openSocketTimeout = null;
							$scope.messageStepWifi	= 'Connecting to pump ...TIMEOUT';
						if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
							alert('**** $scope.enablePumpWifiFailure(10) ****');
						$scope.setupAndReset(retry);
						//$scope.enablePumpWifiFailure();
					}
				}, 3000*$rootScope.me.setuptimemultiplier);
			};


			$scope.connectToPumpAp = function() {
				var socket = new Socket();
				var cmd = "";
				var closeSocket = false;
				socket.onData = function(data) {
					var dataString = new TextDecoder("utf-8").decode(data);
					dataString = dataString.replace('\r\n','');
					if (dataString.includes(cmd)) {
						switch(cmd) {
							case "Connect":
								var substr = dataString.substring(cmd.length+1).split(":", 2); // MAC:id
	    					$rootScope.$apply(function() {
									$rootScope.setupPump.macaddress = substr[0];
									$rootScope.setupPump.idAsNumber = parseInt(substr[1]);
									$rootScope.setupPump.id =$rootScope.convertPumpIdentity(substr[1]);
	    					});
								closeSocket = true;
								$scope.bSuccess = true;
						    $scope.performActionSuccess();
							break;
							default:
								closeSocket = true;
								if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
									alert('**** $scope.performActionFailure(07) ****');
								$scope.performActionFailure();
							break;
						}
					}

					if (closeSocket) {
						$timeout(function(){
							socket.close();
						}, 200*$rootScope.me.setuptimemultiplier);
					}
				};

				socket.onError = function(errorMessage) {
					if (!closeSocket) {
						if (!$scope.bSuccess) {
							if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
								alert('**** $scope.performActionFailure(08) ****');		
							$scope.performActionFailure();
						}
					}
				};

				socket.onClose = function(hasError) {
					//if (hasError) alert('Connection Closed: ' + hasError);
				};

				if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
					alert('Trying to connect to '+PumpApp.Constants.PumpApIpAddress
																				+'::'+PumpApp.Constants.PumpApPortNo);
				socket.open( PumpApp.Constants.PumpApIpAddress, PumpApp.Constants.PumpApPortNo,
					function() {
						if ($rootScope.openSocketTimeout != null) {
							clearTimeout($rootScope.openSocketTimeout);
							$rootScope.openSocketTimeout = null;
						}
						cmd = "Connect";
						socket.write(PumpApp.Utils.formatUint8Array
							("connect " + $rootScope.me.deviceuuid + "\r\n"));
					},
					function(errorMessage) {
						if ($rootScope.openSocketTimeout != null) {
							clearTimeout($rootScope.openSocketTimeout);
							$rootScope.openSocketTimeout = null;
							if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
								alert('**** $scope.performActionFailure(09) ****');
							$scope.performActionFailure();
						} 
					}
				);

				$rootScope.openSocketTimeout = setTimeout(function(){
					if ($rootScope.openSocketTimeout != null) {
						socket.close();
						$rootScope.openSocketTimeout = null;
						if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
							alert('**** $scope.performActionFailure(10) ****');
						$scope.performActionFailure();
					}
				}, 1000*$rootScope.me.setuptimemultiplier);
			};

			$scope.pumpConnectSuccessUseLocalSocket = function() {
						var keepGoing = false;
						$timeout(function(){
							DeviceUtility.getCurrentSSID(
							function (s){
								$rootScope.unverifiedSSID = s.replace(/"/g,'');
								if ($rootScope.setupPump.name.length > 0 && $rootScope.setupPump.name === $rootScope.unverifiedSSID) {
									keepGoing = true;
								}
							}, {});
						}, 2000*$rootScope.me.setuptimemultiplier);  // TIMER

						$timeout(function(){

							if (keepGoing !== true) { //Current SSID != Pump SSID
								$rootScope.$apply(function() {
									$rootScope.targetSSID = $rootScope.setupPump.name;
									//$rootScope.togglePopup('popupSetupCannotConnect', 45);
									if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
										alert('**** $scope.performActionFailure(06) ****');
									$scope.enablePumpWifiFailure();
								});
								return;
							};
							$scope.bSuccess = false;
							var params = {};
							// Trying to get IPAddress. Plugin API may take a while to return!!!
							addressimpl.request("getIPAddress", JSON.stringify(params), 
								function(ip) {
								}, function() {
							});

							var socket = new Socket();
							var cmd = "";
							var closeSocket = false;
							socket.onData = function(data) {
								var dataString = new TextDecoder("utf-8").decode(data);
								dataString = dataString.replace('\r\n','');
								if (dataString.includes(cmd)) {
									switch(cmd) {
										case "Connect":
											var substr = dataString.substring(cmd.length+1).split(":", 2); // MAC:id
				    					$rootScope.$apply(function() {
												$rootScope.setupPump.macaddress = substr[0];
												$rootScope.setupPump.idAsNumber = parseInt(substr[1]);
												$rootScope.setupPump.id =$rootScope.convertPumpIdentity(substr[1]);
				    					});
											closeSocket = true;
											$scope.bSuccess = true;
									    $scope.performActionSuccess();
										break;
										default:
											closeSocket = true;
											if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
												alert('**** $scope.performActionFailure(07) ****');
											$scope.performActionFailure();
										break;
									}
								}

								if (closeSocket) {
									$timeout(function(){
										socket.close();
									}, 200*$rootScope.me.setuptimemultiplier);
								}
							};

							socket.onError = function(errorMessage) {
								if (!closeSocket) {
									if (!$scope.bSuccess) {
										if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
											alert('**** $scope.performActionFailure(08) ****');		
										$scope.performActionFailure();
									}
								}
							};

							socket.onClose = function(hasError) {
								//if (hasError) alert('Connection Closed: ' + hasError);
							};

								if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
alert('Trying to connect to '+PumpApp.Constants.PumpApIpAddress+'::'+PumpApp.Constants.PumpApPortNo);

							socket.open( PumpApp.Constants.PumpApIpAddress, PumpApp.Constants.PumpApPortNo,
								function() {
									if ($rootScope.openSocketTimeout != null) {
										clearTimeout($rootScope.openSocketTimeout);
										$rootScope.openSocketTimeout = null;
									}
									cmd = "Connect";
									socket.write(PumpApp.Utils.formatUint8Array
										("connect " + $rootScope.me.deviceuuid + "\r\n"));
								},
								function(errorMessage) {
									if ($rootScope.openSocketTimeout != null) {
										clearTimeout($rootScope.openSocketTimeout);
										$rootScope.openSocketTimeout = null;
										if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
											alert('**** $scope.performActionFailure(09) ****');
										$scope.performActionFailure();
									} 
								}
							);

							$rootScope.openSocketTimeout = setTimeout(function(){
								if ($rootScope.openSocketTimeout != null) {
									socket.close();
									$rootScope.openSocketTimeout = null;
									if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
										alert('**** $scope.performActionFailure(10) ****');
									$scope.performActionFailure();
								}
							}, 1000*$rootScope.me.setuptimemultiplier);

						}, 5000*$rootScope.me.setuptimemultiplier);  // TIMER
				
			};

			$scope.retrieveSsidFromPumpUseLocalSocket = function() {
				$scope.netWorks = [];
				document.getElementById('scanButton').style.display = 'none';
				document.getElementById('scanSpinner').style.display = 'unset';
				var socket = new Socket();
				var cmd = "";
				var ssidList = "";
				var closeSocket = false;
				socket.onData = function(data) {
					var dataString = new TextDecoder("utf-8").decode(data);
					dataString = dataString.replace('\r\n','');
					if (dataString.includes(cmd)) {
				    switch(cmd) {
							case "Connect":
								cmd = "ssid";
								socket.write(PumpApp.Utils.formatUint8Array(cmd + "\r\n"));
						    break;
							default:
  		    			closeSocket = true;
								if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
									alert('**** $scope.performActionFailure(N01) ****');
				  			$scope.performActionFailure();
						    break;
				    }
					} else {  // ssid response
						var splitSsid = dataString.split(/\r?\n/g);
						for(var i = 0; i < splitSsid.length; i ++){
							if (!splitSsid[i].includes('#####')) {
								if (splitSsid[i].length > 0) {
									$scope.netWorks.push({ SSID: splitSsid[i] });
								}
							}
						}
						if (dataString.includes('#####')) {
							if ($rootScope.retrieveSocketTimeout != null) {
								clearTimeout($rootScope.retrieveSocketTimeout);
								$rootScope.retrieveSocketTimeout = null;
							}
	  		    	closeSocket = true;
						}
					}
					if (closeSocket) {
						$timeout(function(){
							socket.close();
						}, 200*$rootScope.me.setuptimemultiplier);
						document.getElementById('scanButton').style.display = 'unset';
						document.getElementById('scanSpinner').style.display = 'none';
					}
				};

				socket.onError = function(errorMessage) {
					if (!closeSocket) {
					  //alert('Connection Error: ' + errorMessage);
						if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
							alert('**** $scope.performActionFailure(N02) ****'+errorMessage);
					  $scope.performActionFailure();
					}
				};
				socket.onClose = function(hasError) {
					//if (hasError) alert('Connection Closed: ' + hasError);
				};

				socket.open( PumpApp.Constants.PumpApIpAddress, PumpApp.Constants.PumpApPortNo,
				  function() {
						cmd = "Connect";
						socket.write(PumpApp.Utils.formatUint8Array
							("connect " + $rootScope.me.deviceuuid + "\r\n"));
				  },
				  function(errorMessage) {
						if ($rootScope.retrieveSocketTimeout != null) {
							clearTimeout($rootScope.retrieveSocketTimeout);
							$rootScope.retrieveSocketTimeout = null;
							if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
								alert('**** $scope.performActionFailure(N03) ****');
							$scope.performActionFailure();
						}
				  }
				);

				$rootScope.retrieveSocketTimeout = setTimeout(function(){
					if ($rootScope.retrieveSocketTimeout != null) {
						socket.close();
						$rootScope.retrieveSocketTimeout = null;
						if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
							alert('**** $scope.performActionFailure(N04) ****');
						$scope.performActionFailure();
					}
				}, 10000*$rootScope.me.setuptimemultiplier);
			}; // End of retrieveSsidFromPumpUseLocalSocket()

			
			$scope.setPumpPropertiesUseLocalSocket = function(props) {
				var socket = new Socket();
				var cmd = "";
				var closeSocket = false;
				socket.onData = function(data) {
					var dataString = new TextDecoder("utf-8").decode(data);
					dataString = dataString.replace('\r\n','');
					if (dataString.includes(cmd)) {
					  switch(cmd) {
							case "Connect":
								cmd = "ssid";
								socket.write(PumpApp.Utils.formatUint8Array(cmd + " " + $rootScope.me.wifiname + "\r\n"));
							  break;
							case "ssid":
							  if ($rootScope.me.wifipass.length) {
									cmd = "pwd";
									socket.write(PumpApp.Utils.formatUint8Array
										(cmd + " " + $rootScope.me.wifipass + "\r\n"));
							  } else {
						    	closeSocket = true;
							  }
							  break;
							case "pwd":
							  closeSocket = true;
							  $scope.performActionSuccess();
							  break;
							default:
						    closeSocket = true;
								if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
									alert('**** $scope.performActionFailure(17) ****');
								$scope.performActionFailure();
							  break;
					  }
					}
					if (closeSocket) {
						$timeout(function(){
							socket.close();
						}, 200*$rootScope.me.setuptimemultiplier);
					}
				};

				socket.onError = function(errorMessage) {
					if (!closeSocket) {
						if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
							alert('**** $scope.performActionFailure(18) ****');
						$scope.performActionFailure();
					}
				};
				socket.onClose = function(hasError) {
					//if (hasError) alert('Connection Closed: ' + hasError);
				};

				socket.open( PumpApp.Constants.PumpApIpAddress, PumpApp.Constants.PumpApPortNo,
					function() {
						if ($rootScope.openSocketTimeout2 != null) {
							clearTimeout($rootScope.openSocketTimeout2);
							$rootScope.openSocketTimeout2 = null;
						}
						cmd = "Connect";
						socket.write(PumpApp.Utils.formatUint8Array
							("connect " + $rootScope.me.deviceuuid + "\r\n"));
					},
					function(errorMessage) {
						if ($rootScope.openSocketTimeout2 != null) {
							clearTimeout($rootScope.openSocketTimeout2);
							$rootScope.openSocketTimeout2 = null;
							if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
								alert('**** $scope.performActionFailure(19) ****');
							$scope.performActionFailure();
						}
					}
				);

				$rootScope.openSocketTimeout2 = setTimeout(function(){
					if ($rootScope.openSocketTimeout2 != null) {
						socket.close();
						$rootScope.openSocketTimeout2 = null;
						if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
							alert('**** $scope.performActionFailure(20) ****');
						$scope.performActionFailure();
					}
				}, 2000*$rootScope.me.setuptimemultiplier);
			} ;

			$scope.softResetUseLocalSocket = function() {
				$scope.messageStepWifi	= 'Restarting pump ...';
				var socket = new Socket();
				var cmd = "";
				var closeSocket = false;
				socket.onData = function(data) {
					var dataString = new TextDecoder("utf-8").decode(data);
					dataString = dataString.replace('\r\n','');
					if (dataString.includes(cmd)) {
						switch(cmd) {
							case "Connect":
								cmd = "soft reset 65529\r\n";
								socket.write(PumpApp.Utils.formatUint8Array(cmd));
								break;
							deafult:
								closeSocket = true;
								break;
						}
					}
					if (closeSocket) {
						$timeout(function(){
							socket.close();
							$scope.resetCommandSuccess();  // closeSocket with RESPONSE
						}, 200*$rootScope.me.setuptimemultiplier);
					}
				};

				socket.onError = function(errorMessage) {
					if (!closeSocket) {
					}
				};
				socket.onClose = function(hasError) {
					if (!closeSocket) {
						$scope.resetCommandSuccess();  // closeSocket with NO RESPONSE
						closeSocket = true;
					}
				};

				socket.open( PumpApp.Constants.PumpApIpAddress, PumpApp.Constants.PumpApPortNo,
				function() {

				if ($rootScope.openSocketTimeout3 != null) {
					clearTimeout($rootScope.openSocketTimeout3);
					$rootScope.openSocketTimeout3 = null;
				}
				cmd = "Connect";
				socket.write(PumpApp.Utils.formatUint8Array
					("connect " + $rootScope.me.deviceuuid + "\r\n"));
				$timeout(function(){
					if (!closeSocket) {  // TIMEOUT !closeSocket with NO RESPONSE
						socket.close();
						$scope.resetCommandSuccess();
						closeSocket = true;
					}
				}, 5000*$rootScope.me.setuptimemultiplier);
				},
				function(errorMessage) {
					if ($rootScope.openSocketTimeout3 != null) {
						clearTimeout($rootScope.openSocketTimeout3);
						$rootScope.openSocketTimeout3 = null;
						$scope.enablePumpWifiFailure();
					}
				}
				);
				$rootScope.openSocketTimeout3 = setTimeout(function() {
					if ($rootScope.openSocketTimeout3 != null) {
						socket.close();
						$rootScope.openSocketTimeout3 = null;
						if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
							alert('**** $scope.performActionFailure(21) ****');
						$scope.enablePumpWifiFailure();
					}
				}, 2000*$rootScope.me.setuptimemultiplier);
			};  // End of softResetUseLocalSocket()


/////////20180930 New Added///////////////////

			$scope.enablePhoneNotificationsUseNetwork = function() {
				if ($rootScope.setupPump.macaddress == null || $rootScope.setupPump.macaddress == undefined || $rootScope.setupPump.macaddress.length === 0) {
					$rootScope.showError('Please enter pump MAC address first');
				} else {
					if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
						alert('enablePhoneNotificationsUseNetwork::setupPump.macaddress==='+$rootScope.setupPump.macaddress);
						$scope.sendAddPhone(3);
				}
			}; // end of $scope.enablePhoneNotificationsUseNetwork

			$scope.sendAddPhone = function(retry) {
				$scope.messageStepPhone	= 'Adding phone...'+retry;
				if (retry > 0) {
					retry--;
					var loginData = PumpApp.Request.Builder.Login();
					$rootScope.makeRequest(loginData).then(
						function success(response){
							$rootScope.setupPump.connectiondata = response.data[1];
							var getData = PumpApp.Request.Builder.AddPhoneNoGps(response.data[1],
								$rootScope.me.deviceuuid, "0x"+$rootScope.setupPump.macaddress+"0000", 
								$rootScope.me.zipcode, "0x"+PumpApp.Utils.localDateTimeString());
							if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
								alert('sendAddPhone::getData='+getData);
					  		$rootScope.makeRequest(getData).then(
					  			function(response) {
					  				$rootScope.isCloudOnline = true;
										$scope.messageStepPhone	= '';
				  					if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
					  					alert('sendAddPhone:RESPONSE:'+response.data[0]+', '+response.data[1]+', '+response.data[2]);
					  				if (response.data[0].includes('error')) { // error
											if (response.data[0].includes('TIMOEOUT')) {
														$scope.performActionFailure();
											} else {
												var errcode = response.data[1];
												if (errcode.length == 4) errcode = response.data[1].substring(2, 4);
												switch(errcode) {
													case '01':
													case '1':
														$scope.setStatusIcon('none', 'progressSpinner');
														document.getElementById('actionButton').disabled = false;
																			$rootScope.togglePopup('pumplistFull', 35);
														break;
													default:
														$rootScope.showError('Cannot add phone:'+response.data[1]+':'+response.data[2]);
														//$scope.enablePumpWifiFailure();
														$scope.performActionFailure();
														break;
												}
											}
					  				} else { // success
					  					if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
					  						alert('sendAddPhone:SUCCESS:'+response.data[0]+', '+response.data[1]+', '+response.data[2]+', '+response.data[3]+', '+response.data[4]);
											var ipaddr = parseInt(response.data[3].substring(2, 4), 16) + '.' +
																		parseInt(response.data[3].substring(4, 6), 16) + '.' +
																		parseInt(response.data[3].substring(6, 8), 16) + '.' +
																		parseInt(response.data[3].substring(8, 10), 16);
					  					if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
					  						alert('addOrUpdPumpList('+response.data[1]+', '+ipaddr+')');
											$scope.addOrUpdPumpList(response.data[1], ipaddr, response.data[4]);
					  				}
					  			},
					  			function error(e){
					  				if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
					  					alert('ERROR:sendAddPhone:JSON');
					  				$rootScope.isCloudOnline = false;
					  				$timeout(function(){
					  						$scope.sendAddPhone(retry);
					  				}, 1500*$rootScope.me.setuptimemultiplier);
					  			}
					  		);
						},
						function error(e){
							if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
								alert('ERROR:sendAddPhone:LOGIN');
							$rootScope.isCloudOnline = false;
							$timeout(function(){
									$scope.sendAddPhone(retry);
							}, 1500*$rootScope.me.setuptimemultiplier);
						}
					);
				} else {  // out of retry
					//failed
					$scope.performActionFailure();
					//$scope.enablePumpWifiFailure();
				}
			}; // end of $scope.sendAddPhone

			$scope.addOrUpdPumpList = function(savedId, ipAddress, desc) {
					$scope.messageStepPhone	= 'Adding pump...';
					$scope.progressBarCurrent = 0;

					$rootScope.setupPump.id = savedId;
					$rootScope.setupPump.wifiipaddress = ipAddress;
					$rootScope.setupPump.wifiname = $rootScope.me.wifiname;
					$rootScope.setupPump.description = desc;
					$rootScope.setupPump.lot = 'N';  // use lot for Paid or Non-Paid for now
										 // unless it will be included in the APP_PHONE response 

					if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO) {
						alert('$rootScope.setupPump.wifiname=='+$rootScope.setupPump.wifiname);
						alert('$rootScope.setupPump.wifiipaddress=='+$rootScope.setupPump.wifiipaddress);
					}
					var found = false;
					var foundIdx = -1;
					var j = 0;
					var pumpsCount = 0;
					if (!angular.isDefined($rootScope.pumps.length)) {
					} else {
						pumpsCount = $rootScope.pumps.length;
					}

					if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
						alert('Adding pump...pumpsCount='+pumpsCount);

					for(j=0; (!found) &&
							(j<pumpsCount); j++) {
						if ($rootScope.setupPump.macaddress === $rootScope.pumps[j].macaddress) {
							if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO) {
								alert('setupPump.macaddress ['+$rootScope.setupPump.macaddress+'] === $rootScope.pumps['+j+'].macaddress');
								alert('setupPump.description='+$rootScope.setupPump.description);
								alert('setupPump.wifiname='+$rootScope.setupPump.wifiname);
								alert('setupPump.wifiipaddress='+$rootScope.setupPump.wifiipaddress);
								alert('setupPump.name='+$rootScope.setupPump.name);
							}
							foundIdx = j;
							found = true;
							if ($rootScope.setupPump.description !== undefined &&
							    $rootScope.setupPump.description.length !== 0) {
								$rootScope.pumps[j].serialending = $rootScope.setupPump.serialending;
								$rootScope.pumps[j].name = $rootScope.setupPump.name;
								$rootScope.pumps[j].description = $rootScope.setupPump.description;
								$rootScope.pumps[j].id = $rootScope.setupPump.id;
								$rootScope.pumps[j].wifiipaddress =	$rootScope.setupPump.wifiipaddress;
								$rootScope.pumps[j].wifiname = $rootScope.setupPump.wifiname;
								$rootScope.pumps[j].lot = $rootScope.setupPump.lot;
							}
						}
					}

					if (found) { 
						$rootScope.setupPump = PumpApp.PumpUtil.create(); //new setupPump for next Setup
					} else {
						foundIdx = pumpsCount;
						if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
							alert('setupPump.macaddress ['+$rootScope.setupPump.macaddress+'], name ['+$rootScope.setupPump.name+'] description ['+$rootScope.setupPump.description+'] id ['+$rootScope.setupPump.id+'] ipaddr ['+$rootScope.setupPump.wifiipaddress+']');
						$rootScope.savePump($rootScope.setupPump);
					}

					if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
						alert('Adding phone...found='+found+', foundIdx='+foundIdx);

					$rootScope.selectedPumpIdx = foundIdx;
					if ($rootScope.pumps[$rootScope.selectedPumpIdx].description === undefined ||
							$rootScope.pumps[$rootScope.selectedPumpIdx].description.length === 0) {
						//$scope.retrievePumpSerialNo($rootScope.selectedPumpIdx);
						$timeout(function(){
							if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
								alert('retrievePumpDesc for pump '+$rootScope.pumps[pumpIdx].id);
							$scope.retrievePumpDesc($rootScope.selectedPumpIdx);
						}, 500*$rootScope.me.setuptimemultiplier);
					} else {
						// No need to set description now, it will be done in step 1 aloing with WiFi info
						//if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
						//	alert('setPumpDesc for pump '+$rootScope.pumps[pumpIdx].id);
					// Use property 'Name' to set pump description per email from di xu
						//$scope.setPumpData($rootScope.pumps[$rootScope.selectedPumpIdx].id, 'Name', $rootScope.pumps[$rootScope.selectedPumpIdx].description);
					}

					$scope.messageStepPhone	= '';
					$scope.setStatusIcon('fa-check', 'progressSpinner');

					if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
						alert('Adding phone...DONE, move to next step');

					$timeout(function(){
						$scope.goToSetupPage(34);
					}, 1000*$rootScope.me.setuptimemultiplier);
			}; // end of $scope.addOrUpdPumpList

/////////20180930 New Added///////////////////



			$scope.enablePhoneNotificationsUseLocalSocket = function() {
				//if ($rootScope.setupPump.name.length === 0) {
				//	$scope.enablePhoneNotificationsWithSocket(0, 255)
				//} else 
				if ($rootScope.setupPump.macaddress === 'abcdefabcdef')
					$rootScope.setupPump.macaddress = '';
				if ($rootScope.setupPump.macaddress == null || $rootScope.setupPump.macaddress == undefined || $rootScope.setupPump.macaddress.length === 0) {
					$scope.enablePhoneNotificationsWithSocket(0, 255);
				} else {
					$scope.messageStepPhone	= 'Getting IpAddress...';
					var loginData = PumpApp.Request.Builder.Login();
					$rootScope.makeRequest(loginData).then(
						function success(response){
							var getData = PumpApp.Request.Builder.SearchPumpIp(
								response.data[1], "0x"+$rootScope.setupPump.macaddress+"0000");
							$rootScope.makeRequest(getData).then(
								function(response) {
									if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
										alert('response.data[1]='+response.data[1]);
									if (response.data[1].length == 1) {
										var ipStr = response.data[1][0][0];			
										if (ipStr === '0xffffffff') {	
											if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
												alert('SearchPumpIp:0xffffffff error');
											$rootScope.showError('Invalid MAC address: '
																+$rootScope.setupPump.macaddress);
											$scope.enablePumpWifiFailure();
											//$scope.enablePhoneNotificationsWithSocket(0, 255);
										} else {
											if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
												alert('ipStr==='+ipStr);
											var last = parseInt(ipStr.substring(8, 10), 16);
											$scope.enablePhoneNotificationsWithSocket(last, last);
										}
									} else {
										$rootScope.showError('Invalid MAC address: '+$rootScope.setupPump.macaddress);
										$scope.enablePumpWifiFailure();
										//$scope.enablePhoneNotificationsWithSocket(0, 255);
									}
								},
								function error(e){
									if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
										alert('SearchPumpIp:HTTP error:'+e.status);
									$rootScope.showError('Server HTTP error: '+e.status);
									$scope.enablePumpWifiFailure();
									//$scope.enablePhoneNotificationsWithSocket(0, 255);
									//debugger;
								}
							);
						},
						function error(e){
							if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
								alert('loginData:SearchPumpIp:HTTP error:'+e.status);
							$rootScope.showError('Server HTTP error: '+e.status);
							$scope.enablePumpWifiFailure();
							//$scope.enablePhoneNotificationsWithSocket(0, 255);
							//debugger;
						}
					);
				}
			}; // End of enablePhoneNotificationsUseLocalSocket()


////ProgressBar
			$scope.progressBarCurrent = 0;
			$scope.progressBarTotal = 256;
			$scope.updateProgressBar = function(newCurrent) {
				$scope.progressBarCurrent = newCurrent;
			};
			$scope.incrementProgressBar = function() {
				$scope.$apply(function() {
					$scope.progressBarCurrent++;
				});
			};
			$scope.watchprogressBarCurrent = $scope.$watch('progressBarCurrent', function (newValue, oldValue, scope) {
				if ($stateParams.stepId!=='32') {return;}
				if (oldValue===newValue) {return;}
				if ($scope.progressBarCurrent >= $scope.progressBarTotal) {
					//$scope.watchprogressBarCurrent();
				}
				else {
					$('.enablePhoneProgressBarFill').animate({
						width: ($scope.progressBarCurrent/$scope.progressBarTotal*100)+'%'
						}, 100, function() {
					});
				}
			}, true);
////ProgressBar

			$scope.searchPumpContinue = function() {
				$scope.messageStepPhone	= 'Locking pump...';
				var socket = new Socket();
				var cmd = "INITIAL";
				var dataString = "INITIAL";
				var stopPingTimer = function() {
					if ($scope.pingTimer != null) {
						clearTimeout($scope.pingTimer);
						$scope.pingTimer = null;
					}
				};  // stopPingTimer

				socket.onData = function(data) {
					stopPingTimer();
					dataString = new TextDecoder("utf-8").decode(data);
					if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
						alert('searchPumpContinue, response='+dataString);
					dataString = dataString.replace('\r\n','');
					if (dataString.includes(cmd)) {
						var substr = dataString.substring(cmd.length+1).split(":", 2);
						if (substr.length === 2) { // MAC & ID

								$rootScope.setupPump.macaddress = substr[0];
								$rootScope.setupPump.idAsNumber = parseInt(substr[1]);
								$rootScope.setupPump.id = 
											$rootScope.convertPumpIdentity(substr[1]);
								if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
									alert('SEND==> operation mode lock');
								socket.write(PumpApp.Utils.formatUint8Array
									("operation mode lock\r\n"));
						}
					}

					setTimeout(function(){
						socket.close();
					},250*$rootScope.me.setuptimemultiplier);
				};// socket.onData

				socket.onError = function(errorMessage) {
					stopPingTimer();
				};// socket.onError

				socket.onClose = function(hasError) {
					stopPingTimer();
					if ($scope.enableSuccess === true) {
						$scope.enableNotificationsSuccessContinue();
					}
				}; // socket.onClose

				socket.open($scope.ipAddress, PumpApp.Constants.PumpApPortNo,
					function() {
						if ($rootScope.openSocketTimeout != null) {
							clearTimeout($rootScope.openSocketTimeout);
							$rootScope.openSocketTimeout = null;
						}

						$timeout(function(){
							if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
								alert('searchPumpContinue, send==> connect ' + $rootScope.me.deviceuuid);
							cmd = "Connect";
							socket.write(PumpApp.Utils.formatUint8Array
								("connect " + $rootScope.me.deviceuuid + "\r\n"));
						}, 500*$rootScope.me.setuptimemultiplier);

						$scope.pingTimer = setTimeout(function(){
							socket.close();
							$scope.pingTimer = null;
							if (!$scope.useProgressBar) {
								if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
									alert('**** $scope.performActionFailure(27.5) ****\nlast cmd sent::'+cmd+'\nlast rsp rcvd::'+dataString);
								$scope.$apply(function() {
									$scope.progressBarCurrent = 0;
								});
								$scope.performActionFailure();
							}
						}, 10000*$rootScope.me.setuptimemultiplier);

					},
					function(errorMessage) {
						$scope.locked = false;
						if ($rootScope.openSocketTimeout != null) {
							clearTimeout($rootScope.openSocketTimeout);
							$rootScope.openSocketTimeout = null;
							if (!$scope.useProgressBar) {
								if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
									alert('**** $scope.performActionFailure(25) ****');
								$scope.$apply(function() {
									$scope.progressBarCurrent = 0;
								});
								$scope.performActionFailure();
							}
						}
					}
				);  // socket.open

				$rootScope.openSocketTimeout = setTimeout(function(){
					if ($rootScope.openSocketTimeout != null) {
						socket.close();
						$rootScope.openSocketTimeout = null;
						if (!$scope.useProgressBar) {
							if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
								alert('**** $scope.performActionFailure(28) ****');
							$scope.$apply(function() {
								$scope.progressBarCurrent = 0;
							});
							$scope.performActionFailure();
						}
					}
				}, 3000*$rootScope.me.setuptimemultiplier);
			};

			$scope.enablePhoneNotificationsPrecheck = function() {
				$rootScope.unverifiedSSID = '';
				if (true) return;

				DeviceUtility.getCurrentSSID(
				function ssidHandler(s){
					$rootScope.unverifiedSSID = s.replace(/"/g,'');
					if ($rootScope.me.wifiname.length > 0 && $rootScope.me.wifiname !== $rootScope.unverifiedSSID) { // reconnect to HOME wifi again
						$rootScope.unverifiedSSID = '';
						if (PumpApp.Utils.isAndroid()) { //Android
							DeviceUtility.connectNetwork
							($rootScope.setupPump.name, {}, {});
						}
						else if (PumpApp.Utils.isIPhone()) { //iOS
							DeviceUtility.iOSConnectNetwork($rootScope.setupPump.name, '', {}, {});
						}
						if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
							alert('**** getCurrentSSID wifiname Mismatched, reConnect ****');
					} else {
						//if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
						//	alert('$rootScope.unverifiedSSID ='+$rootScope.unverifiedSSID);
					}
				}, //ssidHandler
				function fail(){
						$rootScope.unverifiedSSID = '';
						if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
							alert('**** getCurrentSSID FAILED ****');
				});  // getCurrentSSID
			}; // End of enablePhoneNotificationsPrecheck

			$scope.enablePhoneNotificationsWithSocket = function(begin, end) {
				$scope.progressBarTotal = end-begin+1;  // 256 later
				$scope.messageStepPhone	= 'Searching pump...';

				DeviceUtility.getCurrentSSID(
				function ssidHandler(s){

					$rootScope.unverifiedSSID = s.replace(/"/g,'');
					if ($rootScope.me.wifiname.length > 0 && $rootScope.me.wifiname !== $rootScope.unverifiedSSID) {
						$rootScope.$apply(function() {
							$rootScope.targetSSID = $rootScope.me.wifiname;
							//$rootScope.togglePopup('popupSetupCannotConnect', 45);
						});
						if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
							alert('**** $scope.performActionFailure(23) ****');
						$scope.performActionFailure();
					} else { // same wifiname
				    if ($rootScope.me.ipaddress == null || $rootScope.me.ipaddress == undefined || $rootScope.me.ipaddress.length === 0) {
							alert('Cannot continue - NO IP address');
			    	} else { // has ipaddress
							var addr = $rootScope.me.ipaddress.split(".", 4);
							var subnet = addr[0] + '.' + addr[1] + '.' + addr[2];
							var fourthDigit = parseInt(addr[3]);

							var startDigit = begin-1;
							var lastDigit = end+1;
							if (begin === 0 && end === 255) {
								startDigit = (fourthDigit >= 100) ? 99 : 0;
								lastDigit = startDigit + 256;
								$scope.useProgressBar = true;
							} else {
								$scope.useProgressBar = false;
							}

							$scope.locked = false;
							$scope.enableSuccess = false;
							$scope.searchTimer = null;

							function searchPump() {
								if ($scope.abortSearchPump) return;

								if ($scope.locked != true) {
									startDigit++;
									if ($scope.useProgressBar) {
										$scope.incrementProgressBar();
									}

									if (startDigit<lastDigit) {
										var modulus = startDigit % 256;
								  	if ((modulus == fourthDigit) || (modulus == 255) 
											|| (modulus == 254)  || (modulus == 0)) {
								  	} else {
											$scope.locked = true;
											var socket = new Socket();
											var cmd = "INITIAL";
											var dataString = "INITIAL";
											var stopPingTimer = function() {
												if ($scope.pingTimer != null) {
													clearTimeout($scope.pingTimer);
													$scope.pingTimer = null;
												}
											};  // stopPingTimer

											socket.onData = function(data) {
												stopPingTimer();
												dataString = new TextDecoder("utf-8").decode(data);
												if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
alert('searchPump, dataString== ' + dataString);
												dataString = dataString.replace('\r\n','');
												if (dataString.includes(cmd)) {
													var substr = dataString.substring(cmd.length+1).split(":", 2);
												if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
alert('searchPump, substr.length = ' + substr.length + ', setupPump.macaddress = '+$rootScope.setupPump.macaddress);
													if (substr.length === 2) { // MAC & ID
														if ($rootScope.setupPump.macaddress == null 
														|| $rootScope.setupPump.macaddress == undefined
														|| $rootScope.setupPump.macaddress.length === 0) {
															var found = false;
															var j = 0;
															var pumpsCount = 0;
															if (!angular.isDefined($rootScope.pumps.length)) {
															} else {
																pumpsCount = $rootScope.pumps.length;
															}
															for(j=0; (!found) && (j<pumpsCount); j++) {
																if (substr[0] === $rootScope.pumps[j].macaddress) {
																	found = true;
																}
															}
															if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
																alert('Got response from ['+$scope.ipAddress+'], already configured='+found);
															if (!found) { 
																$scope.enableSuccess = true;
															} 
														} else if (dataString.includes($rootScope.setupPump.macaddress)) {
															$scope.enableSuccess=true;
														}

														if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
															alert('$scope.enableSuccess='+$scope.enableSuccess);
														if ($scope.enableSuccess === true) {
															$rootScope.setupPump.macaddress = substr[0];
															$rootScope.setupPump.idAsNumber = parseInt(substr[1]);
															$rootScope.setupPump.id = 
																		$rootScope.convertPumpIdentity(substr[1]);
		
															startDigit = lastDigit; // FORCE OUT
															if ($scope.searchTimer != null) {
																clearInterval($scope.searchTimer);
																$scope.searchTimer = null;
															}
														}
													}
												}

												setTimeout(function(){
												if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
alert('socket.close()');
													socket.close();
													$scope.locked = false;
												},200*$rootScope.me.setuptimemultiplier);
											};// socket.onData

											socket.onError = function(errorMessage) {
												stopPingTimer();
												$scope.locked = false;
											};// socket.onError

											socket.onClose = function(hasError) {
												stopPingTimer();
												$scope.locked = false;
												if ($scope.enableSuccess === true) {
													if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
alert('socket.onClose() && enableSuccess === true ==> enableNotificationsSuccess()');
													$scope.enableNotificationsSuccess();
												} else {
														$scope.performActionFailure();
												}
											}; // socket.onClose

											$scope.ipAddress = subnet+'.'+modulus.toString();
											socket.open($scope.ipAddress, PumpApp.Constants.PumpApPortNo,
												function() {
													if ($rootScope.openSocketTimeout != null) {
														clearTimeout($rootScope.openSocketTimeout);
														$rootScope.openSocketTimeout = null;
													}

													$timeout(function(){
														if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
															alert('searchPump, send==> connect ' + $rootScope.me.deviceuuid);
														cmd = "Connect";
														socket.write(PumpApp.Utils.formatUint8Array
															("connect " + $rootScope.me.deviceuuid + "\r\n"));
													}, 500*$rootScope.me.setuptimemultiplier);

													$scope.pingTimer = setTimeout(function(){
														socket.close();
														$scope.locked = false;
														$scope.pingTimer = null;
														if (!$scope.useProgressBar) {
															if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
																alert('**** $scope.performActionFailure(24.5) ****\nlast cmd sent::'+cmd+'\nlast rsp rcvd::'+dataString);
															$scope.$apply(function() {
																$scope.progressBarCurrent = 0;
															});
															$scope.performActionFailure();
														}
													}, 10000*$rootScope.me.setuptimemultiplier);

												},
												function(errorMessage) {
													$scope.locked = false;
													if ($rootScope.openSocketTimeout != null) {
														clearTimeout($rootScope.openSocketTimeout);
														$rootScope.openSocketTimeout = null;
														if (!$scope.useProgressBar) {
															if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
																alert('**** $scope.performActionFailure(25) ****');
															$scope.$apply(function() {
																$scope.progressBarCurrent = 0;
															});
															$scope.performActionFailure();
														}
													}
												}
											);  // socket.open

											$rootScope.openSocketTimeout = setTimeout(function(){
												if ($rootScope.openSocketTimeout != null) {
													socket.close();
													$scope.locked = false;
													$rootScope.openSocketTimeout = null;
													if (!$scope.useProgressBar) {
														if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
															alert('**** $scope.performActionFailure(26) ****');
														$scope.$apply(function() {
															$scope.progressBarCurrent = 0;
														});
														$scope.performActionFailure();
													}
												}
											}, 3000*$rootScope.me.setuptimemultiplier);

										} // modulus check
									} else { // > lastDigit
										if ($scope.searchTimer != null) clearInterval($scope.searchTimer);
										$scope.searchTimer = null;
										if ($scope.enableSuccess === true) {
alert('>lastDigit && enableSuccess === true ==> enableNotificationsSuccess()');
											$scope.enableNotificationsSuccess();
										} else {
											if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
												alert('**** $scope.performActionFailure(27) ****');
											$scope.$apply(function() {
												$scope.progressBarCurrent = 0;
											});
											$scope.performActionFailure();
										}
									}
								} 
							}
							searchPump();
							if ($scope.useProgressBar) {
								$scope.searchTimer = setInterval(searchPump, 
															500*$rootScope.me.setuptimemultiplier);
							}
				    }  // else // has ipaddress
					}  // else same wifiname
				}, //ssidHandler
				function fail(){
					$rootScope.togglePopup('popupVerifyWifiFail', 35);
				});  // getCurrentSSID
			}  // End of enablePhoneNotificationsWithSocket()



///////////////////////////////////////////////////////////////////////////////////////

//cordova.plugins.email.open({
//    to:      'mchen60047@gmail.com',
//    subject: 'Nexus6 FCM Token',
//    body:    $rootScope.me.fcmtoken
//});





	}]);
})();
