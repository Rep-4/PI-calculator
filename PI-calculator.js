let array;
const iterate = document.getElementById('iterate');
const precision = document.getElementById('precision');
const culbutton = document.getElementById('culculate');
const table = document.getElementById('table');
const valuelist = document.getElementsByClassName('valuelist');
const reset = document.getElementById('reset');
let num;

function initialize() {
	console.log(BigNumber.multiply("2",sqrt("3",parseInt(precision.value))));
	array = [6,"3",BigNumber.multiply("2",sqrt("3",parseInt(precision.value)))];
	num = 1;
	[...valuelist].forEach((e)=>{e.remove();});
}

function sqrt(n,scale=50) {
	let x = n;
	for (let i = 0;i < scale;i++){
		x = BigNumber.divide(BigNumber.add(x,BigNumber.divide(n,x)),"2"); //(x+n/x)/2
	}
	x = x.slice(0, x.indexOf('.')+scale+1);
	return `${x}`;
}

function culculate(array){
	array[0] = 2*array[0];
	//console.log(array,BigNumber.divide(BigNumber.multiply(array[1],array[2]),BigNumber.add(array[1],array[2])));
	array[2] =  BigNumber.multiply("2",BigNumber.divide(BigNumber.multiply(array[1],array[2]),BigNumber.add(array[1],array[2])) );
	array[1] = sqrt(BigNumber.multiply(array[1],array[2]),parseInt(precision.value));
	return array
}

function addtable(i,array){
	const tr = document.createElement('tr');
	tr.classList.add('valuelist');
	tr.id=`value${i}`;
	array.forEach((e)=>{
		const td = document.createElement('td');
		td.innerText = `${e}`;
		tr.appendChild(td);
	});
	table.appendChild(tr);
}


culbutton.addEventListener('click',()=>{
	for (let i = 1;i <= parseInt(iterate.value);i++) {
		addtable(i,array);
		array = culculate(array);	
		num = i;
}})

reset.addEventListener('click',()=>{
	initialize();
})

initialize();
