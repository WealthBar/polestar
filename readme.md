# WTF is Polestar?

"Polestar" is a greenfield re-thinking of how we manage projects and code bases.
The primary goals are to:
- enable SOA development and deployment
- allow for the use of (almost) any technology choice per service
- enable easier code shares across projects via global libraries by target environment
- make running multiple services locally saner

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

### `agnostic`

Code here should run pretty much anywhere and make minimal assumptions about the environment consuming it.

### `backend`

Code here should assume it is running in NodeJS.

### `frontend`

Code here should assume it is running in a browser.

### `script`

Code here should assume it is running in NodeJS as part of a cron job or a development tool.

## `nginx`

`nginx` is used to proxy all `*.local` requests to locally running services. The config is dynamically
build based on scanning the `project` directory for sites. Sites with a `.port` file will be proxied to.
Sites without a `.port` file will have their `public` directory be served as raw files and built/packaged
as static content.

## `project/<domain>/`

Each project is named by the "domain" it uses. This will be mapped to `<site>.<domain>.local` be working
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


# `*.local` DNS setup
```
$ brew install dnsmasq
$ echo 'address=/.local/127.0.0.1' > /usr/local/etc/dnsmasq.conf
$ sudo cp -v /usr/local/Celler/dnsmasq/<version>homebrew.mxcl.dnsmasq.plist /Library/LaunchDaemons
$ sudo launchctl load -w /Library/LaunchDaemons/homebrew.mxcl.dnsmasq.plist
```

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
$ dig asdf.local
...
;; ANSWER SECTION:
asdf.local.             0       IN      A       127.0.0.1
...
```

# Running locally

## Startup `nginx`

```
$ overmind s -f procfile.dev
```

*Note*: If you change a site's `.port` or add/remove a site you need to stop and restart `nginx` as it
does not watch the file system for changes.

## Startup sites you need

```
$ cd project/<domain>/site/<subdomain>
$ ./dev
```

You may need to stop and restart, or not, depending on what stack the site uses to run in development mode.

We might create some `project/<domain>/procfile.dev` files to run all of the sites for a given domain if that
becomes more convenient.

# TODO

## Managing databases.

`project/hubdb` has the start of the db setup work.

A DB could be shared by many other projects it has to be external to any given project and managed as 
its own _thing_. "Deployment" for a DB is either initial setup, or the incremental application of
a schema migrations, or the alternation of data.

This should probably be moved to its own top level pattern, something like:

```
db/<domain>/
 setup # shell script
 up # script to apply migrations  
 migration/
  <tz>.sql
 seed/<whitelabel>/(main|project|local)/
   seed # script to seed data
 once/<whitelabel>/ # data fixes for production
   <tz>.sql
```


## Managing local ports

- Update the `nginx.conf.js` to detect port conflicts and automatically assign ports
  when the `.port` file is empty.

