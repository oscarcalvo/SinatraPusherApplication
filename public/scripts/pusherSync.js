Math.guid = function(){
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
	return v.toString(16);
  }).toUpperCase();      
};	


(function(Backbone) {
	var pusherSync={		
	
		getSynPreviousChannelName: function(id, channelName){
			return channelName+id;
		},	
		previousSync:function(){
				this.isSync=false;
				var context=this;
				this.presenceChannel.members.each(function(member){					
					if(member.id!=context.presenceChannel.members.me.id){
						var auxChanelName=
						context.presenceChannel.trigger(context.options.previousSyncEventName,{ev: "ps",id:member.id, re:context.presenceChannel.members.me.id});
						var tChannel=context.getChannelAuthenticated(context.getSynPreviousChannelName(context.presenceChannel.members.me.id,context.options.channelName),null);
						tChannel.bind(context.options.previousSyncEventName,function(data){
							if(data.ev=="rps"){						
								$.each(data.object,function(index,item){
									if(!context.collection.getBySyncItem(item.pusherSyncItemID)){											
											var aux=new context.collection.model(item);											
											context.collection.add(aux);											
									}									
								});
							}
							//aqui debo desuscribirme							
						});
						return false;
					}				
				});		
		},
		handlePresenceChannel:function(){
				
				var context=this;
				if(this.options.prevSync){
					this.presenceChannel=this.getChannelAuthenticated(this.options.channelPresenceName,function(){
						if(context.options.prevSync)
							context.previousSync();
					});		
					
					this.presenceChannel.bind(this.options.previousSyncEventName,function(data){
							if( data.id==context.presenceChannel.members.me.id &&
							data.ev=="ps"){
							
								var tChannel=context.getChannelAuthenticated(context.getSynPreviousChannelName(data.re,context.options.channelName),function(){
								
									tChannel.trigger(context.options.previousSyncEventName,{
										ev: "rps",
										object: context.collection
									});							
								});
								
							}
					
					});
				}
				
		},
		syncCollection: function(collection, options){
				this.options=options;
				this.collection=collection;
				Pusher.channel_auth_endpoint =options.channel_auth_endpoint;	
				this.pusher=new Pusher(pusherKey);				
				var context=this;
				
				
					
					console.log("antes");
				this.channel=this.getChannelAuthenticated(options.channelName,options.subscription_succeeded);				
				console.log("despues");
				this.isSync=true;
				console.log("subscribiendo al evento "+options.eventName);
				this.channel.bind(options.eventName,function(data){		
					console.log("recibido evento "+data.ev);
					switch(data.ev){
						case "ia":
							context.collection.add(new context.collection.model(data.object));							
							break;
						case "id":							
							var element=context.collection.getBySyncItem(data.object.pusherSyncItemID);
							context.collection.remove(element);
							break;
						case "iu":
							var element=context.collection.select(function(item){
								return item.get("pusherSyncItemID")==data.object.pusherSyncItemID;
							})[0];
							if(element)
								element.set(data.object);
							else
								context.collection.add(new context.collection.model(data.object));
							break;
					}
					
				});
				
				this.handlePresenceChannel();
				this.collection.bind("remove",function(item){
						if(item.get("pusherSyncClientID")==BackbonePusherSyncCollection.pusherSyncClientID)
							context.channel.trigger(context.options.eventName, {
								ev: "id",
								object: item
							});
				});
				
				this.collection.bind("add",function(item){					
					item.bind("change",function(item){
						if(item.get("pusherSyncClientID")==BackbonePusherSyncCollection.pusherSyncClientID){
								console.log("lanzando evento"+context.options.eventName);
								context.channel.trigger(context.options.eventName, {ev: "iu",object: item});
							}
					});					
					if(item.get("pusherSyncClientID")==BackbonePusherSyncCollection.pusherSyncClientID)
							context.channel.trigger(context.options.eventName, {
								ev: "ia",
								object: item
							});
				});
				
		},
		getChannelAuthenticated:function( channelName, subscriptionSuceeded){
			console.log("autenticando en "+channelName);
				var context=this;				
				var ch=this.pusher.subscribe(channelName);
				ch.bind('pusher:subscription_error', function(status) {
					error("Error in Pusher subscription:"+status);
				});
				ch.bind('pusher:subscription_succeeded', function() {
					if(subscriptionSuceeded)
						subscriptionSuceeded();
				});					
				return ch;
			}		
	}

	var BackbonePusherSyncCollection=Backbone.Collection.extend({			
			initialize: function(){
				this.bind("add",function(mdl){				
					if(!mdl.get("pusherSyncClientID"))
						mdl.set({pusherSyncClientID:BackbonePusherSyncCollection.pusherSyncClientID});
					if(!mdl.get("pusherSyncItemID"))
						mdl.set({pusherSyncItemID: Math.guid()});
				});
			},
			
			syncByPusher:function(options){
				var defaults=	{				
				eventName: "client-pusherSync",
				previousSyncEventName: "client-pvPusherSync"
				};
				options=$.extend(defaults,options);	
				options.channelPresenceName="presence-"+options.channelName;
				options.channelName="private-"+options.channelName;				
				pusherSync.syncCollection(this, options);				
			},
			getBySyncItem:function(SyncItemId){
			return this.select(function(item){
								return item.get("pusherSyncItemID")==SyncItemId;
					})[0];
				}
	},
	{
		pusherSyncClientID:Math.guid()		
	});
	Backbone.Collection=BackbonePusherSyncCollection;
}(Backbone));


var TestModel=Backbone.Model.extend({});
var TestCollection=Backbone.Collection.extend({
	model: TestModel
});




