function (doc) {
	if(doc._id.substr(0,1) === '_') return;
	
	var email = '';
	var rewards = [];
	var occurred = doc
		.occurred
		.substr(0,7)
		.replace(/[^0-9]/g,'-')
		.split('-')
		;
	
	for(var i=doc.included.length-1; i>=0; i--){
		var item = doc.included[i];
		var attr = item.attributes;
		switch(item.type){
			case "user":
				if(!attr.is_email_verified) break;
				email = attr.email || '';
				break;
			case "reward":
				if(item.id <= 0) break;
				if(! /plaidsheep/.test(attr.url)) break;
				
				rewards.push({
					title: attr.title,
					amount: attr.amount,
					id: attr.id,
					url: attr.url
				});
				break;
		}
	}
	
	for(i=rewards.length-1; i>=0; i--){
		var reward = rewards[i];
		var key = occurred.slice('-');
		key.push(reward.title);
		key.push(email);
		emit(key,reward.amount);
	}

}
