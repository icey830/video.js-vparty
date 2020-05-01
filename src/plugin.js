import videojs from 'video.js';
import window from 'global/window';
import {version as VERSION} from '../package.json';

const defaults = {
  header: '互动精灵-VIDEOJS',
  class: '',
  content: 'This will show up while the video is playing',
  debug: false,
  showBackground: true,
  attachToControlBar: false,
  overlays: [{
    showImages: true,
    start: 'playing',
    end: 'paused'
  }]
};

const Component = videojs.getComponent('Component');

const dom = videojs.dom || videojs;
const registerPlugin = videojs.registerPlugin || videojs.plugin;

/**
 * Whether the value is a `Number`.
 *
 * Both `Infinity` and `-Infinity` are accepted, but `NaN` is not.
 *
 * @param  {Number} n
 * @return {Boolean}
 */

/* eslint-disable no-self-compare */
const isNumber = n => typeof n === 'number' && n === n;
/* eslint-enable no-self-compare */

/**
 * Whether a value is a string with no whitespace.
 *
 * @param  {String} s
 * @return {Boolean}
 */
const hasNoWhitespace = s => typeof s === 'string' && (/^\S+$/).test(s);

/**
 * Overlay component.
 *
 * @class   Vparty
 * @extends {videojs.Component}
 */
class Vparty extends Component {

  constructor(player, options) {
    super(player, options);

    ['start', 'end'].forEach(key => {
      const value = this.options_[key];

      if (isNumber(value)) {
        this[key + 'Event_'] = 'timeupdate';
      } else if (hasNoWhitespace(value)) {
        this[key + 'Event_'] = value;

      // An overlay MUST have a start option. Otherwise, it's pointless.
      } else if (key === 'start') {
        throw new Error('invalid "start" option; expected number or string');
      }
    });


    ['endListener_', 'rewindListener_', 'startListener_'].forEach(name => {
      this[name] = (e) => Vparty.prototype[name].call(this, e);
    });

    if (this.startEvent_ === 'timeupdate') {
      this.on(player, 'timeupdate', this.rewindListener_);
    }

    this.debug(`created, listening to "${this.startEvent_}" for "start" and "${this.endEvent_ || 'nothing'}" for "end"`);

    this.hide();
  }

  createEl() {
    const options = this.options_;
    const content = options.content;

    const background = options.showBackground ? 'vjs-overShow-background' : 'vjs-overShow-no-background';
    const el = dom.createEl('aside', {
      className: `
        vjs-overShow
        ${options.class}
        vjs-hidden
      `
    });

    const _header = dom.createEl('h5', {
      className: `
      vjs-overShow-header
            `
    });

    _header.innerHTML = options.header;

    const showimages = options.showImages ? 'vjs-image-container' : 'vjs-text-container';
    const alinks = options.showImages ? 'vjs-overShow-link' : 'vjs-overShow-text-link vjs-overShow-btn';
    const _div = dom.createEl('div' ,{
      className: `
          vjs-overShow-container
          ${showimages}
          `
    });

    const list = options.list;

    if (Array.isArray(list)) {
      list.forEach(function (item, num, arr) {

        const _a = dom.createEl('a',{
          className: `
           ${alinks}
          `
        });

        _a.innerHTML = arr[num].order;

        const _img = dom.createEl('img',{
          className: `
           vjs-overShow-img
          `
        });
        if(arr[num].image) {
          _img.src = arr[num].image;
          _img.alt = arr[num].alt || arr[num].title;
          _a.appendChild(_img);
        }

        const _span = dom.createEl('span',{
          className: `
           vjs-overShow-span
          `
        });
        _span.innerHTML += arr[num].title;
        _a.appendChild(_span);
        _a.onclick = function() {
          player.currentTime(arr[num].res);
          player.play();

        }
        _div.appendChild(_a);

      });
    }

    if (typeof content === 'string') {
      el.innerHTML = content;
    } else if (content instanceof window.DocumentFragment) {
      el.appendChild(content);
    } else {
      dom.appendContent(el, content);
    }

    el.appendChild(_header);
    el.appendChild(_div);

    return el;
  }

  /**
   * Logs debug errors
   * @param  {...[type]} args [description]
   * @return {[type]}         [description]
   */
  debug(...args) {
    if (!this.options_.debug) {
      return;
    }

    const log = videojs.log;
    let fn = log;

    // Support `videojs.log.foo` calls.
    if (log.hasOwnProperty(args[0]) && typeof log[args[0]] === 'function') {
      fn = log[args.shift()];
    }

    fn(...[`overlay#${this.id()}: `, ...args]);
  }

  /**
   * Overrides the inherited method to perform some event binding
   *
   * @return {Overlay}
   */
  hide() {
    super.hide();

    this.debug('hidden');
    this.debug(`bound \`startListener_\` to "${this.startEvent_}"`);

    // Overlays without an "end" are valid.
    if (this.endEvent_) {
      this.debug(`unbound \`endListener_\` from "${this.endEvent_}"`);
      this.off(this.player(), this.endEvent_, this.endListener_);
    }

    this.on(this.player(), this.startEvent_, this.startListener_);

    return this;
  }

