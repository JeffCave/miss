'use strict';

(function(){


const state = {
	elems: {
		board:null,
	},
	grades :{
		"Greg Gaffin":[90, 80 ,70],
		"Joan Jett":[60, 50, 40],
		"Arthur Brown":[30, 20, 10]
	}
};

function DoStuff(){

	for(let name in state.grades){
		let studentGrades = state.grades[name];
		let average = 0;
		for(let g=0; g<studentGrades.length; g++){
			let grade = studentGrades[g];
			average += grade;
		}
		average /= studentGrades.length;

		let li = document.createElement('li');
		li.innerText = [name,':',average].join(' ');
		state.elems.board.append(li);
	};
}


/**
 * wait for the page to load before starting everything
 */
window.addEventListener('load',function(){

	document.querySelector('#dostuff').addEventListener('click', DoStuff);

	state.elems.board = document.querySelector('main > ul');

});



})();

