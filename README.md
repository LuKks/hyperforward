# hyperforward

Forward p2p e2e encrypted (Hyperswarm/discovery + Noise Protocol)

![](https://img.shields.io/npm/v/hyperforward.svg) ![](https://img.shields.io/npm/dt/hyperforward.svg) ![](https://img.shields.io/github/license/LuKks/hyperforward.svg)

Public connection:
```bash
# server: listen remote forward
hyperforward -R 127.0.0.1:3000 --clients *
# The temporal public key is:
# 6e7c244099bf7c14314b0eb611c6bff9b040bca1d80fed9c5e22d52a0c0e927c
# Listening on: 127.0.0.1:48305

# client: connect local forward
hyperforward -L 127.0.0.1:3000 --connect 6e7c244099bf7c14314b0eb611c6bff9b040bca1d80fed9c5e22d52a0c0e927c
# The temporal public key is:
# 9dde1ccf27c95680b4bead02598897ce31cd5dbca256d3a154033ad398f38d63
# Listening on: 127.0.0.1:3000
```

Authentication:
```bash
# create your pair keys:
hyperforward keygen lks

# ask a friend to create their pair keys:
# hyperforward keygen crst

# for easy usage, save your friend's public key with a custom name:
hyperforward add crst 7fb38687efe15b9280fef1dc5d84d87c618a0cf1041bfbe3f33c115a30b0b57f

# ask your friend to do the same with your public key:
# hyperforward add lks dce09d024d0df44c551b3d2478a5b0f987983a94bb35ba9ea85bfebb5169e555
```

Private connection:
```bash
# server: you listen remote forward
hyperforward --from lks -R 127.0.0.1:3000 --clients crst

# client: friend connect local forward
hyperforward --from crst -L 127.0.0.1:3000 --connect lks
```

## Install
```
npm i -g hyperforward
```

## Examples
#### Generate a public/secret noise key pair
```bash
# use: hyperforward keygen [name]

# on lks's computer
hyperforward keygen lks
# Generating public/secret noise key pair.
# Your identification has been saved in /home/lucas/.ssh/noise_lks
# Your public key has been saved in /home/lucas/.ssh/noise_lks.pub
# The public key is:
# dce09d024d0df44c551b3d2478a5b0f987983a94bb35ba9ea85bfebb5169e555

# on crst's computer
hyperforward keygen crst
# Generating public/secret noise key pair.
# ...
# The public key is:
# 7fb38687efe15b9280fef1dc5d84d87c618a0cf1041bfbe3f33c115a30b0b57f
```

#### Add to known peers
```bash
# use: hyperforward add [name] [public_key]

# on lks's computer
hyperforward add crst 7fb38687efe15b9280fef1dc5d84d87c618a0cf1041bfbe3f33c115a30b0b57f
# The public key is named:
# [crst] (7fb3...b57f)

# on crst's computer
hyperforward add lks dce09d024d0df44c551b3d2478a5b0f987983a94bb35ba9ea85bfebb5169e555
# The public key is named:
# [lks] (dce0...e555)
```

#### Listen remote forward (server)
```bash
# use: hyperforward --from [public_key] -R [remote_address:port] --clients [asterisk or list of names or public keys]

hyperforward --from lks -R 127.0.0.1:3000 --clients crst
# --clients: only names or public keys (comma separated) are allowed to connect
```

#### Connect local forward (client)
```bash
# use: hyperforward --from [public_key] -L [local_address:port] --connect [public_key]

hyperforward --from crst -L 127.0.0.1:3000 --connect lks
# --connect: only --clients specified in remote (-R) can connect
```

#### Print the public key
```bash
# use: hyperforward print [name]

hyperforward print lks
# The public key is:
# dce09d024d0df44c551b3d2478a5b0f987983a94bb35ba9ea85bfebb5169e555
```

#### List keys
```bash
# use: hyperforward ls

hyperforward ls lks
# My pair keys:
# 1) lks dce09d024d0df44c551b3d2478a5b0f987983a94bb35ba9ea85bfebb5169e555

# Known peers:
# 1) crst 7fb38687efe15b9280fef1dc5d84d87c618a0cf1041bfbe3f33c115a30b0b57f
```

#### Remove public key and pair key
```bash
# use: hyperforward rm [name]

hyperforward rm lks
# Public key is now deleted: /home/lucas/.ssh/noise_lks.pub
# Secret key is now deleted: /home/lucas/.ssh/noise_lks

hyperforward rm crst
# Public key is now deleted: /home/lucas/.ssh/noise_crst.pub
```

#### Temporal server authentication
Don't set `--from` in `-R` (will keygen a temporal pair keys in memory)\
```bash
# server:
hyperforward -R 127.0.0.1:3000 --clients crst
# Temporal listening on:
# 3ce750bd562d6c1b4702153da15af742bd7602575ee30a14fc1556b83fa3ea29

# example client connection:
hyperforward --from crst -L 127.0.0.1:3000 --connect 3ce750bd562d6c1b4702153da15af742bd7602575ee30a14fc1556b83fa3ea29
```

#### Temporal client authentication
Don't set `--from` in `-L` (will keygen a temporal pair keys in memory)\
```bash
# example server listen:
hyperforward --from lks -R 127.0.0.1:3000 --clients crst
# Listening on:
# dce09d024d0df44c551b3d2478a5b0f987983a94bb35ba9ea85bfebb5169e555

# client:
hyperforward --from crst -L 127.0.0.1:3000 --connect 3ce750bd562d6c1b4702153da15af742bd7602575ee30a14fc1556b83fa3ea29
```

## License
Code released under the [MIT License](https://github.com/LuKks/hyperforward/blob/master/LICENSE).
