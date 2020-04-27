(function(){
	"use strict";
	
	window.PumpApp = window.PumpApp || {};
	window.PumpApp.Request = window.PumpApp.Request || {};
	
	var requestBuilder = {
		Login: function() {
			return [["LOGIN", "0x0001", "admin", "password"]];
		},
		GetAllPumps: function(data) {
			return [["GET", data], ["//0x02/0x01", "@ALL_NODE", "@INDEX,1,2,9,5,6,19,22,24,21"]];
		},
		GetPumpById: function(data, pumpId) {
			return [["GET", data], ["//0x02/0x01", pumpId, "@INDEX,1,2,9,5,6,19,22,24,21"]];
		},
		GetPumpByIds: function(data, pumpIds) {
			return [["GET", data], ["//0x02/0x01", [pumpIds], "@INDEX,1,2,9,5,6,19,22,24,21"]];
		},
		ExecuteCommand: function(data, pumpId, command) {
			return [["NODE_STRCMD", data], ["//0x02/0x01", pumpId, command]];
		},
		AppNodeSearch: function() {
			return [["APP_NODESEARCH","","0123456789012345"]];
		},
		NodePropertyGet: function(data, pumpId, propertyName) {
			return [["NODE_PROPERTY_GET",data],["//0x02/0x01",pumpId,propertyName]];
		},
		NodePropertySet: function(data, pumpId, propertyName, propertyValue) {
			return [["NODE_PROPERTY_SET", data],["//0x02/0x01",pumpId,propertyName,propertyValue]];
		},
		PutTokenIds: function(data, pumpId, phoneName, platform, fcmToken, deviceId) {
			return [["PUT_TOKENIDS", data],["//0x02/0x01", pumpId, [[phoneName, "FCM", platform, fcmToken, deviceId]]]];
		},
		SearchPumpField: function(data, mac, fieldNo) {
			return [["SEARCH", data],["//0x02/0x01", [["0x2", "=", mac]], fieldNo, "1,20"]];
		},
		SearchPumpIp: function(data, mac) {
			return [["SEARCH", data],["//0x02/0x01", [["0x2", "=", mac]], "9", "1,20"]];
		},
		UpgradeFirmware: function(data, pumpId) {
			return [["NODE_ACTOND", data],["//0x02/0x01", pumpId]];
		},
		GetHistory: function(data, pumpId) {
			return [["NODE_HISTORY_GET",data],["//0x02/0x01",pumpId,"0","30","END"]];
		},
		HistoryStart: function(data, pumpId) {
			return [["NODE_HISTORY_START",data],["//02/01" ,pumpId]];
		},
		GetPhoneListByMac: function(data, mac) {
			return [["GET_EXT_UUID",data],["//0x02/0x01",mac]];
		},
		GetPhoneListById: function(data, pumpId) {
			return [["GET_EXT_UUID", data],["//0x02/0x01", pumpId]];
		},
		PutExtUuid: function(data, pumpId, deviceId, phoneName, slot) {
			return [["PUT_EXT_UUID", data],["//0x02/0x01", pumpId, [[deviceId, phoneName, slot]]]];
		},
		DelExtUuid: function(data, pumpId, slot) {
			return [["PUT_EXT_UUID", data],["//0x02/0x01", pumpId, [["", "", slot]]]];
		},
		Register: function(data, deviceId, phoneName, platform, fcmToken) {
			return [["REGISTER", data],["//0x02/0x04", deviceId, "2,3,11,12,24", [deviceId, platform, phoneName, "FCM", fcmToken]]];
		},

///////////// New Protocol Proposed 9/25/2018
		RegisterPhone: function(data, deviceId, fcmToken, phoneName, platform, fname, lname, email) {
			return [["REGISTER_PHONE", data], [deviceId, fcmToken, phoneName, platform, "FCM", fname, lname, email]];
		},

		AddPhone: function(data, deviceId, mac, lat, lng, alt, zip, datetime) {
			return [["ADD_PHONE", data], [deviceId, mac, lat, lng, alt, zip, datetime]];
		},

		AddPhoneNoGps: function(data, deviceId, mac, zip, datetime) {
			return [["ADD_PHONE", data], [deviceId, mac, "", "", "", zip, datetime]];
		},

		GetUUIDs: function(data, mac) {
			return [["GET_UUID", data], [mac]];
		},

		DelUUID: function(data, mac, idx) {
			return [["DEL_UUID", data], [mac, idx]];
		},

		GetPumpByUUID: function(data, deviceId) {
			return [["GET_PUMP_BY_UUID", data], [deviceId]];
		}

///////////// New Protocol Proposed 9/25/2018
	};
	window.PumpApp.Request.Builder = requestBuilder;
})();




/*

0x5c46a46774dd1b55

[["GET_EXT_UUID", "0x5c3cb7800d301cbe"],["//0x02/0x01", "0x0007"]]

[["GET_PUMP_BY_UUID", "0x5c3cb7800d301cbe"], ["35c6a2a7e2908a790000000000000000"]]

[["NODE_HISTORY_START","0x5c3cb7800d301cbe"],["//02/01" ,"0x000f"]]

[["NODE_HISTORY_GET","0x5c46a46774dd1b55"],["//0x02/0x01","0x000f","0","30","END"]]


[["GET_EXT_UUID", "0x5be83dcfb2621eec"],["//0x02/0x01", "0x0007"]]
[["GET_UUID", "0x5bf565cbc3012c48"], ["0xecfabc1195340000"]]
[["DEL_UUID", "0x5be84bd672c7f103"], ["0xecfabc1195340000", "3"]]
[
  "success",
  "0x5bf565cbc3012c48"
]207.135.172.62
[
  "success",
  [
    [
      "35c6a2a7e2908a790000000000000000",
      "Ming Android Phone",
      "0"
    ],
    [],
    [
      "",
      "",
      "2"
    ],
    [],
    []
  ]
]

[["GET_PUMP_BY_UUID", "0x5bb63aeb61e33633"], ["35c6a2a7e2908a790000000000000000"]]

[["PUT_EXT_UUID", "0x5b60f85a73687cf6"],["//0x02/0x01", "0x0007", [["", "", "2"]]]]

[["GET_EXT_UUID", "0x5b534757b7f9eb9c"],["//0x02/0x01", "0x0007"]]


[["PUT_EXT_UUID","0x5b534757b7f9eb9c"],["//0x02/0x01","0x0007",[["35c6a2a7e2908a790000000000000000","Ming Android Phone","2"]]]]

删除：[["PUT_EXT_UUID","0x5b4f7e3c592ffd59"],["//0x02/0x01","0x0008",[["","","2"]]]]

查询所有UUID：[["GET_EXT_UUID","0x5b4f9664ce10cbe0"],["//0x02/0x01","0x0008"]]
*/
