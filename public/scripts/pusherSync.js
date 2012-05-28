Math.guid = function(){
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
	return v.toString(16);
  }).toUpperCase();      
};	


(function(Backbone) {
	var PusherSync= function(){};	
		PusherSync.prototype={
		getSynPreviousChannelName: function(id, channelName){
			return channelName+id;
		},	
		previousSync:function(){
				this.isSync=false;
				var self=this;	
				var aux=false;
				this.presenceChannel.members.each(function(member){					
					if(member.id!=self.presenceChannel.members.me.id
					&& !aux){
						//aquí esta pendiente que manejes lo que pasa si el otro extremo se desconecta justo en ese momento
						//habría que poner un timer para que si no se recibe respuesta en x, se envíe al siguiente
						//jugando con el this.isSync como semaforo.
						aux=true;
						var auxChanelName=
						self.presenceChannel.trigger(self.options.previousSyncEventName,{ev: "ps",id:member.id, re:self.presenceChannel.members.me.id});
						var tChannel=self.getChannelAuthenticated(self.getSynPreviousChannelName(self.presenceChannel.members.me.id,self.options.channelName),null);
						tChannel.bind(self.options.previousSyncEventName,function(data){
							if(data.ev=="rps"){						
								$.each(data.object,function(index,item){
									if(!self.collection.getBySyncItem(item.pusherSyncItemID)){																																	
											self.collection.add(new self.collection.model(item));											
									}									
								});
							}
							self.unsubscribeChannel(tChannel);				
						});						
					}							
				});		
		},
		handlePresenceChannel:function(){				
				var self=this;
				if(this.options.prevSync){
					this.presenceChannel=this.getChannelAuthenticated(this.options.channelPresenceName,function(){
						if(self.options.prevSync)
							self.previousSync();
					});	
					this.presenceChannel.bind(this.options.previousSyncEventName,function(data){
							if( data.id==self.presenceChannel.members.me.id &&
							data.ev=="ps"){							
								var tChannel=self.getChannelAuthenticated(self.getSynPreviousChannelName(data.re,self.options.channelName),function(){
									tChannel.trigger(self.options.previousSyncEventName,{
										ev: "rps",
										object: self.collection
									});
										self.unsubscribeChannel(tChannel);	
								});
								
							}
					
					});
				}
				
		},
		syncCollection: function(collection, options){
				this.options=options;
				this.collection=collection;
				Pusher.channel_auth_endpoint =options.channel_auth_endpoint;					
				this.pusher=options.pusherObject;
				var self=this;
					
				this.channel=this.getChannelAuthenticated(options.channelName,options.subscription_succeeded);								
				this.isSync=true;
				this.channel.bind(options.eventName,function(data){
				var aux=new self.collection.model(data.object);
				if(aux.get("pusherSyncClientID") && aux.get("pusherSyncClientID")!=BackbonePusherSyncCollection.pusherSyncClientID){
						switch(data.ev){
							case "ia":
								self.collection.add(aux);							
								break;
							case "id":							
								var element=self.collection.getBySyncItem(aux.get("pusherSyncItemID"));
								self.collection.remove(element);
								break;
							case "iu":
								var element=self.collection.select(function(item){
									return item.get("pusherSyncItemID")==aux.get("pusherSyncItemID");
								})[0];
								if(element)
									element.set(aux);
								else
									self.collection.add(aux);
								break;
							}					
						}
					});		
				this.handlePresenceChannel();
				this.collection.bind("remove",function(item){
						if(item.get("pusherSyncClientID")==BackbonePusherSyncCollection.pusherSyncClientID)
							self.channel.trigger(self.options.eventName, {
								ev: "id",
								object: item
							});
				});				
				this.collection.bind("add",function(item){					
					item.bind("change",function(item){
						if(item.get("pusherSyncClientID")==BackbonePusherSyncCollection.pusherSyncClientID){
									self.channel.trigger(self.options.eventName, {ev: "iu",object: item});
							}
					});					
					if(item.get("pusherSyncClientID")==BackbonePusherSyncCollection.pusherSyncClientID)
							self.channel.trigger(self.options.eventName, {
								ev: "ia",
								object: item
							});
				});				
		},
		getChannelAuthenticated:function( channelName, subscriptionSuceeded){
							var self=this;				
				var ch=this.pusher.subscribe(channelName);
				ch.bind('pusher:subscription_error', function(status) {
					error("Error in Pusher subscription:"+status);
				});
				ch.bind('pusher:subscription_succeeded', function() {
					if(subscriptionSuceeded)
						subscriptionSuceeded();
				});					
				return ch;
			},
		unsubscribeChannel:function(channel){
				this.pusher.unsubscribe(channel.name);
		},
	}
	var BackbonePusherSyncCollection=Backbone.Collection.extend({			
			initialize: function(){
				this.bind("add",function(model){				
					if(!model.get("pusherSyncClientID"))
						model.set({pusherSyncClientID:BackbonePusherSyncCollection.pusherSyncClientID});
					if(!model.get("pusherSyncItemID"))
						model.set({pusherSyncItemID: Math.guid()});
				});
			},
			
			syncByPusher:function(options){
				var defaults=	{				
				eventName: "client-pusherSync",
				previousSyncEventName: "client-pvPusherSync",
				pusherObject: new Pusher(options.pusherKey)
				};
				options=$.extend(defaults,options);	
				options.channelPresenceName="presence-"+options.channelName;
				options.channelName="private-"+options.channelName;	
				var pSync=new PusherSync();
				pSync.syncCollection(this, options);				
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




