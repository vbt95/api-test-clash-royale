const request = require('request');
const express= require('express');

// get PORT number from heroku or 3000 if testing on local machine
const port = process.env.PORT || 3000;

// database connection
const { Pool } = require('pg')
const pool = new Pool({
connectionString: process.env.DATABASE_URL,
  ssl: true,
}
)

var app = express();

// set view engine
app.set('view engine','ejs');

// For maintenance mode
/*app.use((req,res,next) =>{
	res.render('maintenance');
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
	pool.connect((err,client,done ) =>{
	
	if(err){
		 throw err;
	}
	client.query(`CREATE TABLE IF NOT EXISTS month${ISO.month} (tag varchar(20) PRIMARY KEY,
	name varchar(30),
	week1Given integer DEFAULT 0,week1Received integer DEFAULT 0, 
	week2Given integer DEFAULT 0,week2Received integer	DEFAULT 0, 
	week3Given integer DEFAULT 0,week3Received integer DEFAULT 0,
	week4Given integer DEFAULT 0,week4Received integer DEFAULT 0,
	week5Given integer DEFAULT 0, week5Received integer DEFAULT 0);`
	//totalDonationsGiven AS week1Given+week2Given+week3Given+week4Given+week5Given, 
	//totalDonationsReceived AS week1Received+week2Received+week3Received+week4Received+week5Received
	//);
	, (err, res) => {
		done();
		if (err) {
			console.log(err);
		}
		console.log('Inside checktable execution over');
		});
	});
}

var alter1 =(body,ISO) =>{
	client.query('ALTER TABLE month'+ISO.month+' ADD totalDonationsGiven AS (week1Given+week2Given+week3Given+week4Given+week5Given) PERSISTED;'
	,(err,res)  =>{
		if(err) return err;
		console.log('alter1 execution over');
		return alter2(body,ISO);
		client.end();
	});
}
var alter2 = (body,ISO) =>{
	client.query('ALTER TABLE month'+ISO.month+' ADD totalDonationsReceived AS (week1Received+week2Received+week3Received+week4Received+week5Received) PERSISTED;'
	,(err,res)  =>{
		if(err) return err;
		console.log('alter2 execution over');
		return updateFinal(body,ISO);
		client.end();
	});
};

var updateFinal = (body,ISO) =>{
	body.members.forEach( (item) => {
		let statusInsert = updateOne(item,ISO);
		if(statusInsert)
			return statusInsert;
})
};

var updateOne = (item,ISO) =>{
	
	pool.connect( (err,client,done) =>{
		
		if(err){
			console.log(err);
			done();
			return err;
		}	
	client.query( `SELECT tag FROM month${ISO.month} WHERE tag=$1;`
		,[item.tag]
		, (err,res) =>{
		
		if(err){
			console.log(err);
			done();
			return err;
		}
		console.log('insertFirst execution over');
		
		if(res.rowCount  > 0){
			console.log('Exists');
			client.query( `UPDATE month{ISO.month} SET week${ISO.week}Given = $1,
					week${ISO.week}Received = $2
					WHERE tag = $3;` 
				, 
				[item.donations,item.donationsReceived,item.tag]
				,(err,res) =>{
					if(err){
						console.log(err);
						done();
						return err;
					}
				console.log('updated one item');
				done();
				return;
			});
		}
		else
		{
			console.log('Not exists');
			client.query(`INSERT into month${ISO.month} (tag,name,week${ISO.week}Given,week${ISO.week}Received)
				VALUES ($1,$2,$3,$4); `
			,[item.tag,item.name,item.donations,item.donationsReceived]
			, (err,res) =>{
				if(err){
					console.log(err);
					done();
					return err;
				}
				console.log('Inserted it');
				done();
				return;
			});
		}
		});
	});
}

var updateRecords = (body)=>{
	
	const ISO = getISOWeekInMonth(new Date());
	let status = updateFinal(body,ISO);
	if(status){
			return status;
	}
};

app.get('/update', (req,res) =>{
	
	// Request data from RoyaleAPI
	request(options, (error,response,body) =>{
	if(error)
		res.render('error',{message : error});
	else if(response.statusCode !== 200){
		res.render('error', {message : response.statusCode});
	}
	else{
		//console.log(JSON.stringify(body,undefined,2));
		
		const statusUpdate = updateRecords(body);
		if(statusUpdate){
			res.render('error', {message : statusUpdate});
			return;
		}
		res.send('Successfully updated');
	}
	//res.send('done');
});
});

app.get('/setForCurrentMonth' ,(req,res) =>{
	let status = checkTable();
	if(status)
		res.render('error', {message : status});
	else
		res.send('Done');
});

// View current month records
app.get('/view',(req,res) =>{
	
	const ISO= getISOWeekInMonth(new Date());
	
	pool.connect( (err,client,done) =>{
		
		if(err){
			res.render('error', {message : err});
			return done();
		}
		else
		{			
		client.query(`SELECT * FROM month${ISO.month};`, (err, result) => {
			if (err) {
				console.log(error);
				done();
				res.render('error' ,{message : err});
			}
		/*for (let row of res.rows) {
			console.log(JSON.stringify(row));
		}*/
		//res1.render(res.rows);
		else{
			done();
			res.render('view',result);
		}
		});
		}
	});
});



// Home page
app.get('/', (req,res) =>{
	res.render('home',{} );
});

// Error for any other non-supported page
app.use((req,res,next) =>{
	res.render('error',{message : 'Error 404! Not found page'});
});

// start listening at port
app.listen(port, () =>{
	console.log(`Server is up at ${port}`);
});
