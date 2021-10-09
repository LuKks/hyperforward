# hyperforward

Forwarding via Hyperswarm (p2p) + Noise Protocol (e2e encrypted)

Do not use it! I'm currently working on it.

![](https://img.shields.io/npm/v/hyperforward.svg) ![](https://img.shields.io/npm/dt/hyperforward.svg) ![](https://img.shields.io/github/license/LuKks/hyperforward.svg)

```bash
# 1) create your main pair keys:
hyperforward keygen lks
# => will generate ~/.ssh/noise_lks.pub and ~/.ssh/noise_lks

# note: for easy usage, save your friend's public key with a custom name:
hyperforward add crst e52fc62ec5ac755f5e6fb41f86db8bdea44a5fa918c44dbf3d4c1a0b1872130f
# => will only generate ~/.ssh/noise_crst.pub

# 2) I create reverse forward allowing only specific clients (comma separated, by name or pubkey)
hyperforward -R 127.0.0.1:3000 --keys=lks --clients=crst

# 3) later only crst can receive the forward
hyperforward -L 127.0.0.1:3000 --keys=crst --join=lks
```

## Install
```
npm i -g hyperforward
```

## Notes

## Examples
#### A
```javascript

```

## Tests
```
There are no tests yet.
```

## License
Code released under the [MIT License](https://github.com/LuKks/hyperforward/blob/master/LICENSE).
