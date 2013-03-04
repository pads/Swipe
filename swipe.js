/*
 * Swipe 2.0
 *
 * Brad Birdsall
 * Copyright 2012, Licensed GPL & MIT
 *
 */

window.Swipe = function(element,options) {

  var _this = this;

  // return immediately if element doesn't exist
  if (!element) return;

  // reference dom elements
  this.container = element;
  this.element = this.container.children[0];

  // simple feature detection
  this.browser = {
    touch: (function() {
      return ('ontouchstart' in window) || window.DocumentTouch && document instanceof DocumentTouch;
    })(),
    transitions: (function() {
      var temp = document.createElement('swipe'),
        props = ['transformProperty', 'WebkitTransform', 'MozTransform', 'OTransform', 'msTransform'];
      for ( var i in props ) {
        if (temp.style[ props[i] ] !== undefined) return true;
      }
      return false;
    })()
  };

  // retreive options
  options = options || {};
  this.index = options.startSlide || 0;
  this.speed = options.speed || 300;
  this.callback = options.callback || function() {};
  this.transitionEnd = options.transitionEnd || function() {};
  this.delay = options.auto || 0;
  this.cont = (options.continuous != undefined) ? !!options.continuous : true;
  this.disableScroll = !!options.disableScroll;
  this.maxWidth = options.maxWidth || 0;

  // verify index is a number not string
  this.index = parseInt(this.index,10);

  // trigger slider initialization
  this.setup();

  // begin auto slideshow
  this.begin();

  // add event listeners
  if (this.element.addEventListener) {
    if (window.navigator.msPointerEnabled) {
      this.element.addEventListener("MSPointerDown",this,false);
      this.element.addEventListener("MSPointerMove",this,false);
      this.element.addEventListener("MSPointerUp",this,false);
    }
    if (!!this.browser.touch) {
      this.element.addEventListener('touchstart',this,false);
      this.element.addEventListener('touchmove',this,false);
      this.element.addEventListener('touchend',this,false);
    }
    if (!!this.browser.transitions) {
      this.element.addEventListener('webkitTransitionEnd',this,false);
      this.element.addEventListener('msTransitionEnd',this,false);
      this.element.addEventListener('oTransitionEnd',this,false);
      this.element.addEventListener('transitionend',this,false);
    }
    window.addEventListener('resize',this,false);
  }

  // to play nice with old IE
  else {
    window.onresize = function() {
      _this.setup(true);
    };
  }

};

