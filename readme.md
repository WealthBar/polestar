# WTF is Polestar?

"Polestar" is a greenfield re-thinking of how we manage projects and code bases.
The primary goals are to:
- enable SOA development and deployment
- allow for the use of (almost) any technology choice per service
- enable easier code shares across projects via global libraries by target environment
- make running multiple services locally saner

# SameSite Crap

If you are using Chrome goto: chrome://flags and disable "Cookies without SameSite must be secure". For some _stupid_ 
reason chrome enforces this on `.local` domains.

FireFox is smart enough to not screw this up.

# Conventions and Layout

We are aiming for "if you name it right, it just works". That means you'll have to follow
specific naming conventions, or it will not work.

## filenames

* Always lower case using snake case.
* No hyphens.

## `crypt` directories

All `crypt` directories will be encrypted using `git-crypt`.
This is done via a the top level `.gitattributes` file.

* `crypt/main/` will contain the production secrets
* `crypt/project/` will contain secrets used for project branch deployments
* `crypt/local/` will contain secrets used for local development

## `config` directories/files

TBD

## `lib`

All code in `lib` should be designed with re-use in mind and well documented to describe the
behavior of the code. Changes here should be rare as they will affect many projects.

Currently, all code here is in Typescript. If we start supporting other languages we'll have to
add another tier to the directory structure.

Currently, we build each area as a single package. We may revisit that at some point as well.

### `ts_agnostic`

Code here should run pretty much anywhere and make minimal assumptions about the environment consuming it.

### `node_core`

Code here should assume it is running in NodeJS.

### `ts_browser`

Code here should assume it is running in a browser.

### `node_script`

Code here should assume it is running in NodeJS as part of a cron job or a development tool.

## `nginx`

`nginx` is used to proxy all `*.xxx` requests to locally running services. The config is dynamically
build based on scanning the `project` directory for sites. Sites with a `.port` file will be proxied to.
Sites without a `.port` file will have their `public` directory be served as raw files and built/packaged
as static content.

*NOTE*: I originally used `.local` for the local DNS but google oauth requires a "real" tld and doesn't
accept `.local` or `.localhost` even though those are traditionally used for 127/8 DNS.

So then I tried `.dev` and aliasing over top of `.dev`, even tho that is a real TLD. But no, that doesn't
work either because `.dev` is also special in forcing all connections to `https`. 🤦‍♂️

So then I tried `.xxx`. That appears to work.

## `project/<domain>/`

Each project is named by the "domain" it uses. This will be mapped to `<site>.<domain>.dev` be working
locally. (I'm still debating if the TLD should be included).

Projects are broken into sections:

### HTTP Services: `project/<domain>/site/<subdomain>`

Each subdomain is its own deployment. For example, you might split a project up into several services:

```
 api - client api
 app - client app
 mobile.api - client mobile api
 signin - client signin pages
 signup - client signup pages
 staff.api - staff api
 staff.app - staff app
```

Each built on different technology stacks/versions.

Each `site` is expected to provide shell scripts as follows:

* `init` - install dependencies required for `build` and `dev`
* `dev` - run in local dev mode, bound to `.port`
* `build` - build the site
* `test` - build and test the site (including coverage)
* `lint` - lint the code
* `pack` - package the site via docker

These provide a level-of-indirection for CI and CD to hook into that can be standardized
across various technologies allowing us to avoid having CI/DB configuration for each site.

If any of the shell scripts fail they should return a non-zero error code.

TBD: versioning. Probably use a `.version` file.

#### Common `ENV` variables

TBD

#### Common CI/CD

goal: no custom configuration of CI/CD per site.

CI effectively will run:

```
if (./init && ./lint && ./test && ./pack) {
 if (branch === 'main') {
  trigger main deployment
 }
 if (branch.match(/k\d+\.project/)) {
  trigger project deployment
 }
}
```

Deployments will target a DO Kubernetes cluster for now.

### Tasks: `project/<domain>/task/<name>`

TBD

#### Common `ENV` variables

TBD

#### Common CI/CD

goal: no custom configuration of CI/CD per task.

# Running locally

## `*.xxx` DNS setup
```
$ brew install dnsmasq
# edit /usr/local/etc/dnsmasq.conf
$ sudo cp -v /usr/local/Celler/dnsmasq/<version>homebrew.mxcl.dnsmasq.plist /Library/LaunchDaemons
$ sudo launchctl load -w /Library/LaunchDaemons/homebrew.mxcl.dnsmasq.plist
```

/usr/local/etc/dnsmasq.conf:
```
address=/.xxx/127.0.0.1
local=/xxx/
domain=xxx
server=192.168.1.1
```

Replace server with your existing DNS server (or 1.1.1.1 if you just want to use cloudflare)

You can manually start and stop the service with the following commands

```
$ sudo launchctl stop homebrew.mxcl.dnsmasq
$ sudo launchctl start homebrew.mxcl.dnsmasq
```

In `System Preferences -> Network -> Advanced -> DNS` add `127.0.0.1` as your first DNS server 
entry (be sure to have your second entry as your original DNS server).

If you have both WiFi and wired you’ll need to update both network interface settings.

To confirm:

```
$ dig google.com
...
;; ANSWER SECTION:
google.com.             159     IN      A       216.58.217.46
...
```

and

```
$ dig asdf.dev
...
;; ANSWER SECTION:
asdf.dev.             0       IN      A       127.0.0.1
...
```

## DB setup

1. Spin up a Postgres 13 server on port 5413
2. For each project you'll be using, `cd db/<project>` then `./setup`

If you don't already have a local Postgres server (Postgres.app), go to https://postgresapp.com/ and download the version that has all the versions (currently called `Postgres.app with all currently supported PostgreSQL versions`) and follow the instructions to install it.

If you already have Postgres.app installed, click on the task bar icon (the little elephant), choose `Open Postgres`. To create a new database, click on the sidebar icon on the bottom left if it's not already open, and then `+` in the bottom left to open the "Create a new server" dialog. You can name it whatever you want, but make sure to set the version to `13` and make sure the port is `5413`, then click `Create Server`.

## Installation

1. Switch to Node 15: `nvm install 15`
2. Run script: `./init.sh`

If node 15 is already installed, you can `nvm use 15` instead of `install`ing it. You may want to set 15 as a default so you don't have to `use` every time: `nvm alias default 15`.

## Configuration

2. Unlock encrypted secrets: `git-crypt unlock ~/<path>/polestar.key`
1. Run config script: `. ./config.sh`

## Startup overmind

```
$ ./dev
```

*Note*: If you change a site's `.port` or add/remove a site you need to stop and restart overmind as it
does not watch the file system for changes.


## SMTP for development

```
docker run --name=papercut -p 25:25 -p 37408:37408 jijiechen/papercut:latest
```

Access via: `http://smtp.dev:37408`

# TODO

## Managing databases.

`db/hello` has the start of the db setup work.

A DB could be shared by many other projects it has to be external to any given project and managed as 
its own _thing_. "Deployment" for a DB is either initial setup, or the incremental application of
a schema migrations, or the alternation of data.

This should probably be moved to its own top level pattern, something like:

```
db/<domain>/
 config/
 crypt/
 setup # shell script to setup initial DB
 schema/
   ... # files used by setup to initialize the schema
 up # script to apply migrations  
 migration/
  <tz>.sql
 seed/(main|project|local)/
   seed # script to seed data
 once/ # data fixes for production
   <tz>.sql
```


## Managing local ports

- Update the `nginx.conf.js` to detect port conflicts and automatically assign ports
  when the `.port` file is empty.

