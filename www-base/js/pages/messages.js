(function(){
	"use strict";
	
	
	angular.module('pumpApp').controller('messagesController', ['$scope', '$state', '$stateParams', '$rootScope', '$timeout',
		function($scope, $state, $stateParams, $rootScope, $timeout) {
			$scope.parentPage = $rootScope.page;
			$rootScope.page = 'messages';
			$rootScope.footerVisible = false;
			$rootScope.isRootBack = false;
			$rootScope.clickCloudIconCallback = null;
			
			$scope.hasScrolled = false;
			$scope.showingShortcuts = false;
			$rootScope.currentMessages = null;
			$scope.messageInputText = '';
			
			$scope.shortCutCommands = [
				[
					{
						title:'Status',
						//icon:'leafIconSvg',
						icon:'fas fa-question-circle',
						message:'Check pump status',
						command:'Status'
					},
					{
						title:'Batt',
						icon:'fas fa-battery-half',
						message:'Check battery',
						command:'Batt'
					}
				],
				[
					{
						title:'Pump Test',
						icon:'fas fa-wrench',
						message:'Pump test',
						command:'Pump test'
					} ,
					{
						title:'Temp',
						icon:'fas fa-thermometer-half',
						message:'Check room temperature',
						command:'Temp'
					}
				],
				[
					{
						title:'Water',
						icon:'fas fa-tint',
						message:'Check water level',
						command:'Water'
					},
					//{
					//	title:'Settings',
					//	icon:'fas fa-cog',
					//	message:'Get pump settings',
					//	command:'Settings'
					//}
					{
						title:'Silence',
						icon:'fas fa-bell-slash',
						message:'Silence Alert',
						command:'Silence Alert'
					}
				],
				[
					/*{
						title:'Pump Test',
						icon:'leafIconSvg',
						message:'Pump test',
						command:'Pump test'
					} ,

					{
						title:'More',
						icon:'leafIconSvg',
						message:'More?',
						command:'pump batt'
					} */
				]
			];
			
			$scope.getIpAddress = function() {
				if ($rootScope.selectedPump === null || $rootScope.selectedPump === undefined) {
					return;
				}

				if ($rootScope.selectedPump.macaddress == null || $rootScope.selectedPump.macaddress == undefined || $rootScope.selectedPump.macaddress.length === 0) {
			    } else {
					var loginData = PumpApp.Request.Builder.Login();
					$rootScope.makeRequest(loginData).then(
						function success(response){
							var getData = PumpApp.Request.Builder.SearchPumpIp(
							  response.data[1], "0x"+$rootScope.selectedPump.macaddress+"0000");
							$rootScope.makeRequest(getData).then(
								function(response) {
									if (response.data[1].length == 1) {
										var ipStr = response.data[1][0][0];			
										if (ipStr !== '0xffffffff') {
											var first =  parseInt(ipStr.substring(2, 4), 16);
											var second = parseInt(ipStr.substring(4, 6), 16);
											var third =  parseInt(ipStr.substring(6, 8), 16);
											var fouth =  parseInt(ipStr.substring(8, 10), 16);
											$rootScope.selectedPump.wifiipaddress =
												first.toString()+'.'+second.toString()
	 											+'.'+third.toString()+'.'+fouth.toString();
										}
									}
								},
								function error(e){
									//debugger;
								}
							);
						},
						function error(e){
							//debugger;
						}
					);
			    }
			};
			$scope.getIpAddress();


			$scope.watchMessages = $rootScope.$watch('messages', function (newValue, oldValue, scope) {
				$rootScope.updateCurrentMessages();
				$rootScope.markAllAsRead($scope.pumpDetails[$rootScope.messagesStoreByPumpProperty]);
			}, true);
			
			$scope.messageItemHeight = null;
			$scope.$on('ngRepeatFinished', function(ngRepeatFinishedEvent) {
				if ($scope.messageItemHeight === null) {
					$scope.messageItemHeight = $('.messagesMainContainter').height()*0.12;
				}
				
				$(".messagesListContainer").scrollTop($('.messagesListContainer')[0].scrollHeight);
			});
			
			$scope.messageDateToLocale = function(utcDtStr) {
				return PumpApp.Utils.utcStringAsLocalTimeString(utcDtStr);
			}
		
			$scope.toggleShowShortcuts = function(forceValue) {
				if (angular.isDefined(forceValue)) {
					$scope.showingShortcuts = forceValue;
				}
				else {
					$scope.showingShortcuts = !$scope.showingShortcuts;
				}
				
				var newHeight = ($scope.showingShortcuts?48:10);
				var newBarHeight = ($scope.showingShortcuts?$('.messagesInputTop').height():100);
				var newBottomHeight = (($('.messagesMainContainter').height()*(newHeight/100))-newBarHeight);
				newBarHeight += ($scope.showingShortcuts?'px':'%');
				
				$('.messagesInputTop').css('height',newBarHeight);
				$('.messagesShortcuts').css('height',newBottomHeight+'px');
				$('.messagesInputContainer').css('height',newHeight+'%');
				$('.messagesListContainer').css('height',(100-newHeight)+'%');
				
				if (!$scope.hasScrolled) {
					$(".messagesListContainer").scrollTop($('.messagesListContainer')[0].scrollHeight);
				}
			}
			
			$scope.handleScroll = function() {
				if (!$scope.hasScrolled) {
					$scope.hasScrolled = true;
				}
			};
			$(".messagesListContainer").on( "scroll", $scope.handleScroll );
			
			$scope.sendInputAsCommand = function() {
				$scope.toggleShowShortcuts(false);
				
				var command = $scope.messageInputText;
				var message = 'Executing command: ' + command;
				
				$rootScope.sendMessage($rootScope.selectedPump, command, message);
				
				$scope.messageInputText = '';
			};
			
			$scope.shortcutClick = function(shortcut) {
				$scope.toggleShowShortcuts(false);
				
				$scope.sendMessageToPump($rootScope.selectedPump, shortcut.command, shortcut.message);
			};
			
			$scope.sendMessageToPump = function(pump, command, message) {
				if (pump === null || pump === undefined) {
					//Send command to all pumps
					for (var i = 0; i < $rootScope.pumps.length; i++) {
						$rootScope.sendMessage($rootScope.pumps[i], command, message);
					}
				} 
				else {
					$rootScope.sendMessage(pump, command, message);
				}
			};
			
			$scope.messagesBack = function() {
				$rootScope.rootBackFunc = $rootScope.masterRootBack;
				$rootScope.navigateToPage($scope.parentPage);
			};
			$rootScope.rootBackFunc = $scope.messagesBack;
			
			$scope.keyboadIsShown = false;
			$scope.keyboardshow = function(e)
			{
				$rootScope.$apply(function () {
					$scope.keyboadIsShown = true;
					$scope.toggleShowShortcuts(false);
				});
				if (PumpApp.Utils.isAndroid()) { //Android
					$('.messagesInputContainer').css('bottom', e.keyboardHeight + 'px');
				}
				StatusBar.hide();
			};
			$scope.keyboardhide = function(e) {
				$rootScope.$apply(function () {
					$scope.keyboadIsShown = false;
				});
				$('.messagesInputContainer').css('bottom', '0');
				StatusBar.hide();
			};
			$scope.dismissKeyboad = function(e) {
				$rootScope.$apply(function () {
					$scope.toggleShowShortcuts(false);
				});
			};

			if (PumpApp.Utils.isPhone()) {
				window.addEventListener('native.keyboardshow', $scope.keyboardshow);
				window.addEventListener('native.keyboardhide', $scope.keyboardhide);
			}
			
			$scope.$on("$destroy",
				function() {
					$rootScope.selectedPump = null;
					$rootScope.currentMessages = null;
					if ($scope.watchMessages !== null && $scope.watchMessages !== undefined) {
						$scope.watchMessages();
					}
					
					if (PumpApp.Utils.isPhone()) {
						window.removeEventListener('native.keyboardshow', $scope.keyboardshow);
						window.removeEventListener('native.keyboardhide', $scope.keyboardhide);
					}
				}
			);
			
			$rootScope.createMenu([]);
			
			$scope.pumpDetails = $rootScope.selectedPump;
			if ($scope.pumpDetails === null || $scope.pumpDetails === undefined) {
				$scope.pumpDetails = {
					id:'',
					idAsNumber:0,
					name:'All Pumps',
					description:''
				};
			}
			
			$rootScope.markAllAsRead($scope.pumpDetails[$rootScope.messagesStoreByPumpProperty]);

			$timeout(function(){
				$scope.toggleShowShortcuts(true);
			}, 750);

	}]);
})();
