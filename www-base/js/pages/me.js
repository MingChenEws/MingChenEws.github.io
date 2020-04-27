(function(){
	"use strict";
	
	angular.module('pumpApp').controller('meController', ['$scope', '$state', '$rootScope', '$timeout',
		function($scope, $state, $rootScope, $timeout) {
			$rootScope.page = 'me';
			$rootScope.footerVisible = true;
			$rootScope.isRootBack = true;
			
			$scope.manageHomeWifis = false;
			$scope.showScanning = false;
			$scope.editingItem = null;
			$scope.editingTextInput = null;

/*
						var newPump = PumpApp.PumpUtil.create();
newPump.id = '0x000a';

alert('newPump.id'+newPump.id);
						var ps = [].concat($rootScope.pumps[newPump['id']);
alert('ps=['+ps+']');

				if (ps !== null && ps !== undefined)
					alert('ps.length='+ps.length);

			if ($rootScope.pumps !== null && $rootScope.pumps !== undefined) {
				var ps = [].concat($rootScope.pumps['0x000a']);
				if (ps !== null && ps !== undefined) {
					alert('ps.length='+ps.length);
					if (ps.length > 0) {
alert('ps[0]='+ps[0]);
					//alert('name:'+ps[0].name+', description='+ps[0].description);
					}
				}
			}
			
*/
			$scope.checkCloud = function() {
				$rootScope.sendRegisterPhone(3);
			};
			$rootScope.clickCloudIconCallback = $scope.checkCloud;

			$scope.editMe = function(item) {
				if (item.name === 'wifiname') {
					$rootScope.togglePopup('showConnectedWiFiInfo', 25);
					return;
				}
				if (item.name === 'wifipass' && 
					!($rootScope.me.currentwifiname in $rootScope.homewifis)) {
					return;
				}
				var el = document.getElementById("meEditInputTextbox");
				if (item.name === 'requesturlserver') {
					el.readOnly = true;
				} else {
					el.readOnly = false;
				}

				if (item.name === 'done') {
					if ($rootScope.isMeComplete()) {
						if ($rootScope.isMeCompleteOrHomeWifi()) {
							if ($rootScope.isCloudOnline === true) {
								$rootScope.navigateToPage('setup', {stepId:-2});
							} else {
								if ($rootScope.me.fcmtoken.length > 0) {
									$rootScope.sendRegisterPhone(3);
								} else {
									alert('Waiting for notification token to be assigned!');
								}
							}
						} else {
							$rootScope.togglePopup('popupVerifyWifiNo', 35);
						}	
					} else {
						$rootScope.togglePopup('popupMeIncomplete', 35);
					}
					return;
				}
				
				$rootScope.isRootBack = false;
				$scope.editingItem = item;
				$rootScope.rootBackFunc = $scope.meEditBack;
				$rootScope.footerVisible = false;
				$rootScope.page = 'edit';
				
				$scope.allowSave = true;
				if ($scope.editingItem.showCheckbox) {
					if ($scope.editingItem.name === 'wifipass') {
						$scope.editingTextInput = $rootScope.me[$scope.editingItem.name];
						$scope.editingCheckboxInput = $rootScope.me[$scope.editingItem.name+'exists'];
					}
					else {
						if ($rootScope.me[$scope.editingItem.name] === null) {
							$scope.editingCheckboxInput = true;
						}
						else {
							$scope.editingCheckboxInput = $rootScope.me[$scope.editingItem.name];
						}
					}
				}
				else {
					$scope.editingTextInput = $rootScope.me[$scope.editingItem.name];
				}
				
				$timeout(function() {
					$('#meEditInputTextbox').focus();
				});
			};
			
			$scope.allowSave = false;
			$scope.typeEdit = function() {
				var len = $('#meEditInputTextbox').val().length;
				if (len > $scope.editingItem.maxlength) {
					$scope.allowSave = false;
				}
				else {
					if (len == 0) {
						$scope.allowSave = false;
					} else {
						$scope.allowSave = true;
						if ($scope.editingItem.name === 'debuglevel') {
							var level = parseInt($('#meEditInputTextbox').val());
							if ((level<0) || (level>3)) {
								$scope.allowSave = false;
							}
						} 
					}
				}
			};
			
			$scope.saveEdit = function() {
				if (!$scope.allowSave) {
					return;
				}
				
				if ($scope.editingItem.name === 'requesturlip') {
					// check ipaddress format
					var ok = false;
					var addr = ($('#meEditInputTextbox').val()).replace(/ /g,'').split(".", 4);
					if (addr.length === 4) {
						var dig = parseInt(addr[0]);
						if (dig >=0 && dig <= 255) {
							dig = parseInt(addr[1]);
							if (dig >=0 && dig <= 255) {
								dig = parseInt(addr[2]);
								if (dig >=0 && dig <= 255) {
									dig = parseInt(addr[3]);
									if (dig >=0 && dig <= 255) {
										var fourthDigit = parseInt(addr[3]);
										$scope.editingTextInput = addr[0]+'.'+addr[1]+'.'+addr[2]+'.'+addr[3];
										//alert('Cloud IP ['+$scope.editingTextInput+']');
										ok = true;
									}
								}
							}
						}
          }
					if (!ok) {
						alert('Incorrect IP format!');
						return;
          }
				}

				if ($scope.editingItem.name === 'requesturlserver') {
					var server = document.getElementById("requestServer");
				  //alert("DONE selected="+server.options.selectedIndex);
					$rootScope.me.requesturlserver = 
						$scope.selectOptions[server.options.selectedIndex].name;
					$rootScope.me.requesturlip = $scope.selectOptions[server.options.selectedIndex].value;
					//alert("SAVE Requesturlserver CHANGED:: server="+$rootScope.me.requesturlserver
					//		+", ip="+$rootScope.me.requesturlip);
					$scope.editingTextInput = $scope.selectOptions[server.options.selectedIndex].name;
				}

				if ($scope.editingItem.showCheckbox) {
					if ($scope.editingItem.name === 'wifipass') {
						$rootScope.me[$scope.editingItem.name] = $scope.editingTextInput;
						$rootScope.me[$scope.editingItem.name+'exists'] = $scope.editingCheckboxInput;
						$rootScope.homewifis[$rootScope.me.currentwifiname] = $rootScope.me[$scope.editingItem.name];
						$rootScope.homewifis[$rootScope.me.currentwifiname + 'exists'] = $rootScope.me[$scope.editingItem.name+'exists'];
					}
					else {
						$rootScope.me[$scope.editingItem.name] = $scope.editingCheckboxInput;
					}
				}
				else {
					$rootScope.me[$scope.editingItem.name] = $scope.editingTextInput;
					if ($scope.editingItem.name === 'debuglevel') {
						$rootScope.me.ALERT_level = parseInt($scope.editingTextInput);
						$rootScope.ALERT_level = $rootScope.me.ALERT_level;
					}
				}
				
				$scope.clearEditState();
				$rootScope.checkIsMeCompleted();
			}

			$scope.clearEditValues = function() {
				$scope.editingItem = null;
				$scope.editingTextInput = null;
			};

			$scope.clearEditState = function() {
				$scope.clearEditValues();
				$rootScope.isRootBack = true;
				$rootScope.rootBackFunc = $rootScope.masterRootBack;
				$rootScope.footerVisible = true;
				$scope.manageHomeWifis = false;
				$rootScope.page = 'me';
			};
			
			$scope.meEditBack = function() {
				if ($scope.editingItem !== null) {
					if ($scope.editingItem.name === 'requesturlserver') {
						$scope.selectedOptionName = $rootScope.me.requesturlserver;
					}
				}
				$scope.clearEditState();
			};
			
			$scope.scan = function() {
				$rootScope.scan();
			};
			
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
			
			$scope.showManageWifis = function() {
				$rootScope.toggleMenu();
				
				$rootScope.isRootBack = false;
				$rootScope.rootBackFunc = $scope.meEditBack;
				$rootScope.footerVisible = false;
				$rootScope.page = 'edit';
				
				$scope.manageHomeWifis = true;
				if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO) {
					var homewifiLen = Object.keys($rootScope.homewifis).length;
					alert("$rootScope.homewifis.length="+homewifiLen);
					if (homewifiLen > 0) {
						for (var key in $rootScope.homewifis) {
							if ($rootScope.homewifis.hasOwnProperty(key))
								alert("$rootScope.homewifis["+key+"]="+$rootScope.homewifis[key]);
						}
					}
				}
			};
			
			$scope.deleteWifi = function(wifiName) {
				delete $rootScope.homewifis[wifiName];
				delete $rootScope.homewifis[wifiName + 'exists'];
				if (Object.keys($rootScope.homewifis).length > 0) {
					for (var key in $rootScope.homewifis) {
						if ($rootScope.homewifis.hasOwnProperty(key)) {
								$rootScope.me.wifiname = key;
								$rootScope.me.wifipass = $rootScope.homewifis[key];
								$rootScope.me.wifipassexists = $rootScope.homewifis[key+'exists'];
								if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO)
							  	alert("RESET ME WIFI::$rootScope.homewifis["+key+"]="+$rootScope.homewifis[key]);
								break;
						}
					}
				} else {
					$rootScope.me.wifiname = '';
					$rootScope.me.wifipass = '';
					$rootScope.me.wifipassexists = null;
				}
			};

			$scope.initOptions = function() {
				$scope.selectedOptionName = $rootScope.me.requesturlserver;
			}
			$scope.changeRequesturlserver = function() {
if (0) {
				$scope.editingTextInput = $scope.selectedOptionName;
} else {
				var server = document.getElementById("requestServer");
				if ($rootScope.ALERT_level >= $rootScope.ALERT_INFO) {
					alert("selected="+server.options.selectedIndex);
					alert("changeRequesturlserver CHANGED:: label="+
									$scope.selectOptions[server.options.selectedIndex].name
							+", ip="+$scope.selectOptions[server.options.selectedIndex].value);
				}
				$scope.editingTextInput = $scope.selectOptions[server.options.selectedIndex].name;
}
			};
			$scope.selectOptions = [ 
					{value:'13.86.34.108', name:'ECO-FLO North America Server'},
					{value:'34.228.8.148', name:'ECO-FLO Backup Server'},
					{value:'207.135.172.62', name:'Cita Testing Server'} ];
			$scope.editOptions = [
				{
					name:'firstname',
					title:'First Name',
					required:'*',
					wording:'Enter First Name:',
					showCheckbox:false,
					maxlength:20
				},
				{
					name:'lastname',
					title:'Last Name',
					required:'*',
					wording:'Enter Last Name:',
					showCheckbox:false,
					maxlength:20
				},
				{
					name:'name',
					title:'Phone Nickname',
					required:'*',
					wording:"Enter Phone Nickname (example: John's phone):",
					showCheckbox:false,
					maxlength:20
				},
				{
					name:'email',
					title:'Email',
					required:'*',
					wording:'Enter Email Address:',
					showCheckbox:false,
					maxlength:30
				},
				{
					name:'zipcode',
					title:'Zip Code',
					required:'*',
					wording:'Enter Zip Code:',
					showCheckbox:false,
					maxlength:5
				},
				{
					name:'allowlocation',
					title:'Allow Location',
					required:'*',
					wording:'Allow Location:',
					showCheckbox:true,
					checkboxText:'Allow app to use your GPS location?',
					maxlength:1
				},
				{
					name:'wifiname',
					title:'Connected WiFi Name',
					required:'*',
					wording:'',
					showCheckbox:false,
					maxlength:30
				},
				{
					name:'wifipass',
					title:'Home WiFi Password',
					required:'*',
					wording:'Enter the password for your WiFi Router:',
					showCheckbox:true,
					checkboxText:'No password?',
					maxlength:30
				},
				{
					name:'requesturlserver',
					title:'Cloud Server',
					required:'*',
					wording:'Enter Cloud IpAddress:',
					showCheckbox:false,
					maxlength:15
				},
				{
					name:'done',
					title:'',
					required:'',
					wording:'',
					showCheckbox:false,
					maxlength:0
				},
				{
					name:'debuglevel',
					title:'Debug Level',
					required:'',
					wording:'Enter Debug Level:',
					showCheckbox:false,
					maxlength:1
				},
				{
					name:'setuptimemultiplier',
					title:'Setup Time Multiplier',
					required:'',
					wording:'Enter Setup Time Multiplier:',
					showCheckbox:false,
					maxlength:1
				}
			];
			
			$rootScope.createMenu([
				{
					icon:'fas fa-wifi',
					title:'Home Network List',
					callback:$scope.showManageWifis,
					args:{}
				},
				{
					icon:'fas fa-info-circle',
					title:'About - '+$rootScope.appVersionNo,
					callback:function(){
						$rootScope.togglePopup('showMeAbout', 20);
					},
					args:{}
				},
				{
					icon:'fas fa-eye',
					title:'Check WiFi Network',
					callback:$rootScope.checkWifiConnection,
					args:{}
				},
/*
				{
					icon:'fas fa-code',
					title: 'Email FCM Token',
					callback:function(){
							cordova.plugins.email.isAvailable( function (isAvailable) {
									cordova.plugins.email.open({ 
												to: 'alotttech@gmail.com',
												subject: 'Greetings',
												body: $rootScope.me.fcmtoken
											});
								 	} );
					},
					args:{}
				},
*/

			]);

	}]);
})();
