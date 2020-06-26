const EventEmitter = require('events');
const Redlock = require('redlock');

class RedlockLeader extends EventEmitter {
  constructor(options) {
    super();

    this.isLeader = false;
    this.lock = null;
    this.ttl = options.ttl || 10000;
    this.wait = options.wait || 1000;
    this.key = options.key || 'redlock-leader';
    this.timeout = null;

    console.log('OPTIONS:', {ttl: this.ttl, wait: this.wait, key: this.key});
    this.redlock = new Redlock(options.clients, {
      driftFactor: 0.01,
      retryCount: 0,
      retryDelay: 200,
      retryJitter: 200
    });

    this.redlock.on('clientError', function (err) {
      console.error('A redis error has occurred:', err);
    });
  }

  async start() {
    console.log('START', new Date());
    let lock;
    try {
      lock = await this.redlock.lock(this.key, this.ttl);
    } catch (error) {
      console.error('Failed to acquire lock.', error);
    }

    if (lock) {
      if (!this.lock) {
        this.isLeader = true;
        this.lock = lock;
        this.emit('elected');
      }

      this.timeout = setTimeout(async () => {
        await this.renew();
      }, this.ttl / 2);
    } else {
      if (this.lock) {
        this.isLeader = false;
        this.lock = null;
        this.emit('revoked');
      }

      this.timeout = setTimeout(async () => {
        await this.start();
      }, this.wait);
    }
  }

  async renew() {
    console.log('RENEW', new Date());
    if (this.lock) {
      try {
        await this.lock.extend(this.ttl);
        this.emit('extended');
        this.timeout = setTimeout(async () => {
          await this.renew();
        }, this.ttl / 2);
      } catch (error) {
        if (this.lock) {
          this.isLeader = false;
          this.lock = null;
          this.emit('revoked');
        }

        this.timeout = setTimeout(async () => {
          await this.start();
        }, this.ttl / 2);
      }
    }
  }

  async stop() {
    console.log('STOP', new Date());
    if (this.timeout) {
      clearTimeout(this.timeout);
    }

    try {
      if (this.lock) {
        await this.lock.unlock();
      }
    } catch (error) {

    }

    this.lock = null;
  }
}

module.exports = RedlockLeader;