Swipe.prototype = {

  setup: function(resizing) {

    // resizing causes slide position issues if there is more than one slide visible
    if(resizing && this.maxWidth) return;

    // get and measure amt of slides
    this.slides = this.element.children;
    this.length = this.slides.length;
    this.cache = new Array(this.length);

    // return immediately if their are less than two slides
    if (this.length < 2) return;

    // determine width of each slide
    this.totalWidth = this.container.getBoundingClientRect().width || this.container.offsetWidth || window.innerWidth;
    this.width = this.maxWidth || this.totalWidth;
    // return immediately if measurement fails
    if (!this.width) return;

    // store array of slides before, current, and after
    var refArray = [
      [],
      [],
      []
    ];

    this.element.style.width = (this.slides.length * this.width) + 'px';

    // stack elements
    for ( var index = this.length - 1; index > -1; index-- ) {

      var elem = this.slides[index];

      elem.style.width = this.width + 'px';
      if(index > 0 && !this.maxWidth) {
        elem.style.visibility = 'hidden';
      }
      elem.setAttribute('data-index',index);

      if (this.browser.transitions) {
        elem.style.left = (index * (-this.width)) + 'px';
      }

      // add this index to the reference array    0:before 1:equal 2:after
      refArray[this.index > index ? 0 : (this.index < index ? 2 : 1)].push(index);

    }

    if (this.browser.transitions) {

      // stack left, current, and right slides
      this._stack(refArray[0],-1);
      this._stack(refArray[1],0);
      this._stack(refArray[2],1);

      // stack last slide to the left of first if continuous
      if(this.cont) {
        this._stack([this.length - 1],-1);
      }

    } else {
      // move "viewport" to put current slide into view
      this.element.style.left = (this.index * -this.width) + "px";
    }

    this.container.style.visibility = 'visible';

  },

  kill: function() {

    // cancel slideshow
    this.delay = 0;
    clearTimeout(this.interval);

    // clear all translations
    var slideArray = [];
    for ( var i = this.slides.length - 1; i >= 0; i-- ) {
      this.slides[i].style.width = '';
      slideArray.push(i);
    }
    this._stack(slideArray,0);

    var elem = this.element;
    elem.className = elem.className.replace('swipe-active','');

    // remove event listeners
    if (this.element.removeEventListener) {
      if (!!this.browser.touch) {
        this.element.removeEventListener('touchstart',this,false);
        this.element.removeEventListener('touchmove',this,false);
        this.element.removeEventListener('touchend',this,false);
      }
      if (!!this.browser.transitions) {
        this.element.removeEventListener('webkitTransitionEnd',this,false);
        this.element.removeEventListener('msTransitionEnd',this,false);
        this.element.removeEventListener('oTransitionEnd',this,false);
        this.element.removeEventListener('transitionend',this,false);
      }
      window.removeEventListener('resize',this,false);
    }

    // kill old IE! you can quote me on that ;)
    else {
      window.onresize = null;
    }

  },

  getPos: function() {

    // return current index position
    return this.index;

  },

  prev: function(delay) {

    // cancel slideshow
    this.delay = delay || 0;
    clearTimeout(this.interval);

    // if not at first slide
    if (this.index) this.slide(this.index - 1,this.speed);
    else if (this.cont) this.slide(this.length - 1,this.speed);

  },

  next: function(delay) {

    // cancel slideshow
    this.delay = delay || 0;
    clearTimeout(this.interval);

    if (this.index < this.length - 1) this.slide(this.index + 1,this.speed); // if not last slide
    else if (this.cont) this.slide(0,this.speed); //if last slide return to start

  },

  begin: function() {

    var _this = this;

    this.interval = (this.delay)
      ? setTimeout(function() {
      _this.next(_this.delay);
    },this.delay)
      : 0;

  },

  handleEvent: function(e) {
    switch (e.type) {
      case 'touchstart':
      case 'MSPointerDown':
        this.onTouchStart(e);
        break;
      case 'touchmove':
      case 'MSPointerMove':
        this.onTouchMove(e);
        break;
      case 'touchend':
      case 'MSPointerUp':
        this.onTouchEnd(e);
        break;
      case 'webkitTransitionEnd':
      case 'msTransitionEnd':
      case 'oTransitionEnd': // opera 11 and below
      case 'otransitionend': // opera 12 (and above?)
      case 'transitionend':
        this.onTransitionEnd(e);
        break;
      case 'resize':
        this.setup(true);
        break;
    }

    e.stopPropagation();
  },

  onTouchStart: function(e) {

    var _this = this;

    if(!this.maxWidth) {
      for ( var index = this.length - 1; index > -1; index-- ) {
        var elem = this.slides[index];
        elem.style.visibility = 'visible';
      }
    }

    e = _this._convertIE10Event(e);

    _this.start = {

      // get touch coordinates for delta calculations in onTouchMove
      pageX: e.touches[0].pageX,
      pageY: e.touches[0].pageY,

      // set initial timestamp of touch sequence
      time: Number(new Date())

    };

    // used for testing first onTouchMove event
    _this.isScrolling = undefined;

    // reset deltaX
    _this.deltaX = 0;

  },

  onTouchMove: function(e) {

    var _this = this;

    e = _this._convertIE10Event(e);

    // ensure swiping with one touch and not pinching
    if (window.navigator.msPointerEnabled) {
      if ((e.pointerType == e.MSPOINTER_TYPE_MOUSE && e.buttons != 1) || !e.isPrimary) return;
    } else {
      if (e.touches.length > 1 || e.scale && e.scale !== 1) return;
    }

    _this.deltaX = e.touches[0].pageX - _this.start.pageX;

    // determine if scrolling test has run - one time test
    if (typeof _this.isScrolling == 'undefined') {
      _this.isScrolling = !!( _this.isScrolling || Math.abs(_this.deltaX) < Math.abs(e.touches[0].pageY - _this.start.pageY) );
    }

    // if user is not trying to scroll vertically
    if (!_this.isScrolling) {

      // prevent native scrolling
      e.preventDefault();

      // cancel slideshow
      _this.delay = 0;
      clearTimeout(_this.interval);

      // increase resistance if first or last slide
      _this.deltaX =
        _this.deltaX /
          ( (!this.cont
            && !_this.index && _this.deltaX > 0               // if first slide and sliding left
            || _this.index == _this.length - 1              // or if last slide and sliding right
            && _this.deltaX < 0                            // and if sliding at all
            ) ?
            ( Math.abs(_this.deltaX) / _this.width + 1 )      // determine resistance level
            : 1 );                                          // no resistance if false

      // translate immediately 1:1
      if(_this.maxWidth) {
        var slideIndices = _this._getAllSlideIndices();
        _this._move(slideIndices,_this.deltaX);
      } else {
        if(_this.cont) {
          if(_this.index === 0) {
            _this._move([_this.length - 1 - _this.index,_this.index,_this.index + 1],_this.deltaX);
          } else if(_this.index === _this.length - 1) {
            _this._move([_this.index - 1,_this.index,0],_this.deltaX);
          } else {
            _this._move([_this.index - 1,_this.index,_this.index + 1],_this.deltaX);
          }
        } else {
          _this._move([_this.index - 1,_this.index,_this.index + 1],_this.deltaX);
        }
      }

    } else if (_this.disableScroll) {

      // prevent native scrolling
      e.preventDefault();

    }

  },

  onTouchEnd: function(e) {

    var _this = this;

    if (window.navigator.msPointerEnabled && !e.isPrimary) return;

    // determine if slide attempt triggers next/prev slide
    var isValidSlide =
        Number(new Date()) - _this.start.time < 250      // if slide duration is less than 250ms
          && Math.abs(_this.deltaX) > 20                   // and if slide amt is greater than 20px
          || Math.abs(_this.deltaX) > _this.width / 2, // or if slide amt is greater than half the width

    // determine if slide attempt is past start and end
      isPastBounds =
        !_this.index && _this.deltaX > 0                          // if first slide and slide amt is greater than 0
          || _this.index == _this.length - 1 && _this.deltaX < 0, // or if last slide and slide amt is less than 0

      direction = _this.deltaX < 0; // true:right false:left
    // if not scrolling vertically
    if (!_this.isScrolling) {

      var slideIndices = _this._getAllSlideIndices();
      if (isValidSlide && !isPastBounds || this.cont) {
        if (direction) {
          if(_this.maxWidth > 0) {
            var width = _this.width;
            if(_this.index === _this.length - 2) {
              width = _this.width - (_this.totalWidth - _this.maxWidth);
            }
            _this._slide(slideIndices.slice(1, slideIndices.length),-width,_this.speed);
          } else {
            if(_this.cont) {
              if(_this.index === 0) {
                // Undo stacking last slide to the left of first slide once moving forward
                _this._stack([_this.length - 1],1)
              } else if(_this.index === _this.length - 2) {
                _this._stack([0],1)
              }
              _this._stack([_this.index - 1],-1);
              if(_this.index === _this.length - 1) {
                _this._slide([_this.index,0],-_this.width,_this.speed);
                for(var i = 1; i < _this.length - 1; i++) {
                  _this._stack([i],1);
                }
                _this.index = -1;
              } else {
                _this._slide([_this.index,_this.index + 1],-_this.width,_this.speed);
              }
            } else {
              _this._stack([_this.index - 1],-1);
              _this._slide([_this.index,_this.index + 1],-_this.width,_this.speed);
            }
          }
          _this.index += 1;
        } else {
          if(_this.maxWidth > 0) {
            var width = _this.width;
            if(_this.index === _this.length - 1) {
              width = _this.width - (this.totalWidth - this.maxWidth);
            }
            _this._slide(slideIndices,width,_this.speed);
          } else {
            _this._stack([_this.index + 1],1);
           if(_this.cont) {
             if(_this.index === 0) {
               _this._slide([_this.length - 1 - _this.index,_this.index],_this.width,_this.speed);
               _this.index = _this.length - 1;
               _this._stack([_this.index - 1],-1);
             } else {
               _this._slide([_this.index - 1,_this.index],_this.width,_this.speed);
               _this._stack([_this.index - 2],-1);
               _this.index += -1;
               if(_this.index === 0) {
                 _this._stack([this.length - 1],-1);
               }
             }
           } else {
             _this._slide([_this.index - 1,_this.index],_this.width,_this.speed);
             _this.index += -1;
           }
          }
          if(!_this.cont) {
            _this.index += -1;
          }
        }
        _this.callback(_this.index,_this.slides[_this.index]);
      } else {
        if(_this.maxWidth > 0) {
          _this._slide(slideIndices,0,_this.speed);
        } else {
          _this._slide([_this.index - 1,_this.index,_this.index + 1],0,_this.speed);
        }
      }

    }

  },

  onTransitionEnd: function(e) {

    if (this._getElemIndex(e.target) == this.index) { // only call transition end on the main slide item

      if (this.delay) this.begin();

      this.transitionEnd(this.index,this.slides[this.index]);

    }

  },

  slide: function(to,speed) {

    var from = this.index;

    if (from == to) return; // do nothing if already on requested slide

    var speed = (typeof speed === "undefined") ? this.speed : speed;

    if (this.browser.transitions) {
      var toStack = Math.abs(from - to) - 1,
        direction = Math.abs(from - to) / (from - to), // 1:right -1:left
        inBetween = [];

      while (toStack--) inBetween.push((to > from ? to : from) - toStack - 1);

      // stack em
      this._stack(inBetween,direction);

      // now slide from and to in the proper direction
      this._slide([from,to],this.width * direction,speed);
    }
    else {
      this._animate(from * -this.width,to * -this.width,speed)
    }

    this.index = to;

    this.callback(this.index,this.slides[this.index]);

  },

  _slide: function(nums,dist,speed) {

    var _slides = this.slides,
      l = nums.length;

    while (l--) {

      this._translate(_slides[nums[l]],dist + this.cache[nums[l]],speed ? speed : 0);

      this.cache[nums[l]] += dist;

    }

  },

  _stack: function(nums,pos) {  // pos: -1:left 0:center 1:right

    var _slides = this.slides,
      l = nums.length,
      dist = this.width * pos;

    while (l--) {
      if (nums[l] > 1 && this.maxWidth > 0) {
        dist += this.width;
      }
      this._translate(_slides[nums[l]],dist,0);

      this.cache[nums[l]] = dist;

    }

  },

  _move: function(nums,dist) { // 1:1 scrolling

    var _slides = this.slides,
      l = nums.length;

    while (l--) this._translate(_slides[nums[l]],dist + this.cache[nums[l]],0);

  },

  _translate: function(elem,xval,speed) {

    if (!elem) return;

    var style = elem.style;

    // set duration speed to 0
    style.webkitTransitionDuration =
      style.MozTransitionDuration =
        style.msTransitionDuration =
          style.OTransitionDuration =
            style.transitionDuration = speed + 'ms';

    // translate to given position
    style.webkitTransform = 'translate(' + xval + 'px,0)' + 'translateZ(0)';
    style.msTransform =
      style.MozTransform =
        style.OTransform = 'translateX(' + xval + 'px)';

  },

  _animate: function(from,to,speed) {

    var elem = this.element;

    if (!speed) { // if not an animation, just reposition

      elem.style.left = to + 'px';

      return;

    }

    var _this = this,
      start = new Date(),
      timer = setInterval(function() {

        var timeElap = new Date() - start;

        if (timeElap > speed) {

          elem.style.left = to + 'px';  // callback after this line

          if (_this.delay) _this.begin();

          _this.transitionEnd(_this.index,_this.slides[_this.index]);


          clearInterval(timer);

          return;

        }

        elem.style.left = (( (to - from) * (Math.floor((timeElap / speed) * 100) / 100) ) + from) + 'px';

      },4);

  },

  _getElemIndex: function(elem) {

    return parseInt(elem.getAttribute('data-index'),10);

  },

  _getAllSlideIndices: function() {
    var slideIndices = [];
    for ( var index = -1; index < this.slides.length; index++ ) {
      slideIndices.push(index);
    }
    return slideIndices;
  },
  // IE 10 event properties are different so convert to an event object the rest of the code can handle
  _convertIE10Event: function(e) {
    if (window.navigator.msPointerEnabled) {
      e.touches = [{ pageX:e.pageX, pageY:e.pageY }];
    }
    return e;
  }

};


if (window.jQuery || window.Zepto) {
  (function($) {
    $.fn.Swipe = function(params) {
      return this.each(function() {
        var _this = $(this);
        _this.data('Swipe',new Swipe(_this[0],params));
      });
    }
  })(window.jQuery || window.Zepto)
}
