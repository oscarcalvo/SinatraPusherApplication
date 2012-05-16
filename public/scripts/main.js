

$(function(){

	_.templateSettings = {
	  interpolate : /\{\{(.+?)\}\}/g
	};
	var channelName="private-blogChannel";
	var eventName="client-newCommentEvent";
	Pusher.channel_auth_endpoint = '/pusherAuthentication';	
	var pusher=new Pusher('4df2e537c7b561b87dd7');
	window.channel=pusher.subscribe(channelName);
	channel.bind('pusher:subscription_succeeded', function() {
		console.log("suscrito con exito");
		
	});	
	channel.bind('pusher:subscription_error', function(status) {
	console.log("error en la suscripcion:"+status);
});
	channel.bind(eventName,function(data){			
			var newComment=new Comment(data);			
			var view=new NewCommentView({model:newComment});
			view.render();
	});	
	
	var Comment=Backbone.Model.extend();	
	
	window.NewCommentView=Backbone.View.extend({
			el: $('#posts-list'),
			template: _.template($('#tNewComment').html()),
			render: function(){				
				var html=$(this.template(this.model.toJSON()));
				html.hide();
				this.el.addClass('has-comments');
				this.el.prepend(html);
				html.slideDown();
			}
	},
	{
		displayDate: function(date){		
				date = (date instanceof Date? date : new Date( Date.parse(date) ) );
				console.log("llamada con "+date);
				var display = date.getDate() + ' ' +
                ['January', 'February', 'March',
                 'April', 'May', 'June', 'July',
                 'August', 'September', 'October',
                 'November', 'December'][date.getMonth()] + ' ' +
                date.getFullYear();
				return display;	
			}
	});
	
	$('#submit').click(function(){
		var newComment=new Comment({			
		 "name":  $('#comment_author').val(),
		"comment": $('#comment').val()		
		});
		channel.trigger(eventName,newComment);	
		var view=new NewCommentView({model:newComment});		
		view.render();			
	});	
});



