# hyperforward

Forward P2P E2E encrypted

![](https://img.shields.io/npm/v/hyperforward.svg) ![](https://img.shields.io/npm/dt/hyperforward.svg) ![](https://img.shields.io/github/license/LuKks/hyperforward.svg)

## Install
```
npm i -g hyperforward
```

### Examples
#### Public connection
1) Already having a server (TCP, HTTP, SOCKS, VNC, etc) running in your computer o remotely:
```bash
hyperforward -R 127.0.0.1:3000 --firewall *
# Use this temporal public key to connect:
# 6e7c244099bf7c14314b0eb611...a1d80fed9c5e22d52a0c0e927c
```

2) Other peers can connect to you using the public key:
```bash
hyperforward -L 127.0.0.1:8080 --connect 6e7c244099bf7c14314b0eb611...a1d80fed9c5e22d52a0c0e927c
# Ready to use, listening on: 127.0.0.1:8080
```

3) Now you can use the **local 127.0.0.1:8080** as it will be forwarded **to remote 127.0.0.1:3000**

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
hyperforward --key lukks -R 127.0.0.1:3000 --firewall cristian
```

2) **cristian** creates a local server **127.0.0.1:8080** to receive from **lukks**
```bash
hyperforward --key cristian -L 127.0.0.1:8080 --connect lukks
```

### More
```bash
hyperforward --key [name] -R [ip:port] --firewall [*, names or public keys comma separated]
hyperforward --key [name] -L [ip:port] --connect [name or public key]
hyperforward keygen [name]
hyperforward add [name] [public_key]
hyperforward print [name]
hyperforward ls
```

#### Sharing multiple services
Let's say you have multiple things going on:

- **HTTP server** on: **127.0.0.1:3000**
- **VNC/NoMachine** on: **127.0.0.1:4001**
- **SOCKS5 proxy** on: **127.0.0.1:1090**

1) **Each service should have their own key pair:**

```bash
hyperforward keygen http-1
hyperforward keygen vnc-1
hyperforward keygen proxy-1
```

2) **Normal remote forward each one:**

_In this case, only certain keys should be able to use the private VNC service._
```bash
hyperforward --key http-1 -R 127.0.0.1:3000 --firewall *
hyperforward --key vnc-1 -R 127.0.0.1:4001 --firewall cristian,lukks
hyperforward --key proxy-1 -R 127.0.0.1:1090 --firewall *
```

3) **Other peers can connect to your services:**

Let's say "lukks" would like to use your VNC (as he's authorized):
```bash
hyperforward --key lukks -L 127.0.0.1:4001 --connect vnc-1
```

Later, anyone would like to use your proxy:
```bash
hyperforward -L 127.0.0.1:1090 --connect proxy-1
```

## License
Code released under the [MIT License](https://github.com/LuKks/hyperforward/blob/master/LICENSE).
