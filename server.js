var http = require('http');
var router = require('router');
var route = router();
var Server = http.createServer(server);
var filed = require('filed');
var mu = require('mu2');
var leveler = require('levelidb');
var qs = require('querystring');
var uuid = require('node-uuid');
var Cookies = require('cookies');
var pass = require('./pw.json').password;

var db = leveler("/wotf", {
    encoding: "json",
		createIfMissing: true
});

function roladex(cb){
	var dex = {};
	db.readStream()
	  .on('data', function (data) {
	    dex[data.key] = data.value;
	  })
	  .on('error', function (err) {
	    cb(err, null)
	  })
	  .on('close', function () {
	  })
	  .on('end', function () {
			var str = ''
			for(n in dex){
				str += '<a href="./person/' + dex[n].id + '">'+dex[n].name+'</a><br />'
			};
			cb(null, str)
	  })
};

route.get('/auth', function(req, res){
	filed('public/auth.html').pipe(res)
});

route.post('/auth', function(req, res){
	req.on('data', function(data){
		var cookies = new Cookies( req, res );
		var pw = qs.parse(data.toString('utf8')).password;
		if(pw === pass){
			cookies.set('admin', 'true');
			res.setHeader('Location', '/');
			res.writeHead(302);
			res.end()
		}
		else {
			cookies.set('admin', 'false');
			res.setHeader('Location', '/auth');
			res.writeHead(302);
			res.end()
		}
	})
});

route.get('/roladex', function(req, res){
	roladex(function(err, str){
		if(err) console.error(err);
		else{
			res.setHeader("Content-Type", "text/html");
			res.writeHead(200);
			res.write(str);
			res.end();
		}
	})
});

route.get('/', function(req, res){
	roladex(function(err, str){
		if(err) console.error(err);
		else{
			res.setHeader("Content-Type", "text/html");
			res.writeHead(200);
			var data = {list: str, homeshow: 'hide'};
			var moo = mu.compileAndRender('public/index.html', data);
			moo.pipe(res);
		}
	})
});

route.get('/person/{id}', function(req, res){
	db.get(req.params.id, function(err, data){
		console.log(data)
		if(err) {
			res.writeHead(400);
			res.end('NOT FOUND')
		}
		else {			
			res.setHeader("Content-Type", "text/html");
			res.writeHead(200);
			data.homeshow = ""
			var moo = mu.compileAndRender('public/index.html', data);
			moo.pipe(res);	
		}		
	})
});

route.get('/public/{file}', function(req, res){
	filed('public/' + req.params.file).pipe(res)
});

route.post('/save', function(req, res){
	req.on('data', function(data){
		data = qs.parse(data.toString('utf8'));
		data.id = data.id || uuid();
		data.date = new Date().getTime();
		console.log(data)
		db.put(data.id, data, function(err){
			if(err) console.error(err);
			res.setHeader('Location', './person/' + data.id);
			res.writeHead(302);
			res.end()
		});
	})
});

route.post('/delete/{id}', function(req, res){
	db.del(req.params.id, function(err){
		if(err) console.error(err);
		res.setHeader('Location', '/');
		res.writeHead(301);
		res.end()
	})
})

function server(req, res){
	var cookies = new Cookies( req, res );
  var admin = cookies.get('admin');

	if(!admin) {
		res.setHeader('Location', '/auth');
		res.writeHead(302);
		res.end()
	}

	else{
		route(req, res)
	}
	
		
};

Server.listen(10001)