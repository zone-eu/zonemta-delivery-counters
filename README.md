# @zone-eu/zonemta-delivery-counters

Delivery counters plugin for [ZoneMTA](https://github.com/zone-eu/zone-mta). Install this to see delivery counts and sending speed in [ZoneMTA WebAdmin](https://github.com/zone-eu/zmta-webadmin).

## Setup

Add this as a dependency for your ZoneMTA app

Requires Node.js 20 or newer.

```
npm install @zone-eu/zonemta-delivery-counters --save
```

Add a configuration entry in the "plugins" section of your ZoneMTA app

```json
...
  "plugins": {
    "modules/@zone-eu/zonemta-delivery-counters": {
      "enabled": "main",
      "redis": "redis://localhost:6379/2",
      "prefix": "zmta"
    }
  }
...
```

Redis configuration is optional. If not set then the redis connection provided by ZoneMTA is used.

## Counter retention

Only the dated counters used by WebAdmin are written: `delivered_<zone>^YYYY/MM/DD`, `bounced_<zone>^YYYY/MM/DD`, and `domains^YYYY/MM/DD`, with the configured prefix followed by `_` when set. Dates use UTC. Each counter expires 48 hours after its last update. The increment and expiry are written in the same Redis transaction.

Undated aggregates and dated delivery/bounce totals without a zone are no longer updated. Existing keys from older versions are not automatically deleted or expired. After upgrading all plugin instances, remove obsolete counter keys and expire or remove historical dated keys that have no TTL. Restrict cleanup to this plugin's keys and check for any other consumers first.

Please note that if you used the zone-mta-template when installing ZoneMTA (Which is the default procedure in the documentaton) zone-mta-counters is already installed for you.

## License

Delivery counters for ZoneMTA is licensed under the [European Union Public License 1.2](LICENSE) or later.

> Delivery counters for ZoneMTA is part of the Zone Mail Suite (ZMS). Suite of programs and modules for an efficient, fast and modern email server.

Copyright (c) 2026 Zone Media OÜ
