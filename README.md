Redlock Leader
==============
Leader election by Redlock Distributed Lock Manager algorithm.

## Install
```
npm install redlock-leader
```

## Usage
``` javascript
const RedlockLeader = require('redlock-leader');
const client = require('redis').createClient({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: 6379,
  enable_offline_queue: false,
  //password: '',
  //db: 1,
  retry_strategy: function (options) {
    return Math.min(options.attempt * 100, 3000);
  }
});

const leader = new RedlockLeader([client], {
  ttl: 10000,
  wait: 1000,
  key: 'my-leader-key'
});

leader.on('elected', () => console.log(`${process.pid} ${new Date()} Instance is elected as leader.`));
leader.on('revoked', () => console.log(`${process.pid} ${new Date()} Instance is no longer the leader.`));
leader.on('extended', () => console.log(`${process.pid} ${new Date()} Leadership status of instance is extended.
`));
leader.on('error', (e) => console.log(`${process.pid} ${new Date()} ERROR`, e));

leader.start();
```

## API
### new RedlockLeader(clients, options)
Create a new leader selector.

  * `clients` An array of redis client instances.
  * `options` An object holding the leader selection options.
    * `ttl` Lock time to live in milliseconds, defaults to 10000 milliseconds.
    * `wait` Time between 2 tries getting elected in milliseconds, defaults to 1000 milliseconds
    * `key` A string key identifying the lock, defaults to 'redlock-leader'

### start()
Starts leader selection process.

### stop()
Stops leader selection process.

### isLeader
Indicates whether the instance is the leader or not.

### Events
`elected` when instance becomes the leader

`revoked` when instance gets revoked from its leadership

`extended` when instance's leadership ttl gets extended

`error` when an error occurred at a redis client

### How it works
https://redis.io/topics/distlock
