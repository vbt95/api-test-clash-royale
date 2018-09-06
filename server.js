const request = require('request');
const express= require('express');
const hbs = require('hbs');
const { Client } = require('pg');

const port = process.env.PORT || 3000;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: true,
});
client.connect();

var app = express();

hbs.registerPartials(__dirname+'/views/partials');
app.set('view engine','hbs');

/*app.use((req,res,next) =>{
	res.render('maintenance.hbs');
});*/


var options = {
	method : 'GET',
	url : 'https://api.royaleapi.com/clan/C2VQCU'
	,headers : {
		auth : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTYyOCwiaWRlbiI6IjI1NTcyODU2ODA2MTkxOTI0MyIsIm1kIjp7fSwidHMiOjE1MzYyMjc3MDE3MTh9.8tb3YdGuJxSDxZu_aO9aRSMSnwY1Y5st6srZqe3LyNg'
	}
	, json : true

}

var checkTable = () =>{
	var curDate= new Date();
	var month= curDate.getMonth();
	
	client.query('CREATE TABLE IF NOT EXISTS month'+month+' (id integer);', (err, res2) => {
		if (err) throw err;
	client.end();
	});
};

app.get('/update', (req,res) =>{
	
	
	checkTable();
	
	
	request(options, (error,response,body) =>{
	if(error)
		res.send(error);
	else if(response.statusCode !== 200){
		res.send(statusCode);
	}
	else{
		console.log(JSON.stringify(body,undefined,2));
		res.send(body);
	}
	//res.send('done');
	

});
});

app.get('/view',(req,res) =>{
	
	queryAll(res);
	res.send('done');
});

var queryAll= (res1) =>{
	client.query('SELECT table_schema,table_name FROM information_schema.tables;', (err, res) => {
		if (err) throw err;
		for (let row of res.rows) {
			console.log(JSON.stringify(row));
		}
		//res1.render(res.rows);
	client.end();
	});
}




app.get('/', (req,res) =>{
	res.render('home.hbs',{} );
});

app.use((req,res,next) =>{
	res.render('error.hbs');
});

app.listen(port, () =>{
	console.log(`Server is up at ${port}`);
});
