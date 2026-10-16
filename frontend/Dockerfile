# Site and admin panel on nginx, running as a non-root user (listens on 8080).
FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY index.html app.js styles.css /usr/share/nginx/html/
COPY assets /usr/share/nginx/html/assets
COPY admin /usr/share/nginx/html/admin

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
