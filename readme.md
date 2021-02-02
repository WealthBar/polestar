# WTF is Polestar?

"Polestar" is a greenfield re-thinking of how we manage projects and code bases.
The primary goals are to:
- enable SOA development and deployment
- allow for the use of (almost) any technology choice per service
- enable easier code shares across projects via global libraries by target environment
- make running multiple services locally saner

# Conventions

We are aiming for "if you name it right, it just works". That means you'll have to follow
specific naming conventions, or it will not work.

## lib

## config

## crypt

All `crypt` directories must have a `.gitattributes`

# Layout

```
project/<domain>/
site/
api - client api
app - client app
mobile.api - client mobile api
signin - client signin pages
signup - client signup pages
staff.api - staff api
staff.app - staff app
task/
... - cron tasks
```

# TODO
