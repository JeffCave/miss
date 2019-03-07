function(newDoc, oldDoc, userCtx) {
	if (oldDoc && !newDoc._deleted) {
		throw({"forbidden": "Record has already been inserted."});
	}
}
