db = db.getSiblingDB('hims');
db.createUser({
  user: 'hims',
  pwd: 'hims_secret',
  roles: [{ role: 'readWrite', db: 'hims' }],
});
db.createCollection('tenants');
