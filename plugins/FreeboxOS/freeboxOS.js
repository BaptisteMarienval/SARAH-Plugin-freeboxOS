exports.action = function(data, callback, config, SARAH){

	// Retrieve config
	config = config.modules.freeboxOS;
	
	var http     = require('http'),
	request      = require('request'),
	crypto       = require('crypto');
	
	// Paramètres Freebox
	var callLogsURL 		= "call/log/";
	var authURL 			= "login/authorize/";
	var loginURL 			= "login/";
	var loginSessionURL 	= "login/session/";
	var lanConfigURL 		= "lan/config/";
	var connectionStatusURL = "connection/";
	var connectionConfigURL = "connection/config/";
	var wifiConfigURL 		= "wifi/config/";
	
	var baseURL 	= config.freeboxAddr;
	var track_id	= config.track_id;
	var app_token	= config.app_token;
	var app_id 		= config.app_id;    
	var app_name 	= config.app_name;
	var app_version = config.app_version;
	var device_name = config.device_name;
	
	// Paramètres Application
	var periodHisto = data.periodHisto;
	var periodMissCall = data.periodMissCall;
	var app = {
		status        : 'granted',
		logged_in     : false,
		challenge     : '',
		password      : '',
		session_token : '',
		permissions   : {}
	};
	
	var debug = true;
	var mois = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'décembre'];

		
/************************************************* 
*************** MAIN ************************
**************************************************/	
// Demande d'authentification lors de la 1ère utilisation.
// Acceptez via l'ecran de la freebox !!!
if (data.actionToDo == 'askAuth') {
	authRequest();
}
// Etape nécessaire une fois authentification validée physiquement sur freebox
// Permet de récupérer de quoi générer le password (ne faire qu'une fois également)
if (data.actionToDo == 'confirmAuth') {
	acceptAuth(sessionRequest);
}
// Récupération des log d'appels
if (data.actionToDo == 'histoCall' || data.actionToDo == 'missingCall' ) {
 sessionRequest(callList);
}

// Récupération des infos LAN
if (data.actionToDo == 'getIPLan') {
 sessionRequest(lanConfig);
}

// Récupération des infos LAN
if (data.actionToDo == 'getIPWeb') {
 sessionRequest(connectionStatus);
}

// Récupération des infos de connection
if ((data.actionToDo == 'getMaxBandwidth') || (data.actionToDo == 'getCurrentBandwidth')) {
 sessionRequest(connectionStatus);
}

// Récupération des infos wifi
if ((data.actionToDo == 'getWifiStatus')) {
 sessionRequest(wifiConfig);
}

// Modification de la configuration wifi
if ((data.actionToDo == 'setWifiOn') || (data.actionToDo == 'setWifiOff')) {
 sessionRequest(setWifiConfig);
}


/********************************************
*************** CALL LOGS********************
********************************************/
function callList() {

	var options = {
			url : baseURL+callLogsURL,
			headers : {
				'X-Fbx-App-Auth' : app.session_token
			}, 
			method : 'GET',
		};

		request(options, function (error, response, body) {
		
				if (!error && response.statusCode == 200){
					var bodyJSON = JSON.parse(body);

					var myDate = new Date();

					var period = "";
					
					if (data.actionToDo == 'histoCall') {
					period = periodHisto;
					}
					if (data.actionToDo == 'missingCall') {
					period = periodMissCall;
					}

					myDate.setDate(myDate.getDate() - period);
					myDate.setHours(0);
					myDate.setMinutes(0);
					
					var strResult = "";
					var cptAppel = 0;
					var type ="";
					
					var intro ="appel";
					
					for (var i = 0; i < bodyJSON.result.length; i++) {
						var jour = new Date(bodyJSON.result[i].datetime*1000);

						if (myDate <= jour) {
							
							if (bodyJSON.result[i].type == 'accepted') {
							type = " appel reçu de ";
							}
							if (bodyJSON.result[i].type == 'outgoing') {
							type = " appel emis vers ";
							}
							if (bodyJSON.result[i].type == 'missed') {
							type = " appel manqué de ";
							}

							
							if (data.actionToDo == 'missingCall') {
								intro = "appel manqué";
								if (bodyJSON.result[i].type == 'missed'){
									cptAppel++;
									strResult += ". le "+jour.getDate()+" "+(mois[jour.getMonth()])+" a "+jour.getHours()+" heure "+jour.getMinutes()+" : "+bodyJSON.result[i].name+" ."; 
								}
							}
							
							if (data.actionToDo == 'histoCall') {
								intro = "appel";
								cptAppel++;
								strResult += ". le "+jour.getDate()+" "+(mois[jour.getMonth()])+" a "+jour.getHours()+" heure "+jour.getMinutes()+" : "+type+bodyJSON.result[i].name+" ."; 
							}
						}
					}
					
					var tts = "";
					
					if (!(cptAppel>0)) {
						if(period>0) {
							tts="Il n'y a pas eu d'"+intro+" depuis "+period+" jours";
						}
						else {
							tts="Il n'y a pas eu d'"+intro+" aujourd'hui";
						}
					}
					else {
					if(period>0) {
							tts="Il y a eu "+cptAppel+" "+intro+" depuis "+period+" jours";
						}
						else {
							tts="Il y a eu "+cptAppel+" "+intro+" aujourd'hui";
						}
					
					}
					SARAH.speak(tts+". "+strResult);
								}
				else{
					console.log("callList : erreur lors de la requete : "+baseURL+callLogsURL);
				}
			});
}

