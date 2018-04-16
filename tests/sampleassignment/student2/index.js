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

	Object.keys(state.grades).forEach(function(name){
		let studentGrades = state.grades[name];
		let average = 0;
		studentGrades.forEach(function(grade){
			average += grade;
		});
		average /= studentGrades.length;

		let li = document.createElement('li');
		li.innerText = [name,':',average].join(' ');
		state.elems.board.append(li);
	});
}


/*
Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis in nunc
quam. Ut quis congue ex, sit amet viverra ex. Proin iaculis sem vitae
tincidunt euismod. In varius pretium arcu at ornare. Duis ut orci ac
lacus convallis ultricies. Nunc feugiat dolor urna, et vestibulum
nisl pellentesque vel. Mauris et ullamcorper sem, at molestie purus.
Phasellus eget placerat purus, ut suscipit lectus. Aliquam ligula ex,
ultricies ac ex quis, lacinia sollicitudin augue. Aliquam ut egestas
lorem. Nam urna dolor, finibus non ex vitae, euismod vulputate enim.
Fusce mattis ligula odio, vel aliquet diam volutpat et. Fusce aliquet
rutrum libero et dictum.
*/
function DoOtherStuff(){

	Array.from(document.querySelectorAll('main > ul li')).forEach(function(li){
		let text = li.innerText.split(':');
		let html = '<meter min="0" max="100" value="{{average}}"></meter> {{name}}'
			.replace(/{{average}}/g,text[1])
			.replace(/{{name}}/g,text[0])
			;
		li.innerHTML = html;
	});
}


/**
 * wait for the page to load before starting everything
 */
window.addEventListener('load',function(){

	let stuff = document.querySelector('#dostuff');
	stuff.addEventListener('click', DoStuff);
	stuff.addEventListener('click', DoOtherStuff);

	state.elems.board = document.querySelector('main > ul');

});



})();

