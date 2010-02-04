window.addEvent('load', function(){

	var touch = new Touch.Gesture($(document.body));
	
	touch.addEvent('gesture', function(touches){
		if (touches.length > 0){
			$$('h1').set('text', touches[touches.length - 1].direction);
		}
	});
});