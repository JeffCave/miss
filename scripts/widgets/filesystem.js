'use strict';
export {
	DisplaySubmissions
};

/*
global d3
*/


export default function DisplaySubmissions(element,db){
	let holder = document.querySelector(element);

	let templates = {
		ul: '<ul></ul>',
		li: holder.innerHTML
	};

	let newElem = document.createElement('ul');
	holder.parentNode.insertBefore(newElem,holder);
	holder.parentNode.removeChild(holder);
	holder = newElem;
	let dom = d3.select(holder);

	let subChange = null;
	db.changes({filter:'checksims/submissions',live:true})
		.on('change',(e)=>{
			if(subChange !== null){
				return;
			}
			subChange = setTimeout(function(){
				db.query('checksims/submissions',{include_docs:true}).then((data)=>{
					subChange = null;

					let binding = dom.selectAll('li')
						.data(data.rows,function(d){
							return d.doc.name;
						})
						;
					binding
						.enter()
							.append('li')
						.merge(binding)
							.html(function(d){
								let html = Mustache.render(templates.li,d.doc,templates);
								return html;
							})
						.exit()
							.remove()
						;
				});
			},100);
		});
}
