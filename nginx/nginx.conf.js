const fs = require('fs');
const p = require('path');

const hostMappings = [];

function readdirRecursiveSync(path, cb) {
  const files = fs.readdirSync(path);
  let stats;

  for (const file of files) {
    stats = fs.lstatSync(p.join(path, file));
    if (stats.isDirectory()) {
      readdirRecursiveSync(p.join(path, file), cb);
    } else {
      cb(p.join(path, file));
    }
  }
}

const hostPostfix = process.env.HOST_POSTFIX;

readdirRecursiveSync('project', (file) => {
  if (file.endsWith('/.port')) {
    const subdomainsFile = p.join(p.dirname(file), '.additional_subdomains');
    let subdomains = [];
    if (fs.existsSync(subdomainsFile)) {
      subdomains = (fs.readFileSync(subdomainsFile, "utf-8")).split(/[\n\r]/).filter(x => x.trim() !== '');
    }
    const m = file.match(/project\/(?<domain>[^/]+)\/site\/(?<sub>[^/]+)/);
    if (m) {
      const port = +((fs.readFileSync(file, "utf-8")).split(/[\n\r]/)?.[0]);
      if (port) {
        const { domain, sub } = m.groups;
        subdomains.unshift(sub);
        subdomains.forEach((subdomain) => {
          console.log(`adding ${subdomain}.${domain}.${hostPostfix} ${port};`);
          hostMappings.push(`    ${subdomain}.${domain}.${hostPostfix} ${port};`)
          hostMappings.push(`    *.${subdomain}.${domain}.${hostPostfix} ${port};`)
        });
      }
    }
  }
});

const cwd = process.cwd();
const hostMap = hostMappings.join('\n');

const config = `
worker_processes 1;
error_log stderr;
daemon off;

events {
    worker_connections 1024;
}

http {
  include mime.types;
  default_type text/plain;
  access_log /dev/stdout;

  map $http_upgrade $connection_upgrade {
      default upgrade;
      '' close;
  }

  map $http_host $localport {
    hostnames;

    default 0;
${hostMap}
  }

  error_page 404 /404.html;

  server {
    listen 80;
    port_in_redirect off;

    if ($host ~* ^([^.]+\\.)*([^.]+)\\.([^.]+)\\.${hostPostfix}$) {
      set $subdomain $2;
      set $domain $3;
    }

    location ~ / {
      index index.html;
      proxy_read_timeout 300;
      proxy_connect_timeout 300;
      proxy_http_version 1.1;
      proxy_intercept_errors on;
      proxy_pass_header  Set-Cookie;
      proxy_set_header   X-Forwarded-Proto $scheme;
      proxy_set_header   Host              $http_host;
      proxy_set_header   X-Forwarded-For   $remote_addr;
      proxy_set_header   Upgrade           $http_upgrade;
      proxy_set_header   Connection        $connection_upgrade;

      if ($localport = 0) {
        root ${cwd}/project/$domain/site/$subdomain/public/;
      }

      if ($localport != 0) {
        proxy_pass http://127.0.0.1:$localport;
      }
    }
  }
}
`;

console.log("writing ./nginx/nginx.conf");
fs.writeFileSync("./nginx/nginx.conf", config);
process.exit(0);
