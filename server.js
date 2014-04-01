var trace = function(m){ console.log(m)},
	express = require('express'),
	http = require('http'),
	path = require('path'),
	app = express();


app.configure(function(){
	app.use(express.logger('dev'));
	app.use(express.bodyParser());
	app.use(express.static(path.join(__dirname, "public")));
	app.use(express.static(path.join(__dirname, "bower_components")));
	app.use(express.static(path.join(__dirname, "node_modules")));
}); 

app.get("/", function(req,res){
	res.render('layout.jade');
})
app.get("/channel_:id", function(req,res){
	res.redirect('/#/channel_'+req.params.id+parseQuery(req.query));
})
app.get("/channel_:id/item_:uid", function(req,res){
	res.redirect('/#/channel_'+req.params.id+"/item_"+req.params.uid+parseQuery(req.query));
})
app.get("*", function(req,res){
	res.redirect('/');
})

http.createServer(app).listen(3000,function(){
	trace("SERVER:: initialized");
})


function parseQuery(query){
	var path = "", items = [];
	if (Object.keys(query)){
		path += "?"
		for (var ii in query){ items.push(ii+"="+query[ii]); }
	}
	return path+items.join("&")
}