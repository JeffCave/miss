/*
global d3
global Vue
*/


// define the item component
Vue.component('forcedirected', {
	template: '#forcedirected-template',
	props: {
		opts: {
			type: Object,
			default: function(){
				return {
					lineColour: 'darkgray',
					nodeColour: ['steelblue'],
					radius: 5,
					height: 300,
					width:  300,
					interval : 60,
					stopVelocity: 0.1,
				};
			}
		},
		animation: {
			type: Object,
			default: function(){
				return {
					speed : 60,
					lastFrame : 0,
					timer : null
				};
			}
		},
		results: {
			type: Object,
			default: function(){
				return {};
			},
		},
	},
	data: function () {
		return {
			links:{},
			nodes:{},
		};
	},
	created:function(){
		this.stop();
	},
	computed: {
	},
	watch:{
		results:function(newval,oldval){
			let results = Object.entries(newval);
			Object.keys(this.links).forEach(name=>{
				if(!(name in results)){
					Vue.delete(this.links, name);
				}
			});
			results.forEach(result =>{
				let key = result[0];
				let val = result[1];
				let link = this.links[key];
				if(!link){
					link = {
						points : val.submissions.map(d=>{
								if(!(d.name in this.nodes)){
									let node = {
										key: d.name,
										pos:{x: 0, y: 0},
										velocity:{x: 0, y: 0},
										force:{x: 0, y: 0},
										links:{}
									};
									Vue.set(this.nodes,d.name,node);
								}
								return this.nodes[d.name];
							}),
						value : val.percentMatched,
						key : key
					};
					link.points.forEach(node=>{
						node.links[link.key] = link;
					});
					Vue.set(this.links,key,link);
				}
				link.value = val.percentMatched;
			});
			Object.values(this.links).forEach(link=>{
				link.points.forEach(node=>{
					if(!(node.key in this.nodes)){
						Vue.delete(this.nodes,node.key);
					}
				});
			});
			this.start();
		}
	},
	methods:{
		start:function(){
			if(this.animation.timer){
				return this.animation.timer;
			}
			this.animation.lastFrame = Date.now();
			this.animation.timer = setInterval(()=>{
				this.UpdateFrame();
			},this.animation.speed);
			return this.animation.timer;
		},
		stop:function(){
			clearInterval(this.animation.timer);
			this.animation.timer = null;
		},
		UpdateFrame:function(){
			/*
			const DELAY = 20;
			const DELTAT = 0.01;
			const SEGLEN = 10;
			const SPRINGK = 10;
			const MASS = 1;
			const GRAVITY = 50;
			const RESISTANCE = 10;
			const STOPVEL = 0.1;
			const STOPACC = 0.1;
			const BOUNCE = 0.75;
			*/
			const DELAY = 20;
			const DELTAT = 0.01;
			const SEGLEN = 10;
			const SPRINGK = 10;
			const MASS = 1;
			const GRAVITY = 50;
			const RESISTANCE = 10;
			const STOPVEL = 0.1;
			const STOPACC = 0.1;
			const BOUNCE = 0.75;
			const springForce = function(dotA, dotB, strength){
				let dx = (dotA.x - dotB.x);
				let dy = (dotA.y - dotB.y);
				let len = Math.sqrt(dx*dx + dy*dy);
				let spring = {x:0,y:0};
				if (len > SEGLEN) {
					let force = SPRINGK * (len - SEGLEN) * strength;
					spring.x = (dx / len) * force;
					spring.y = (dy / len) * force;
				}
				return spring;
			};
			const gravityForce = function(dotA, dotB, strength){
				let dx = (dotA.x - dotB.x);
				let dy = (dotA.y - dotB.y);
				let len = Math.sqrt(dx*dx + dy*dy);
				let force = GRAVITY * strength;
				let gravity = {};
				if(len === 0){
					dx = 0;
					dy = 0;
					len = 1;
				}
				gravity.x = (1 - dx / len) * force;
				gravity.y = (1 - dy / len) * force;
				return gravity;
			};

			Object.values(this.links).forEach(link=>{
				let spring = springForce(link.points[0].pos,link.points[1].pos,link.value);
				let gravity = gravityForce(link.points[0].pos,link.points[1].pos,-1);

				let a = link.points[0].force;
				a.x += spring.x;
				a.y += spring.y;
				a.x += gravity.x;
				a.y += gravity.y;
				let b = link.points[1].force;
				b.x -= spring.x;
				b.y -= spring.y;
				b.x -= gravity.x;
				b.y -= gravity.y;
			});

			let shouldStop = true;
			Object.values(this.nodes).forEach(node=>{
				// Now we can start applying physics
				let resist = {
					x : -1 * RESISTANCE * node.velocity.x,
					y : -1 * RESISTANCE * node.velocity.y,
				};

				let accel = {
					x : node.force.x + resist.x,
					y : node.force.y + resist.y,
				};
				node.force.x = 0;
				node.force.y = 0;

				node.velocity.x += (DELTAT * accel.x);
				node.velocity.y += (DELTAT * accel.y);

				// check the item has settled down
				// at some point there is so little movement we may as well call it
				// check our stop constants to see if the movement is too small to
				// really consider
				let isStopped =
					Math.abs(node.velocity.x) < STOPVEL &&
					Math.abs(node.velocity.y) < STOPVEL &&
					Math.abs(accel.x) < STOPACC &&
					Math.abs(accel.y) < STOPACC
					;
				if (isStopped) {
					node.velocity.x = 0;
					node.velocity.y = 0;
				}
				else{
					// if any of them aren't stopped, we should not stop
					shouldStop = false;
				}

				// move the node
				node.pos.x += node.velocity.x;
				node.pos.y += node.velocity.y;
			});

			if(shouldStop){
				this.stop();
			}
		},
		MouseDown:function(e){
			function mousemove(m){
				e.target.setAttribute('cx',m.layerX);
				e.target.setAttribute('cy',m.layerY);
			}
			function remover(m){
				m.target.removeEventListener('mousemove',mousemove);
				m.target.removeEventListener('mouseup',remover);
			}
			e.target.addEventListener('mousemove',mousemove);
			e.target.addEventListener('mouseup',remover);
		},
	}
});


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
				source:d.submissions[0].submission,
				target:d.submissions[1].submission,
				value:d.percentMatched,
				original:d
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

	let simulation = svg.node().simulation;
	if(!simulation){
		simulation = d3.forceSimulation()
			.force("link", d3.forceLink()
				.id(function(d) {
					return d.name;
				})
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
			.stop()
			;
		svg.node().simulation = simulation;
	}
	simulation.nodes(graph.nodes).on("tick", ticked);
	simulation.force("link").links(graph.links);

	let linkData = d3.select("g.links")
		.selectAll("line")
		.data(graph.links,function(d){
			return [d.source.name,d.target.name].join('.');
		})
		;
	linkData.exit().remove();
	let links = linkData
		.enter().append("line")
			.attr("stroke", function(d){
				let colour = lineColour;
				if(d.original.error){
					colour = 'red';
				}
				return colour;
			})
		.merge(linkData)
			.attr("stroke-width", function(d){
				let width = d.value;
				if(d.original.error){
					width = 1;
				}
				width = width * (radius+1);
				width = Math.floor(width);
				width = width + 'px';
				return width;
			})
			.attr("opacity", function(d) {
				let opacity = d.value;
				if(d.original.error){
					opacity = 0.5;
				}
				return opacity;
			})
		;

	let nodeData = svg.select("g.nodes").selectAll("circle")
		.data(graph.nodes,(d)=>{
			return d.name;
		})
		;

	nodeData.exit().remove();
	let nodes = nodeData
		.enter().append("circle")
			.attr("cx", width/2)
			.attr("cy", height/2)
			.call(d3.drag()
				.on("start", dragstarted)
				.on("drag", dragged)
				.on("end", dragended))
		.merge(nodeData)
			.attr("r", radius)
			.attr("fill", function(d) { return color(d.group); })
		;

	nodes.each(function(pDatum){
		d3.select(this)
			.selectAll('title')
			.data([pDatum.name])
			.enter().append("title")
				.text(function(d,i) {
					return d;
				});
	});

	// we have made changes to the data, better restart the simulation
	simulation.alpha(0.1).restart();

	function ticked() {
		let link = d3.select("g.links").selectAll("line");
		let node = d3.select("g.nodes").selectAll("circle");

		function boundWidth(val){
			if(val < radius){
				val = radius;
			}
			else if(val > width-radius){
				val = width-radius;
			}
			return val;
		}
		function boundHeight(val){
			if(val < radius){
				val = radius;
			}
			else if(val > width-radius){
				val = width-radius;
			}
			return val;
		}

		node
			.attr("cx", function(d) { return boundWidth(d.x);  })
			.attr("cy", function(d) { return boundHeight(d.y); })
			;
		link
			.attr("x1", function(d) { return boundWidth(d.source.x); })
			.attr("y1", function(d) { return boundHeight(d.source.y); })
			.attr("x2", function(d) { return boundWidth(d.target.x); })
			.attr("y2", function(d) { return boundHeight(d.target.y); })
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
