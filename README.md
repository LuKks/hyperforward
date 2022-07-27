# hyperforward

CLI and library to forward peer-to-peer end-to-end encrypted connections.

![](https://img.shields.io/npm/v/hyperforward.svg) ![](https://img.shields.io/npm/dt/hyperforward.svg) ![](https://img.shields.io/github/license/LuKks/hyperforward.svg)

## Install
```
npm i -g hyperforward
```

## Usage
```shell
Usage: hyperforward [options] [command]

CLI to forward P2P E2E encrypted connections

Options:
  -v, --version                Output the current version
  -h, --help                   display help for command

Commands:
  remote [options] <hostname>  Create a P2P server that forwards to a remote hostname
  local [options] <hostname>   Create a local server that forwards to a P2P server
  keygen <name>                Create a seed key by name
  add <name> <public key>      Add a known public key by name
  rm <name>                    Remove a key by name
  print <name>                 Print the public key by name
  ls                           List my own keys and known peers
  migrate [options]            Migrate old keys to the new directory and format
  help [command]               display help for command
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

`--firewall` is a list of names or public keys comma separated.\
`--connect` can be a name or public key.

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
