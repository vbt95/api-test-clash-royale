const request = require('request');
const express= require('express');
const hbs = require('hbs');
const { Client } = require('pg');

// get PORT number from heroku or 3000 if testing on local machine
const port = process.env.PORT || 3000;

// database connection
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: true,
});
client.connect();

var app = express();

// set view and partials
hbs.registerPartials(__dirname+'/views/partials');
app.set('view engine','hbs');

// For maintenance mode
/*app.use((req,res,next) =>{
	res.render('maintenance.hbs');
});*/

// Options for HTTP request to API
var options = {
	method : 'GET',
	url : 'https://api.royaleapi.com/clan/C2VQCU'
	,headers : {
		auth : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTYyOCwiaWRlbiI6IjI1NTcyODU2ODA2MTkxOTI0MyIsIm1kIjp7fSwidHMiOjE1MzYyMjc3MDE3MTh9.8tb3YdGuJxSDxZu_aO9aRSMSnwY1Y5st6srZqe3LyNg'
	}
	, json : true

}


/* Get ISO week in month, based on first Monday in month
** @param {Date} date - date to get week in month of
** @returns {Object} month: month that week is in
**                   week: week in month
*/
var getISOWeekInMonth= (date) =>{
  // Copy date so don't affect original
  var d = new Date(+date);
  if (isNaN(d)) return;
  // Move to previous Monday
  d.setDate(d.getDate() - d.getDay() + 1);
  // Week number is ceil date/7
  return {month: +d.getMonth()+1,
          week: Math.ceil(d.getDate()/7)};
}

// check if table exists and if not then create it
var checkTable = () =>{
	
	const ISO = getISOWeekInMonth(new Date());
	//let flag=false;
	client.query(`CREATE TABLE IF NOT EXISTS month${ISO.month} (tag varchar(20) PRIMARY KEY,
	name var(30),
	week1Given int DEFAULT 0,week1Received int DEFAULT 0, 
	week2Given int DEFAULT 0,week2Received int DEFAULT 0, 
	week3Given int DEFAULT 0,week3Received int DEFAULT 0,
	week4Given int DEFAULT 0,week4Received int DEFAULT 0,
	week5Given int DEFAULT 0, week5Received int DEFAULT 0,
	totalDonationsGiven int DEFAULT 0, totalDonationsReceived int DEFAULT 0);`
	, (err, res2) => {
		if (err) return err;
		flag = true;
	client.end();
	});
	
	//if(!flag){
	client.query('ALTER TABLE month'+ISO.month+' ADD totalDonationsGiven AS (week1Given+week2Given+week3Given+week4Given+week5Given) PERSISTED;'
	,(err,res2)  =>{
		if(err) return err;
		client.end();
	});
	
	client.query('ALTER TABLE month'+ISO.month+' ADD totalDonationsReceived AS (week1Received+week2Received+week3Received+week4Received+week5Received) PERSISTED;'
	,(err,res2)  =>{
		if(err) return err;
		client.end();
	});
	
	//}
	return;
};

var insertFirst = (body,ISO) =>{
	const insertQuery = {
		text : `INSERT INTO month${ISO.month} (tag,name) 
		SELECT ($1,$2)
		WHERE NOT EXISTS(
		SELECT 1 FROM month${ISO.month} WHERE tag=$1
		);`
		,values : [item.tag,item.name]
	};
	client.query( insertQuery, (err,res) =>{
		if(err)
			return err;
		client.end();
	});
};

var updateRecords = (body)=>{
	body.members.forEach( (item) => {
		const ISO = getISOWeekInMonth(new Date());
		
		const statusInsert = insertFirst(item,ISO);
		if(statusInsert)
			return statusInsert;
		
		/*const updateQuery = {
			text : 
			, values : [item.donations, item.donationsReceived, item.tag]
		};*/
		
		client.query( `UPDATE month{ISO.month} SET week${ISO.week}Given = ${item.donations},
					week${ISO.week}Received = ${item.donationsReceived}
					WHERE tag = ${item.tag};` 
		, (err,res) =>{
			if(err)
				return err;
			client.end();
		});
	});
	
};

app.get('/update', (req,res) =>{
	
	let status = checkTable();
	if(status){
			res.render('error.hbs',{message : status});
			return ;
	}
	
	// Request data from RoyaleAPI
	request(options, (error,response,body) =>{
	if(error)
		res.render('error.hbs',{message : error});
	else if(response.statusCode !== 200){
		res.render('error.hbs', {message : response.statusCode});
	}
	else{
		//console.log(JSON.stringify(body,undefined,2));
		
		const statusUpdate = updateRecords(body);
		if(statusUpdate){
			res.render('error.hbs', {message : statusUpdate});
			return;
		}
		res.send('Successfully updated');
	}
	//res.send('done');
});
});

// View current month records
app.get('/view',(req,res) =>{
	
	var result = queryMonthly();
	res.send(result);
});

// query all records for current month
var queryMonthly= () =>{
	const ISO= getISOWeekInMonth();
	
	client.query(`SELECT * FROM month${ISO.month};`, (err, res) => {
		if (err) return;
		/*for (let row of res.rows) {
			console.log(JSON.stringify(row));
		}*/
		//res1.render(res.rows);
		return res;
	client.end();
	});
}



// Home page
app.get('/', (req,res) =>{
	res.render('home.hbs',{} );
});

// Error for any other non-supported page
app.use((req,res,next) =>{
	res.render('error.hbs',{message : 'Error 404! Not found page'});
});

// start listening at port
app.listen(port, () =>{
	console.log(`Server is up at ${port}`);
});
