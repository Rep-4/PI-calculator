let array;
const iterate = document.getElementById('iterate');
const culbutton = document.getElementById('culculate');
const table = document.getElementById('table');
const valuelist = document.getElementsByClassName('valuelist');
const reset = document.getElementById('reset');
let num;

function initialize() {
	array = [6,3,2*Math.sqrt(3)];
	num = 1;
	[...valuelist].forEach((e)=>{e.remove();});
}

function culculate(array){
	array[0] = 2*array[0];
	array[2] =  2 * array[1]*array[2]/(array[1]+array[2]);
	array[1] = Math.sqrt(array[1]*array[2]);
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
	//initialize();
	for (let i = 1;i <= parseInt(iterate.value);i++) {
		addtable(i,array);
		array = culculate(array);	
		num = i;
}})

reset.addEventListener('click',()=>{
	initialize();
})

initialize();
