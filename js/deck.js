/**
 * Deck behaviour for index.html.
 *
 * Loaded after reveal.js and its plugins, at the end of <body>, so the DOM and
 * the Reveal global are both available by the time this runs.
 *
 *   1. Reveal initialization
 *   2. Corner header/footer chrome  (opt out per slide with `data-no-header`)
 *   3. Click-to-play YouTube posters
 */

/*********************************************
 * 1. INITIALIZATION
 * https://revealjs.com/config/
 *********************************************/

// Logical slide height, and the range the logical width may move in. Below
// MIN_WIDTH (4:3) the layouts get too cramped, so narrower windows letterbox;
// above MAX_WIDTH (16:9) columns would stretch further than they were designed
// for, so ultra-wide windows pillarbox.
var SLIDE_HEIGHT = 720;
var MIN_WIDTH = 960;
var MAX_WIDTH = 1280;

function slideWidth() {
  // PDF export uses the box as the page size, so keep it independent of
  // whatever window the export happens to run in.
  if ( /print-pdf/gi.test( window.location.search ) ) return MAX_WIDTH;
  var aspect = window.innerWidth / window.innerHeight;
  var width = Math.round( SLIDE_HEIGHT * aspect );
  return Math.max( MIN_WIDTH, Math.min( MAX_WIDTH, width ) );
}

Reveal.initialize({
  hash: true,

  // Reveal lays every slide out in this fixed logical box, then scales the
  // whole thing to fit the window. A box whose aspect ratio differs from the
  // screen's leaves bands of unused space, so the width follows the window
  // (see slideWidth above): 1280x720 on a 16:9 projector, narrower on 16:10
  // or 4:3 laptops, so the slide fills the screen in every case instead of
  // being shrunk to fit a box that is too wide for it.
  width: slideWidth(),
  height: SLIDE_HEIGHT,

  // Fraction of the viewport kept empty around the slide. This is the
  // breathing room the corner chrome and reveal's progress bar live in;
  // lower it for a tighter fit, but the chrome will start to overlap.
  margin: 0.04,

  // Ceiling on the scale factor. The default 2 stops the slide growing on
  // displays past ~1500px of usable height, stranding it in the middle of a
  // 4K screen.
  maxScale: 4,

  highlight: {
    // The `data-noescape` blocks contain intentional markup (<mark>, fragments),
    // so silence highlight.js' unescaped-HTML warning.
    beforeHighlight: function( hljs ) {
      hljs.configure({ ignoreUnescapedHTML: true });
    }
  },

  // https://revealjs.com/plugins/
  plugins: [ RevealMarkdown, RevealHighlight, RevealNotes, RevealMath.KaTeX]
});

// Reveal re-scales on resize but never changes the box itself, so follow the
// window here too (entering fullscreen, moving to the projector, ...).
window.addEventListener( 'resize', function() {
  var width = slideWidth();
  if ( width !== Reveal.getConfig().width ) Reveal.configure( { width: width } );
});

/*********************************************
 * 2. HEADER / FOOTER CHROME
 * Reveal has no footer concept, so copy the hidden #header markup from
 * index.html into the deck: once into .reveal on screen, or into every slide
 * background when exporting to PDF. Positioned by css/slides.css.
 *
 * Add `data-no-header` to a <section> to keep its chrome hidden; marking a
 * vertical stack hides it for every slide inside it.
 *********************************************/
( function() {
  var header = document.getElementById( 'header' ).innerHTML;
  var revealEl = document.querySelector( 'div.reveal' );

  function hasNoHeader( slide ) {
    if ( !slide ) return false;
    if ( slide.hasAttribute( 'data-no-header' ) ) return true;
    var parent = slide.parentNode;
    return !!parent && parent.nodeName === 'SECTION' && parent.hasAttribute( 'data-no-header' );
  }

  if ( window.location.search.match( /print-pdf/gi ) ) {
    Reveal.addEventListener( 'ready', function() {
      Reveal.getSlides().forEach( function( slide ) {
        if ( hasNoHeader( slide ) ) return;
        if ( slide.slideBackgroundElement ) {
          slide.slideBackgroundElement.insertAdjacentHTML( 'beforeend', header );
        }
      });
    });
  }
  else {
    function updateHeader( event ) {
      var slide = ( event && event.currentSlide ) || Reveal.getCurrentSlide();
      revealEl.classList.toggle( 'hide-header', hasNoHeader( slide ) );
    }

    // Insert on `ready`, not immediately: reveal.js builds `.backgrounds` during
    // initialization, and that layer has no z-index of its own, so it is painted
    // purely by DOM order. Inserting the chrome before it exists puts the chrome
    // behind the slide background, where it flashes on load and then vanishes.
    Reveal.addEventListener( 'ready', function( event ) {
      revealEl.insertAdjacentHTML( 'beforeend', header );
      updateHeader( event );
    });
    Reveal.addEventListener( 'slidechanged', updateHeader );
  }
})();

/*********************************************
 * 3. CLICK-TO-PLAY YOUTUBE
 * Swap the poster for a real player only on click, so no third-party player
 * code (and none of its console noise) loads up front.
 *********************************************/
( function() {
  document.querySelectorAll( '.yt-facade' ).forEach( function( facade ) {
    facade.addEventListener( 'click', function() {
      if ( facade.classList.contains( 'playing' ) ) return;

      var iframe = document.createElement( 'iframe' );
      iframe.src = 'https://www.youtube-nocookie.com/embed/' + facade.dataset.videoId +
                   '?autoplay=1&rel=0';
      iframe.title = 'YouTube video player';
      // `autoplay` is needed here so the click carries through to the player;
      // Firefox logs one "unsupported feature name" line for it, only on play.
      iframe.allow = 'autoplay; picture-in-picture; web-share';
      iframe.allowFullscreen = true;
      facade.appendChild( iframe );
      facade.classList.add( 'playing' );
    });
  });

  // Reveal's auto-pause only matches `iframe[src*="youtube.com/embed/"]`, which the
  // -nocookie domain doesn't, so tear the player down ourselves when leaving a slide.
  Reveal.addEventListener( 'slidechanged', function( event ) {
    document.querySelectorAll( '.yt-facade.playing' ).forEach( function( facade ) {
      if ( event.currentSlide && event.currentSlide.contains( facade ) ) return;
      var iframe = facade.querySelector( 'iframe' );
      if ( iframe ) iframe.remove();
      facade.classList.remove( 'playing' );
    });
  });
})();
