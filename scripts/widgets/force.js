'use strict';

import * as utils from '../DeepDiff/util/misc.js';

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
				if(!(name in newval)){
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
									let initPos = d.name;
									initPos = initPos.hashCode();
									initPos = utils.UniformDistribution(initPos);
									initPos = initPos();

									initPos = {
										y: Math.floor(initPos * this.opts.width),
										x: (initPos%2) ? -1 : this.opts.width+1,
									};

									let node = {
										key: d.name,
										pos:initPos,
										velocity:{x: 0, y: 0},
										force:{x: 0, y: 0},
										links:{},
										group:0
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
			// search the nodes for items that there is no longer a link for
			Object.keys(this.nodes).forEach(node=>{
				let found = Object.values(this.links).some((link)=>{
					return link.points[0].key === node || link.points[1].key === node;
				});
				if(!found){
					Vue.delete(this.nodes,node);
				}
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
			const now = Date.now();

			//let DELAY = 20;
			let DELTAT = 0.01;
			let SEGLEN = this.opts.radius*2;
			let SPRINGK = 30;
			let MASS = 1;
			let GRAVITY = 50;
			let RESISTANCE = 10;
			let STOPVEL = 0.1;
			let STOPACC = 0.1;
			let BOUNCE = 0.75;
			const springForce = function(dotA, dotB, strength){
				let dx = (dotB.x - dotA.x);
				let dy = (dotB.y - dotA.y);
				let len = Math.sqrt(dx*dx + dy*dy);
				let spring = {x:0,y:0};
				if (len > SEGLEN) {
					len = len - SEGLEN;
					let force = SPRINGK * len * strength;
					let ratioBase = Math.abs(dx) + Math.abs(dy);
					spring.x = (dx / ratioBase) * force;
					spring.y = (dy / ratioBase) * force;
				}
				return spring;
			};
			const gravityForce = function(dotA, dotB, strength){
				let dx = (dotB.x - dotA.x);
				let dy = (dotB.y - dotA.y);
				let len = Math.sqrt(dx*dx + dy*dy);
				let gravity = {x:0,y:0};
				if(len !== 0){
					let force = GRAVITY * strength;
					let ratioBase = Math.abs(dx) + Math.abs(dy);
					gravity.x = (dx / ratioBase) * force;
					gravity.y = (dy / ratioBase) * force;
				}
				return gravity;
			};

			Object.values(this.links).forEach(link=>{
				let spring = springForce(link.points[0].pos,link.points[1].pos,link.value);
				let gravity = gravityForce(link.points[0].pos,link.points[1].pos,-1);

				spring.x += gravity.x;
				spring.y += gravity.y;

				spring.x /= 2;
				spring.y /= 2;

				let direction = 1;
				link.points.forEach((point)=>{
					point.force.x += spring.x * direction;
					point.force.y += spring.y * direction;
					direction = -1;
				});
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
				accel.x *= DELTAT;
				accel.y *= DELTAT;
				// apply the acceleration to the velocity
				node.velocity.x += accel.x;
				node.velocity.y += accel.y;
				// This force has been accumulated, and consumed: set it to zero
				node.force.x = 0;
				node.force.y = 0;

				// move the node
				node.pos.x += node.velocity.x;
				node.pos.y += node.velocity.y;

				// apply boundary checking
				if(node.pos.x < 0){
					let boundary = 0;
					let overflow = (boundary - node.pos.x);
					node.pos.x = boundary + overflow * BOUNCE;
					node.velocity.x = -1 * node.velocity.x * BOUNCE;
				}
				else if(node.pos.x > this.opts.width){
					let boundary = this.opts.width;
					let overflow = (boundary - node.pos.x);
					node.pos.x = boundary + overflow * BOUNCE;
					node.velocity.x = -1 * node.velocity.x * BOUNCE;
				}
				if(node.pos.y < 0){
					let boundary = 0;
					let overflow = (boundary - node.pos.y);
					node.pos.y = boundary + overflow * BOUNCE;
					node.velocity.y = -1 * node.velocity.y * BOUNCE;
				}
				else if(node.pos.y > this.opts.height){
					let boundary = this.opts.height;
					let overflow = (boundary - node.pos.y);
					node.pos.y = boundary + overflow * BOUNCE;
					node.velocity.y = -1 * node.velocity.y * BOUNCE;
				}

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

				// round and apply the final values
				//node.pos.x = Math.round(node.pos.x);
				//node.pos.y = Math.round(node.pos.y);

			});

			if(shouldStop){
				this.stop();
			}

			this.animation.lastFrame = now;
		},
		MouseDown:function(e){
			let node = e.target.firstChild.innerHTML;
			node = this.nodes[node];

			let svg = e.target.parentNode.parentNode;
			let restart = this.start;

			function mousemove(m){
				node.velocity.x = 0;
				node.velocity.y = 0;
				node.pos.x = m.layerX;
				node.pos.y = m.layerY;
				restart();
			}
			function remover(m){
				svg.removeEventListener('mousemove',mousemove);
				window.removeEventListener('mouseup',remover);
			}

			svg.addEventListener('mousemove',mousemove);
			window.addEventListener('mouseup',remover);
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