/********************************************
*************** LAN CONFIG ******************
********************************************/
function lanConfig() {

	var options = {
			url : baseURL+lanConfigURL,
			headers : {
				'X-Fbx-App-Auth' : app.session_token
			}, 
			method : 'GET',
		};

		request(options, function (error, response, body) {
		
				if (!error && response.statusCode == 200){
					var bodyJSON = JSON.parse(body);
					var name_dns = bodyJSON.result.name_dns;
					var name_mdns = bodyJSON.result.name_mdns;
					var name = bodyJSON.result.name;
					var mode = bodyJSON.result.mode;
					var name_netbios = bodyJSON.result.name_netbios;
					var ip = bodyJSON.result.ip;

					var strResult = "";
					var tts = "";
					
					if (data.actionToDo == 'getIPLan') {
						strResult = ip;
						strResult = strResult.replace("."," point ").replace("."," point ").replace("."," point ").replace("."," point ");
						tts = "LIPAI locale de la freebox est : ";
					}
					SARAH.speak(tts+strResult);
				}
				else{
					console.log("callList : erreur lors de la requete : "+baseURL+lanConfigURL);
				}
			});
}


/*****************************************
*************** CONNECTION STATUS ********
*****************************************/
function connectionStatus() {

	var options = {
			url : baseURL+connectionStatusURL,
			headers : {
				'X-Fbx-App-Auth' : app.session_token
			}, 
			method : 'GET',
		};

		request(options, function (error, response, body) {
		
				if (!error && response.statusCode == 200){
					var bodyJSON = JSON.parse(body);
	
						var dlServiceRate = bodyJSON.result.rate_down_priv;
						var ulServiceRate = bodyJSON.result.rate_up_priv;
						var totalServiceUpload = bodyJSON.result.bytes_up_priv;
						var totalUpload = bodyJSON.result.bytes_up;
						var totalServiceDownload = bodyJSON.result.bytes_down_priv;
						var totalDownload = bodyJSON.result.bytes_down;
						var stateConnection = bodyJSON.result.state;
						var typeConnection = bodyJSON.result.type;
						var mediaConnection = bodyJSON.result.media;
						var ipv4 = bodyJSON.result.ipv4;
						var ipv6 = bodyJSON.result.ipv6;
						var downMax = bodyJSON.result.bandwidth_down;
						var upMax = bodyJSON.result.bandwidth_up;
						var downCurrent = bodyJSON.result.rate_down;
						var upCurrent = bodyJSON.result.rate_up;
						
						if ((data.actionToDo == 'getMaxBandwidth') || (data.actionToDo == 'getCurrentBandwidth')) {
					
						downMax = (downMax/1000000)/8;
						upMax = (upMax/1000)/8;
						downCurrent = (downCurrent/1000000)/8;
						upCurrent = (upCurrent/1000)/8;
					
						downMax = Math.round(downMax*100)/100;
						upMax = Math.round(upMax*100)/100;
						downCurrent = Math.round(downCurrent*100)/100;
						upCurrent = Math.round(upCurrent*100)/100;

						var type = "";
						var up ="";
						var down = "";
						if(data.actionToDo == 'getMaxBandwidth') {
							type = "maximum";
							up = upMax;
							down = downMax;
						}
					
						if (data.actionToDo == 'getCurrentBandwidth') {
							type = "actuel";
							up = upCurrent;
							down = downCurrent;
						}
						var ttsUp = "L'euplod "+type+" est de : "+up+" kilo octet par seconde";
						ttsUp=ttsUp.replace(".", " virgule ");
						var ttsDown = "Le download "+type+" est de : "+down+" mega octet par seconde";
						ttsDown=ttsDown.replace(".", " virgule ")
					
						SARAH.speak(ttsDown+". "+ ttsUp);
					}
					if (data.actionToDo == 'getIPWeb') {
						
					
						ipv4 = ipv4.replace("."," point ").replace("."," point ").replace("."," point ").replace("."," point ");
						var tts = "LIPAI web de la freebox est : ";
						SARAH.speak(tts+ipv4);
					}
				}
				else{
					console.log("callList : erreur lors de la requete : "+baseURL+connectionStatusURL);
				}
			});
}

