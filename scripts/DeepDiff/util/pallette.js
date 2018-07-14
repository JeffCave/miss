'use strict';

export {
	Pallette
};

/**
 * I'm sure I've seen this somehwere before, but can't figure out where. The
 * idea is programmatiallcy create a color pallete.
 *
 * The advantage of algorithmically creating the pallette is that it will
 * always offer another value... no matter how many are requested.
 *
 * A good data pallete should have a couple of different features:
 *
 * 1. Difference: All of the colours should be easily distinguishable from one
 *    another
 * 2. Size: There should be sufficient colours to meet the size of the data set
 *
 * # Difference
 *
 * To achieve a high level of difference a virtual colour wheel is created
 * with each of the cardinal colours (red, green, and blue) being allocated
 * 1/3 of the circle each. Working circumferentially, the colors will be
 * proportionally blended. As colors move toward the center, they will be
 * blended with the colour directly opposite on the cicle (identified by
 * bisecting the circle through the position). The effect should be one of
 * blended colours along the outside permiter, with the colors fading to white
 * as they move toward the center.
 *
 * This gives a large variety of colours to choose from, while also keeping
 * different colours on opposite sides of the circle. Algorithmically, we can
 * determine "different" by measuring the angle between two colors. The closer
 * to 180 degrees the angle created by the two points, the more different they
 * are.
 *
 * # Size
 *
 * The maximum number of different colours to choose from, would be 'infinite'
 * colours. While not perfectly possible, this should be kept in mind as some
 * sort of [platonic ideal](https://xkcd.com/2019/).
 *
 * Using the previously defined colour wheel the objective is to select an
 * formula that will select for maximum difference (180 degrees) while not
 * allowing for a collision of colours on subsequent selections. I seem to
 * remember reading an article on the Golden Ratio as a packing algorithm in
 * plant leaf produciton. Plants tend to place the next leaf one turn of the
 * Golden Ratio. This allows for maximum packing of leaves (or seed in a
 * sunflower).
 *
 * I have no idea how true this is, but it seems reasonable and would result
 * in a spiral shape of colour selection with each point having a differnece
 * of ~60% of the circle: nearly 50%, while not allowing for collisions in
 * subsequent colours.
 *
 * The only other spiral I have considered is a Pythagorean spiral, but the
 * edge of a pythagorean spiral remains constant, and therefore would reduce
 * the amount of difference as the circle get's larger.
 *
 * Rather than using the golden ratio, I will be using the Fibinacii sequence
 * aproximation. It is my hope that the variance in the sequence will mean
 * that colours are not selected from exactly the same spot on the circle.
 *
 */
class Pallette{

	constructor(){
		this.PHI = (1 + (5 ** 0.5)) / 2;
		this.PORTION = 360 / 3;

		this.BaseAngles = {
			r : this.PORTION * 0,
			g : this.PORTION * 1,
			b : this.PORTION * 2,
		};
	}

	at(pos){
		let angle = pos * this.PHI;
		let radius = 1 + 2 * angle;

		let color = this.circumferentialColor(angle);
		let polarOpposite = this.circumferentialColor((angle + 180) % 360);
		let polarDiameter = (radius + 127) / 256;
		let oppositeDiameter = 1 - polarDiameter;

		color.r = (color.r * polarDiameter) + (polarOpposite.r * oppositeDiameter);
		color.g = (color.g * polarDiameter) + (polarOpposite.g * oppositeDiameter);
		color.b = (color.b * polarDiameter) + (polarOpposite.b * oppositeDiameter);

		return color;
	}

	circumferentialColor(angle){
		let blue = 0;
		let green = 0;
		let red = 0;

		angle = angle % 360;

		if(angle < this.GREEN){
			blue = angle / this.PROPORTION;
			green = (this.GREEN - angle) / this.PROPORTION;
		}
		else if(angle < this.RED){
			green = (angle - this.GREEN) / this.PROPORTION;
			red = (this.RED - angle) / this.PROPORTION;
		}
		else{
			red = (angle - this.RED) / this.PROPORTION;
			blue = (360 - angle) / this.PROPORTION;
		}

		return {
			r:red,
			g:green,
			b:blue,
		};
	}

}
