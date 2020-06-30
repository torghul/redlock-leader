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

const leader = new RedlockLeader([client], {});

leader.on('elected', () => console.log(`${process.pid} ${new Date()} ELECTED`));
leader.on('revoked', () => console.log(`${process.pid} ${new Date()} REVOKED`));
leader.on('extended', () => console.log(`${process.pid} ${new Date()} EXTENDED`));
leader.on('error', (e) => console.log(`${process.pid} ${new Date()} ERROR`, e));

leader.start();

//console.log('Instance leader status is', leader.isLeader);