/*****************************************
*************** CONNECTION CONFIG ********
*****************************************/
function connectionConfig() {

	var options = {
			url : baseURL+connectionConfigURL,
			headers : {
				'X-Fbx-App-Auth' : app.session_token
			}, 
			method : 'GET',
		};

		request(options, function (error, response, body) {
		
				if (!error && response.statusCode == 200){
					var bodyJSON = JSON.parse(body);
	
					var ping = bodyJSON.result.ping;
					var is_secure_pass = bodyJSON.result.is_secure_pass;
					var remote_access_port = bodyJSON.result.remote_access_port;
					var remote_access = bodyJSON.result.remote_access;
					var wol = bodyJSON.result.wol;
					var adblock = bodyJSON.result.adblock;
					var adblock_not_set = bodyJSON.result.adblock_not_set;
					var api_remote_access = bodyJSON.result.api_remote_access;
					var allow_token_request = bodyJSON.result.allow_token_request;
					var remote_access_ip = bodyJSON.result.remote_access_ip;
					
					if (data.actionToDo == 'MyACTION') {
					}
					
				}
				else{
					console.log("callList : erreur lors de la requete : "+baseURL+connectionConfigURL);
				}
			});
}

/***********************************
*************** WIFI CONFIG ********
***********************************/
function wifiConfig() {
	var options = {
			url : baseURL+wifiConfigURL,
			headers : {
				'X-Fbx-App-Auth' : app.session_token
			}, 
			method : 'GET',
		};

		request(options, function (error, response, body) {
		
				if (!error && response.statusCode == 200){
					var bodyJSON = JSON.parse(body);
	
					var bbs = bodyJSON.result.bbs;
					var ap_params = bodyJSON.result.ap_params;

					// Status Wifi
					if (data.actionToDo == 'getWifiStatus') {
						if (bodyJSON.result.ap_params.enabled == true) {
							var tts = "Le wifi est activai";
						}
						else {
							var tts = "Le wifi est desactivai";
						}
					
					}
					
					SARAH.speak(tts);
				}
				else{
					console.log("callList : erreur lors de la requete : "+baseURL+wifiConfigURL);
				}
			});
}

// Disable WIFI
function setWifiConfig() {

var tts = "";
var status = true;
if (data.actionToDo == 'setWifiOff') {
	status = false;
}

var options = {
			url : baseURL+wifiConfigURL,
			headers : {
				'X-Fbx-App-Auth' : app.session_token
			}, 
			data : {'ap_params': {'enabled': status}},
			method : 'POST',
		};
		request(options, function (error, response, body) {
		
				if (!error && response.statusCode == 200){

					// Set Wifi
					if (data.actionToDo == 'setWifiOn') {
						tts = "Le wifi est activai";
					}
					
					if (data.actionToDo == 'setWifiOff') {
						tts = "Le wifi est desactivai";
					}
					
					SARAH.speak(tts);
				}
				else{
					console.log("callList : erreur lors de la requete : "+baseURL+wifiConfigURL+" : disableWifi");
				}
			});
}

/************************************************* 
*************** AUTH REQUEST *********************
**************************************************/	

