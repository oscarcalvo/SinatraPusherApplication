Math.guid = function(){
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
	return v.toString(16);
  }).toUpperCase();      
};	

$(function(){

	if(window.cancelChat)
		return;
	
_.templateSettings = {
	  interpolate : /\{\{(.+?)\}\}/g
	};	
	var Comment=Backbone.Model.extend({
		defaults:{
			state: "editing",
			name: "",
			comment: ""
		},
		initialize: function() {
			if(!this.get("id"))
				this.set({id: Math.guid()});
		}
	});
	var ConfigurationModel=Backbone.Model.extend({
		defaults: {
			byKey: true
		}
	});
	window.configurationModel=new ConfigurationModel();
	
	var Comments=Backbone.Collection.extend({
		model: Comment,
		getCommentsByStateAndClientId: function(state,clientId){
			return this.select(function(cSelect){
				return cSelect.get("state")==state && cSelect.get("pusherSyncClientID")==clientId;
			});	
		},		
		getCommentsByState: function(state){
			return this.select(function(cSelect){
				return cSelect.get("state")==state;
			});	
		}		
	});
	window.commentsList=new Comments();
	
	var newCommentView=Backbone.View.extend({
		el: $('#comments'),		
		template: _.template($('#tNewComment').html()),
		updateComment:function(nModel){
			$("#sComment",this.addedElement).text(nModel.get("comment"));
			$("#sName",this.addedElement).text(nModel.get("name"));
			this.showHideComment();
		},
		deleteComment:function(nModel){			
			if(nModel==this.model)					
				this.addedElement.remove();			
		},
		initialize: function(){
			_.bindAll(this,"updateComment", "deleteComment");			
			this.model.bind("change",this.updateComment);
			this.model.collection.bind("remove",this.deleteComment);
		},
		render: function(){
			this.addedElement=$(this.template(this.model.toJSON()));
			this.showHideComment();				
			this.el.append(this.addedElement);				
		},
		showHideComment:function(){
			if(this.model.get("comment")=="" && this.model.get("name")=="")
				this.addedElement.hide();
			else
				this.addedElement.show();
		}
	});	
	var CommentsView=Backbone.View.extend({
		el: $('#mainPanel'),	
			initialize: function(){			
				_.bindAll(this,"sendComment,updateByKey");
				var context=this;				
				commentsList.bind("add",function(comment){
						
							if(comment.get("state")=="finished" || comment.get("pusherSyncClientID")!=Backbone.Collection.pusherSyncClientID)
									context.showNewComment(comment);	
							if(comment.get("state")=="editing" && comment.get("pusherSyncClientID")==Backbone.Collection.pusherSyncClientID){
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
			"keyup #tComment" : "updateByKey",
			"keyup #iName" : "updateByKey"
		},		
		getCurrentComment:function(){			
			return commentsList.getCommentsByStateAndClientId("editing",Backbone.Collection.pusherSyncClientID)[0];
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
		}
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
	
	commentsList.syncByPusher({
	channel_auth_endpoint: "/pusherAuthentication",
	pusherKey: "4df2e537c7b561b87dd7",
	channelName: "myCollectionSync",
	prevSync:true
});
	
	
	commentsList.add(new Comment());
});