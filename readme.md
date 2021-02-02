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

## `config` directories

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
Sites without a `.port` file will be served as raw files.

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


#### Common `ENV` variables

TBD

#### Common CI

TBD

#### Common CD

TBD

### Tasks: `project/<domain>/task/<name>`

TBD

#### Common `ENV` variables

TBD

#### Common CI

TBD

#### Common CD

TBD
# TODO
