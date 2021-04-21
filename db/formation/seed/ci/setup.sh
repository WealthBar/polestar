#!/bin/bash
psql -X -e -d ${DB_FORMATION_DBA_URL} --echo-all -f ./seed.sql | grep ERROR
