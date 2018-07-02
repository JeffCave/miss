'use strict';

import * as utils from '../DeepDiff/util/misc.js';

/*
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
		results:{
			deep:true,
			handler:function(newval,oldval){
				this.start();
				this.ReSync();
			}
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
		ReSync:_.throttle(function(){
			let results = Object.entries(this.results);
			Object.keys(this.links).forEach(name=>{
				if(!(name in this.results)){
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
									initPos = Math.round(initPos * this.opts.width);

									initPos = {
										y: initPos,
										x: (initPos%2) ? -1 : this.opts.width+1,
									};

									initPos = {
										x:145 + Math.round(5*Math.random()),
										y:145 + Math.round(5*Math.random()),
									}

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
		},600),
		UpdateFrame:function(){
			const now = Date.now();

			let DELTAT = 0.01;
			let SEGLEN = this.opts.radius*3;
			let SPRINGK = 10;
			let MASS = 1;
			let GRAVITY = 50;
			let RESISTANCE = 10;
			let STOPVEL = 0.1;
			let STOPACC = 0.1;
			let BOUNCE = 0.75;
			const RubberBandForce = function(dotA, dotB, strength, seglen){
				let dx = (dotB.x - dotA.x);
				let dy = (dotB.y - dotA.y);
				let len = Math.sqrt(dx*dx + dy*dy);
				let spring = {x:0,y:0};
				if (len > seglen) {
					len = len - seglen;
					let force = SPRINGK * len * strength;
					let ratioBase = Math.abs(dx) + Math.abs(dy);
					spring.x = (dx / ratioBase) * force;
					spring.y = (dy / ratioBase) * force;
				}
				return spring;
			};
			const SpringForce = function(dotA, dotB, strength, seglen){
				let dx = (dotB.x - dotA.x);
				let dy = (dotB.y - dotA.y);
				let len = Math.sqrt(dx*dx + dy*dy);
				let spring = {x:0,y:0};

				len = len - seglen;
				let force = SPRINGK * len * strength;
				let ratioBase = Math.abs(dx) + Math.abs(dy);
				if(ratioBase === 0){
					dx = 1;
					dy = 1;
					ratioBase = 2;
				}
				spring.x = (dx / ratioBase) * force + 0.000001;
				spring.y = (dy / ratioBase) * force + 0.000001;

				return spring;
			};
			const gravityForce = function(dotA, dotB, strength, seglen){
				let dx = (dotB.x - dotA.x);
				let dy = (dotB.y - dotA.y);
				//let len = Math.sqrt(dx*dx + dy*dy);
				let ratioBase = Math.abs(dx) + Math.abs(dy);
				let gravity = {x:GRAVITY,y:GRAVITY};
				if(ratioBase === 0){
					ratioBase = 0.001;
				}
				let force = GRAVITY * strength;
				gravity.x = (1 - dx / ratioBase) * force;
				gravity.y = (1 - dy / ratioBase) * force;
				return gravity;
			};

			Object.values(this.links).forEach(link=>{
				// TODO: this is hacky... it should be picked up naturally on change
				let r = this.results[link.key];
				link.value = (r.complete === r.totalTokens) ? r.percentMatched : 0;

				// Calculate the forces
				let spring = SpringForce(
					link.points[0].pos,
					link.points[1].pos,
					link.value+0.1,
					100*(1-link.value)+this.opts.radius*3
				);
				//let gravity = SpringForce(
				//	link.points[0].pos,
				//	link.points[1].pos,
				//	-0.01,
				//	500
				//);
				//spring.x += gravity.x;
				//spring.y += gravity.y;

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
