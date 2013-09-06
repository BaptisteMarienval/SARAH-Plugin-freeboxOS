exports.action = function(data, callback, config){

	//config = config.modules.zibase;
	var callLogsURL="/api/v1/call/log/";
	var authURL="/api/v1/call/log/";
	var http = "http://";
		
/************************************************* 
*************** BUILD URL ************************
**************************************************/	

	if (!config.ipFreebox){
		console.log("IP freebox non renseignée");
		callback();
	}

	//url = http+config.ipFreebox+callLogsURL;
	var url = http+config.ipFreebox;
	console.log(url);
	
/************************************************* 
*************** SEND REQUEST *********************
**************************************************/	
	var request = require('request');
  
	if (data.actionToDo == 'auth') {
		url += authURL;
		var oauth =
			{ 'app_id': "sarah.freebox",
			'app_name': "FreeboxOS for SARAH",
			'app_version': "0.0.1",
			'device_name': "my Device"
			}
  
		request.post({'uri':url, oauth:oauth}, function (err, response, body){
  
		var retAuth = r.body;
		console.log(r.body);
		});
	}
  
	if (data.actionToDo == 'callList') {
	
		url += callLogsURL;
		request({ 'uri': url, 'json': true }, function (err, response, json){

			if (err || response.statusCode != 200) {
				callback({'tts': "L'action a échoué"});
			}
	
			var ret = response.body;
			console.log(ret);
			console.log(ret.result);
		});
	}
	// Callback
	callback();
}