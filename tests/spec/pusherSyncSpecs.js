/*describe("Calculadora",function(){
	it("calcular suma",function(){
			expect(new Calculadora().sumar(3,5)).toEqual(8);
	});
	
	it("calcular multiplicación",function(){
			expect(new Calculadora().multiplicar(5,7)).toEqual(35);		
	});
	it("calcular división",function(){
			expect( Calculadora.dividir(40,8)).toEqual(5);		
	});
});

*/

window.cancelChat=true;

describe ("PusherSync", function(){

	it("Backbone Collection overwrited",function(){
		expect(new  Backbone.Collection().syncByPusher).toBeTruthy();
	});
	it("open one channels when you instance it",function(){	
			var conf= initializeBasicConfiguration();			
			spyOn(conf.pusher,"subscribe").andReturn(conf.channel);
			conf.collection.syncByPusher(conf.defaults);
			expect(conf.pusher.subscribe).toHaveBeenCalledWith("private-"+conf.defaults.channelName);			
	});
	it("sends a event in the channel when you add a object to the collection",function(){
		var conf=initializeBasicConfiguration();
		var testModel=new conf.collection.model();
		spyOn(conf.pusher,"subscribe").andReturn(conf.channel);
		spyOn(conf.channel,"trigger");
		conf.collection.syncByPusher(conf.defaults);
		conf.collection.add(testModel);
		expect(conf.channel.trigger).toHaveBeenCalledWith(conf.defaults.eventName,{ev:"ia",object:testModel});
	});
	it("doesn't sends a event in the channel when you add a object to the collection if the guid is distinct",function(){
		var conf=initializeBasicConfiguration();
		var testModel=new conf.collection.model({pusherSyncClientID:Math.guid()});		
		spyOn(conf.channel,"trigger");
		conf.collection.syncByPusher(conf.defaults);
		conf.collection.add(testModel);
		expect(conf.channel.trigger).not.toHaveBeenCalledWith(conf.defaults.eventName,{ev:"ia",object:testModel});
	});
	it("add the item to collection when the channel receives a event of item added",function(){
		var conf=initializeBasicConfiguration();
		var testModel=new conf.collection.model({pusherSyncClientID:Math.guid(),pusherSyncItemID:Math.guid()});
		_.extend(conf.pusher.subscribe(),Backbone.Events);
		conf.collection.syncByPusher(conf.defaults);
		conf.channel.trigger(conf.defaults.eventName,{ev:"ia",object:testModel});
		expect(conf.collection.length).toEqual(1);
		expect(conf.collection.at(0).get("pusherSyncItemID")).toEqual(testModel.get("pusherSyncItemID"));
	});
	it("update the item when the channel receive a event of item updated",function(){
		var conf=initializeBasicConfiguration();
		var testModel=new conf.collection.model({pusherSyncClientID:Math.guid(),pusherSyncItemID:Math.guid(),name:"test"});
		conf.collection.add(new conf.collection.model(testModel));
		_.extend(conf.pusher.subscribe(),Backbone.Events);
		conf.collection.syncByPusher(conf.defaults);
		testModel.set({name:"test2"});		
		conf.channel.trigger(conf.defaults.eventName,{ev:"iu",object:testModel});
		expect(conf.collection.at(0).get("name")).toEqual("test2");		
	});
	
	
	
	initializeBasicConfiguration=function(){		
			var TestModel=Backbone.Model.extend();
			var TestCollection=Backbone.Collection.extend({model:TestModel});			
			var testCollection1=new TestCollection();		
			var fakeChannel={bind:function(){},trigger:function(){}};
			var fakePusher={subscribe:function(){return fakeChannel;}};			
			var defaults={
			channel_auth_endpoint: "",
			pusherKey: "",
			channelName: "myCollectionSync",
			pusherObject: fakePusher,
			eventName:"client-syncEvent",
			};
			return {collection: testCollection1,channel: fakeChannel, pusher: fakePusher, defaults:defaults};
			
	}
	
});