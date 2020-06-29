const RedlockLeader = require('./index');
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

const leader = new RedlockLeader({clients: [client]});

leader.on('elected', () => console.log('ELECTED', new Date()));
leader.on('revoked', () => console.log('REVOKED', new Date()));
leader.on('extended', () => console.log('EXTENDED', new Date()));
leader.on('error', (e) => console.log('ERROR', new Date(), e));

leader.start();

//console.log('Instance leader status is', leader.isLeader);
