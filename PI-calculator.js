let array;
const iterate = document.getElementById('iterate');
const precision = document.getElementById('precision');
const culbutton = document.getElementById('culculate');
const table = document.getElementById('table');
const valuelist = document.getElementsByClassName('valuelist');
const reset = document.getElementById('reset');
let num;

function initialize() {
	array = [6,BigDecimal.from(3),BigDecimal.from(2).mul(BigDecimal.from(3).sqrt(precision.value))];
	num = 1;
	[...valuelist].forEach((e)=>{e.remove();});
}

function culculate(array){
	array[0] = 2*array[0];
	array[2] =  BigDecimal.from(2).mul( array[1].mul(array[2]).div((array[1].sum(array[2])),precision.value) );
	array[1] = (array[1].mul(array[2])).sqrt(precision.value);
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
