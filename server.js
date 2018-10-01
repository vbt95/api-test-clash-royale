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

//set static resources
app.use(express.static(__dirname+'/public'));

// For maintenance mode
/*app.use((req,res,next) =>{
	res.render('maintenance');
});*/

// Options for HTTP request to API
var options = {
	method : 'GET',
	url : 'https://api.royaleapi.com/clan/C2VQCU'
	,headers : {
		auth : process.env.API_KEY
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
var checkTable = (response) =>{
	
	const ISO = getISOWeekInMonth(new Date());
	//let flag=false;
	pool.connect((err,client,done ) =>{
	
	if(err){
		 response.render('error',{message : err});
		 return;
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
			response.render('error',{message : err});
		}
		else
			response.render('success');
		console.log('Inside checktable execution over');
		
		});
	});
}

var updateFinal = (body,ISO,response) =>{
	const totalMembers = body.members.length;
	//body.members.forEach( (item,index) => {
		
	for(let index=0; index<totalMembers;index++){
		
		const item = body.members[index];
		if(response.headersSent)
			continue;
		pool.connect( (err,client,done) =>{
		if(err){
			console.log(err);
			done();
			response.render('error',{message : err});
		}
		else{
		client.query( `SELECT * FROM month${ISO.month} WHERE tag = $1;`
			,[item.tag]
			, (err,res) =>{
		
			if(err){
				console.log(err);
				done();
				response.render('error',{ message : err});
			}
			else{
		
				console.log('checking for existence over');
		
				if(res.rowCount  > 0){
					console.log('Exists');
					client.query( `UPDATE month${ISO.month} SET week${ISO.week}Given = $1,
						week${ISO.week}Received = $2
						WHERE tag = $3;` 
						, 
						[item.donations,item.donationsReceived,item.tag]
						,(err,res) =>{
							if(err){
								console.log(JSON.stringify(err,undefined,2));
								done();
								response.render('error', { message : err});
							}
							else{
								console.log('updated one item');
								done();
								if(index == totalMembers-1)
									response.render('success');
							}
					});// update query over
				}
				else
				{
					console.log('Not exists');
					client.query(`INSERT into month${ISO.month} (tag,name,week${ISO.week}Given,week${ISO.week}Received)
							VALUES ($1,$2,$3,$4); `
							,[item.tag,item.name,item.donations,item.donationsReceived]
							, (err,res) =>{
									if(err){
									console.log(JSON.stringify(err,undefined,2));
									done();
									response.render('error',{ message: err});
								}
								else{
									console.log('Inserted it');
									done();
									if(index== totalMembers-1)
										response.render('success');
								}
					});// insert query over
				}
			}
		});
	};
		});
	}
}

var updateRecords = (body,res)=>{
	
	const ISO = getISOWeekInMonth(new Date());
	updateFinal(body,ISO,res);
};

app.get('/update', (req,res) =>{
	
	// Request data from RoyaleAPI
	request(options, (error,response,body) =>{
	if(error)
		res.render('error',{message : error});
	else if(response.statusCode !== 200){
		res.render('error', {message : `Error! ${response.statusCode}`});
	}
	else{
		//console.log(JSON.stringify(body,undefined,2));
		updateRecords(body,res);
	}
});
});

app.get('/setForCurrentMonth' ,(req,res) =>{
	checkTable(res);
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


app.use('/testview',(req,res)=>{
	res.render('view',{
		 rows : [
        {
            "name": "Nicki Bey",
            "tag": "Q8JGYLCY",
            "rank": 1,
            "previousRank": 1,
            "role": "elder",
            "expLevel": 13,
            "trophies": 5817,
            "clanChestCrowns": 47,
            "donations": 0,
            "donationsReceived": 360,
            "donationsDelta": -360,
            "donationsPercent": 0,
            "arena": {
                "name": "Champion",
                "arena": "League 7",
                "arenaID": 19,
                "trophyLimit": 5800
            }
        },
        {
            "name": "John™",
            "tag": "PL22YQUY",
            "rank": 2,
            "previousRank": 4,
            "role": "elder",
            "expLevel": 13,
            "trophies": 5677,
            "clanChestCrowns": 110,
            "donations": 348,
            "donationsReceived": 320,
            "donationsDelta": 28,
            "donationsPercent": 1.25,
            "arena": {
                "name": "Master III",
                "arena": "League 6",
                "arenaID": 18,
                "trophyLimit": 5500
            }
        },
		]
	});
	});

// Error for any other non-supported page
app.use((req,res,next) =>{
	res.render('error',{message : 'Error 404! Page not found'});
});


// start listening at port
app.listen(port, () =>{
	console.log(`Server is up at ${port}`);
});



