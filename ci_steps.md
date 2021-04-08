.github trigger on `project/*/site/*/` ($p)
* in a CI container w/ an attached PG with DB_HOST and DB_PORT 
* pull repo (with crypt key)
* `. ./config.sh ci` in root of the repo
* for each db in `$p/db.lst`
  * in `db/$db/` run `./setup`
* in `$p`
  * `init`
  * `lint`
  * `build`
  * `test`
  * if `pack` run it, else if -e Dockerfile then create the docker image

.github trigger on `lib/*/` ($l)
* pull repo (with crypt key)
* `. ./config.sh ci` in root of the repo
* in `$l`
    * `init`
    * `lint`
    * `build`
    * `test`
    * if `pack` run it

Deployment:
`project/(?:<domain>)/site/(?:subdomain>)/`
(main)
`project/formation/site/system.api/` -> https://system.api.formation.cidirectinvesting.com/
(project)
`project/formation/site/system.api/` -> https://system.api.formation.k123.prod-k.wealth.bar/
