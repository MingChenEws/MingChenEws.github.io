(function(){
	"use strict";
	
	window.PumpApp = window.PumpApp || {};
	
	var me = function() {
		this.firstname='';
		this.lastname='';
		this.name='';
		this.email='';
		this.zipcode='';
		this.allowlocation=null;
		this.wifiname='';
		this.wifipass='';
		this.wifipassexists=null;
		this.apptokenid='';
		this.appid='';
		this.deviceuuid='';
		this.platform='';
		this.model='';
		this.fcmtoken='';
		this.ipaddress='';
		this.init=false;
		this.currentwifiname='';
		this.debuglevel='1';
		this.ALERT_level=1;
		this.requesturlserver='ECO-FLO North America Server';
		this.requesturlip='13.86.34.108';
		this.setuptimemultiplier=2;
		this.done = false;
		this.setupChecks = [ { selected:false }, { selected:false }, { selected:false } ];
	};
	window.PumpApp.Me = me;

	const pump = {
		id:null,   //
		idAsNumber:-1,
		description:'', //
		imeid:'',
		serialno:'',
		lot : null, // use lot for Paid or Non-Paid
		curFwVer : '',
		newFwVer : '',
		statusFlag : null,
		pumpData : null,
		isFirmwareUpgadeAvailable : false,
		isPumpOffline : false,
		isPaid : true,
		isInPump : false,
		isAccessible : false,

		error : '00',
		error2 : '',
		name:'',  // ECO-FLO-serialending
		
		waterLvl : 0,
		lastCurr : 0,
		run : 0,
		gallons : 0,
		lifetime : 0,
		ac : 0,
		batV : 0,
		temp : 0,
		ampC : 0,
		ampA : 0,
		ctimeAvg : 0,

		waterLevel : '',
		waterCurrent : '',
		runCycle : '',
		gallonsPumped : '',
		lifetimeCycle : '',
		acVoltage : '',
		batteryVoltage : '',
		roomTemperature : '',
		lastUpdateTime : '',

		ampCurrent : '',
		ampAvg : '',
		cycleTimeAvg : '',

		errorMessage : '',
		error2Message : '',

		statusList : null,
		
		serialending : '',  //
		macaddress : '',  //
		wifiipaddress : '', //
		wifiname : '', //
		connectiondata: '' // use connectiondata for Available or not
	};

	var errorCodes = {
		'01' : 'Water level too high',
		'11' : 'Pump is on',
		'21' : 'Pump disconnected / low current',
		'22' : 'Pump current too high',
		'31' : 'Relay malfunctioned',
		'41' : 'Sensor disconnected',
		'51' : 'AC power lost',
		'52' : 'AC power too low',
		'53' : 'AC power too high',
		'62' : 'Battery low',
		'63' : 'Battery critically low',
		'64' : 'Battery disconnected',
		'65' : 'Battery dead',
		'71' : 'Room temperature high',
		'72' : 'Room temperature low',
		'81' : 'Cellular signal low',
		'91' : 'Lost connection to cloud',
		'a1' : 'Is unlocked',
		'b1' : 'Alarm input is on',
		'c1' : 'pump disconnected or current too low',
		'c2' : 'pump current too high'
	};
	window.PumpApp.ErrorCodes = errorCodes;
  
	var errorDetails = {
		'01' : 'The water level in your sump basin has exceeded the normal operating range of your pump.  This needs immediate attention or there is a risk of overflow and flooding!  See below for troubleshooting or call Customer Service at 877-326-3561.\n\n1. The water is coming in the sump basin faster than the pump can clear it, even though the pump is operating normally.  Add an auxiliary pump to keep up with in-flow.\n2. The pump inlet or discharge is clogged.  Find and clear clog.\n3. The check valve (if installed) has failed or is installed backward and is not allowing water to pass.  Replace check valve.\n4. Pump motor has overloaded and needs to cool down for several minutes before automatically restarting.',
		'11' : 'TBD',
		'21' : 'TBD',
		'22' : 'TBD',
		'31' : 'Your pump controller possible has experienced a switch failure. Call customer service at 877-326-3561.',
		'41' : 'Your pump controller possible has experienced a water sensor failure. Call customer service at 877-326-3561.',
		'51' : 'Your pump circuit has experienced a power outage.  Please restore power as soon as possible.  For troubleshooting see below or call customer service at 877-326-3561.\n\n1. Pump may have tripped breaker or blown fuse.  Re-set breaker or replace fuse at breaker or fuse box.\n2. For whole-home power outage, notifiy utility and await power restoration.  Use manual pump if necessary to prevent flooding.',
		'52' : 'Notice: voltage to pump is outside of normal range.  See below for troubleshooting or call Customer Service at 877-326-3561.\n\n1. Make sure pump system is on dedicated circuit.  Pump should not be installed on an electrical circuit with other appliances or a drop in voltage could cause pump not to start.\n2. Never use an extension cord with the pump.  The pump power cord needs to be plugged directly in to a GFCI wall outlet.\n3. If voltage supplied is too high (rare), check with your electric supplier for possible solutions.',
		'53' : 'Notice: voltage to pump is outside of normal range.  See below for troubleshooting or call Customer Service at 877-326-3561.\n\n1. Make sure pump system is on dedicated circuit.  Pump should not be installed on an electrical circuit with other appliances or a drop in voltage could cause pump not to start.\n2. Never use an extension cord with the pump.  The pump power cord needs to be plugged directly in to a GFCI wall outlet.\n3. If voltage supplied is too high (rare), check with your electric supplier for possible solutions.',
		'62' : 'The voltage of the 9V battery in your pump control box is low.  Replace the battery soon.',
		'63' : 'The voltage of the 9V battery in your pump control box is critically low.  Replace the battery as soon as possible.',
		'64' : 'The 9V battery in your pump control box is disconnected.  Please re-connect battery.',
		'65' : 'The 9V battery in your pump control box needs to be replaced immediately.',
		'71' : 'The room temperature in the location of your pump system has reached a critical level. This could be caused by an overheating pump or some other reason.  Please check for issues.',
		'72' : 'The room temperature in the location of your pump system has reached a critically low level.  Please check for issues.',
		'81' : 'TBD',
		'91' : 'Your pump system has lost connection to the cloud.  You may not receive notifications or be able to control pump remotely until connectivity is restored.',
		'a1' : 'TBD',
		'b1' : 'TBD',
		'c1' : 'Your pump electrical current (amps) is low when pump is running.  See below for troubleshooting or call Customer Service at 877-326-3561.\n\n1. Check that pump impeller is tightly secured to pump shaft.\n2. Check that discharge pipe is securely attached to pumps and no leaks are present',
		'c2' : 'Notice: amps are trending up.  See below for troubleshooting or call Customer Service at 877-326-3561.\n\n1. Check for debris around pump inlet or stuck inside pump.  See Owner Manual for instructions or see PDF here (clickable).\n2. Make sure check valve (if installed) is operating properly.\n3. Check that discharge piping has not come apart at any fitting.'
	};
	window.PumpApp.ErrorDetails = errorDetails;

	window.PumpApp.Pump = pump;
	window.PumpApp.PumpUtil = {};
	window.PumpApp.PumpUtil.create = function() {
		var newPump = Object.create(PumpApp.Pump);
		return newPump;
	};
	window.PumpApp.PumpUtil.createFromData = function(data) {
		var newPump = Object.create(PumpApp.Pump);
		newPump.id=data[1];
		newPump.idAsNumber=parseInt(newPump.id.slice(2,6), 16);
		newPump.description='Test description';
		//newPump.imeid=data[2].slice(2, 18).toUpperCase();
		newPump.imeid=data[2].slice(2, 14);
		newPump.wifiipaddress = parseInt(data[3].substring(2, 4), 16).toString() + '.' +
														parseInt(data[3].substring(4, 6), 16).toString() + '.' +
														parseInt(data[3].substring(6, 8), 16).toString() + '.' +
														parseInt(data[3].substring(8, 10), 16);

		newPump.serialno=PumpApp.Utils.toASCII(data[4]) + 'C' + PumpApp.Utils.padLeft(parseInt(data[5], 16));
		//newPump.isPaid = data[4];
    if (data[6].length === 18) {
    	newPump.curFwVer = PumpApp.Utils.padVer(parseInt(data[6].slice(10, 14), 16)) + '.' + 
											PumpApp.Utils.padVer(parseInt(data[6].slice(14, 18), 16));
		} else {
  	  newPump.curFwVer = PumpApp.Utils.padVer(parseInt(data[6].slice(2, 6), 16)) 
				+ '.' + PumpApp.Utils.padVer(parseInt(data[6].slice(6, 10), 16));

		}
    newPump.newFwVer = PumpApp.Utils.padVer(parseInt(data[9].slice(2, 6), 16)) 
			+ '.' + PumpApp.Utils.padVer(parseInt(data[9].slice(6, 10), 16));

    //newPump.statusFlag = data[7];
		newPump.statusFlag = PumpApp.Utils.toSomething(data[7].substring(2, 10), 32);
		var bit29 = newPump.statusFlag.slice(2, 3);
		var bit27 = newPump.statusFlag.slice(4, 5);
		var bit0 = newPump.statusFlag.slice(31, 32);
		if (bit27 == '1' || bit29 == '1') {
			newPump.isFirmwareUpgadeAvailable = true;
		} else {
			newPump.isFirmwareUpgadeAvailable = false;
		}
		newPump.isPumpOffline = (bit0 === '1') ? true : false;

		if (data[8].length > 0) {
      newPump.pumpData = data[8].slice(2, data[8].length);

		////////////////////////////////////////////////////////////////////////////////
		newPump.temp = parseInt(newPump.pumpData.slice(0, 4), 16) / 10;
		newPump.batV = parseInt(newPump.pumpData.slice(4, 8), 16) / 10;
		newPump.lastCurr = parseInt(newPump.pumpData.slice(8, 12), 16) / 10;
		newPump.ac = parseInt(newPump.pumpData.slice(12, 16), 16);
		newPump.waterLvl = parseInt(newPump.pumpData.slice(16, 20), 16) / 10;
		newPump.statusList = PumpApp.Utils.toSomething(newPump.pumpData.slice(20, 24), 16).split('');

		newPump.error = newPump.pumpData.slice(24, 26);
		newPump.error2 = newPump.pumpData.slice(26, 28);
		newPump.lifetime = parseInt(newPump.pumpData.slice(28, 36), 16);
		newPump.gallons = parseInt(newPump.pumpData.slice(36, 40), 16);
		newPump.run = parseInt(newPump.pumpData.slice(40, 44), 16);
		////////////////////////////////////////////////////////////////////////////////
	}

		newPump.name=PumpApp.Constants.SerialPrefix+newPump.serialno.slice(-6);
		newPump.waterLevel = newPump.waterLvl + ' Inches';	
		newPump.waterCurrent = newPump.lastCurr + ' GPM';
		newPump.runCycle = newPump.run + '';
		newPump.gallonsPumped = newPump.gallons + ' G';
		newPump.lifetimeCycle = newPump.lifetime + '';
		newPump.acVoltage = newPump.ac + ' V';
		newPump.batteryVoltage = newPump.batV + ' V';
		newPump.roomTemperature = newPump.temp + ' F';

		if (errorCodes[newPump.error] === undefined
			&& newPump.error !== '') {
				newPump.errorMessage = 'Unknown (0x'+newPump.error+')';
		} else newPump.errorMessage = errorCodes[newPump.error];

		if (errorCodes[newPump.error2] === undefined
			&& newPump.error2 !== '') { 
				newPump.error2Message = 'Unknown (0x'+newPump.error2+')';
		} else newPump.error2Message = errorCodes[newPump.error2];

		return newPump;2
	};

///////////////////////////////////////////////////////////
	window.PumpApp.PumpUtil.updateFromData = function(refpump, data, ssid) {

		refpump.id=data[1];
		refpump.idAsNumber=parseInt(refpump.id.slice(2,6), 16)
		refpump.wifiipaddress = parseInt(data[3].substring(2, 4), 16).toString() + '.' +
														parseInt(data[3].substring(4, 6), 16).toString() + '.' +
														parseInt(data[3].substring(6, 8), 16).toString() + '.' +
														parseInt(data[3].substring(8, 10), 16);
		//alert('>>>>updateFromData::refpump.id='+refpump.id+', idAsNumber='+refpump.idAsNumber +', wifiipaddress='+refpump.wifiipaddress);

		//refpump.imeid=data[2].slice(2, 18).toUpperCase();
		refpump.imeid=data[2].slice(2, 14);
		refpump.serialno=PumpApp.Utils.toASCII(data[4]) + 'C' + PumpApp.Utils.padLeft(parseInt(data[5], 16));
		//if ((refpump.name === undefined) || (refpump.name.length === 0)) {
			refpump.name=PumpApp.Constants.SerialPrefix+refpump.serialno.slice(-6);
		//}
		//refpump.isPaid = data[4];

		refpump.isInPump = true;
		if (refpump.isPaid === null || refpump.isPaid !== true) {
			if (refpump.wifiname === ssid) {
				refpump.isAccessible = true;
		  } else {
				refpump.isAccessible = false;
			}
		} else {
			refpump.isAccessible = true;
		} 

    if (data[6].length === 18) {
			refpump.curFwVer = PumpApp.Utils.padVer(parseInt(data[6].slice(10, 14), 16)) 
				+ '.' + PumpApp.Utils.padVer(parseInt(data[6].slice(14, 18), 16));
		} else {
		  refpump.curFwVer = PumpApp.Utils.padVer(parseInt(data[6].slice(2, 6), 16)) 
				+ '.' + PumpApp.Utils.padVer(parseInt(data[6].slice(6, 10), 16));
		}

    refpump.newFwVer = PumpApp.Utils.padVer(parseInt(data[9].slice(2, 6), 16)) 
			+ '.' + PumpApp.Utils.padVer(parseInt(data[9].slice(6, 10), 16));
    //refpump.statusFlag = data[7];

		refpump.statusFlag = PumpApp.Utils.toSomething(data[7].substring(2, 10), 32);
		var bit29 = refpump.statusFlag.slice(2, 3);
		var bit27 = refpump.statusFlag.slice(4, 5);
		var bit0 = refpump.statusFlag.slice(31, 32);
		if (bit27 == '1' || bit29 == '1') {
			refpump.isFirmwareUpgadeAvailable = true;
		} else {
			refpump.isFirmwareUpgadeAvailable = false;
		}
		refpump.isPumpOffline = (bit0 === '1') ? true : false;

		if (data[8].length > 0) {
			refpump.pumpData = data[8].slice(2, data[8].length);
			//alert('data[8].length='+data[8].length+', refpump.pumpData.length='+refpump.pumpData.length);

			if (refpump.pumpData.length == 44) { // Old data
				////////////////Data Decode before 20180707////////////////////////////////////
				refpump.temp = parseInt(refpump.pumpData.slice(0, 4), 16) / 10;
				refpump.batV = parseInt(refpump.pumpData.slice(4, 8), 16) / 10;
				refpump.lastCurr = parseInt(refpump.pumpData.slice(8, 12), 16) / 10;
				refpump.ac = parseInt(refpump.pumpData.slice(12, 16), 16);
				refpump.waterLvl = parseInt(refpump.pumpData.slice(16, 20), 16) / 10;
				refpump.statusList = PumpApp.Utils.toSomething
															(refpump.pumpData.slice(20, 24), 16).split('');
				refpump.error = refpump.pumpData.slice(24, 26);
				refpump.error2 = refpump.pumpData.slice(26, 28);
				refpump.lifetime = parseInt(refpump.pumpData.slice(28, 36), 16);
				refpump.gallons = parseInt(refpump.pumpData.slice(36, 40), 16);
				refpump.run = parseInt(refpump.pumpData.slice(40, 44), 16);
				////////////////////////////////////////////////////////////////////////////////
				refpump.ampCurrent = 'n/a Amp';
				refpump.ampAvg = 'n/a Amp';
				refpump.cycleTimeAvg = 'n/a sec';
			} else if (refpump.pumpData.length == 56) { // New Data
				////////////////Data Decode after 20180707 - with Mark's new document /////////////////
				var tmp = refpump.pumpData.slice(0, 4).toLowerCase();
				if (tmp !== 'ffff')
					refpump.temp = parseInt(refpump.pumpData.slice(0, 4), 16) / 10;
				tmp = refpump.pumpData.slice(4, 8).toLowerCase();
				if (tmp !== 'ffff')
					refpump.batV = parseInt(refpump.pumpData.slice(4, 8), 16) / 10;
				tmp = refpump.pumpData.slice(8, 12).toLowerCase();
				if (tmp !== 'ffff')
					refpump.lastCurr = parseInt(refpump.pumpData.slice(8, 12), 16) / 10;
				tmp = refpump.pumpData.slice(12, 16).toLowerCase();
				if (tmp !== 'ffff')
					refpump.gallons = parseInt(refpump.pumpData.slice(12, 16), 16);
				tmp = refpump.pumpData.slice(16, 20).toLowerCase();
				if (tmp !== 'ffff')
					refpump.ampC = parseInt(refpump.pumpData.slice(16, 20), 16) / 10;
				tmp = refpump.pumpData.slice(20, 24).toLowerCase();
				if (tmp !== 'ffff')
					refpump.ampA = parseInt(refpump.pumpData.slice(20, 24), 16) / 10;
				tmp = refpump.pumpData.slice(24, 28).toLowerCase();
				if (tmp !== 'ffff')
					refpump.ac = parseInt(refpump.pumpData.slice(24, 28), 16);
				tmp = refpump.pumpData.slice(28, 32).toLowerCase();
				if (tmp !== 'ffff')
					refpump.waterLvl = parseInt(refpump.pumpData.slice(28, 32), 16) / 10;

				refpump.statusList = PumpApp.Utils.toSomething
															(refpump.pumpData.slice(32, 36), 16).split('');
				refpump.error = refpump.pumpData.slice(36, 38);
				refpump.error2 = refpump.pumpData.slice(38, 40);

				tmp = refpump.pumpData.slice(40, 48).toLowerCase();
				if (tmp !== 'ffffffff')
					refpump.lifetime = parseInt(refpump.pumpData.slice(40, 48), 16);
				tmp = refpump.pumpData.slice(48, 52).toLowerCase();
				if (tmp !== 'ffff')
					refpump.run = parseInt(refpump.pumpData.slice(48, 52), 16);
				tmp = refpump.pumpData.slice(52, 56).toLowerCase();
				if (tmp !== 'ffff')
					refpump.ctimeAvg = parseInt(refpump.pumpData.slice(52, 56), 16);
				////////////////////////////////////////////////////////////////////////////////
				refpump.ampCurrent = refpump.ampC + ' Amp';
				refpump.ampAvg = refpump.ampA + ' Amp';
				refpump.cycleTimeAvg = refpump.ctimeAvg + ' sec';
			} else {
				//alert('Incorrect data buffer size ['+refpump.pumpData.length+'] =='+refpump.pumpData );
			}
		}

		if (data.length === 10) { // No last update time
			refpump.lastUpdateTime = '';
		} else {
			refpump.lastUpdateTime = PumpApp.Utils.lastUpdateDateTimeString(data[10]);
		}

		refpump.roomTemperature = refpump.temp + ' F';
		refpump.batteryVoltage = refpump.batV + ' V';
		refpump.waterCurrent = refpump.lastCurr + ' GPM';
		refpump.gallonsPumped = refpump.gallons + ' G';

		refpump.acVoltage = refpump.ac + ' V';
		refpump.waterLevel = refpump.waterLvl + ' Inches';	
//ERROR Code
		refpump.lifetimeCycle = refpump.lifetime + '';
		refpump.runCycle = refpump.run + '';


		if (errorCodes[refpump.error] === undefined
			&& refpump.error !== '') {
				refpump.errorMessage = 'Unknown (0x'+refpump.error+')';
		} else refpump.errorMessage = errorCodes[refpump.error];

		if (errorCodes[refpump.error2] === undefined
			&& refpump.error2 !== '') {
				refpump.error2Message = 'Unknown (0x'+refpump.error2+')';
		} else refpump.error2Message = errorCodes[refpump.error2];
	};
//////////////////////////////////////////////////////////////////
	
	var message = function(msg) {
		this.datetime = PumpApp.Utils.utcNowAsString();
		this.message = msg.message;
		this.unread = true;
		this.isAlert = false;
		this.pumpIdentity = msg.pumpIdentity;
		if (angular.isDefined(msg.isAlert)) {
			this.isAlert = msg.isAlert;
		}
		this.senderIsPump = true;
		if (angular.isDefined(msg.senderIsPump)) {
			this.senderIsPump = msg.senderIsPump;
		}
		if (angular.isDefined(msg.errCode)) {
			this.errCode = msg.errCode;
		} else {
			this.errCode = '';
		}
	};
	window.PumpApp.Message = message;

	var pumpConstants = {
		RequestUrlIp: "13.86.34.108",
		RequestUrl: "http://13.86.34.108:8090/AVAT_DB/ACTION",
		//RequestUrl: "http://207.135.172.62:8090/AVAT_DB/ACTION",
		//RequestUrl: "http://34.228.8.148:8090/AVAT_DB/ACTION",
		SerialPrefix: 'ECO-FLO-',
		PumpApIpAddress: '192.168.4.1',
		PumpApIpSubnet: '192.168.4',
		PumpApPortNo: 333
	};
	window.PumpApp.Constants = pumpConstants;
})();
