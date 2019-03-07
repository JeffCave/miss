function(doc, req) {
	doc = JSON.parse(req.body);
	doc._id = req.uuid;
	return [doc,"Saved."];
}
