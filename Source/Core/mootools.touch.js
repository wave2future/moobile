/*
---

name: Touch
description: Class to aid the retrieval of the cursor movements
license: MIT-Style License (http://mootools.net/license.txt)
copyright: Valerio Proietti (http://mad4milk.net)
authors: Valerio Proietti (http://mad4milk.net)
requires: core:1.2.4:*
provides: Touch

...
*/

var Touch = new Class({
	
	Implements: Events,
	
	initialize: function(element){
		this.element = document.id(element);
		
		this.bound = {
			start: this.start.bind(this),
			move: this.move.bind(this),
			end: this.end.bind(this)
		};
		
		if (Browser.Platform.ipod){
			this.context = this.element;
			this.startEvent = 'touchstart';
			this.endEvent = 'touchend';
			this.moveEvent = 'touchmove';
		} else {
			this.context = document;
			this.startEvent = 'mousedown';
			this.endEvent = 'mouseup';
			this.moveEvent = 'mousemove';
		}
		
		this.attach();
	},
	
	attach: function(){
		this.element.addListener(this.startEvent, this.bound.start);
	},
	
	detach: function(){
		this.element.removeListener(this.startEvent, this.bound.start);
	},
	
	start: function(event){
		this.preventDefault(event);
		// this prevents the copy-paste dialog to show up when dragging. it only affects mobile safari.
		document.body.style.WebkitUserSelect = 'none';
						
		this.hasDragged = false;
		
		this.context.addListener(this.moveEvent, this.bound.move);
		this.context.addListener(this.endEvent, this.bound.end);
		
		var page = this.getPage(event);
			
		this.startX = page.pageX;
		this.startY = page.pageY;
		
		this.fireEvent('start');
	},
	
	move: function(event){
		this.preventDefault(event);
		
		this.hasDragged = true;
		
		var page = this.getPage(event);
		
		this.deltaX = page.pageX - this.startX;
		this.deltaY = page.pageY - this.startY;
		
		this.fireEvent('move', [this.deltaX, this.deltaY]);
	},
	
	end: function(event){
		this.preventDefault(event);
		// we re-enable the copy-paste dialog on drag end
		document.body.style.WebkitUserSelect = '';
		
		this.context.removeListener(this.moveEvent, this.bound.move);
		this.context.removeListener(this.endEvent, this.bound.end);

		this.fireEvent((this.hasDragged) ? 'end' : 'cancel');
	},
	
	preventDefault: function(event){
		if (event.preventDefault) event.preventDefault();
		else event.returnValue = false;
	},
	
	getPage: function(event){
		//when on mobile safari, the coordinates information is inside the targetTouches object
		if (event.targetTouches) event = event.targetTouches[0];
		if (event.pageX != null && event.pageY != null) return {pageX: event.pageX, pageY: event.pageY};
		var element = (!document.compatMode || document.compatMode == 'CSS1Compat') ? document.documentElement : document.body;
		return {pageX: event.clientX + element.scrollLeft, pageY: event.clientY + element.scrollTop};
	}
	
});


/*
---

name: Touch.Gesture
description: Class to help with multi-touch and gestures
requires: core:1.2.4:*, Touch
provides: Touch.Gesture,Touch.Gestures

...
*/

Touch.Gesture = new Class({

	Extends: Touch,
	
	start: function(event){
		this.parent(event);
		this.touches =[];
		$A(event.touches).each(function(touch, i){
			var page = this.getPage(event.touches[i]);
			this.touches[i] = {
				startX: page.pageX,
				startY: page.pageY,
				startTime: $time(),
				deltaX: 0,
				deltaY: 0,
				direction: "tap"
			};
		}, this);
		this.fireEvent('start', [this.touches]);
	},
	
	move: function(event){
		this.preventDefault(event);
		this.hasDragged = true;
		$A(event.touches).each(function(touch, i){
			var page = this.getPage(event.touches[i]);
			this.touches[i] = $merge(this.touches[i], {
				endX: page.pageX,
				endY: page.pageY,
				endTime: $time() - this.touches[i].startTime,
				deltaX: page.pageX - this.touches[i].startX,
				deltaY: page.pageY - this.touches[i].startY
			});
			this.fireEvent('move', [this.touches[i].deltaX, this.touches[i].deltaY]);
		}, this);
	},
	
	end: function(event){
		this.parent(event);
		this.touches.each(function(touch, i){
			$H(Touch.Gestures).each(function(gesture, name){
				if (gesture(touch, this.touches)){
					this.touches[i].direction = name;
					this.fireEvent(name, [this.touches[i]], this);
				}
			}, this);
		}, this);
		this.fireEvent('gesture', [this.touches]);
	}
	
});

/* BASIC GESTURES */
Touch.Gestures = {

	'up': function(touch){
		return (touch.deltaX.abs() < 50 && touch.deltaY < 0);
	},
	
	'down': function(touch){
		return (touch.deltaX.abs() < 50 && touch.deltaY > 0);
	},
	
	'left': function(touch){
		return (touch.deltaX < 0 && touch.deltaY.abs() < 50);
	},
	
	'right': function(touch){
		return (touch.deltaX > 0 && touch.deltaY.abs() < 50);
	},
	
	'upleft': function(touch){
		return (touch.deltaX < -50 && touch.deltaY < -50);
	},
	
	'upright': function(touch){
		return (touch.deltaX > 50 && touch.deltaY < -50);
	},
	
	'downleft': function(touch){
		return (touch.deltaX < -50 && touch.deltaY > 50);
	},
	
	'downright': function(touch){
		return (touch.deltaX > 50 && touch.deltaY > 50);
	}

};

/* MULTI FINGERS */
$H(Touch.Gestures).each(function(gesture, name){
	
	var name = name;
	['two','three'].each(function(fingers, i){
		Touch.Gestures[fingers + ' ' + name] = function(touch, touches){
			return touches.length == (i + 2) && $A(touches).every(function(){
				return touch.direction.trim() == name;
			});
		};
	});
	
});

$extend(Touch.Gestures, {

	'pinch': function(touch, touches){
		if (touches.length == 2){
			var dir = [touches[0].direction, touches[1].direction];
			return (dir[0].contains('left') && dir[1].contains('right')) ||
				(dir[0].contains('right') && dir[1].contains('left')) ||
				(dir[0].contains('up') && dir[1].contains('down')) ||
				(dir[0].contains('down') && dir[1].contains('up'));
		}
		return false;
	}

});
