	var channelName="private-blogChannel";
	var eventName="client-newCommentEvent";
	Pusher.channel_auth_endpoint = '/pusherAuthentication';	
	var pusherKey="4df2e537c7b561b87dd7";



Math.guid = function(){
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
	return v.toString(16);
  }).toUpperCase();      
};	

$(function(){

window.clientID=Math.guid();
_.templateSettings = {
	  interpolate : /\{\{(.+?)\}\}/g
	};	
	var Comment=Backbone.Model.extend({
		defaults:{
			state: "editing",			
			clientID:clientID
		},
		initialize: function() {
			if(!this.get("id"))
				this.set({id: Math.guid()});
		}
	});
	var ConfigurationModel=Backbone.Model.extend({
		defaults: {
			byKey: true,
		}
	});
	window.configurationModel=new ConfigurationModel();
	
	var Comments=Backbone.Collection.extend({
		model: Comment,
		getCommentsByStateAndClientId: function(state,clientId){
			return this.select(function(cSelect){
				return cSelect.get("state")==state && cSelect.get("clientId")==clientId;
			});	
		},		
		getCommentsByState: function(state){
			return this.select(function(cSelect){
				return cSelect.get("state")==state;
			});	
		},		
	});
	window.commentsList=new Comments();
	
	var newCommentView=Backbone.View.extend({
		el: $('#comments'),		
		template: _.template($('#tNewComment').html()),
		updateComment:function(nModel,commentText){			
			
			$("#sComment",this.addedElement).text(commentText);
			
		},
		initialize: function(){
			_.bindAll(this,"updateComment");
			this.model.bind("change:comment",this.updateComment);
		},
		render: function(){
			this.addedElement=$(this.template(this.model.toJSON()));
			this.el.append(this.addedElement);				
		}		
	});	
	var CommentsView=Backbone.View.extend({
		el: $('#mainPanel'),	
			initialize: function(){			
				_.bindAll(this,"sendComment,updateByKey");
				var context=this;				
				commentsList.bind("add",function(comment){							
							if(comment.get("state")=="finished" || comment.get("clientID")!=window.clientID)
									context.showNewComment(comment);	
							if(comment.get("state")=="editing" && comment.get("clientID")==window.clientID){
								comment.bind("change:state",function(model,state){
									if(state=="finished")
										context.showNewComment(model);	
								});
							}
				});
			},
			updateByKey: function(){					
				this.getCurrentComment().set({
				name: $('#iName').val(),
				comment: $('#tComment').val()				
				});	
			},
			showNewComment:function(comment){				
				var view=new newCommentView({model: comment});
				view.render();			
			},
		render: function(){
			this.el.show();
			configurationView.hide();
		},
		hide:function(){
			this.el.hide();
		},
		events: {
			"click #bSend": "sendComment",
			"keyup #tComment" : "updateByKey"
		},		
		getCurrentComment:function(){			
			return commentsList.getCommentsByStateAndClientId("editing",window.clientId)[0];
		},		
		sendComment: function(event){		
			event.preventDefault();	
			this.getCurrentComment().set({
				name: $('#iName').val(),
				comment: $('#tComment').val(),
				state: "finished"
			});
			commentsList.add(new Comment());				
				
		}
	});
	var ConfigurationView=Backbone.View.extend({
		el: $('#configuration'),	
		model: configurationModel,		
		render: function(){		
			$('#chByKey').attr("checked",this.model.get("byKey"));
			this.el.show();
			commentsView.hide();
		},
		hide:function(){
			this.el.hide();
		},
		events:{
			"click #aComments" : "showComments",
			"change #chByKey" : "setChangeByKey"
		},
		showComments:function(){
			commentsView.render();
		},
		setChangeByKey:function(){
			this.model.set({"byKey":$('#chByKey').is(":checked")});			
		},
	});
	window.commentsView=new CommentsView();		
	window.configurationView=new ConfigurationView();
	commentsView.render();

	var ConfigurationController=Backbone.Controller.extend({
		routes:{
			"configuration" : "configuration"
		},
		configuration: function(){			
			configurationView.render();
		}
	});
	var configurationController=new ConfigurationController();
	Backbone.history.start();
	
	var pusher=new Pusher(pusherKey);
	window.channel=pusher.subscribe(channelName);
	channel.bind('pusher:subscription_succeeded', function() {
			//console.log("suscrito con exito");		
	});	
	channel.bind('pusher:subscription_error', function(status) {
	console.log("error en la suscripcion:"+status);
});
	channel.bind(eventName,function(data){					
			console.log("recibido evento");
			console.log(JSON.stringify(data));
			var comment=commentsList.get(data.id);			
			if(!comment){	
				var newComment=new Comment(data);			
				commentsList.add(newComment);
			}
			else				
				comment.set(data);
				
	});	
	commentsList.bind("add",function(comment){								
							if(comment.get("clientID")==clientID){								
								comment.bind("change:state",function(model,state){											
											if(state=='finished'){														
													channel.trigger(eventName,model);			
									}
								});
								comment.bind("change:comment",function(model,commentText){
											if(configurationModel.get("byKey")){															
													channel.trigger(eventName,model);		
											}
								
								});
							}
				});
	commentsList.add(new Comment());
});