// A FAIRE 1 FOIS POUR AVOIR TRACK ID ET APP TOKEN
function authRequest() {

	//Asking for an app token
	var options = {
		url    : baseURL+authURL,
		method : 'POST',
		json   : {
			   "app_id"      : app_id,
			   "app_name"    : app_name,
			   "app_version" : app_version,
			   "device_name" : device_name
			},
		encode : 'utf-8'
	};
	
	request(options, function (err, response, body) {
            if (err || response.statusCode != 200) {
                return callback({});
            }

			app_token = body.result.app_token;
			track_id = body.result.track_id;
			
			if (debug){
				console.log("app token = "+ app_token);
				console.log("track id = "+ track_id);
			}
			
			// Récupération du track id et du token pour le mettre dans le .prop
			var fs = require('fs');
			fs.readFile(__dirname+"\\freeboxOS.prop", 'utf8', function (err,data) {
				if (err) {
				console.log(err); return callback({});
				}
				var resulttmp = data.replace(/GENERATED_TRACK_ID/g, body.result.track_id);
				var result = resulttmp.replace(/GENERATED_TOKEN/g, body.result.app_token);
				fs.writeFile(__dirname+"\\freeboxOS.prop", result, 'utf8', function (err) {
					if (err) {
					console.log(err); return callback({});
					}
				});
				
			});

		});
}

/********************************************
*************** SESSION *********************
********************************************/	
function acceptAuth(next) {

	// ACCEPT AUTH
	request(baseURL+authURL+track_id, function (error, response, body) {
		if (!error && response.statusCode == 200){
			body = JSON.parse(body);
			app.status    = body.result.status; // 'pending'
			app.challenge = body.result.challenge;
			
			if (debug){
			console.log("app status = "+app.status);
			console.log("app challenge = "+app.challenge);
			}
		}
		else{
			console.log("acceptAuth() -> erreur lors de la requete : "+baseURL+authURL+track_id);
		}

		//On refait la meme requete pour verifier le changement de status
		request(baseURL+authURL+track_id, function (error, response, body) {

			if (!error && response.statusCode == 200) 
			{
				body = JSON.parse(body);
				app.status = body.result.status;
				if (debug){
					console.log("app status = "+ app.status);
				}
				if(app.status == 'granted') { //La demande est OK
					if(next) next();
				}
				else if (app.status != 'pending')
				{
					console.log("The app is not accepted. You must register it.");
				}
				else
				{
					console.log("Waiting for the user to accept.");
				}
			}
			else 
			{
				console.log("acceptAuth() -> erreur lors de la requete : "+baseURL+authURL+track_id);
			}

		});
	});
}


function sessionRequest(next) {

		// SESSION 
		request(baseURL+loginURL, function (error, response, body) {

			if (!error && response.statusCode == 200) {

				body = JSON.parse(body);
				app.logged_in = body.result.logged_in; 
				app.challenge = body.result.challenge; 
				//generation du password
				app.password = crypto.createHmac('sha1', app_token).update(app.challenge).digest('hex'); 
				if (debug){
				console.log("logged in = "+app.logged_in ); 
				console.log("update challenge = "+body.result.challenge); 
				console.log("password = "+app.password);
				}

				//If we're not logged_in
				if (!app.logged_in){
					//POST app_id & password
					var options = {
						url    : baseURL+loginSessionURL,
						method : 'POST',
						json   : {
						   "app_id"      : app_id,
						   "app_version" : app_version,
						   "password"    : app.password,
						},
						encode : 'utf-8'
					};

					request(options, function (error, response, body) {

						if ( !error && (response.statusCode == 200 || response.statusCode == 403) ) {
							app.challenge = body.result.challenge; 
							if (debug) {
							console.log("login status = "+app.logged_in );
							}
							if (response.statusCode == 200) { 
								app.session_token = body.result.session_token; 
								app.logged_in   = true; 
								app.permissions = body.result.permissions;
	
								if (debug){
								console.log("session token = "+app.session_token); 
								console.log("logged in = "+app.logged_in); 
								console.log("permissions = "+app.permissions); 
								}
								if(next) next();
							}
							else if(response.statusCode == 403) { 
								app.logged_in = false; 
								console.log(body.msg + ' : ' + body.error_code);
							}
						
						}
						else
						{
							console.log("Erreur dans la requete "+baseURL+loginSessionURL);
						}
					});
				}

			}
		else{
			console.log("sessionRequest -> erreur dans la requete"+baseURL+loginURL);
		}

		});
	}

// Callback
callback({});
}
