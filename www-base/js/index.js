/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
(function(){
	"use strict";
	
	angular.module('pumpApp', ['ui.router', 'ngTouch', 'LocalForageModule', 'ui.bootstrap', 'chart.js'])
	.directive('menuRepeatDirective', function() {
		return function(scope, element, attrs) {
			var itemHeight = $('.app').height() * 0.06;
			angular.element(element).css('height', itemHeight + 'px');
		};
	})
	.directive('onFinishRender', function ($timeout) {
		return {
			restrict: 'A',
			link: function (scope, element, attr) {
				if (scope.$last === true) {
					$timeout(function () {
						scope.$emit(attr.onFinishRender);
					});
				}
			}
		}
	})
	.run(['$rootScope', '$state', '$window', '$stateParams', '$timeout', '$http', '$localForage', '$interval',
		function($rootScope, $state, $window, $stateParams, $timeout, $http, $localForage, $interval) {	
			$rootScope.appVersionNo = '1.0.21';
			$rootScope.footerVisible = true;
			$rootScope.isRootBack = true;		
			$rootScope.clickCloudIconCallback = null;
			$rootScope.backPage = '';

			$rootScope.hasLocationPermission = false;
			$rootScope.hasInitialized = false;
			$rootScope.meStatus = 'NOT COMPLETED';
			$rootScope.alertPumpID = '';
			$rootScope.alertErrorCode = '';
			$rootScope.alertMsg = '';
			$rootScope.isMoreInfo = false;
			$rootScope.managePhoneList = false;
			$rootScope.isPumpAlert = false;
			$rootScope.isCloudOnline = false;
			$rootScope.inBarcodeScanner = false;

			$rootScope.ALERT_NONE  = 0;
			$rootScope.ALERT_ERROR = 1;
			$rootScope.ALERT_DEBUG = 2;
			$rootScope.ALERT_INFO  = 3;

			$rootScope.unverifiedSSID = '';

			$rootScope.checkLocationPermission = function(hasLocationPermission) {
				$rootScope.hasLocationPermission = hasLocationPermission;
				if ($rootScope.hasLocationPermission) {
					DeviceUtility.getCurrentSSID(
						function ssidHandler(s){
							$rootScope.unverifiedSSID = s.replace(/"/g,'');
							$rootScope.me.currentwifiname = $rootScope.unverifiedSSID;

							if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
								alert('Current WiFi Name = '+$rootScope.me.currentwifiname);

							if (!($rootScope.me.currentwifiname in $rootScope.homewifis)) {
								$rootScope.$apply(function () {
									$rootScope.togglePopup('popupVerifyWifi', 35);
								});
							}
							else {
								$rootScope.me.wifiname = $rootScope.me.currentwifiname;
								$rootScope.me.wifipass = $rootScope.homewifis[$rootScope.me.currentwifiname];
								$rootScope.me.wifipassexists = $rootScope.homewifis[$rootScope.me.currentwifiname + 'exists'];
							}
							if ($rootScope.page === 'me') {
								$rootScope.checkIsMeCompleted();
								$rootScope.toggleMenu(false);
								$rootScope.navigateToPage('me');
							}

							var params = {};
							addressimpl.request("getIPAddress", JSON.stringify(params), 
							    function(ip) {
								$rootScope.me.ipaddress = ip;
								if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
							    alert("ip address "+$rootScope.me.ipaddress + ", deviceID:"+$rootScope.me.deviceuuid + ", len:" + $rootScope.me.deviceuuid.length + ", wifiname:" + $rootScope.me.wifiname);
							    }, function() {
										if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
							    		alert("failed on get ip address");
							    });
						}, 
						function fail(){

							$rootScope.me.currentwifiname = '';
		          if (PumpApp.Utils.isAndroid()) {
								$rootScope.togglePopup('popupVerifyWifiFail', 35);
		          } else {
								$rootScope.togglePopup('popupVerifyWifiFailiOS', 35);
							}

						});
				} else {
					$rootScope.$apply(function () {
            if (PumpApp.Utils.isAndroid()) {
						  DeviceUtility.grantPermission($rootScope.checkWifiConnection); 
            }
						//$rootScope.togglePopup('getCurrentWifiSSID', 35);
					});
				}
			};

      if (PumpApp.Utils.isAndroid()) {
				var Permission = window.plugins.Permission;
			}

			$rootScope.reqCnt = 0;

			$rootScope.getPermissionStatus = function() {
		    if (PumpApp.Utils.isAndroid()) {
					var permissions = ['android.permission.ACCESS_WIFI_STATE', 'android.permission.CHANGE_WIFI_STATE', 'android.permission.ACCESS_COARSE_LOCATION'];
					Permission.has(permissions, function(results) {
							$rootScope.permissionList = [];
							if (!results['android.permission.ACCESS_WIFI_STATE']) {
									$rootScope.permissionList.push('android.permission.ACCESS_WIFI_STATE');
							}
							if (!results['android.permission.CHANGE_WIFI_STATE']) {
									$rootScope.permissionList.push('android.permission.CHANGE_WIFI_STATE');
							}
							if (!results['android.permission.ACCESS_COARSE_LOCATION']) {
									$rootScope.permissionList.push('android.permission.ACCESS_COARSE_LOCATION');
							}
							//alert('$rootScope.permissionList.length='+$rootScope.permissionList.length);
							var needed = 0;
							if ($rootScope.permissionList.length > 0) {
									Permission.request($rootScope.permissionList, function(results) {

									for(var i=0; i<$rootScope.permissionList.length; i++) {
											if (!results[$rootScope.permissionList[i]]) {
													needed ++;
											}
									}
									if (needed > 0) {
										//alert('Permission is not granted!!!');
										if ($rootScope.reqCnt < 2) {
											alert('Location permission needs to be granted in order for the mobile application to work properly');
											$timeout(function(){
												$rootScope.reqCnt++;
												$rootScope.getPermissionStatus();
											}, 1000);
										} else {
											alert('Location permission was not granted, the mobile application may not work properly');
										}
									} else {
										//alert('YES YES, Permission is granted!!!');
										$timeout(function(){
											$rootScope.getPermissionStatus();
										}, 2000);
									}

								}, function(ex){});
							} else {
								$rootScope.checkLocationPermission(true);
							}

					}, function(ex){} );
				}
			};


			$rootScope.checkWifiConnection = function() {
				$rootScope.ALERT_level = $rootScope.me.ALERT_level;
				if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
					alert('Current Alert Level == '+$rootScope.ALERT_level);
				if (PumpApp.Utils.isAndroid()) {
					$rootScope.getPermissionStatus();
					//DeviceUtility.getLocationPermissionStatus($rootScope.checkLocationPermission, {});
				}
        else if (PumpApp.Utils.isIPhone()) {
            cordova.plugins.diagnostic.isLocationEnabled($rootScope.checkLocationPermission, function(ex){});
        }
			};

			$rootScope.checkIsMeCompleted = function() {
//alert('in checkIsMeCompleted: $rootScope.page ='+$rootScope.page);
				$rootScope.me.done = $rootScope.isMeCompleteOrHomeWifiAndCloudOnline();
				if ($rootScope.isMeComplete()) {
					if ($rootScope.isMeCompleteOrHomeWifi()) {
						if ($rootScope.isCloudOnline == true) {
							$rootScope.meStatus = 'GO TO SETUP';
						} else {
							$rootScope.meStatus = 'CHECK CLOUD';
						}
					} else {
						$rootScope.meStatus = 'NOT IN HOME NETWORK';
					}	
				} else {
					$rootScope.meStatus = 'NOT COMPLETED';
				}
			};


			$rootScope.sendRegisterPhone = function(retry) {
				if (retry > 0) {
					retry--;
					var loginData = PumpApp.Request.Builder.Login();
					$rootScope.makeRequest(loginData).then(
						function success(response){
							$rootScope.setupPump.connectiondata = response.data[1];
							var getData = PumpApp.Request.Builder.RegisterPhone(response.data[1],
								$rootScope.me.deviceuuid, $rootScope.me.fcmtoken, $rootScope.me.name,
								$rootScope.me.platform, $rootScope.me.firstname, 
								$rootScope.me.lastname, $rootScope.me.email);
							if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
								alert('sendRegisterPhone::getData='+getData);
					  		$rootScope.makeRequest(getData).then(
					  			function(response) {
					  				if (response.data[0] === 'error') {
					  					if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
						  					alert('sendRegisterPhone::'+response.data[0]+', '+response.data[1]+', '+response.data[2]);
					  				} else {
						  				$rootScope.isCloudOnline = true;
					  					if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
					  						alert('sendRegisterPhone::'+response.data[0]+', '+response.data[1]);
											$rootScope.checkIsMeCompleted();
					  				}
					  			},
					  			function error(e){
					  				if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
					  					alert('ERROR: sendRegisterPhone');
					  				$rootScope.isCloudOnline = false;
					  				$timeout(function(){
					  						$scope.sendRegisterPhone(retry);
					  				}, 1500*$rootScope.me.setuptimemultiplier);
					  			}
					  		);
						},
						function error(e){
							if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
								alert('ERROR:sendRegisterPhone:LOGIN');
							$rootScope.isCloudOnline = false;
							$timeout(function(){
									$rootScope.sendRegisterPhone(retry);
							}, 1500*$rootScope.me.setuptimemultiplier);
						}
					);
				}
			}

			$rootScope.sendRegister = function() {
					var loginData = PumpApp.Request.Builder.Login();
					$rootScope.makeRequest(loginData).then(
						function success(response){
						var getData = PumpApp.Request.Builder.Register(response.data[1],
								$rootScope.me.deviceuuid, $rootScope.me.name, $rootScope.me.platform,
								$rootScope.me.fcmtoken);
								if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
									alert('sendRegister::getData='+getData);
							$rootScope.makeRequest(getData).then(
								function(response) {
									if (response.data[0] === 'error') {
										alert('sendRegister::'+response.data[0]+'\nresponse.data[1]=='+response.data[1]);
									} else {
										if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
											alert('sendRegister::'+response.data[0]+'\nresponse.data[1]=='+response.data[1]);
									}
								},
								function error(e){
									if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
										alert('ERROR1: sendRegister');
									//debugger;
								}
							);
						},
						function error(e){
							if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
								alert('ERROR2: sendRegister');
							//debugger;
						}
					);
			};
			
			$rootScope.onStart = function() {
				if (PumpApp.Utils.isPhone()) {
					$rootScope.push = PushNotification.init({
						"android": {
						"icon": "alert",
						"iconColor": "red"
						},
						"browser": {
						pushServiceURL: 'http://push.api.phonegap.com/v1/push'
						},
						"ios": {
							"alert": "true",
							"badge": "true",
							"sound": "true"
						},
						"windows": {}
					});

					$rootScope.push.on('registration', (data) => {
						if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
							alert('FCM registration: ' + data.registrationId);
						if (!($rootScope.me.fcmtoken === data.registrationId)) {
						    $rootScope.me.fcmtoken = data.registrationId;
								if ($rootScope.isMeComplete()) {
									if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
										alert('>>>$rootScope.sendRegisterPhone');
									$rootScope.sendRegisterPhone(3);
								} else {
									if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
										alert('FCM registration:ME not completed:' + data.registrationId);
								}
						}
					}); // end of push.on.registration

					$rootScope.push.on('notification', (data) => {
						var isItAlert = !(data.additionalData.errCode.length===4 && data.additionalData.errCode==='0x00');
						$rootScope.saveMessage(data.additionalData.pumpId, new PumpApp.Message({message:data.message,pumpIdentity:data.additionalData.pumpId,isAlert:isItAlert,errCode:data.additionalData.errCode}));
						$rootScope.showAlert(isItAlert, data.additionalData.pumpId,
																	data.additionalData.errCode, data.message);
						// then call finish to let the OS know we are done
						push.finish(() => {
							//console.log("processing of push data is finished");
						}, () => {
							//console.log("something went wrong with push.finish for ID =", data.additionalData.notId);
						}, data.additionalData.notId);
					});  // end of push.on.notification

				}
				
				if ($rootScope.isMeComplete()) {
//alert("Check sendRegisterPhone::"+$rootScope.me.fcmtoken.length);
					if ($rootScope.me.fcmtoken.length > 0) {
						$rootScope.sendRegisterPhone(3);
					}
				}

				$rootScope.checkWifiConnection();

				if (angular.isDefined($rootScope.pumps.length)) {
					//if (!$rootScope.isMeCompleteOrHomeWifi()) {
					if (!$rootScope.isMeComplete()) {
						$rootScope.navigateToPage('me');
					}
					else if ($rootScope.pumps.length > 0) {
						$rootScope.navigateToPage('pumps');
					}
					else {
						if ($rootScope.isCloudOnline == true) {
							$rootScope.navigateToPage('setup', {stepId:-2});
						} else {
							$rootScope.navigateToPage('me');						
						}
					}
				}
				else {
					$rootScope.navigateToPage('me');
				}
				
				$rootScope.hasInitialized = true;
				if (navigator.splashscreen)
				{
					navigator.splashscreen.hide();
				}
			};
			
			if (!PumpApp.Utils.useLocalDatabase()) {
////////////// Initialize JSON database HERE
////////////// Initialize JSON database END
			} else {
//////////////Local database initialization//////////////Replace if needed
				//Local database hydration
				//$localForage.clear();return; //clear all database data
				//homewifis - all changes to $rootScope.homewifis are persisted to database 
				$rootScope.homewifis = {};
				$localForage.bind($rootScope, { key: 'homewifis', defaultValue: {} }).then(function(data) {
					$rootScope.homewifis = data; //Do not delete this line
				});
			
				//Me information - all changes to $rootScope.me are persisted to database 
				$rootScope.me = new PumpApp.Me();
				$localForage.bind($rootScope, { key: 'me', defaultValue: {} }).then(function(data) {
					if (!angular.isDefined($rootScope.me.name) || !angular.isDefined(data.name)) {
						$rootScope.me = new PumpApp.Me();
							if (PumpApp.Utils.isAndroid()) {
								$rootScope.me.deviceuuid = device.uuid.replace(/-/g,'') + '0000000000000000';
							} else {
								$rootScope.me.deviceuuid = device.uuid.replace(/-/g,'');
							}
							$rootScope.me.platform = device.platform;
							$rootScope.me.model = device.model;
							$rootScope.me.requesturlip = PumpApp.Constants.RequestUrlIp;
					} else {
							if (!angular.isDefined($rootScope.me.requesturlip) 
								|| ($rootScope.me.requesturlip.length == 0)) {
								$rootScope.me.requesturlip = PumpApp.Constants.RequestUrlIp;
							}
					}
				});

				//Messages - all changes to $rootScope.messages are persisted to database 
				$rootScope.messages = {};
				$rootScope.currentMessages = null;
				$rootScope.messagesStoreByPumpProperty = 'id'; //group messages by something unique PumpApp.Pump (in models.js) Example: 'id' or 'serialno'
				$localForage.bind($rootScope, { key: 'messages', defaultValue: {} }).then(function(data) {
					$rootScope.messages = data; //Do not delete this line
				});
			
				$rootScope.setupPump = undefined;
				$localForage.bind($rootScope, { key: 'setupPump', defaultValue: {} }).then(function(data) {
					if (angular.isDefined(data.name)) {
						$rootScope.setupPump = data; //Do not delete this line
					}
					else {
						$rootScope.setupPump = PumpApp.PumpUtil.create();
					}
				});
			
				//Pumps list - all changes to $rootScope.pumps are persisted to database 
				$rootScope.pumps = [];
				$rootScope.selectedPump = null;
				$localForage.bind($rootScope, { key: 'pumps', defaultValue: {} }).then(function(data) {
					$rootScope.pumps = data; //Do not delete this line
				});
//////////////Local database initialization//////////////END





			}

			$rootScope.savePump = function(pump) {
				if (!PumpApp.Utils.useLocalDatabase()) {
////////////// savePump with JSON database HERE
////////////// savePump with JSON database END
				} else {
////////////// savePump with Local database HERE
					if (!angular.isDefined($rootScope.pumps.push)) {
						$rootScope.pumps = [];
					}
					$rootScope.pumps.push($rootScope.setupPump);
					//Do not delete below, for saving pump setup progress		
					$rootScope.setupPump = PumpApp.PumpUtil.create(); 
////////////// savePump with Local database END
				}
			};
			

////////////// All Messages with Local database START  -- replace with JSON if needed
			$rootScope.updateCurrentMessages = function() {
				if ($rootScope.selectedPump === null || $rootScope.selectedPump === undefined) {
					try {
						$rootScope.currentMessages = [].concat.apply([], Object.values($rootScope.messages));
						if ($rootScope.currentMessages === null || $rootScope.currentMessages === undefined) {
							$rootScope.currentMessages = [];
						}
					}
					catch(error) {
						$rootScope.currentMessages = [];
					}
				}
				else {
					if (angular.isDefined($rootScope.messages[$rootScope.selectedPump[$rootScope.messagesStoreByPumpProperty]])) {
						$rootScope.currentMessages = [].concat($rootScope.messages[$rootScope.selectedPump[$rootScope.messagesStoreByPumpProperty]]);
					}
					else {
						$rootScope.currentMessages = [];
					}
				}
			};
			
			$rootScope.unreadMessageCount = function(pumpGrouping) {
				if ($rootScope.messages[pumpGrouping] === null || $rootScope.messages[pumpGrouping] === undefined) {
					return [0,0];
				}
				
				var unread = 0;
				var alerts = 0;
				for (var i = 0; i < $rootScope.messages[pumpGrouping].length; i++) {
					if ($rootScope.messages[pumpGrouping][i].unread) {
						unread++;
						if ($rootScope.messages[pumpGrouping][i].isAlert) {
							alerts++;
						}
					}
				}
				
				return [unread,alerts];
			}
			
			$rootScope.markAllAsRead = function(pumpGrouping) {
				if ($rootScope.messages[pumpGrouping] === null || $rootScope.messages[pumpGrouping] === undefined) {
					return;
				}
				
				for (var i = 0; i < $rootScope.messages[pumpGrouping].length; i++) {
					if ($rootScope.messages[pumpGrouping][i].unread) {
						$rootScope.messages[pumpGrouping][i].unread = false;
					}
				}
			}
			
			$rootScope.saveMessage = function(pumpGrouping, message, updateDirect) {
				if (updateDirect === true) {
					if ($rootScope.messages[pumpGrouping] === null || $rootScope.messages[pumpGrouping] === undefined) {
						$rootScope.messages[pumpGrouping] = [];
					}
					
					$rootScope.messages[pumpGrouping].push(message);
				}
				else {
					try {
						$rootScope.$apply(function () {
							$rootScope.saveMessage(pumpGrouping, message, true);
						});
					}
					catch (error) {
						$rootScope.saveMessage(pumpGrouping, message, true);
					}
				}
			};
////////////// All Messages with Local database END  -- replace with JSON if needed

			$rootScope.messageLocked = false;
			$rootScope.sendMessage = function(pump, command, message) {

				if (PumpApp.Utils.sendMsgWithLocalSocket()) {
					if (pump.wifiipaddress === null || pump.wifiipaddress === undefined
						|| pump.wifiipaddress.length === 0) {
						$rootScope.showError('Cannot send message - Pump Ip Address unknown');
						return;
					}
					if (pump.wifiname !== $rootScope.me.currentwifiname ) {
						$rootScope.showError('Cannot send message - Pump WiFi name mismatched: ['+pump.wifiname+'!=='+$rootScope.me.currentwifiname+']');
						return;
					}

					//Do send command to pump... here
					if ($rootScope.messageLocked) return;
					$rootScope.messageLocked = true;
					$rootScope.sendMessageWithLocalSocket(pump, command, message);

				} else {
///////////////////////////////sendMessageWithJSON///////////////////////
					var pumpIdentity = pump[$rootScope.messagesStoreByPumpProperty];
					
					var loginData = PumpApp.Request.Builder.Login();
					$rootScope.makeRequest(loginData).then(
						function success(response){
							$rootScope.setupPump.connectiondata = response.data[1];
							var getData = PumpApp.Request.Builder.ExecuteCommand($rootScope.setupPump.connectiondata, pump.id, command);
							if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
								alert('sendMessageWithJSON: getData: '+ getData);
							$rootScope.makeRequest(getData).then(
								function(response) {
									if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
										alert('sendMessageWithJSON: response.data[0][0]: '+ response.data[0][0]+',  response.data[0][1]: '+ response.data[0][1]);
									if (response.data[0][0] === 'success') {
										$rootScope.saveMessage(pumpIdentity, new PumpApp.Message({message:response.data[0][1],pumpIdentity:pumpIdentity}));
									} else {
										$rootScope.saveMessage(pumpIdentity, new PumpApp.Message({message:'Command execution error response as follows: '+response.data[0][1],pumpIdentity:pumpIdentity,isAlert:false,pumpIdentity:pumpIdentity}));
									}
								},
								function error(e){
									$rootScope.saveMessage(pumpIdentity, new PumpApp.Message({message:'Command execution error: Network Error!!',pumpIdentity:pumpIdentity,isAlert:false,pumpIdentity:pumpIdentity}));
									//debugger;
								}
							);
						},
						function error(e){
							//debugger;
						}
					);

					$rootScope.saveMessage(pumpIdentity, new PumpApp.Message({message:message,senderIsPump:false,pumpIdentity:pumpIdentity}));
///////////////////////////////sendMessageWithJSON///////////////////////
				}
			};
			
			$rootScope.sendMessageWithLocalSocket = function(pump, command, message) {
///////////////////////////////sendMessageWithLocalSocket///////////////////////
				var pumpIdentity = pump[$rootScope.messagesStoreByPumpProperty];

				var socket = new Socket();
				var cmd = "";
				var closeSocket = false;
				var stopPingTimer = function() {
					if ($rootScope.pingTimer != null) {
							clearTimeout($rootScope.pingTimer);
						$rootScope.pingTimer = null;
					}
				};  // stopPingTimer
				$rootScope.saveMessage(pumpIdentity, new PumpApp.Message({message:message+' [ '+command+' ]',senderIsPump:false,pumpIdentity:pumpIdentity}));

				socket.onData = function(data) {
				  // data is received (typed array of bytes Uint8Array)
					var dataString = new TextDecoder("utf-8").decode(data);
					dataString = dataString.replace('\r\n','');
					if (dataString.includes(cmd)) { // Connect
						socket.write(PumpApp.Utils.formatUint8Array(command + "\r\n"));
					} else { // Command Response
						stopPingTimer();
						$rootScope.saveMessage(pumpIdentity, new PumpApp.Message({message:dataString,isAlert:false,pumpIdentity:pumpIdentity}));	
						closeSocket = true;
					}
					if (closeSocket) {
						$timeout(function(){
							socket.close();
						}, 500);

					}
				};
				socket.onError = function(errorMessage) {
					stopPingTimer();
					$rootScope.messageLocked = false;
					if (!closeSocket) {
						$rootScope.saveMessage(pumpIdentity, new PumpApp.Message({message:'Connection Error: '+errorMessage,isAlert:true,pumpIdentity:pumpIdentity}));
					}
				};
				socket.onClose = function(hasError) {
					stopPingTimer();
					$rootScope.messageLocked = false;
					if (hasError) {
					}
				};

				$rootScope.pingTimer = setTimeout(function(){
					$rootScope.messageLocked = false;
					$rootScope.pingTimer = null;
					$rootScope.saveMessage(pumpIdentity, new PumpApp.Message({message:'Operation: TIMEOUT',isAlert:true,pumpIdentity:pumpIdentity}));
				}, 10000);

				if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
					alert('trying to connect to ' + pump.wifiipaddress);
				socket.open(pump.wifiipaddress,PumpApp.Constants.PumpApPortNo,
				  function() {
					cmd = "Connect";
					if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
						alert('send [connect '+$rootScope.me.deviceuuid+" "+pump.macaddress+']');
					socket.write(PumpApp.Utils.formatUint8Array
						("connect " + $rootScope.me.deviceuuid + " " + pump.macaddress + "\r\n"));
				  },
				  function(errorMessage) {
					stopPingTimer();
					$rootScope.messageLocked = false;
					$rootScope.saveMessage(pumpIdentity, new PumpApp.Message({message:'Command execution error: '+'Failed to establish communication to pump',isAlert:true,pumpIdentity:pumpIdentity}));
				  }
				);
///////////////////////////////sendMessageWithLocalSocket///////////////////////
			};

			$rootScope.navigateToPage = function(page, params, options) {
				if (!angular.isDefined(params)) {
					params = {};
				}
				if (!angular.isDefined(options)) {
					options = {location:'replace'};
				}
				$state.go(page, params, options);
			};
			
			$rootScope.pageNames = {
				'pumps':'Pumps',
				'setup':'Setup',
				'me':'Me',
				'edit':'Edit',
				'scan':'Scan',
				'pumpdetails':'Pump Details',
				'messages':'Messages'
			};
			
			$rootScope.selectFooter = function(page) {
				if ($rootScope.page === page) {
					return;
				}
				
				if (!$rootScope.isMeComplete()) {
					$rootScope.togglePopup('popupMeIncomplete', 35);
					return;
				}

				if (page === 'setup' && !($rootScope.me.currentwifiname in $rootScope.homewifis)) {
					return;
				}

				if (page === 'setup' && $rootScope.isCloudOnline === false) {
					return;
				}
				
				if (page === 'pumps' && $rootScope.pumps.length === 0) {
					return;
				}

				$rootScope.page = page;
				
				if (page === 'setup') {
					$rootScope.navigateToPage(page, {stepId:-2});
				}
				else {
					$rootScope.footerVisible = true;
					$rootScope.navigateToPage(page);
				}
			};
			
			$rootScope.isMeCompleteOrHomeWifiAndCloudOnline = function() {
				if (!$rootScope.isMeCompleteOrHomeWifi()) {
					return false;
				}
				if ($rootScope.isCloudOnline == false) {
					return false;
				}
				
				return true;
			};

			$rootScope.isMeCompleteAndHasPumps = function() {
				if (!$rootScope.isMeComplete()) {
					return false;
				}
				if (angular.isDefined($rootScope.pumps.length)) {
					if ($rootScope.pumps.length>0)
						return true;
				}
				return false;
			};

			$rootScope.isMeCompleteOrHomeWifi = function() {
				if (!$rootScope.isMeComplete()) {
					return false;
				}
				if (!($rootScope.me.currentwifiname in $rootScope.homewifis)) {
					return false;
				}
				
				return true;
			};
			
			$rootScope.isMeComplete = function() {
				if (!angular.isDefined($rootScope.me)) {
					return false;
				}
				if ($rootScope.me.firstname === '') {
					return false;
				}
				if ($rootScope.me.lastname === '') {
					return false;
				}
				if ($rootScope.me.name === '') {
					return false;
				}
				if ($rootScope.me.email === '') {
					return false;
				}
				if ($rootScope.me.zipcode === '') {
					return false;
				}
				if ($rootScope.me.allowlocation === null) {
					return false;
				}
				if ($rootScope.me.wifiname === '') {
					return false;
				}
				if ($rootScope.me.wifipassexists === null || ($rootScope.me.wifipass === '' && $rootScope.me.wifipassexists === false)) {
					return false;
				}
				
				return true;
			};

			$rootScope.checkDisplayCloudIcon = function() {
				var displayCloudIcon = false;
				switch($rootScope.page) {
					case 'me':
					case 'pumps':
						displayCloudIcon = true;
						break;
				}
				return displayCloudIcon;
			};

			$rootScope.callbackCloudIcon = function() {
				if ($rootScope.clickCloudIconCallback !== null) {
					if ($rootScope.isCloudOnline === false) {
						$rootScope.clickCloudIconCallback();
					}
				}
			};

			$rootScope.upgradeFirmware = function() {
				var loginData = PumpApp.Request.Builder.Login();
				$rootScope.makeRequest(loginData).then(
					function success(response){
						var getData = PumpApp.Request.Builder.UpgradeFirmware(
							response.data[1], $rootScope.selectedPump.id);
						if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
							alert('upgradeFirmware::reqData='+getData);
						$rootScope.makeRequest(getData).then(
							function(response) {
								if (response.data[0] === 'success') {
									$rootScope.setupPump.isFirmwareUpgadeAvailable = false;
									$rootScope.navigateToPage('pumps');
								}
							},
							function error(e){
								$scope.enablePhoneNotificationsWithSocket(0, 255);
								//debugger;
							}
						);
					},
					function error(e){
						$scope.enablePhoneNotificationsWithSocket(0, 255);
						//debugger;
					}
				);
			};			

			$rootScope.showAlerMsgMoreInfo = function(msg) {
				if (msg.isAlert === true) {
					$rootScope.showAlertMoreInfo(msg.errCode);
				}
			};

			$rootScope.showMorePumpAlert = function(errCode) {
				$rootScope.dismissPumpAlert();	
				$rootScope.showAlertMoreInfo(errCode);
			};

			var splitErrCode = function (input, len) {
				var err = input.slice(2, input.length);
    		return err.match(new RegExp('.{1,'+len+'}(?=(.{'+len+'})+(?!.))|.{1,'+len+'}$', 'g'))
			};

			$rootScope.showAlertMoreInfo = function(errCode) {
				$rootScope.pumpErrCodes = [];
				if ((errCode!==undefined) && (errCode.length !== 0)) {
					$rootScope.alertErrorCode = errCode;
					$rootScope.pumpErrCodes = splitErrCode(errCode, 2);
					if ($rootScope.pumpErrCodes.length >0) {
						if ($rootScope.pumpErrCodes.length ===1) {
							if ($rootScope.pumpErrCodes[0] !== '00')
								$rootScope.isMoreInfo = true;
							else
								$rootScope.showError('errorCode 00');
						}
					}
				}
			};

			$rootScope.showPumpAlert = function(errCode) {
				if ((errCode!==undefined) && (errCode.length !== 0)) {
					$rootScope.alertErrorCode = errCode;
					$rootScope.isPumpAlert = true;
				} 
			};


			$rootScope.popupShowing = false;
			$rootScope.currentPopup = '';
			$rootScope.currentAlert = '';
			$rootScope.popupStates = [];
			$rootScope.popupStates['popupMeIncomplete'] = {
				type: 'Warnning',
				buttons:[
					{
						title:'Continue',
						styleClass:'popupButtonConfirm',
						callback:function(){$rootScope.togglePopup();}
					}
				]
			};
			$rootScope.popupStates['getCurrentWifiSSID'] = {
				type: 'Information',
				buttons:[
					{
						title:'Ok',
						styleClass:'popupButtonConfirm popupButtonConfirmWifi',
						callback:function(){
							$rootScope.togglePopup();
							$rootScope.checkWifiConnection();
						}
					}
				]
			};
			$rootScope.popupStates['popupVerifyWifi'] = {
				type: 'Warnning',
				buttons:[
					{
						title:'Yes',
						styleClass:'popupButtonConfirm popupButtonConfirmWifi',
						callback:function(){
							$rootScope.me.wifiname = $rootScope.unverifiedSSID;
							$rootScope.togglePopup();
							$rootScope.homewifis[$rootScope.me.wifiname] = '';
							$rootScope.me.wifipass = '';
							$rootScope.me.wifipassexists = null;
							$rootScope.homewifis[$rootScope.me.currentwifiname] = $rootScope.me.wifipass;
							$rootScope.homewifis[$rootScope.me.currentwifiname + 'exists'] = $rootScope.me.wifipassexists;
							$rootScope.navigateToPage('me');
							}
					},
					{
						title:'No',
						styleClass:'popupButtonConfirm popupButtonConfirmWifi popupButtonConfirmWifiNo',
						callback:function(){
								$rootScope.togglePopup();
								$rootScope.togglePopup('popupVerifyWifiNo', 35);
								//if ($rootScope.me.wifiname == null || $rootScope.me.wifiname == undefined 
								//|| $rootScope.me.wifiname.length === 0) {
									//$rootScope.me.currentwifiname = '';
									//if (PumpApp.Utils.isAndroid()) {
									//	$rootScope.togglePopup('popupVerifyWifiNo', 35);
									//} else {
									//	$rootScope.togglePopup('popupVerifyWifiNoiOS', 35);
									//}
								//}
								//else {
									//if (PumpApp.Utils.isAndroid()) {
									//	$rootScope.togglePopup('popupVerifyWifiNoContinue', 35);
									//} else {
									//	$rootScope.togglePopup('popupVerifyWifiNoContinueiOS', 35);
									//}
								//}
							}
					}
				]
			};
			$rootScope.popupStates['showConnectedWiFiInfo'] = {
				type: 'Information',
				buttons:[
					{
						title:'Ok',
						styleClass:'popupButtonConfirm',
						callback:function(){
							$rootScope.togglePopup();
						}
					}
				]
			};
			$rootScope.popupStates['popupVerifyWifiNo'] = {
				type: 'Warnning',
				buttons:[
					{
						title:'Ok',
						styleClass:'popupButtonConfirm',
						callback:function(){
							$rootScope.togglePopup();
							//if (PumpApp.Utils.isAndroid()) {
							//	if(navigator.app) {
							//		navigator.app.exitApp();
							//	}
							//}
						}
					}
				]
			};

			$rootScope.popupStates['pumplistFull'] = {
				type: 'Error',
				buttons:[
					{
						title:'Ok',
						styleClass:'popupButtonConfirm',
						callback:function(){
							$rootScope.togglePopup();
							$rootScope.DispManagePhoneList();
							//if (PumpApp.Utils.isAndroid()) {
							//	if(navigator.app) {
							//		navigator.app.exitApp();
							//	}
							//}
						}
					}
				]
			};

			$rootScope.popupStates['popupVerifyWifiNoiOS'] = {
				type: 'Warnning',
				buttons:[]
			};

			$rootScope.popupStates['popupVerifyWifiNoContinue'] = {
				type: 'Warnning',
				buttons:[
					{
						title:'Stay',
						styleClass:'popupButtonConfirm',
						callback:function(){
							$rootScope.togglePopup();
						}
					},
					{
						title:'Exit',
						styleClass:'popupButtonConfirm',
						callback:function(){
							if (PumpApp.Utils.isAndroid()) {
								if(navigator.app) {
									navigator.app.exitApp();
								}
							}
						}
					}
				]
			};

			$rootScope.popupStates['popupVerifyWifiNoContinueiOS'] = {
				type: 'Warnning',
				buttons:[
					{
						title:'Stay',
						styleClass:'popupButtonConfirm',
						callback:function(){
							$rootScope.togglePopup();
						}
					}
				]
			};

			if (false) {
				$rootScope.popupStates['popupVerifyWifiFail'] = {
					type: 'Warnning',
					buttons:[
						{
							title:'Exit',
							styleClass:'popupButtonConfirm',
							callback:function(){
								if (PumpApp.Utils.isAndroid()) {
									if(navigator.app) {
										navigator.app.exitApp();
									}
								}
							}
						}
					]
				};
			} else {
				$rootScope.popupStates['popupVerifyWifiFail'] = {
					type: 'Warnning',
					buttons:[
						{
							title:'Ok',
							styleClass:'popupButtonConfirm popupButtonConfirmWifi',
							callback:function(){$rootScope.togglePopup();}
						}
					]
				};
			}

			$rootScope.popupStates['popupVerifyWifiFailiOS'] = {
				type: 'Warnning',
				buttons:[
					{
						title:'Ok',
						styleClass:'popupButtonConfirm popupButtonConfirmWifi',
						callback:function(){$rootScope.togglePopup();}
					}
				]
			};

			$rootScope.popupStates['popupConfirmDeletePump'] = {
				type: 'Warnning',
				buttons:[
					{
						title:'Yes',
						styleClass:'popupButtonConfirm popupButtonConfirmWifi',
						callback:function(){
								$rootScope.togglePopup();
								$rootScope.findSelfInPhoneList();
							}
					},
					{
						title:'No',
						styleClass:'popupButtonConfirm popupButtonConfirmWifi popupButtonConfirmWifiNo',
						callback:function(){$rootScope.togglePopup();}
					}
				]
			};

			$rootScope.popupStates['popupConfirmExit'] = {
				type: 'Warnning',
				buttons:[
					{
						title:'Yes',
						styleClass:'popupButtonConfirm popupButtonConfirmWifi',
						callback:function(){
								if (PumpApp.Utils.isAndroid()) {
									navigator.app.exitApp();
								}
								else {
									$rootScope.togglePopup();
								}
							}
					},
					{
						title:'No',
						styleClass:'popupButtonConfirm popupButtonConfirmWifi popupButtonConfirmWifiNo',
						callback:function(){$rootScope.togglePopup();}
					}
				]
			};
			$rootScope.popupStates['popupSetupCannotConnect'] = {
				type: 'Warnning',
				buttons:[
					{
						title:'Ok',
						styleClass:'popupButtonConfirm',
						callback:function(){
							$rootScope.togglePopup();
							if (window.cordova && window.cordova.plugins.settings) {
							window.cordova.plugins.settings.open("wifi", 						function() {
							console.log('opened settings');
						}, function () {
							console.log('failed to open settings');
						});
							} else {
								if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
									alert('Cannot switch to system Setting!');
							}
						}
					}
				]
			};

			$rootScope.popupStates['showMeAbout'] = {
				type: 'Information',
				buttons:[
					{
						title:'Ok',
						styleClass:'popupButtonConfirm popupButtonConfirmWifi',
						callback:function(){$rootScope.togglePopup();}
					}
				]
			};

			$rootScope.popupStates['upgradeFirmware'] = {
				type: 'Warnning',
				buttons:[
					{
						title:'Yes',
						styleClass:'popupButtonConfirm popupButtonConfirmWifi',
						callback:function(){
							$rootScope.upgradeFirmware();
							$rootScope.togglePopup();
						}
					},
					{
						title:'No',
						styleClass:'popupButtonConfirm popupButtonConfirmWifi popupButtonConfirmWifiNo',
						callback:function(){
							$rootScope.togglePopup();
						}
					}
				]
			};

			$rootScope.popupStates['errorPopupMessage'] = {
				type: 'Error',
				buttons:[
					{
						title:'Ok',
						styleClass:'popupButtonConfirm',
						callback:function(){
							$rootScope.togglePopup();
						}
					}
				]
			};


			/*jimleaf 6/12/2018 begin*/
			$rootScope.popupStates['genericPopupMessageAlert'] = {
				type: 'Warnning',
				buttons:[
					{
						title:'More Information',
						styleClass:'popupButtonConfirm popupButtonConfirmWifi',
						callback:function(){
							$rootScope.dismissAlert();
							$rootScope.showAlertMoreInfo($rootScope.alertErrorCode);
						}
					},
					{
						title:'Dismiss',
						styleClass:'popupButtonConfirm',
						callback:function(){
							$rootScope.dismissAlert();
						}
					}
				]
			};
			$rootScope.popupStates['genericPopupMessage'] = {
				type: 'Warnning',
				buttons:[
					{
						title:'Dismiss',
						styleClass:'popupButtonConfirm',
						callback:function(){
							$rootScope.dismissAlert();
						}
					}
				]
			};

			$rootScope.generalErrorMessage = '';
			$rootScope.showError = function(message) {
				$rootScope.generalErrorMessage = message;
				$rootScope.togglePopup('errorPopupMessage', 25);
			};

			$rootScope.alertPumpID = '';
			$rootScope.alertErrorCode = '';
			$rootScope.alertMsg = '';
			$rootScope.generalAlertInterval = null;
			$rootScope.isItAlert = false;

			$rootScope.showAlert = function(isItAlert, pumpID, errCode, msg, thisdelay) {
				$rootScope.isItAlert = isItAlert;
				var delay = isItAlert ? 60000 : 10000;
				if (angular.isDefined(thisdelay)) {
					delay = thisdelay;
				}
				$rootScope.alertPumpID = pumpID;
				$rootScope.alertErrorCode = errCode;
				$rootScope.alertMsg = msg;
				if ($rootScope.generalAlertInterval !== null) {
					$interval.cancel($rootScope.generalAlertInterval);
					$rootScope.generalAlertInterval = null;
				}

				if (true) {
					$rootScope.selectedPump =  $rootScope.getPumpByIdentity(pumpID);
					if ($rootScope.selectedPump === null) {
						$rootScope.showError('showAlert:: No pump found for id ['+pumpID+']');
					} else {
						$rootScope.showPumpAlert(errCode);
					}
					//$rootScope.generalAlertInterval = $interval(function(){$rootScope.dismissPumpAlert();}, delay);
				} else {
					$rootScope.popupShowing = true;
					if (isItAlert) {
						$rootScope.currentPopup = 'genericPopupMessageAlert';
					}  else {
						$rootScope.currentPopup = 'genericPopupMessage';
					}
					var popupDg = document.getElementById('popupDialog');
					if (!!popupDg) {
						popupDg.style.height = '50%';
					}
					$rootScope.generalAlertInterval = $interval(function(){$rootScope.dismissAlert();}, delay);
				}

			};

			$rootScope.dismissPumpAlert = function() {
				if ($rootScope.generalAlertInterval !== null) {
					$interval.cancel($rootScope.generalAlertInterval);
					$rootScope.generalAlertInterval = null;
				}
				$rootScope.toggleisPumpAlert();
			};

			$rootScope.dismissAlert = function() {
				if ($rootScope.generalAlertInterval !== null) {
					$interval.cancel($rootScope.generalAlertInterval);
					$rootScope.generalAlertInterval = null;
				}
				$rootScope.togglePopup();
			};
			/*jimleaf 6/12/2018 end*/


			$rootScope.DispManagePhoneList = function() {
				//if (callFromMenu)
				//	$rootScope.toggleMenu();
				$rootScope.selectedPump = $rootScope.setupPump;
//alert('$rootScope.selectedPump.macaddress::'+$rootScope.selectedPump.macaddress+', $rootScope.setupPump.macaddress::'+$rootScope.setupPump.macaddress);


				var getPhoneList = PumpApp.Request.Builder.GetUUIDs
						($rootScope.setupPump.connectiondata, "0x"+$rootScope.setupPump.macaddress+"0000");
				if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
					alert('GetUUIDs::getPhoneList=='+getPhoneList);
				$rootScope.makeRequest(getPhoneList).then(
					function(response) {
						if (response.data[0] === 'success') {
							var datalength = response.data[1].length;
							if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
								alert('GetUUIDs::SUCCESS:datalength='+datalength);
							$rootScope.phonelist = [];
									var found = false;
									$rootScope.freeSlot = -1;
							for (var i=0; i<datalength; i++) {
								if (response.data[1][i] !== null && response.data[1][i].length > 0
														&& response.data[1][i][0].length > 0) {
									$rootScope.phonelist.push({	uuid:response.data[1][i][1],
																							name:response.data[1][i][2],
																							slot:response.data[1][i][0]});
									if (response.data[1][i][1] === $rootScope.me.deviceuuid) {
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
								if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
									alert('DispManagePhoneList:: $rootScope.phonelist.length='+	
												$rootScope.phonelist.length+', toggleManagePhoneList()');
								$rootScope.toggleManagePhoneList();
							} else {
								if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
									alert('No phone list!!!');
							}
						} else {
							if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
								alert('GetUUIDs:error:'+response.data[1]+':'+response.data[2]);
						}
					},
					function error(e){
						if ($rootScope.ALERT_level >= $rootScope.ALERT_ERROR)
							alert('GetUUIDs:error:LOGIN');
					}
				);
			};



			$rootScope.toggleManagePhoneList = function() {
				$rootScope.managePhoneList = !$rootScope.managePhoneList;
			};

			$rootScope.toggleisMoreInfo = function() {
				$rootScope.isMoreInfo = !$rootScope.isMoreInfo;
//alert('showAlerMsgMoreInfo::isMoreInfo == '+$rootScope.isMoreInfo);
			};

			$rootScope.toggleisPumpAlert = function() {
				$rootScope.isPumpAlert = !$rootScope.isPumpAlert;
//alert('showAlerMsgMoreInfo::isPumpAlert == '+$rootScope.isPumpAlert);
			};

			$rootScope.togglePopup = function(name, thisheight) {
				var height =35;
				if (angular.isDefined(thisheight)) {
					height = thisheight;
				}

				var popupDg = document.getElementById('popupDialog');
				if (!!popupDg) {
					popupDg.style.height = height+'%';
				}
				$rootScope.popupShowing = !$rootScope.popupShowing;
				$rootScope.currentPopup = name;
			};

			$rootScope.menuShowing = false;
			$rootScope.menuOptions = [];
			$rootScope.createMenu = function(options) {
				$rootScope.menuShowing = false;
				$('.menu').css('top', (6*options.length*-1) + '%');
				$rootScope.menuOptions = options;
			};
			$rootScope.toggleMenu = function(force) {
				if (angular.isDefined(force)) {
					$rootScope.menuShowing = force;
				}
				else {
					$rootScope.menuShowing = !$rootScope.menuShowing;
				}
				
				var menuTop = 10;
				if (!$rootScope.menuShowing) {
					menuTop = (6*$rootScope.menuOptions.length*-1);
				}
				
				//$('.menu').css('top', menuTop + '%');
				$('.menu').animate({
					top: menuTop + '%'
					}, 315, function() {
					// Animation complete.
				});
			};
			$(document).click(function() {
				if($rootScope.menuShowing) {
					$rootScope.toggleMenu(false);
				}
			});
			$(".menu").click(function(e) {
				e.stopPropagation();
				return false;
			});
			$(".headerRight").click(function(e) {
				e.stopPropagation();
				return false;
			});

			$rootScope.showScanning = false;
			$rootScope.scan = function(args) {
				$rootScope.toggleMenu();
				$rootScope.backPage = args.page;
				
				if (angular.isDefined(args.callback)) {
					args.callback();
				}
				
				if (PumpApp.Utils.isPhone()) {
					cordova.plugins.barcodeScanner.scan(
						function (result) {
							args.success(result);
						},
						function (error) {
							args.error(error);
						}
					);
				}
			};

			$rootScope.clearScanState = function() {
				$rootScope.showScanning = false;
				$rootScope.isRootBack = true;
				$rootScope.rootBackFunc = $rootScope.masterRootBack;
				$rootScope.footerVisible = true;
				$rootScope.page = $rootScope.backPage;
				$rootScope.backPage = '';
			};


			$rootScope.deletePhoneIndex = function(phone) {
					// call JSON to delete from server
				if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
					alert('deletephoneIndex('+phone.slot+', '+$rootScope.selectedPump.macaddress+')');

				var delPhone = PumpApp.Request.Builder.DelUUID
						($rootScope.setupPump.connectiondata, "0x"+$rootScope.selectedPump.macaddress+"0000", phone.slot);
				if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
					alert('deletephoneIndex::delPhone=='+delPhone);
				$rootScope.makeRequest(delPhone).then(
					function(response) {
						if (response.data[0] === 'success') {
							if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
								alert('deletephoneIndex:SUCCESS:Phone Name=='+phone.name+', slot='+phone.slot);
							phone.uuid='';
							phone.name='';
						} else { // error
							if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
								alert('deletephoneIndex::'+response.data[0]+', '+response.data[1]+', '+response.data[2]);
						}
					},
					function error(e){
						if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
							alert('deletephoneIndex::send error1:');
					}
				);
			};

			$rootScope.iconFillColors = [
				'#75C043',
				'#66A83B',
				'#589032',
				'#49782A',
				'#3A6022',
				'#2C4819',
				'#1D3011',
				'#0F1808'
			];
			$rootScope.iconFillColor = function(index, avail, inPump) {
//alert('iconFillColor, connectiondata='+avail);
				if (avail === true) {
					return $rootScope.iconFillColors[index%$rootScope.iconFillColors.length];
				} else {
					if (inPump === true) {
						return '#FF0000';  // not available, RED
					} else {
						return '#FFFF00';  // not in pump, YELLOW
					}
				} 
			};
			
			$rootScope.convertPumpIdentity = function(id) {
				var decimalValue = parseInt(id, 10);
				return ('0x'+(decimalValue+0x10000).toString(16).substr(-4));
			};

			$rootScope.normalizePumpIdentity = function(id) {
				var idStr = '';
				switch(id.length) {
					case 1: idStr = "0x000" + id; break;
					case 2: idStr = "0x00" + id; break;
					case 3: idStr = "0x0" + id; break;
					case 4: idStr = "0x" + id; break;
					default: idStr = id; break;
				}
				return idStr;
			};

			$rootScope.getPumpByIdentity = function(pumpIdentity) {
				for (var i = 0; i < $rootScope.pumps.length; i++) {
					if ($rootScope.pumps[i][$rootScope.messagesStoreByPumpProperty] === pumpIdentity) {
						return $rootScope.pumps[i];
					}
				}
				return null;
			};
			
			$rootScope.getPumpError = function(error) {
				if (!angular.isDefined(error)) {
					error = '00';
				}

				if (!angular.isDefined(PumpApp.ErrorCodes[error])
					&& error !== '') {
					if (error === '00')
						return PumpApp.ErrorCodes[error]
					else
						return 'Unknown (0x'+error+')';
				}
				return PumpApp.ErrorCodes[error];
			};

			$rootScope.getPumpErrorReason = function(error) {
				return PumpApp.ErrorCodes[error];
			};
			$rootScope.getPumpErrorResolution = function(error) {
				return PumpApp.ErrorDetails[error];
			};
			
			$rootScope.makeRequest = function(data) {
//alert('url='+'http://' + $rootScope.me.requesturlip + ':8090/AVAT_DB/ACTION');
				return $http({
					//url: PumpApp.Constants.RequestUrl,  // defined in models.js
					//url: 'http://' + $rootScope.me.requesturlip + ':8090/AVAT_DB/ACTION',
					url: 'http://' + $rootScope.me.requesturlip + ':8090/AVAT_DB/ACTION',
					method: "POST",
					data: data
				})
			};
    }]);

	// configure our routes
	angular.module('pumpApp').config(['$urlRouterProvider', '$stateProvider', '$localForageProvider', 'ChartJsProvider', function ($urlRouterProvider, $stateProvider, $localForageProvider, ChartJsProvider) {
		 $localForageProvider.config({
			name        : 'pumpApp', // name of the database and prefix for your data, it is "lf" by default
			version     : 1.0, // version of the database, you shouldn't have to use this
			storeName   : 'keyvaluepairs', // name of the table
			description : 'Pump app persisted storage'
		});
			
		$urlRouterProvider.otherwise(function() {
            return '/landing'
        }),
        $stateProvider.state({
            name: 'pumps',
            url: '/pumps',
            templateUrl: 'pages/pumps.html',
            controller: 'pumpsController as vm'
        }),   
        $stateProvider.state({
            name: 'pumpdetails',
            url: '/pumpdetails/:pumpId',
            templateUrl: 'pages/pumpdetails.html',
            controller: 'pumpDetailsController as vm'
        }),   
        $stateProvider.state({
            name: 'messages',
            url: '/messages',
            templateUrl: 'pages/messages.html',
            controller: 'messagesController as vm'
        }),  
        $stateProvider.state({
            name: 'setup',
            url: '/setup/:stepId',
            templateUrl: function($stateParams){                        
                return 'pages/setup/' + $stateParams.stepId +'.html';
            },
            controller: 'setupController as vm'
        });
        $stateProvider.state({
            name: 'me',
            url: '/me',
            templateUrl: 'pages/me.html',
            controller: 'meController as vm'
        });
        $stateProvider.state({
            name: 'landing',
            url: '/landing',
            templateUrl: 'pages/landing.html',
            controller: 'landingController as vm'
        });

		ChartJsProvider.setOptions({ colors : [ '#803690', '#00ADF9', '#DCDCDC', '#46BFBD', '#FDB45C', '#949FB1', '#4D5360'] });

	}]);
	
	angular.module('pumpApp').controller('indexController', ['$scope', '$state', '$stateParams', '$rootScope', '$timeout', '$interval',
		function($scope, $state, $stateParams, $rootScope, $timeout, $interval) {
			$rootScope.masterRootBack = function() {
				if (!PumpApp.Utils.isIPhone()) {
					if ($rootScope.inBarcodeScanner == true) {
						$rootScope.inBarcodeScanner = false;
					} else {
						$rootScope.togglePopup('popupConfirmExit', 15);
					}
				}
			};
			
			$rootScope.rootBackFunc = $rootScope.masterRootBack;
			
			$scope.rootBackFuncWarpper = function() {
				try {
					$scope.$apply(function(){$rootScope.rootBackFunc();});
				}
				catch(error) {
					$rootScope.rootBackFunc();
				}
			};
			
			if (PumpApp.Utils.isAndroid()) {
				document.addEventListener('backbutton', function (e) {
					$scope.rootBackFuncWarpper();
				}, false);
			}
	}]);

	// View: pumps
	// see js/pages/pumps.js
	
	// View: pumpsDetails
	// see js/pages/pumpsDetails.js
	

	// View: setup
	// see js/pages/setup.js

	// View: me
	// see js/pages/me.js
})();parseInt
