require 'sinatra'
require 'pusher'
require 'sinatra/json'


get "/" do
erb :index
end

post "/pusherAuthentication" do
content_type :json
Pusher.app_id="20218"
Pusher.key="4df2e537c7b561b87dd7"
Pusher.secret="6e542cd583fbba78f141" 
 @resp=Pusher[params[:channel_name]].authenticate(params[:socket_id],{
	:user_id=>SecureRandom.uuid
 })
 
 log(@resp)
 json(@resp)
end

def log(msg)
  print msg  
  print "\n"
end