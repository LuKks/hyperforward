# hyperforward

Forward peer-to-peer end-to-end encrypted

![](https://img.shields.io/npm/v/hyperforward.svg) ![](https://img.shields.io/npm/dt/hyperforward.svg) ![](https://img.shields.io/github/license/LuKks/hyperforward.svg)

## Install
```
npm i -g hyperforward
```

### Examples
#### Public connection
Already having a server (TCP, HTTP, SOCKS, VNC, etc) running in your computer o remotely:
```bash
hyperforward remote 127.0.0.1:3000
# Use this temporal public key to connect:
# 6e7c244099bf7c14314b0e...0fed9c5e22d52a0c0e927c
```

Other peers can connect to you using the public key:
```bash
hyperforward local 127.0.0.1:8080 --connect 6e7c244099bf7c14314b0e...0fed9c5e22d52a0c0e927c
# Ready to use, listening on: 127.0.0.1:8080
```

Now you can use the **local 127.0.0.1:8080** as it will be forwarded **to remote 127.0.0.1:3000**

#### Authorization
Create named key pair:
```bash
hyperforward keygen lukks

# Ask a friend to create their key pair:
hyperforward keygen cristian
```

#### Private connection
Same as the first example but with specific authorization.

1) **lukks** shares the remote server **127.0.0.1:3000** allowing only **cristian**
```bash
hyperforward remote 127.0.0.1:3000 --key lukks --firewall cristian
```

2) **cristian** creates a local server **127.0.0.1:8080** to receive from **lukks**
```bash
hyperforward local 127.0.0.1:8080 --key cristian --connect lukks
```

### More
```bash
hyperforward remote [ip:port] --key [name] --firewall [names or public keys comma separated]
hyperforward local [ip:port] --key [name] --connect [name or public key]
hyperforward keygen [name]
hyperforward add [name] [public_key]
hyperforward print [name]
hyperforward ls
hyperforward rm [name]
```

#### Sharing multiple services
There is a security limitation: you can only use **one key per forward**.\
You still reuse a single key (ie. lukks, cristian, etc) to easily set firewalls.

Let's say you have multiple things going on:

- **HTTP server** on: **127.0.0.1:3000**
- **VNC/NoMachine** on: **127.0.0.1:4001**
- **SOCKS5 proxy** on: **127.0.0.1:1090**

1) **Each service should have their own key pair:**

```bash
hyperforward keygen http1
hyperforward keygen vnc1
hyperforward keygen proxy1
```

2) **Remote forward each one:**

_In this case, only certain people should be able to use the private VNC service._
```bash
hyperforward remote 127.0.0.1:3000 --key http1
hyperforward remote 127.0.0.1:4001 --key vnc1 --firewall cristian,lukks
hyperforward remote 127.0.0.1:1090 --key proxy1
```

3) **Other peers can connect to your services:**

Let's say "lukks" would like to use the VNC (as he's authorized):
```bash
hyperforward local 127.0.0.1:4001 --key lukks --connect vnc1
```

Later, anyone would like to use your proxy:
```bash
hyperforward local 127.0.0.1:1090 --connect proxy1
```

## License
MIT
