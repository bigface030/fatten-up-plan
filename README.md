- Node v16
- Yarn
- mkcert

```bash
# 1. Create cert files and move them to ssl-cert folder.
mkcert fatten-up-plan.local "*.fatten-up-plan.local" localhost 127.0.0.1 ::1
mv fatten-up-plan.local+4-key.pem ssl-cert/fatten-up-plan.local+4-key.pem
mv fatten-up-plan.local+4.pem ssl-cert/fatten-up-plan.local+4.pem

# 2. Add following record to /etc/hosts file
127.0.0.1    fatten-up-plan.local

# 3. Install node_modules with Yarn
yarn install

# 4. Run dev server
yarn dev
```
