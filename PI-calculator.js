let array;
const iterate = document.getElementById('iterate');
const precision = document.getElementById('precision');
const culbutton = document.getElementById('culculate');
const table = document.getElementById('table');
const valuelist = document.getElementsByClassName('valuelist');
const reset = document.getElementById('reset');
let num;
const cellI = document.getElementById('i');
const cellN = document.getElementById('n');
const cellln = document.getElementById('ln');
const cellLn = document.getElementById('Ln');


function initialize() {
	array = null;
	num = 1;
	[...valuelist].forEach((e)=>{e.remove();});
	const cells = document.getElementsByClassName('cell2');
	[...cells].forEach((e)=>{
		e.style.removeProperty('width');
	});
}

function sqrt(n,scale=50) {
	let x = n;
	for (let i = 0;i < scale;i++){
		x = BigNumber.divide(BigNumber.add(x,BigNumber.divide(n,x,scale)),"2",scale); //(x+n/x)/2
	}
	x = x.slice(0, x.indexOf('.')+scale+1);
	return `${x}`;
}

function culculate(array,scale=50){
	array[0] = 2*array[0];
	//console.log(array,BigNumber.divide(BigNumber.multiply(array[1],array[2]),BigNumber.add(array[1],array[2])));
	array[2] =  BigNumber.multiply("2",BigNumber.divide(BigNumber.multiply(array[1],array[2]),BigNumber.add(array[1],array[2]),scale));
	array[1] = sqrt(BigNumber.multiply(array[1],array[2]),scale);
	array[2] = array[2].slice(0, array[2].indexOf('.')+scale+1);
	return array
}

function addtable(i,array){
	for (let j = 0;j < 3;j++) {
		const cell = document.createElement('div');
		cell.classList.add('valuelist','cell2');
		cell.innerText = `${array[j]}`;
		if (j === 0) {cellN.appendChild(cell)}
		else if (j === 1) {cellln.appendChild(cell)}
		else if (j === 2) {cellLn.appendChild(cell)}
	}
	const celli = document.createElement('div');
	celli.classList.add('valuelist','cell2');
	celli.innerText = `${num}`;
	cellI.appendChild(celli);
}

function resizechild() {
	const cells = document.getElementsByClassName('cell2');
	['i','n','ln','Ln'].forEach((el)=>{
		let maxwidth = 0;
		[...cells].forEach((e)=>{
			//if (e.offsetWidth > maxwidth) {maxwidth = e.offsetWidth;}
			if (e.parentElement.id === `${el}`) maxwidth = Math.max(maxwidth,e.clientWidth);
		});
		[...cells].forEach((e)=>{
			if (e.parentElement.id === `${el}`) e.style.width = `${maxwidth}px`;
		});
	});
	
}


culbutton.addEventListener('click',()=>{
	if (!array) {array = [6,"3",BigNumber.multiply("2",sqrt("3",parseInt(precision.value)))]};
	for (let i = 1;i <= parseInt(iterate.value);i++) {
		addtable(i,array);
		resizechild();
		array = culculate(array,parseInt(precision.value));	
		num++;
}})

reset.addEventListener('click',()=>{
	initialize();
})

initialize();
