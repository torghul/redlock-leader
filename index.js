const EventEmitter = require('events');
const Redlock = require('redlock');

/**
 * Cluster leader selection using redlock algorithm.
 *
 * @fires RedlockLeader.elected
 * @fires RedlockLeader.extended
 * @fires RedlockLeader.revoked
 * @fires RedlockLeader.error
 */
class RedlockLeader extends EventEmitter {
  /**
   * Create a redlock leader selector class instance.
   *
   * @param {Object} options
   * @param {Array} options.clients an array holding redis client connections
   * @param {number} [options.ttl] time to live in milliseconds for the key, defaults to 10000
   * @param {number} [options.wait] time to wait in milliseconds to retry to get elected as the leader, defaults to 1000
   * @param {string} [options.key] redis key, defaults to redlock-leader
   */
  constructor(options) {
    super();

    this._isLeader = false;
    this.lock = null;
    this.ttl = options.ttl || 10000;
    this.wait = options.wait || 1000;
    this.key = options.key || 'redlock-leader';
    this.timeout = null;

    this.redlock = new Redlock(options.clients, {
      driftFactor: 0.01,
      retryCount: 0,
      retryDelay: 200,
      retryJitter: 200
    });

    this.redlock.on('clientError', (error) => {
      this.emit('error', {error});
    });
  }

  /**
   * Indicates whether instance is leader or not.
   *
   * @returns {boolean} is instance leader
   */
  get isLeader() {
    return this._isLeader;
  }

  /**
   * Start leader election.
   *
   * @returns {Promise<void>}
   */
  async start() {
    let lock;
    try {
      lock = await this.redlock.lock(this.key, this.ttl);
    } catch (error) {
      // Failed to acquire lock. Nothing needs to be done.
    }

    if (lock) {
      if (!this.lock) {
        this._isLeader = true;
        this.lock = lock;
        this.emit('elected');
      }

      this.timeout = setTimeout(async () => {
        await this._renew();
      }, this.ttl / 2);
    } else {
      if (this.lock) {
        this._isLeader = false;
        this.lock = null;
        this.emit('revoked');
      }

      this.timeout = setTimeout(async () => {
        await this.start();
      }, this.wait);
    }
  }

  /**
   * Renew elected leaders ttl.
   *
   * @returns {Promise<void>}
   */
  async _renew() {
    if (this.lock) {
      try {
        await this.lock.extend(this.ttl);
        this.emit('extended');
        this.timeout = setTimeout(async () => {
          await this._renew();
        }, this.ttl / 2);
      } catch (error) {
        if (this.lock) {
          this._isLeader = false;
          this.lock = null;
          this.emit('revoked');
        }

        this.timeout = setTimeout(async () => {
          await this.start();
        }, this.wait);
      }
    }
  }

  /**
   * Stop election process.
   *
   * @returns {Promise<void>}
   */
  async stop() {
    if (this.timeout) {
      clearTimeout(this.timeout);
    }

    try {
      if (this.lock) {
        await this.lock.unlock();
      }
    } catch (error) {

    }

    this._isLeader = false;
    this.lock = null;
  }
}

/**
 * Elected event.
 * Dispatched when instance is elected as the leader.
 *
 * @event RedlockLeader#elected
 * @type {void}
 */

/**
 * Extended event.
 * Dispatched when instance's leadership ttl is extended.
 *
 * @event RedlockLeader#extended
 * @type {void}
 */

/**
 * Revoked event.
 * Dispatched when instance is no longer the leader.
 *
 * @event RedlockLeader#revoked
 * @type {void}
 */

/**
 * Error event.
 * Dispatched when an error occurs at redis client.
 *
 * @event RedlockLeader#error
 * @type {Error}
 */

module.exports = RedlockLeader;
