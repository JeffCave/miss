/*
global d3
*/


export function d3ForceDirected(results){
	const radius = 5;
	const distance = 100;
	//const lineColour = 'black';
	//const lineColour = 'steelblue';
	const lineColour = 'darkgray';

	let graph = {
		nodes: results.submissions,
		links: results.results.map(function(d){
			let rtn = {
				source:d.A.submission,
				target:d.B.submission,
				value:d.percentMatched,
			};
			return rtn;
		}),
	};

	d3.select("svg").selectAll("g.links").data(['links']).enter().append("g").attr("class", "links");
	d3.select("svg").selectAll("g.nodes").data(['nodes']).enter().append("g").attr("class", "nodes");

	let svg = d3.select("svg");
	let width = +svg.attr("width");
	let height = +svg.attr("height");

	let color = d3.scaleOrdinal(d3.schemeCategory20);

	let simulation = d3.forceSimulation()
		.force("link", d3.forceLink()
			.id(function(d) { return d.name; })
			.distance(function(d) {
				return (1-d.value)*distance;
			})
			.strength(function(d){
					let rtn = d.value;
					return rtn;
				})
		)
		.force("charge", d3.forceManyBody())
		.force("center", d3.forceCenter(width / 2, height / 2))
		.force("collision", d3.forceCollide(radius))
		;

	let linkData = d3.select("g.links")
		.selectAll("line")
		.data(graph.links,function(d){
			return [d.source.name,d.target.name].join('.');
		})
		;
	linkData.exit().remove();
	let link = linkData
		.enter().append("line")
			.attr("stroke", lineColour)
		.merge(linkData)
			.attr("stroke-width", function(d){
				return Math.floor((d.value * radius) + 1) + 'px';
			})
			.attr("opacity", function(d) {
				return d.value;
			})
		;

	let nodeData = svg.select("g.nodes").selectAll("circle")
		.data(graph.nodes)
		;
	nodeData.exit().remove();
	let node = nodeData
		.enter().append("circle")
			.call(d3.drag()
				.on("start", dragstarted)
				.on("drag", dragged)
				.on("end", dragended))
		.merge(nodeData)
			.attr("r", radius)
			.attr("fill", function(d) { return color(d.group); })
//		.exit().remove()
		;

	node.append("title").text(function(d,i) {
		return i;

	});

	simulation.nodes(graph.nodes).on("tick", ticked);
	simulation.force("link").links(graph.links);

	function ticked() {
		let link = d3.select("g.links").selectAll("line");
		let node = d3.select("g.nodes").selectAll("circle");
		link
			.attr("x1", function(d) { return d.source.x; })
			.attr("y1", function(d) { return d.source.y; })
			.attr("x2", function(d) { return d.target.x; })
			.attr("y2", function(d) { return d.target.y; })
			;

		node
			.attr("cx", function(d) { return d.x; })
			.attr("cy", function(d) { return d.y; })
			;
	}

	function dragstarted(d) {
		if (!d3.event.active) simulation.alphaTarget(0.3).restart();
		d.fx = d.x;
		d.fy = d.y;
	}

	function dragged(d) {
		d.fx = d3.event.x;
		d.fy = d3.event.y;
	}

	function dragended(d) {
		if (!d3.event.active) simulation.alphaTarget(0);
		d.fx = null;
		d.fy = null;
	}

}
