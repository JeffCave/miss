function(doc, req) {
	doc = JSON.parse(req.body);
	doc._id = 'patreon.' + req.uuid;
	doc.occured = new Date().toISOString();
	
	/**
	 * Check the headers for the hash. We should be able to hash the content
	 * with an MD5, and our secret token 
	 * 
	 * ==secrets.patreon.TokenFromThem==
	 * 
	 * If it is not appropriately signed by them, we should reject it.
	 */
	
	return [doc,"Saved."];
}
