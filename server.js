const request = require('request');
const express= require('express');
const hbs = require('hbs');

const port = process.env.PORT || 3000;
var app = express();

hbs.registerPartials(__dirname+'/views/partials');

const fixieRequest = request.defaults({'proxy': process.env.FIXIE_URL});

app.set('view engine','hbs');

/*app.use((req,res,next) =>{
	res.render('maintenance.hbs');
});*/


var options = {
	url : 'https://api.clashroyale.com/v1/clans/%23C2VQCU/members'
	,headers : {
		Accept : 'application/json'
		, authorization : 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiIsImtpZCI6IjI4YTMxOGY3LTAwMDAtYTFlYi03ZmExLTJjNzQzM2M2Y2NhNSJ9.eyJpc3MiOiJzdXBlcmNlbGwiLCJhdWQiOiJzdXBlcmNlbGw6Z2FtZWFwaSIsImp0aSI6IjQ0MjczNGFhLTdlNDUtNGM4NC1hOWE1LTNmOGQ2ZGM5ODdiYSIsImlhdCI6MTUzNjA4NTkyNCwic3ViIjoiZGV2ZWxvcGVyL2Q5OTc3YzdiLTEzMmQtODRlOC1kZjY1LWE4NDc1MmQzYzY2ZCIsInNjb3BlcyI6WyJyb3lhbGUiXSwibGltaXRzIjpbeyJ0aWVyIjoiZGV2ZWxvcGVyL3NpbHZlciIsInR5cGUiOiJ0aHJvdHRsaW5nIn0seyJjaWRycyI6WyI0Ny45LjE0My4zNiJdLCJ0eXBlIjoiY2xpZW50In1dfQ.o5wL60Xdch5I4BOVkAYAMAtEAHdsjrKHo5XtFWJgeez6wu10PCaw5sdOLGWFf_p8f1ObMBLyY9wNUjvwRNVt0A'
	}
	, json : true

}

app.get('/update', (req,res) =>{
	request(options, (error,response,body) =>{
	if(error)
		console.log("error",error);
	else if(response.statusCode !== 200){
		console.log(statusCode);
	}
	else{
		console.log(JSON.stringify(body,undefined,2));
	}

});
});

app.get('/', (req,res) =>{
	res.render('home.hbs',{} );
});

app.use((req,res,next) =>{
	res.render('error.hbs');
});

app.listen(port, () =>{
	console.log(`Server is up at ${port}`);
});
