function(req) {
	return {
		code: 401,
		body: 'test'
	};
	/*
	 * There are two conditions that should be allowed to pass through:
	 * 
	 * 1. an authenticated user.
	 * 2. a POST to the patreon injection path
	 * 
	 * All other cases should be considered denied.
	 */
	/*
	var isAuthenticated  = req.secObj.admins.names
		.concat(req.secObj.members.names)
		.some(function(name){
			return req.userCtx.name === name;
		})
		;
	return {
		code: 202,
		body: JSON.stringify({
			code:202,
			reason: "DEBUG:" + isAuthenticated
		});
	};
	if(isAuthenticated){
		// Pass through the requests
		return { path: path.raw_path };
	}
	
	var isPatreonPath = /\/==secrets.patreon.TokenFromUs==/.test(req.path);
	if(isPatreonPath){
		return {path:"_update/webhooks"};
	}

	// I don't know who this person is, or what they are doing here.
	return {
		code: 403,
		body: JSON.stringify({
			code:403,
			error: "forbidden",
			reason: "403: Access denied."
		});
	};
	*/
}