  /**
   * Determine whether or not the overlay should hide.
   *
   * @param  {Number} time
   *         The current time reported by the player.
   * @param  {String} type
   *         An event type.
   * @return {Boolean}
   */
  shouldHide_(time, type) {
    const end = this.options_.end;

    return isNumber(end) ? (time >= end) : end === type;
  }

  /**
   * Overrides the inherited method to perform some event binding
   *
   * @return {Overlay}
   */
  show() {
    super.show();
    this.off(this.player(), this.startEvent_, this.startListener_);
    this.debug('shown');
    this.debug(`unbound \`startListener_\` from "${this.startEvent_}"`);

    // Overlays without an "end" are valid.
    if (this.endEvent_) {
      this.debug(`bound \`endListener_\` to "${this.endEvent_}"`);
      this.on(this.player(), this.endEvent_, this.endListener_);
    }

    return this;
  }

  /**
   * Determine whether or not the overlay should show.
   *
   * @param  {Number} time
   *         The current time reported by the player.
   * @param  {String} type
   *         An event type.
   * @return {Boolean}
   */
  shouldShow_(time, type) {
    const start = this.options_.start;
    const end = this.options_.end;

    if (isNumber(start)) {

      if (isNumber(end)) {
        return time >= start && time < end;

      // In this case, the start is a number and the end is a string. We need
      // to check whether or not the overlay has shown since the last seek.
      } else if (!this.hasShownSinceSeek_) {
        this.hasShownSinceSeek_ = true;
        return time >= start;
      }

      // In this case, the start is a number and the end is a string, but
      // the overlay has shown since the last seek. This means that we need
      // to be sure we aren't re-showing it at a later time than it is
      // scheduled to appear.
      return Math.floor(time) === start;
    }

    return start === type;
  }

  /**
   * Event listener that can trigger the overlay to show.
   *
   * @param  {Event} e
   */
  startListener_(e) {
    const time = this.player().currentTime();

    if (this.shouldShow_(time, e.type)) {
      this.show();
      this.player().pause();
    }
  }




  /**
   * Event listener that can trigger the overlay to show.
   *
   * @param  {Event} e
   */
  endListener_(e) {
    const time = this.player().currentTime();

    if (this.shouldHide_(time, e.type)) {
      this.hide();
    }
  }

  /**
   * Event listener that can looks for rewinds - that is, backward seeks
   * and may hide the overlay as needed.
   *
   * @param  {Event} e
   */
  rewindListener_(e) {
    const time = this.player().currentTime();
    const previous = this.previousTime_;
    const start = this.options_.start;
    const end = this.options_.end;

    // Did we seek backward?
    if (time < previous) {
      this.debug('rewind detected');

      // The overlay remains visible if two conditions are met: the end value
      // MUST be an integer and the the current time indicates that the
      // overlay should NOT be visible.
      if (isNumber(end) && !this.shouldShow_(time)) {
        this.debug(`hiding; ${end} is an integer and overlay should not show at this time`);
        this.hasShownSinceSeek_ = false;
        this.hide();

      // If the end value is an event name, we cannot reliably decide if the
      // overlay should still be displayed based solely on time; so, we can
      // only queue it up for showing if the seek took us to a point before
      // the start time.
      } else if (hasNoWhitespace(end) && time < start) {
        this.debug(`hiding; show point (${start}) is before now (${time}) and end point (${end}) is an event`);
        this.hasShownSinceSeek_ = false;
        this.hide();
      }
    }

    this.previousTime_ = time;
  }
}

videojs.registerComponent('Vparty', Vparty);

/**
 * Initialize the plugin.
 *
 * @function plugin
 * @param    {Object} [options={}]
 */
const plugin = function(options) {
  const settings = videojs.mergeOptions(defaults, options);

  // De-initialize the plugin if it already has an array of overlays.
  if (Array.isArray(this.overlays_)) {
    this.overlays_.forEach(vparty => {
      this.removeChild(vparty);
      if (this.controlBar) {
        this.controlBar.removeChild(vparty);
      }
      vparty.dispose();
    });
  }

  const overlays = settings.overlays;

  // We don't want to keep the original array of overlay options around
  // because it doesn't make sense to pass it to each Overlay component.
  delete settings.overlays;

  this.overlays_ = overlays.map(o => {
    const mergeOptions = videojs.mergeOptions(settings, o);
    const attachToControlBar = typeof mergeOptions.attachToControlBar === 'string' || mergeOptions.attachToControlBar === true;

    if (!this.controls() || !this.controlBar) {
      return this.addChild('Vparty', mergeOptions);
    }

    if (attachToControlBar && mergeOptions.align.indexOf('bottom') !== -1) {
      let referenceChild = this.controlBar.children()[0];

      if (this.controlBar.getChild(mergeOptions.attachToControlBar) !== undefined) {
        referenceChild = this.controlBar.getChild(mergeOptions.attachToControlBar);
      }

      if (referenceChild) {
        const controlBarChild = this.controlBar.addChild('Vparty', mergeOptions);

        this.controlBar.el().insertBefore(
          controlBarChild.el(),
          referenceChild.el()
        );
        return controlBarChild;
      }
    }

    const playerChild = this.addChild('Vparty', mergeOptions);

    this.el().insertBefore(
      playerChild.el(),
      this.controlBar.el()
    );
    return playerChild;
  });
};

plugin.VERSION = VERSION;

registerPlugin('vparty', plugin);

export default plugin;
